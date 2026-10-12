import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { createNeonStore } from "../server/storage.mjs";
import {
  initialState,
  addCustomer,
  addLot,
  createOrder,
  changeOrder,
  day,
} from "../server/domain.mjs";

test("Postgres: transações, sessões, persistência e disputa pela última placa", async (t) => {
  const database = new PGlite();
  t.after(() => database.close());
  // Execute the adapter's SQL in real embedded Postgres; no remote credentials.
  const sql = {
    query(text, params = []) {
      return {
        text,
        params,
        then(resolve, reject) {
          return database
            .query(text, params)
            .then((result) => result.rows)
            .then(resolve, reject);
        },
      };
    },
    transaction(queries) {
      return database.transaction(async (tx) => {
        const rows = [];
        for (const query of queries)
          rows.push((await tx.query(query.text, query.params)).rows);
        return rows;
      });
    },
  };
  const store = await createNeonStore(sql);
  assert.equal(await store.hasOwner(), false);
  const initial = initialState("Teste", "Marca");
  await store.createOwner(
    { email: "owner@example.test", salt: "test-salt", hash: "test-hash" },
    initial,
  );
  assert.equal(await store.hasOwner(), true);
  assert.equal((await store.findUser("owner@example.test")).hash, "test-hash");
  await assert.rejects(
    store.createOwner(
      { email: "second@example.test", salt: "x", hash: "y" },
      initial,
    ),
    /já foi criado/,
  );
  assert.equal(await store.findUser("second@example.test"), undefined);
  await store.addSession("session-hash", Date.now() + 60000);
  assert.equal(await store.hasSession("session-hash", Date.now()), true);
  assert.equal(
    await store.hasSession("session-hash", Date.now() + 120000),
    false,
  );
  await store.deleteSession("session-hash");
  assert.equal(await store.hasSession("session-hash", Date.now()), false);

  const customer = await store.mutate((state) =>
    addCustomer(state, { name: "Café de teste" }),
  );
  const product = initial.products[0];
  await store.mutate((state) =>
    addLot(state, {
      productId: product.id,
      quantity: 1,
      unitCostCents: 2500,
      date: day(),
    }),
  );
  const sell = () =>
    store.mutate((state) =>
      createOrder(state, {
        customerId: customer.id,
        items: [{ productId: product.id, quantity: 1, unitPriceCents: 8000 }],
      }),
    );
  const concurrent = await Promise.allSettled([sell(), sell()]);
  assert.equal(
    concurrent.filter((result) => result.status === "fulfilled").length,
    1,
  );
  assert.equal(
    concurrent.filter((result) => result.status === "rejected").length,
    1,
  );
  const order = concurrent.find(
    (result) => result.status === "fulfilled",
  ).value;
  assert.equal(order.costCents, 2500);
  await store.mutate((state) =>
    addLot(state, {
      productId: product.id,
      quantity: 3,
      unitCostCents: 3900,
      date: day(),
    }),
  );
  const reopened = await createNeonStore(sql);
  assert.equal((await reopened.read()).orders.length, 1);
  assert.equal((await reopened.read()).orders[0].costCents, 2500);
  await reopened.mutate((state) => changeOrder(state, order.id, "cancelled"));
  assert.equal(
    (await reopened.read()).lots.reduce((n, lot) => n + lot.remaining, 0),
    4,
  );
});
