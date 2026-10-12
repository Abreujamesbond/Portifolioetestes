import { initialState } from "../server/domain.mjs";
import { applyAction } from "../server/actions.mjs";
import { ZodError } from "zod";
const key = "conecta-interactive-preview-v1";
let sessionState = initialState("Alex", "Minha marca NFC", true);

function read() {
  try {
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved);
  } catch {
    /* File previews can disable storage. Keep a working in-memory session. */
  }
  return structuredClone(sessionState);
}
function save(state: unknown) {
  sessionState = state as ReturnType<typeof initialState>;
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    /* Session remains usable; export is available. */
  }
}
export async function previewApi(
  path: string,
  method: string,
  body?: unknown,
): Promise<unknown> {
  if (path === "/auth/status")
    return { authenticated: true, setupRequired: false };
  if (path === "/health") return { ok: true, mode: "preview" };
  if (path === "/auth/logout") return { ok: true };
  if (path === "/state") return read();
  if (path === "/export")
    return {
      format: "conecta-preview-v1",
      exportedAt: new Date().toISOString(),
      data: read(),
    };
  if (path === "/preview/reset") {
    save(initialState("Alex", "Minha marca NFC", true));
    return { ok: true };
  }
  const state = read();
  try {
    const result = applyAction(state, path, method, body || {});
    // Every record in this sandbox is a demonstration, including user-created examples.
    state.customers.forEach((customer: { demo: boolean }) => {
      customer.demo = true;
    });
    save(state);
    return structuredClone(result);
  } catch (e) {
    if (e instanceof ZodError)
      throw new Error(e.issues[0]?.message || "Confira os dados.");
    throw e;
  }
}
