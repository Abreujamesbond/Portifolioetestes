export type Stage =
  "new" | "contacted" | "interested" | "proposal" | "won" | "lost";
export type Page =
  | "dashboard"
  | "pipeline"
  | "customers"
  | "tasks"
  | "messages"
  | "orders"
  | "settings";
export interface Customer {
  id: string;
  name: string;
  contact: string;
  phone: string;
  segment: string;
  neighborhood: string;
  city: string;
  source: string;
  notes: string;
  stage: Stage;
  consent: boolean;
  doNotContact: boolean;
  archived: boolean;
  demo: boolean;
  createdAt: string;
  lastContactAt: string | null;
  history: { stage: Stage; at: string }[];
}
export interface Task {
  id: string;
  title: string;
  customerId: string;
  dueDate: string;
  kind: "contact" | "delivery" | "general";
  done: boolean;
  orderId?: string;
}
export interface Product {
  id: string;
  name: string;
  priceCents: number;
  minimum: number;
}
export interface Lot {
  id: string;
  productId: string;
  quantity: number;
  remaining: number;
  unitCostCents: number;
  date: string;
  notes: string;
}
export interface Order {
  id: string;
  number: number;
  customerId: string;
  customerName: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    unitPriceCents: number;
    totalCostCents: number;
  }[];
  totalCents: number;
  costCents: number;
  discountCents: number;
  status: "pending" | "paid" | "delivered" | "cancelled";
  createdAt: string;
  paidAt: string | null;
  deliveryDate: string;
  notes: string;
}
export interface Template {
  id: string;
  title: string;
  category: string;
  body: string;
}
export interface State {
  settings: { name: string; business: string; city: string; dailyGoal: number };
  customers: Customer[];
  tasks: Task[];
  products: Product[];
  lots: Lot[];
  orders: Order[];
  expenses: { id: string; title: string; amountCents: number; date: string }[];
  templates: Template[];
  activity: {
    id: string;
    title: string;
    detail: string;
    customerId: string;
    createdAt: string;
  }[];
  demo: boolean;
}
export type ModalSpec = {
  type:
    | "customer"
    | "task"
    | "order"
    | "lot"
    | "expense"
    | "product"
    | "template"
    | "import";
  customer?: Customer;
  task?: Task;
  product?: Product;
  template?: Template;
} | null;
