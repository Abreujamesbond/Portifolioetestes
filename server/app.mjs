import express from "express";
import { randomBytes, scrypt, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import * as domain from "./domain.mjs";
import { applyAction } from "./actions.mjs";
import { createStore } from "./storage.mjs";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let storePromise;
export const getStore = () =>
  (storePromise ||= createStore().catch((error) => {
    storePromise = undefined;
    throw error;
  }));
const app = express();
app.disable("x-powered-by");
if (process.env.TRUST_PROXY === "1" || process.env.VERCEL)
  app.set("trust proxy", 1);
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  );
  if (req.path.startsWith("/api/")) res.setHeader("Cache-Control", "no-store");
  if (!["GET", "HEAD"].includes(req.method)) {
    if (req.get("sec-fetch-site") === "cross-site")
      return res.status(403).json({ error: "Origem não permitida." });
    const origin = req.get("origin");
    if (origin) {
      try {
        if (new URL(origin).host !== req.get("host"))
          return res.status(403).json({ error: "Origem não permitida." });
      } catch {
        return res.status(403).json({ error: "Origem inválida." });
      }
    }
    if (!req.is("application/json"))
      return res.status(415).json({ error: "Envie os dados como JSON." });
  }
  next();
});
app.use(express.json({ limit: "2mb" }));
const sha = (value) => createHash("sha256").update(value).digest("hex");
const cookieToken = (req) =>
  (req.headers.cookie || "")
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith("conecta_session="))
    ?.slice(16);
async function authenticated(req) {
  const token = cookieToken(req);
  return token ? (await getStore()).hasSession(sha(token), Date.now()) : false;
}
async function session(req, res) {
  const token = randomBytes(32).toString("hex");
  await (await getStore()).addSession(sha(token), Date.now() + 14 * 86400000);
  res.cookie("conecta_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: Boolean(process.env.VERCEL) || req.secure,
    maxAge: 14 * 86400000,
    path: "/",
  });
}
const authSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(200)
    .transform((s) => s.toLowerCase()),
  password: z
    .string()
    .min(10, "Use uma senha com pelo menos 10 caracteres.")
    .max(200),
});
const attempts = new Map();
function rateLimit(req, res, next) {
  const now = Date.now();
  for (const [key, value] of attempts)
    if (now - value.since > 15 * 60000) attempts.delete(key);
  const key = req.ip;
  const entry = attempts.get(key) || { count: 0, since: now };
  entry.count++;
  attempts.set(key, entry);
  if (entry.count > 15)
    return res
      .status(429)
      .json({
        error: "Muitas tentativas. Aguarde 15 minutos e tente novamente.",
      });
  next();
}
app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.get("/api/auth/status", async (req, res) =>
  res.json({
    authenticated: await authenticated(req),
    setupRequired: !(await (await getStore()).hasOwner()),
    setupKeyRequired: Boolean(process.env.SETUP_TOKEN || process.env.VERCEL),
  }),
);
app.post("/api/auth/setup", rateLimit, async (req, res) => {
  const store = await getStore();
  if (await store.hasOwner())
    throw new domain.AppError(
      "O acesso já foi criado. Entre com seu e-mail e senha.",
      409,
    );
  if (process.env.VERCEL && !process.env.SETUP_TOKEN)
    throw new domain.AppError(
      "Configure a chave SETUP_TOKEN na Vercel antes de criar o acesso.",
      503,
    );
  if (
    process.env.SETUP_TOKEN &&
    !timingSafeEqual(
      Buffer.from(sha(String(req.body.setupKey || ""))),
      Buffer.from(sha(process.env.SETUP_TOKEN)),
    )
  )
    throw new domain.AppError("Chave de configuração incorreta.", 403);
  const parsed = authSchema
    .extend({
      name: z.string().trim().min(1).max(100),
      business: z.string().trim().min(1).max(100),
      demo: z.boolean().default(false),
    })
    .parse(req.body);
  const salt = randomBytes(16).toString("hex");
  const hash = (await promisify(scrypt)(parsed.password, salt, 64)).toString(
    "hex",
  );
  await store.createOwner(
    { email: parsed.email, salt, hash },
    domain.initialState(parsed.name, parsed.business, parsed.demo),
  );
  await session(req, res);
  res.json({ ok: true });
});
app.post("/api/auth/login", rateLimit, async (req, res) => {
  const parsed = authSchema.parse(req.body);
  const user = await (await getStore()).findUser(parsed.email);
  const hash = await promisify(scrypt)(
    parsed.password,
    user?.salt || "no-existing-user",
    64,
  );
  if (!user || !timingSafeEqual(hash, Buffer.from(user.hash, "hex")))
    throw new domain.AppError("E-mail ou senha incorretos.", 401);
  attempts.delete(req.ip);
  await session(req, res);
  res.json({ ok: true });
});
app.use("/api", async (req, res, next) => {
  if (!(await authenticated(req)))
    return res
      .status(401)
      .json({ error: "Entre na sua conta para continuar." });
  next();
});
app.post("/api/auth/logout", async (req, res) => {
  const token = cookieToken(req);
  if (token) await (await getStore()).deleteSession(sha(token));
  res.clearCookie("conecta_session", { path: "/" });
  res.json({ ok: true });
});
app.get("/api/state", async (_req, res) =>
  res.json(await (await getStore()).read()),
);
app.get("/api/export", async (_req, res) => {
  res.attachment(`conecta-${domain.day()}.json`);
  res.json({
    format: "conecta-v1",
    exportedAt: new Date().toISOString(),
    data: await (await getStore()).read(),
  });
});
app.use("/api", async (req, res) => {
  const result = await (
    await getStore()
  ).mutate((state) => applyAction(state, req.path, req.method, req.body));
  const created =
    req.method === "POST" &&
    [
      "customers",
      "tasks",
      "products",
      "lots",
      "orders",
      "expenses",
      "templates",
    ].some((name) => req.path === "/" + name);
  res.status(created ? 201 : 200).json(result);
});
if (!process.env.VERCEL) {
  app.use(express.static(resolve(root, "dist")));
  app.get("/{*path}", (_req, res) => {
    const index = resolve(root, "dist/index.html");
    if (existsSync(index)) res.sendFile(index);
    else
      res
        .status(503)
        .type("text")
        .send("Execute npm run build ou use npm run dev.");
  });
}
app.use((err, _req, res, _next) => {
  if (err instanceof z.ZodError)
    return res
      .status(400)
      .json({
        error: err.issues[0]?.message || "Confira os dados informados.",
      });
  if (err instanceof domain.AppError)
    return res.status(err.status).json({ error: err.message });
  if (err.type === "entity.parse.failed")
    return res.status(400).json({ error: "Dados inválidos." });
  if (err.type === "entity.too.large")
    return res
      .status(413)
      .json({ error: "Arquivo muito grande. O limite é 2 MB." });
  console.error("Request failed:", err.name);
  res
    .status(500)
    .json({ error: "Não foi possível concluir. Tente novamente." });
});
export default app;
