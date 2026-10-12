import test from "node:test";
import assert from "node:assert/strict";
import {
  initialState,
  addCustomer,
  addLot,
  createOrder,
  changeOrder,
  addTask,
  day,
} from "../server/domain.mjs";

function fixture() {
  const state = initialState("Vendedor", "Minha marca");
  const customer = addCustomer(state, {
    name: "Cliente de teste",
    phone: "11999990000",
  });
  return { state, customer, product: state.products[0] };
}
test("o pedido usa lotes em ordem e novas compras não mudam seu custo", () => {
  const { state, customer, product } = fixture();
  addLot(state, {
    productId: product.id,
    quantity: 2,
    unitCostCents: 2000,
    date: day(-2),
  });
  addLot(state, {
    productId: product.id,
    quantity: 3,
    unitCostCents: 3000,
    date: day(-1),
  });
  const order = createOrder(state, {
    customerId: customer.id,
    items: [{ productId: product.id, quantity: 3, unitPriceCents: 8000 }],
    discountCents: 1000,
  });
  assert.equal(order.totalCents, 23000);
  assert.equal(order.costCents, 7000);
  assert.deepEqual(
    state.lots.map((l) => l.remaining),
    [0, 2],
  );
  addLot(state, {
    productId: product.id,
    quantity: 50,
    unitCostCents: 7000,
    date: day(),
  });
  assert.equal(order.costCents, 7000);
  changeOrder(state, order.id, "paid");
  assert.ok(order.paidAt);
  changeOrder(state, order.id, "delivered");
  assert.equal(order.status, "delivered");
});
test("cancelamento devolve cada unidade ao lote e é idempotente", () => {
  const { state, customer, product } = fixture();
  addLot(state, {
    productId: product.id,
    quantity: 5,
    unitCostCents: 2000,
    date: day(),
  });
  const order = createOrder(state, {
    customerId: customer.id,
    items: [{ productId: product.id, quantity: 2, unitPriceCents: 8000 }],
    deliveryDate: day(1),
  });
  assert.equal(state.lots[0].remaining, 3);
  assert.equal(state.tasks.length, 1);
  changeOrder(state, order.id, "cancelled");
  changeOrder(state, order.id, "cancelled");
  assert.equal(state.lots[0].remaining, 5);
  assert.equal(state.tasks.length, 0);
  assert.throws(() => changeOrder(state, order.id, "paid"), /cancelado/);
});
test("validação de todos os itens precede a retirada do estoque", () => {
  const { state, customer, product } = fixture();
  addLot(state, {
    productId: product.id,
    quantity: 5,
    unitCostCents: 2000,
    date: day(),
  });
  assert.throws(
    () =>
      createOrder(state, {
        customerId: customer.id,
        items: [
          { productId: product.id, quantity: 2, unitPriceCents: 8000 },
          {
            productId: state.products[1].id,
            quantity: 1,
            unitPriceCents: 8000,
          },
        ],
      }),
    /Estoque insuficiente/,
  );
  assert.equal(state.lots[0].remaining, 5);
  assert.equal(state.orders.length, 0);
  assert.throws(
    () =>
      createOrder(state, {
        customerId: customer.id,
        items: [{ productId: product.id, quantity: 1, unitPriceCents: 8000 }],
        discountCents: 8000,
      }),
    /desconto/,
  );
  assert.equal(state.lots[0].remaining, 5);
});
test("DDD 55 recebe código de país e duplicidades são reconhecidas", () => {
  const { state } = fixture();
  addCustomer(state, { name: "Contato com DDD 55", phone: "55999990000" });
  assert.throws(
    () => addCustomer(state, { name: "Mesmo contato", phone: "5555999990000" }),
    /Já existe/,
  );
});
test("não contatar impede lembretes de contato sem bloquear tarefas gerais", () => {
  const { state, customer } = fixture();
  customer.doNotContact = true;
  assert.throws(
    () =>
      addTask(state, {
        title: "Contato",
        customerId: customer.id,
        dueDate: day(),
      }),
    /não contatar/,
  );
  addTask(state, {
    title: "Organizar pedido",
    customerId: customer.id,
    dueDate: day(),
    kind: "general",
  });
  assert.equal(state.tasks.length, 1);
});
test("datas impossíveis e futuras em entradas de estoque são rejeitadas", () => {
  const { state, product } = fixture();
  assert.throws(() =>
    addLot(state, {
      productId: product.id,
      quantity: 3,
      unitCostCents: 2000,
      date: "2026-02-31",
    }),
  );
  assert.throws(
    () =>
      addLot(state, {
        productId: product.id,
        quantity: 3,
        unitCostCents: 2000,
        date: day(1),
      }),
    /futuro/,
  );
});
test("exemplos são identificados e não têm telefone nem autorização de envio", () => {
  const state = initialState("Teste", "Marca", true);
  assert.equal(state.customers.length, 9);
  assert.ok(state.customers.every((c) => c.demo && !c.phone && !c.consent));
  assert.ok(state.orders.length > 0);
  assert.ok(state.tasks.length > 0);
});
