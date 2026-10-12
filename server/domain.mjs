import { z } from "zod";

export const id = () => globalThis.crypto.randomUUID();
export function day(offset = 0) {
  const date = new Date(Date.now() + offset * 86400000);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  return ["year", "month", "day"]
    .map((key) => parts.find((p) => p.type === key).value)
    .join("-");
}
export class AppError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
const text = z.string().trim().max(200);
const required = text.min(1, "Preencha os campos obrigatórios.");
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const d = new Date(value + "T12:00:00Z");
    return (
      Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value
    );
  }, "Data inválida.");
const cents = z.number().int().min(0).max(100_000_000);
const qty = z.number().int().positive().max(100_000);
export const stages = [
  "new",
  "contacted",
  "interested",
  "proposal",
  "won",
  "lost",
];
export const customerSchema = z.object({
  name: required,
  contact: text.default(""),
  phone: text
    .default("")
    .transform((v) => v.replace(/\D/g, ""))
    .refine(
      (v) =>
        !v ||
        v.length === 10 ||
        v.length === 11 ||
        (/^55/.test(v) && [12, 13].includes(v.length)),
      "Use um telefone brasileiro com DDD.",
    ),
  segment: text.default(""),
  neighborhood: text.default(""),
  city: text.default(""),
  source: text.default("Cadastro manual"),
  notes: z.string().max(5000).default(""),
  stage: z.enum(stages).default("new"),
  consent: z.boolean().default(false),
  doNotContact: z.boolean().default(false),
});
export const taskSchema = z.object({
  title: required,
  customerId: z.string().max(100).default(""),
  dueDate: date,
  kind: z.enum(["contact", "delivery", "general"]).default("contact"),
  done: z.boolean().default(false),
});
export const productSchema = z.object({
  name: required,
  priceCents: cents.refine((v) => v > 0),
  minimum: z.number().int().min(0).max(10000).default(5),
});
export const lotSchema = z.object({
  productId: required,
  quantity: qty,
  unitCostCents: cents.refine((v) => v > 0),
  date,
  notes: z.string().max(1000).default(""),
});
export const orderSchema = z.object({
  customerId: required,
  items: z
    .array(
      z.object({
        productId: required,
        quantity: qty,
        unitPriceCents: cents.refine((v) => v > 0),
      }),
    )
    .min(1)
    .max(30),
  discountCents: cents.default(0),
  status: z.enum(["pending", "paid"]).default("pending"),
  deliveryDate: date.or(z.literal("")).default(""),
  notes: z.string().max(2000).default(""),
});
export const templateSchema = z.object({
  title: required,
  category: z.enum([
    "Abordagem",
    "Demonstração",
    "Proposta",
    "Retorno",
    "Entrega",
    "Pós-venda",
    "Objeções",
  ]),
  body: z.string().trim().min(1).max(5000),
});
export const expenseSchema = z.object({
  title: required,
  amountCents: cents.refine((v) => v > 0),
  date,
});
export const settingsSchema = z.object({
  name: required,
  business: required,
  city: text,
  dailyGoal: z.number().int().min(1).max(500),
});

