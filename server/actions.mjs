import { z } from "zod";
import * as domain from "./domain.mjs";

// Pure operations shared by the protected API and the standalone demonstration.
export function applyAction(state, path, method, body = {}) {
  const [, collection, target, action] = path.split("/");
  if (collection === "customers" && method === "POST" && target === "import") {
    const rows = z
      .array(domain.customerSchema)
      .min(1)
      .max(500)
      .parse(body.rows);
    let imported = 0,
      skipped = 0;
    for (const row of rows) {
      const same = state.customers.some(
        (c) =>
          (row.phone &&
            c.phone &&
            domain.normalizePhone(c.phone) ===
              domain.normalizePhone(row.phone)) ||
          (c.name.toLocaleLowerCase("pt-BR") ===
            row.name.toLocaleLowerCase("pt-BR") &&
            c.city.toLocaleLowerCase("pt-BR") ===
              row.city.toLocaleLowerCase("pt-BR")),
      );
      if (same) {
        skipped++;
        continue;
      }
      domain.addCustomer(state, {
        ...row,
        consent: false,
        source: "Importação CSV",
      });
      imported++;
    }
    return { imported, skipped };
  }
  if (collection === "customers" && method === "POST" && !target)
    return domain.addCustomer(state, body);
  if (collection === "customers" && target && method === "PATCH") {
    const customer = domain.find(state.customers, target, "Cliente");
    const parsed = domain.customerSchema
      .partial()
      .extend({ archived: z.boolean().optional() })
      .parse(body);
    if (
      parsed.phone &&
      state.customers.some(
        (c) =>
          c.id !== customer.id &&
          c.phone &&
          domain.normalizePhone(c.phone) ===
            domain.normalizePhone(parsed.phone),
      )
    )
      throw new domain.AppError("Já existe um cliente com esse telefone.");
    if (parsed.stage && parsed.stage !== customer.stage) {
      customer.history.push({
        stage: parsed.stage,
        at: new Date().toISOString(),
      });
      domain.activity(state, "Etapa atualizada", customer.name, customer.id);
    }
    Object.assign(customer, parsed);
    if (customer.doNotContact) {
      customer.consent = false;
      state.tasks
        .filter((t) => t.customerId === customer.id && t.kind === "contact")
        .forEach((t) => {
          t.done = true;
        });
    }
    return customer;
  }
  if (
    collection === "customers" &&
    target &&
    action === "contact" &&
    method === "POST"
  ) {
    const customer = domain.find(state.customers, target, "Cliente");
    if (customer.doNotContact)
      throw new domain.AppError("Esse cliente está marcado como não contatar.");
    customer.lastContactAt = new Date().toISOString();
    if (customer.stage === "new") {
      customer.stage = "contacted";
      customer.history.push({ stage: "contacted", at: customer.lastContactAt });
    }
    domain.activity(state, "Contato registrado", customer.name, customer.id);
    return customer;
  }
  if (collection === "tasks" && method === "POST" && !target)
    return domain.addTask(state, body);
  if (collection === "tasks" && target && method === "PATCH") {
    const task = domain.find(state.tasks, target, "Tarefa");
    const parsed = domain.taskSchema.partial().parse(body);
    const value = { ...task, ...parsed };
    if (value.customerId) {
      const customer = domain.find(
        state.customers,
        value.customerId,
        "Cliente",
      );
      if (!value.done && value.kind === "contact" && customer.doNotContact)
        throw new domain.AppError(
          "Esse cliente está marcado como não contatar.",
        );
    }
    Object.assign(task, parsed);
    return task;
  }
  if (
    (collection === "tasks" || collection === "templates") &&
    target &&
    method === "DELETE"
  ) {
    domain.find(state[collection], target);
    state[collection] = state[collection].filter((item) => item.id !== target);
    return { ok: true };
  }
  if (collection === "products" && method === "POST" && !target) {
    const product = { ...domain.productSchema.parse(body), id: domain.id() };
    state.products.push(product);
    return product;
  }
  if (collection === "products" && target && method === "PATCH") {
    const product = domain.find(state.products, target, "Produto");
    Object.assign(product, domain.productSchema.partial().parse(body));
    return product;
  }
  if (collection === "lots" && method === "POST" && !target)
    return domain.addLot(state, body);
  if (collection === "orders" && method === "POST" && !target)
    return domain.createOrder(state, body);
  if (collection === "orders" && target && method === "PATCH")
    return domain.changeOrder(
      state,
      target,
      z.enum(["paid", "delivered", "cancelled"]).parse(body.status),
    );
  if (collection === "expenses" && method === "POST" && !target) {
    const expense = { ...domain.expenseSchema.parse(body), id: domain.id() };
    state.expenses.unshift(expense);
    return expense;
  }
  if (collection === "templates" && method === "POST" && !target) {
    const template = { ...domain.templateSchema.parse(body), id: domain.id() };
    state.templates.push(template);
    return template;
  }
  if (collection === "templates" && target && method === "PATCH") {
    const template = domain.find(state.templates, target, "Mensagem");
    Object.assign(template, domain.templateSchema.parse(body));
    return template;
  }
  if (collection === "settings" && method === "PATCH") {
    state.settings = domain.settingsSchema.parse(body);
    return state.settings;
  }
  if (path === "/demo/clear" && method === "POST") {
    if (!state.demo) throw new domain.AppError("Não há exemplos para remover.");
    if (state.customers.some((c) => !c.demo))
      throw new domain.AppError(
        "Já existem clientes próprios. Exporte seus dados antes de iniciar uma nova base.",
      );
    const clean = domain.initialState(
      state.settings.name,
      state.settings.business,
    );
    clean.settings = state.settings;
    Object.assign(state, clean);
    return { ok: true };
  }
  throw new domain.AppError("Operação não encontrada.", 404);
}
