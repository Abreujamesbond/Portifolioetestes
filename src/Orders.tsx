import { useState } from "react";
import {
  ArrowDownLeft,
  ArrowRight,
  Banknote,
  Box,
  CircleDollarSign,
  Package,
  Pencil,
  Plus,
  Receipt,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { Empty, PageHeading, PanelTitle, Stat } from "./components";
import { dateKey, money, prettyDate } from "./lib";
import { useStore } from "./store";
export default function Orders() {
  const { state, open, mutate, toast } = useStore();
  const [tab, setTab] = useState("orders"),
    [period, setPeriod] = useState("month");
  const currentDay = dateKey();
  const inPeriod = (value: string) => {
    const day = value.length === 10 ? value : dateKey(new Date(value));
    return (
      period === "all" ||
      (period === "month"
        ? day.startsWith(currentDay.slice(0, 7))
        : day >= dateKey(new Date(Date.now() - 29 * 86400000)) &&
          day <= currentDay)
    );
  };
  const orders = state.orders.filter((o) => inPeriod(o.createdAt));
  const receivedOrders = state.orders.filter(
    (o) => o.paidAt && o.status !== "cancelled" && inPeriod(o.paidAt),
  );
  const revenue = receivedOrders.reduce((s, o) => s + o.totalCents, 0),
    cost = receivedOrders.reduce((s, o) => s + o.costCents, 0);
  const expenses = state.expenses.filter((e) => inPeriod(e.date));
  const margin =
    revenue - cost - expenses.reduce((s, e) => s + e.amountCents, 0);
  const pending = state.orders
    .filter((o) => o.status === "pending")
    .reduce((s, o) => s + o.totalCents, 0);
  const stock = state.lots.reduce((s, l) => s + l.remaining, 0);
  const statusLabels = {
    pending: "A receber",
    paid: "Pago",
    delivered: "Entregue",
    cancelled: "Cancelado",
  };
  async function change(orderId: string, status: string) {
    try {
      await mutate(
        `/orders/${orderId}`,
        "PATCH",
        { status },
        "Pedido atualizado.",
      );
    } catch (e) {
      toast((e as Error).message);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="DA CONVERSA AO RESULTADO"
        title="Pedidos & estoque"
        subtitle="Acompanhe o que entrou, o que saiu e o que está a caminho."
      >
        <button
          className="button secondary"
          onClick={() => open({ type: "lot" })}
        >
          <Package size={16} />
          Entrada de estoque
        </button>
        <button
          className="button primary"
          onClick={() => open({ type: "order" })}
        >
          <Plus size={17} />
          Novo pedido
        </button>
      </PageHeading>
      <div className="period-control">
        <span>Visão financeira</span>
        <select
          aria-label="Período financeiro"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          <option value="month">Este mês</option>
          <option value="30">Últimos 30 dias</option>
          <option value="all">Todo o período</option>
        </select>
      </div>
      <div className="stat-grid">
        <Stat
          label="Recebimentos"
          value={money(revenue)}
          detail={`${receivedOrders.length} pedidos pagos no período`}
          icon={CircleDollarSign}
          tone="stat-green"
        >
          <ArrowDownLeft size={13} />
        </Stat>
        <Stat
          label="Resultado do período"
          value={money(margin)}
          detail="recebido − custo das placas − despesas"
          icon={Banknote}
        />
        <Stat
          label="A receber"
          value={money(pending)}
          detail="todos os pedidos aguardando pagamento"
          icon={Receipt}
        />
        <Stat
          label="Placas disponíveis"
          value={stock}
          detail="estoque livre para novos pedidos"
          icon={Box}
        />
      </div>
      <div className="tabs" role="tablist" aria-label="Área de pedidos">
        {[
          ["orders", "Pedidos"],
          ["stock", "Estoque e produtos"],
          ["expenses", "Despesas"],
        ].map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            className={tab === key ? "active" : ""}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "orders" && (
        <section className="panel">
          {orders.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>PEDIDO / CLIENTE</th>
                    <th>PRODUTOS</th>
                    <th>VALOR</th>
                    <th>SITUAÇÃO</th>
                    <th>ENTREGA</th>
                    <th>PRÓXIMA AÇÃO</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <span className="cell-stack">
                          <strong>
                            #{o.number} · {o.customerName}
                          </strong>
                          <small>{prettyDate(o.createdAt)}</small>
                        </span>
                      </td>
                      <td>
                        <span className="cell-stack">
                          {o.items.map((item, i) => (
                            <small key={i}>
                              {item.quantity}× {item.productName}
                            </small>
                          ))}
                        </span>
                      </td>
                      <td>
                        <b>{money(o.totalCents)}</b>
                      </td>
                      <td>
                        <span className={"badge order-" + o.status}>
                          <i />
                          {statusLabels[o.status]}
                        </span>
                      </td>
                      <td>
                        {o.deliveryDate
                          ? prettyDate(o.deliveryDate)
                          : "A combinar"}
                      </td>
                      <td>
                        <div className="row-actions">
                          {o.status === "pending" && (
                            <>
                              <button
                                className="button secondary small-button"
                                onClick={() => void change(o.id, "paid")}
                              >
                                Confirmar pagamento
                              </button>
                              <button
                                className="text-button muted"
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      "Cancelar este pedido e devolver as unidades ao estoque?",
                                    )
                                  )
                                    void change(o.id, "cancelled");
                                }}
                              >
                                Cancelar
                              </button>
                            </>
                          )}
                          {o.status === "paid" && (
                            <button
                              className="button secondary small-button"
                              onClick={() => void change(o.id, "delivered")}
                            >
                              <Truck size={14} />
                              Marcar entregue
                            </button>
                          )}
                          {o.status === "delivered" && (
                            <span className="muted">Concluído</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              icon={ShoppingBag}
              title="Seu próximo fechamento aparece aqui"
              text="Cadastre um cliente e dê entrada nas placas para registrar seu primeiro pedido."
              action="Registrar pedido"
              onClick={() => open({ type: "order" })}
            />
          )}
        </section>
      )}
      {tab === "stock" && (
        <>
          <div className="section-toolbar">
            <h2>Seus produtos</h2>
            <button
              className="button secondary"
              onClick={() => open({ type: "product" })}
            >
              <Plus size={16} />
              Novo produto
            </button>
          </div>
          <div className="product-grid">
            {state.products.map((p) => {
              const quantity = state.lots
                .filter((l) => l.productId === p.id)
                .reduce((s, l) => s + l.remaining, 0);
              return (
                <article className="panel product-card" key={p.id}>
                  <div className="product-top">
                    <span className="product-icon">
                      <Package size={27} strokeWidth={1.4} />
                    </span>
                    <button
                      className="icon-button"
                      aria-label={`Editar ${p.name}`}
                      onClick={() => open({ type: "product", product: p })}
                    >
                      <Pencil size={16} />
                    </button>
                  </div>
                  <h3>{p.name}</h3>
                  <p>
                    Preço de venda <b>{money(p.priceCents)}</b>
                  </p>
                  <div className="product-stock">
                    <strong>
                      {quantity}
                      <small> disponíveis</small>
                    </strong>
                    <span
                      className={
                        "badge " +
                        (quantity <= p.minimum ? "warning" : "order-paid")
                      }
                    >
                      {quantity <= p.minimum
                        ? "Hora de repor"
                        : "Estoque em dia"}
                    </span>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => open({ type: "lot", product: p })}
                  >
                    Adicionar unidades
                    <ArrowRight size={16} />
                  </button>
                </article>
              );
            })}
          </div>
          <section className="panel">
            <PanelTitle
              title="Entradas de estoque"
              subtitle="Cada lote guarda seu custo de compra."
            />
            {state.lots.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>DATA</th>
                      <th>PRODUTO</th>
                      <th>ENTRADA</th>
                      <th>RESTANTE</th>
                      <th>CUSTO UNITÁRIO</th>
                      <th>OBSERVAÇÕES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...state.lots].reverse().map((l) => (
                      <tr key={l.id}>
                        <td>{prettyDate(l.date)}</td>
                        <td>
                          {
                            state.products.find((p) => p.id === l.productId)
                              ?.name
                          }
                        </td>
                        <td>{l.quantity}</td>
                        <td>{l.remaining}</td>
                        <td>{money(l.unitCostCents)}</td>
                        <td>{l.notes || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty
                icon={Package}
                title="Pronto para receber suas placas"
                text="Registre quantidades e custos para acompanhar suas vendas."
                action="Adicionar estoque"
                onClick={() => open({ type: "lot" })}
              />
            )}
          </section>
        </>
      )}
      {tab === "expenses" && (
        <section className="panel">
          <PanelTitle
            title="Despesas do negócio"
            subtitle="Embalagens, anúncios, taxas e outros custos."
            action="Registrar despesa"
            onAction={() => open({ type: "expense" })}
          />
          {expenses.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>DATA</th>
                    <th>DESCRIÇÃO</th>
                    <th>VALOR</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e) => (
                    <tr key={e.id}>
                      <td>{prettyDate(e.date)}</td>
                      <td>{e.title}</td>
                      <td>{money(e.amountCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              icon={Receipt}
              title="Nenhuma despesa neste período"
              text="Registre os custos extras para acompanhar seu resultado."
              action="Registrar despesa"
              onClick={() => open({ type: "expense" })}
            />
          )}
        </section>
      )}
    </>
  );
}