export function activity(state, title, detail = "", customerId = "") {
  state.activity.unshift({
    id: id(),
    title,
    detail,
    customerId,
    createdAt: new Date().toISOString(),
  });
  state.activity = state.activity.slice(0, 200);
}
export function find(list, target, label = "Registro") {
  const value = list.find((item) => item.id === target);
  if (!value) throw new AppError(`${label} não encontrado.`, 404);
  return value;
}
export function addCustomer(state, input) {
  const parsed = customerSchema.parse(input);
  if (
    parsed.phone &&
    state.customers.some(
      (c) =>
        c.phone && normalizePhone(c.phone) === normalizePhone(parsed.phone),
    )
  )
    throw new AppError("Já existe um cliente com esse telefone.");
  const customer = {
    ...parsed,
    id: id(),
    createdAt: new Date().toISOString(),
    lastContactAt: null,
    archived: false,
    history: [],
    demo: false,
  };
  if (customer.doNotContact) customer.consent = false;
  state.customers.unshift(customer);
  activity(state, "Novo cliente cadastrado", customer.name, customer.id);
  return customer;
}
export function normalizePhone(value) {
  const digits = value.replace(/\D/g, "");
  return digits.length <= 11 ? "55" + digits : digits;
}
export function addTask(state, input) {
  const parsed = taskSchema.parse(input);
  if (parsed.customerId) {
    const customer = find(state.customers, parsed.customerId, "Cliente");
    if (parsed.kind === "contact" && customer.doNotContact)
      throw new AppError("Esse cliente está marcado como não contatar.");
  }
  const task = { ...parsed, id: id(), createdAt: new Date().toISOString() };
  state.tasks.unshift(task);
  return task;
}
export function addLot(state, input) {
  const parsed = lotSchema.parse(input);
  find(state.products, parsed.productId, "Produto");
  if (parsed.date > day())
    throw new AppError(
      "Registre a entrada quando o lote chegar. A data não pode estar no futuro.",
    );
  const lot = {
    ...parsed,
    id: id(),
    remaining: parsed.quantity,
    createdAt: new Date().toISOString(),
  };
  state.lots.push(lot);
  activity(state, "Estoque atualizado", `${lot.quantity} unidades recebidas`);
  return lot;
}
export function createOrder(state, input) {
  const parsed = orderSchema.parse(input);
  const customer = find(state.customers, parsed.customerId, "Cliente");
  if (customer.archived)
    throw new AppError("Reative o cliente antes de registrar um pedido.");
  if (
    new Set(parsed.items.map((i) => i.productId)).size !== parsed.items.length
  )
    throw new AppError(
      "Agrupe as quantidades de cada produto em uma única linha.",
    );
  const items = parsed.items.map((item) => {
    const product = find(state.products, item.productId, "Produto");
    const stock = state.lots
      .filter((l) => l.productId === product.id)
      .reduce((sum, l) => sum + l.remaining, 0);
    if (stock < item.quantity)
      throw new AppError(
        `Estoque insuficiente de ${product.name}: ${stock} disponíveis.`,
      );
    return {
      ...item,
      productName: product.name,
      totalCostCents: 0,
      allocations: [],
    };
  });
  const subtotalCents = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPriceCents,
    0,
  );
  if (parsed.discountCents >= subtotalCents)
    throw new AppError("O desconto precisa ser menor que o total do pedido.");
  if (subtotalCents > 100_000_000)
    throw new AppError("O valor total excede o limite de um pedido.");
  for (const item of items) {
    let remaining = item.quantity;
    const lots = state.lots
      .filter((l) => l.productId === item.productId && l.remaining > 0)
      .sort(
        (a, b) =>
          a.date.localeCompare(b.date) ||
          a.createdAt.localeCompare(b.createdAt),
      );
    for (const lot of lots) {
      const taken = Math.min(remaining, lot.remaining);
      lot.remaining -= taken;
      remaining -= taken;
      item.allocations.push({ lotId: lot.id, quantity: taken });
      item.totalCostCents += taken * lot.unitCostCents;
      if (!remaining) break;
    }
  }
  const order = {
    ...parsed,
    id: id(),
    number: state.nextOrderNumber++,
    customerName: customer.name,
    items,
    totalCents: subtotalCents - parsed.discountCents,
    costCents: items.reduce((sum, i) => sum + i.totalCostCents, 0),
    createdAt: new Date().toISOString(),
    paidAt: parsed.status === "paid" ? new Date().toISOString() : null,
  };
  state.orders.unshift(order);
  customer.stage = "won";
  customer.history.push({ stage: "won", at: new Date().toISOString() });
  if (order.deliveryDate)
    state.tasks.unshift({
      id: id(),
      title: `Entregar pedido #${order.number}`,
      customerId: customer.id,
      dueDate: order.deliveryDate,
      kind: "delivery",
      done: false,
      orderId: order.id,
      createdAt: new Date().toISOString(),
    });
  activity(
    state,
    "Novo pedido",
    `#${order.number} · ${customer.name}`,
    customer.id,
  );
  return order;
}
export function changeOrder(state, orderId, status) {
  const order = find(state.orders, orderId, "Pedido");
  if (order.status === status) return order;
  if (order.status === "cancelled")
    throw new AppError("Esse pedido já foi cancelado.");
  if (status === "cancelled") {
    if (order.status !== "pending")
      throw new AppError(
        "Somente pedidos a receber podem ser cancelados nesta versão.",
      );
    order.items.forEach((i) =>
      i.allocations.forEach((a) => {
        find(state.lots, a.lotId, "Lote").remaining += a.quantity;
      }),
    );
    state.tasks = state.tasks.filter((t) => t.orderId !== order.id);
  } else if (status === "paid" && order.status === "pending")
    order.paidAt = new Date().toISOString();
  else if (status === "delivered" && order.status === "paid")
    state.tasks
      .filter((t) => t.orderId === order.id)
      .forEach((t) => {
        t.done = true;
      });
  else throw new AppError("Confirme o pagamento antes de marcar a entrega.");
  order.status = status;
  activity(
    state,
    status === "cancelled"
      ? "Pedido cancelado"
      : status === "paid"
        ? "Pagamento recebido"
        : "Pedido entregue",
    `#${order.number} · ${order.customerName}`,
    order.customerId,
  );
  return order;
}

