import type { Customer, State, Stage } from "./types";
export const PREVIEW_MODE = import.meta.env.VITE_PREVIEW_MODE === "true";
export const money = (value: number) =>
  (value / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const dateKey = (date = new Date()) =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(
    date,
  );
export const today = () => dateKey();
export const prettyDate = (
  value: string,
  options?: Intl.DateTimeFormatOptions,
) =>
  new Date(
    value.length === 10 ? value + "T12:00:00" : value,
  ).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", ...options });
export const initials = (value: string) =>
  value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((v) => v[0])
    .join("")
    .toUpperCase();
export const cents = (value: FormDataEntryValue | null) =>
  Math.round(Number(value || 0) * 100);
export const stages: {
  id: Stage;
  label: string;
  color: string;
  short: string;
}[] = [
  { id: "new", label: "Novo cliente", short: "Novos", color: "#7e8f9f" },
  {
    id: "contacted",
    label: "Contato feito",
    short: "Contatados",
    color: "#7198cb",
  },
  {
    id: "interested",
    label: "Interessado",
    short: "Interessados",
    color: "#a18cc9",
  },
  {
    id: "proposal",
    label: "Proposta enviada",
    short: "Propostas",
    color: "#d6a950",
  },
  { id: "won", label: "Venda fechada", short: "Fechados", color: "#4a9c79" },
  {
    id: "lost",
    label: "Sem interesse",
    short: "Sem interesse",
    color: "#b38585",
  },
];
export async function api<T = unknown>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  if (PREVIEW_MODE) {
    const { previewApi } = await import("./previewApi");
    return (await previewApi(path, method, body)) as T;
  }
  const response = await fetch("/api" + path, {
    method,
    credentials: "same-origin",
    headers: method !== "GET" ? { "Content-Type": "application/json" } : {},
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response
    .json()
    .catch(() => ({ error: "Resposta inesperada do servidor." }));
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith("/auth"))
      window.dispatchEvent(new Event("session-expired"));
    throw new Error(data.error || "Não foi possível concluir.");
  }
  return data as T;
}
export function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.length <= 11 ? "55" + digits : digits;
}
export function personalize(
  body: string,
  customer: Customer | undefined,
  state: State,
) {
  const vars: Record<string, string> = {
    empresa: customer?.name || "",
    contato: customer?.contact || customer?.name || "",
    meu_nome: state.settings.name,
    meu_negocio: state.settings.business,
    cidade: state.settings.city,
    preco_balcao: state.products[0] ? money(state.products[0].priceCents) : "",
    preco_parede: state.products[1] ? money(state.products[1].priceCents) : "",
  };
  return body.replace(/\{(\w+)\}/g, (match, key) => vars[key] || match);
}
export function parseCSV(source: string): {
  rows: Partial<Customer>[];
  errors: string[];
} {
  const input = source.replace(/^\uFEFF/, "");
  const separator = input.split(/\r?\n/)[0].includes(";") ? ";" : ",";
  const grid: string[][] = [];
  let row: string[] = [],
    value = "",
    quoted = false;
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (char === '"') {
      if (quoted && input[i + 1] === '"') {
        value += '"';
        i++;
      } else quoted = !quoted;
    } else if (char === separator && !quoted) {
      row.push(value.trim());
      value = "";
    } else if (char === "\n" && !quoted) {
      row.push(value.trim());
      if (row.some(Boolean)) grid.push(row);
      row = [];
      value = "";
    } else if (char !== "\r" || quoted) value += char;
  }
  row.push(value.trim());
  if (row.some(Boolean)) grid.push(row);
  if (quoted)
    return {
      rows: [],
      errors: ["Há aspas abertas no arquivo. Confira a formatação do CSV."],
    };
  if (grid.length < 2)
    return {
      rows: [],
      errors: ["Inclua o cabeçalho e pelo menos um cliente."],
    };
  const headers = grid.shift()!.map((s) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, ""),
  );
  const aliases: Record<string, keyof Customer> = {
    nome: "name",
    empresa: "name",
    comercio: "name",
    contato: "contact",
    telefone: "phone",
    whatsapp: "phone",
    segmento: "segment",
    bairro: "neighborhood",
    cidade: "city",
    observacoes: "notes",
  };
  if (!headers.some((h) => aliases[h] === "name"))
    return {
      rows: [],
      errors: ["O cabeçalho precisa ter uma coluna nome ou empresa."],
    };
  const rows: Partial<Customer>[] = [],
    errors: string[] = [];
  if (grid.length > 500)
    return { rows: [], errors: ["Importe até 500 clientes por arquivo."] };
  grid.forEach((cells, index) => {
    const item: Record<string, string> = {};
    headers.forEach((header, i) => {
      if (aliases[header]) item[aliases[header]] = cells[i] || "";
    });
    const digits = (item.phone || "").replace(/\D/g, "");
    if (!item.name?.trim()) errors.push(`Linha ${index + 2}: informe o nome.`);
    else if (
      digits &&
      !(
        [10, 11].includes(digits.length) ||
        ([12, 13].includes(digits.length) && digits.startsWith("55"))
      )
    )
      errors.push(`Linha ${index + 2}: telefone com DDD inválido.`);
    else rows.push(item as Partial<Customer>);
  });
  return { rows, errors };
}
export function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
