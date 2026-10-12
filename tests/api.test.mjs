import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createServer } from "node:net";
import { day } from "../server/domain.mjs";

test("API: autenticação, persistência, importação, estoque concorrente e isolamento", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "conecta-test-"));
  const port = await new Promise((resolve) => {
    const server = createServer();
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
  const setupKey = randomBytes(24).toString("hex");
  let child;
  let cookie = "";
  const base = `http://127.0.0.1:${port}`;
  async function start() {
    child = spawn(process.execPath, ["server/index.mjs"], {
      env: {
        ...process.env,
        DATA_DIR: dir,
        DATABASE_URL: "",
        VERCEL: "",
        SETUP_TOKEN: setupKey,
        PORT: String(port),
        HOST: "127.0.0.1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("Startup timeout")),
        10000,
      );
      child.stdout.on("data", (data) => {
        if (data.toString().includes("Conecta pronto")) {
          clearTimeout(timer);
          resolve();
        }
      });
      child.once("exit", (code) => {
        clearTimeout(timer);
        reject(new Error(`Server exit ${code}`));
      });
    });
  }
  async function stop() {
    if (!child || child.exitCode !== null) return;
    await new Promise((resolve) => {
      child.once("exit", resolve);
      child.kill("SIGTERM");
    });
  }
  t.after(async () => {
    await stop();
    await rm(dir, { recursive: true, force: true });
  });
  async function request(path, method = "GET", body, headers = {}) {
    const response = await fetch(base + "/api" + path, {
      method,
      headers: {
        ...(cookie ? { Cookie: cookie } : {}),
        ...(method !== "GET" ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await response.json();
    return { response, data };
  }
  await start();
  assert.equal((await request("/state")).response.status, 401);
  const password = randomBytes(20).toString("hex");
  assert.equal((await request("/auth/status")).data.setupKeyRequired, true);
  assert.equal((await request("/auth/setup", "POST", {})).response.status, 403);
  const setup = await request("/auth/setup", "POST", {
    setupKey,
    email: "owner@example.test",
    password,
    name: "Teste",
    business: "Marca",
    demo: false,
  });
  assert.equal(setup.response.status, 200);
  cookie = setup.response.headers.get("set-cookie").split(";")[0];
  assert.match(setup.response.headers.get("set-cookie"), /HttpOnly/);
  assert.match(setup.response.headers.get("set-cookie"), /SameSite=Lax/);
  assert.equal(
    (
      await request("/auth/setup", "POST", {
        email: "another@example.test",
        password,
        name: "Other",
        business: "Other",
      })
    ).response.status,
    409,
  );
  assert.equal(
    (
      await request(
        "/customers",
        "POST",
        { name: "Should fail" },
        { Origin: "https://other.example" },
      )
    ).response.status,
    403,
  );
  const customer = (
    await request("/customers", "POST", {
      name: "Cliente real de teste",
      phone: "55999990000",
    })
  ).data;
  assert.ok(customer.id);
  const imported = await request("/customers/import", "POST", {
    rows: [
      { name: "Mesmo telefone", phone: "5555999990000" },
      { name: "Nova conexão", city: "Santos" },
      { name: "Nova conexão", city: "Santos" },
    ],
  });
  assert.deepEqual(imported.data, { imported: 1, skipped: 2 });
  const product = (await request("/state")).data.products[0];
  await request("/lots", "POST", {
    productId: product.id,
    quantity: 1,
    unitCostCents: 2500,
    date: day(),
  });
  const payload = {
    customerId: customer.id,
    items: [{ productId: product.id, quantity: 1, unitPriceCents: 8000 }],
  };
  const orders = await Promise.all([
    request("/orders", "POST", payload),
    request("/orders", "POST", payload),
  ]);
  assert.deepEqual(orders.map((o) => o.response.status).sort(), [201, 400]);
  const order = orders.find((o) => o.response.status === 201).data;
  assert.equal(order.costCents, 2500);
  assert.equal(
    (await request("/orders/" + order.id, "PATCH", { status: "delivered" }))
      .response.status,
    400,
  );
  await request("/orders/" + order.id, "PATCH", { status: "cancelled" });
  assert.equal((await request("/state")).data.lots[0].remaining, 1);
  await request("/tasks", "POST", {
    customerId: customer.id,
    title: "Retornar",
    dueDate: day(),
  });
  await request("/customers/" + customer.id, "PATCH", { doNotContact: true });
  assert.equal(
    (await request("/customers/" + customer.id + "/contact", "POST", {}))
      .response.status,
    400,
  );
  assert.equal((await request("/state")).data.tasks[0].done, true);
  const exportResponse = await request("/export");
  assert.equal(exportResponse.data.format, "conecta-v1");
  assert.ok(!JSON.stringify(exportResponse.data).includes(password));
  await stop();
  await start();
  const restored = await request("/state");
  assert.equal(restored.response.status, 200);
  assert.equal(restored.data.customers.length, 2);
  assert.equal(restored.data.orders.length, 1);
  await request("/auth/logout", "POST", {});
  assert.equal((await request("/state")).response.status, 401);
  const login = await request("/auth/login", "POST", {
    email: "owner@example.test",
    password,
  });
  assert.equal(login.response.status, 200);
});
