import { createContext, useContext } from "react";
import type { ModalSpec, Page, State } from "./types";
export interface Store {
  state: State;
  page: Page;
  navigate: (page: Page, customerId?: string) => void;
  selectedCustomer: string;
  open: (spec: ModalSpec) => void;
  mutate: <T = unknown>(
    path: string,
    method: string,
    body?: unknown,
    success?: string,
  ) => Promise<T>;
  toast: (message: string) => void;
  logout: () => void;
}
export const StoreContext = createContext<Store | null>(null);
export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error("Contexto indisponível");
  return context;
}