export function initialState(name = "", business = "", demo = false) {
  const state = {
    settings: {
      name,
      business: business || "Meu negócio",
      city: "",
      dailyGoal: 15,
    },
    customers: [],
    tasks: [],
    products: [
      { id: id(), name: "Placa NFC de balcão", priceCents: 8990, minimum: 5 },
      { id: id(), name: "Placa NFC de parede", priceCents: 6990, minimum: 5 },
    ],
    lots: [],
    orders: [],
    expenses: [],
    templates: [],
    activity: [],
    nextOrderNumber: 1001,
    demo,
  };
  const templates = [
    [
      "Uma primeira conexão",
      "Abordagem",
      "Olá, {contato}! Sou {meu_nome}, da {meu_negocio}. Trabalho com placas NFC que facilitam o acesso às avaliações do Google. Posso te mostrar como funcionaria na {empresa}?",
    ],
    [
      "Mostre como funciona",
      "Demonstração",
      "A ideia é simples: o cliente aproxima um celular compatível da placa e abre o link de avaliação da {empresa}. Quem preferir pode usar o QR Code, se incluído no modelo. Posso te enviar uma demonstração?",
    ],
    [
      "Uma proposta para seu negócio",
      "Proposta",
      "Preparei estas opções para a {empresa}: placa de balcão por {preco_balcao} e de parede por {preco_parede}. Podemos combinar a personalização e a entrega. Qual opção faz mais sentido para vocês?",
    ],
    [
      "Retomar a conversa",
      "Retorno",
      "Oi, {contato}! Ficou alguma dúvida sobre a placa NFC para a {empresa}? Se quiser, posso te ajudar a escolher o modelo. Se não for o momento, tudo bem também.",
    ],
    [
      "Combinar a entrega",
      "Entrega",
      "Olá, {contato}! Sua placa está pronta. Podemos combinar um horário de entrega na {empresa}? Vou conferir o link e mostrar como usar na hora.",
    ],
    [
      "Como está sendo a experiência?",
      "Pós-venda",
      "Oi, {contato}! Como está sendo o uso da placa na {empresa}? O link está abrindo corretamente? Se precisar de ajuda para orientar a equipe, pode contar comigo.",
    ],
    [
      "O investimento na placa",
      "Objeções",
      "Entendo, {contato}. A placa facilita uma ação que o cliente já pode fazer: acessar seu link. Podemos olhar o modelo mais adequado ao seu espaço e orçamento, sem prometer quantidade de avaliações ou vendas.",
    ],
  ];
  state.templates = templates.map(([title, category, body]) => ({
    id: id(),
    title,
    category,
    body,
  }));
  if (!demo) return state;
  state.settings.city = "São Paulo";
  const businesses = [
    ["Café Aurora", "Marina", "Cafeteria", "Pinheiros", "proposal"],
    ["Studio Bela", "Camila", "Beleza", "Vila Madalena", "interested"],
    ["Barbearia Reserva", "Rafael", "Barbearia", "Pinheiros", "contacted"],
    ["Pet & Cia", "Lucas", "Pet shop", "Moema", "new"],
    ["Bistrô Jardim", "Beatriz", "Restaurante", "Jardins", "new"],
    ["Ótica Horizonte", "Thiago", "Ótica", "Centro", "proposal"],
    ["Flor de Sal", "Sofia", "Restaurante", "Perdizes", "won"],
    ["Espaço Equilíbrio", "Ana", "Estética", "Moema", "interested"],
    ["Oficina Rota", "Pedro", "Automotivo", "Vila Mariana", "contacted"],
  ];
  businesses.forEach(([name, contact, segment, neighborhood, stage]) => {
    const customer = addCustomer(state, {
      name,
      contact,
      segment,
      neighborhood,
      city: "São Paulo",
      stage,
      source: "Exemplo",
      consent: false,
      notes: "Cliente fictício para explorar a ferramenta.",
    });
    customer.demo = true;
    customer.createdAt = new Date(Date.now() - 4 * 86400000).toISOString();
  });
  const cafe = state.customers.find((c) => c.name === "Café Aurora");
  const studio = state.customers.find((c) => c.name === "Studio Bela");
  const flor = state.customers.find((c) => c.name === "Flor de Sal");
  addTask(state, {
    title: "Retomar a proposta do Café Aurora",
    customerId: cafe.id,
    dueDate: day(),
    kind: "contact",
  });
  addTask(state, {
    title: "Apresentar os modelos ao Studio Bela",
    customerId: studio.id,
    dueDate: day(),
    kind: "contact",
  });
  addTask(state, {
    title: "Separar material de demonstração",
    dueDate: day(),
    kind: "general",
  });
  addTask(state, {
    title: "Conferir o link da placa entregue",
    customerId: flor.id,
    dueDate: day(1),
    kind: "general",
  });
  for (const product of state.products)
    addLot(state, {
      productId: product.id,
      quantity: 20,
      unitCostCents: product === state.products[0] ? 2290 : 1720,
      date: day(-7),
      notes: "Lote fictício de demonstração",
    });
  for (let i = 0; i < 6; i++) {
    const order = createOrder(state, {
      customerId: flor.id,
      items: [
        {
          productId: state.products[i % 2].id,
          quantity: (i % 3) + 1,
          unitPriceCents: state.products[i % 2].priceCents,
        },
      ],
      status: "paid",
    });
    order.createdAt = new Date(Date.now() - (6 - i) * 86400000).toISOString();
    order.paidAt = order.createdAt;
    order.status = "delivered";
  }
  createOrder(state, {
    customerId: flor.id,
    items: [
      { productId: state.products[0].id, quantity: 2, unitPriceCents: 8990 },
    ],
    status: "pending",
    deliveryDate: day(2),
  });
  state.activity = state.activity.slice(0, 8);
  return state;
}
