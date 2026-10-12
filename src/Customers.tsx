import { useEffect, useState } from "react";
import {
  Archive,
  ArrowRight,
  CalendarPlus,
  Check,
  Download,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Search,
  ShieldOff,
  Users,
  X,
} from "lucide-react";
import { Avatar, Empty, Modal, PageHeading, StageBadge } from "./components";
import { prettyDate, stages } from "./lib";
import { useStore } from "./store";
import type { Customer, Stage } from "./types";

export default function Customers({
  pipeline = false,
}: {
  pipeline?: boolean;
}) {
  const { state, open, selectedCustomer, mutate, toast } = useStore();
  const [search, setSearch] = useState(""),
    [stage, setStage] = useState("all"),
    [segment, setSegment] = useState("all"),
    [detail, setDetail] = useState(selectedCustomer),
    [archived, setArchived] = useState(false);
  useEffect(() => {
    if (selectedCustomer) setDetail(selectedCustomer);
  }, [selectedCustomer]);
  const visible = state.customers.filter(
    (c) =>
      c.archived === archived &&
      (stage === "all" || c.stage === stage) &&
      (segment === "all" || c.segment === segment) &&
      [c.name, c.contact, c.phone, c.city, c.neighborhood]
        .join(" ")
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase()),
  );
  async function change(id: string, value: Stage) {
    try {
      await mutate(
        `/customers/${id}`,
        "PATCH",
        { stage: value },
        "Etapa atualizada.",
      );
    } catch (e) {
      toast((e as Error).message);
    }
  }
  const selected = state.customers.find((c) => c.id === detail);
  return (
    <>
      <PageHeading
        eyebrow="RELACIONAMENTOS QUE CRESCEM"
        title={pipeline ? "Seu funil de vendas" : "Cada cliente, uma conexão"}
        subtitle={
          pipeline
            ? "Visualize as oportunidades e dê o próximo passo em cada conversa."
            : "Todas as informações para uma abordagem mais pessoal."
        }
      >
        <button
          className="button secondary"
          onClick={() => open({ type: "import" })}
        >
          <Download size={16} />
          Importar lista
        </button>
        <button
          className="button primary"
          onClick={() => open({ type: "customer" })}
        >
          <Plus size={17} />
          Novo cliente
        </button>
      </PageHeading>
      <div className="filter-bar">
        <label className="search-input">
          <Search size={17} />
          <input
            aria-label="Buscar clientes"
            placeholder="Buscar negócio, contato ou cidade…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button aria-label="Limpar busca" onClick={() => setSearch("")}>
              <X size={15} />
            </button>
          )}
        </label>
        <select
          aria-label="Filtrar segmento"
          value={segment}
          onChange={(e) => setSegment(e.target.value)}
        >
          <option value="all">Todos os segmentos</option>
          {[
            ...new Set(state.customers.map((c) => c.segment).filter(Boolean)),
          ].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        {!pipeline && (
          <select
            aria-label="Filtrar etapa"
            value={stage}
            onChange={(e) => setStage(e.target.value)}
          >
            <option value="all">Todas as etapas</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        )}
        <button
          className={"button " + (archived ? "soft" : "secondary")}
          onClick={() => setArchived(!archived)}
        >
          <Archive size={15} />
          {archived ? "Ver ativos" : "Arquivados"}
        </button>
      </div>
      <div className="list-summary">
        <span>
          <b>{visible.length}</b>{" "}
          {visible.length === 1 ? "cliente" : "clientes"}
          {archived ? " arquivados" : " na sua lista"}
        </span>
        {pipeline && (
          <span className="desktop-hint">
            Arraste os cartões ou use o seletor de etapa.
          </span>
        )}
      </div>
      {pipeline ? (
        <div className="kanban">
          {stages.map((column) => (
            <section
              className={`kanban-column column-${column.id}`}
              key={column.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const customerId = e.dataTransfer.getData("text/plain");
                if (state.customers.some((c) => c.id === customerId))
                  void change(customerId, column.id);
              }}
            >
              <div className="kanban-heading">
                <span>
                  <i style={{ background: column.color }} />
                  {column.short}
                </span>
                <b>{visible.filter((c) => c.stage === column.id).length}</b>
              </div>
              <div className="kanban-cards">
                {visible
                  .filter((c) => c.stage === column.id)
                  .map((c) => (
                    <article
                      className="kanban-card"
                      key={c.id}
                      draggable
                      onDragStart={(e) =>
                        e.dataTransfer.setData("text/plain", c.id)
                      }
                    >
                      <button
                        className="card-main"
                        onClick={() => setDetail(c.id)}
                      >
                        <div className="kanban-avatar">
                          <Avatar name={c.name} small />
                          {c.demo && <span className="demo-tag">Exemplo</span>}
                          {c.doNotContact && <ShieldOff size={15} />}
                        </div>
                        <h3>{c.name}</h3>
                        <p>{c.segment || "Segmento a definir"}</p>
                        <span className="location">
                          <MapPin size={12} />
                          {[c.neighborhood, c.city]
                            .filter(Boolean)
                            .join(", ") || "Local a definir"}
                        </span>
                      </button>
                      <div className="kanban-card-footer">
                        <span>{c.contact || "Sem contato"}</span>
                        <button
                          className="icon-button"
                          aria-label={`Ver detalhes de ${c.name}`}
                          onClick={() => setDetail(c.id)}
                        >
                          <ArrowRight size={14} />
                        </button>
                      </div>
                      <select
                        aria-label={`Etapa de ${c.name}`}
                        value={c.stage}
                        onChange={(e) =>
                          void change(c.id, e.target.value as Stage)
                        }
                      >
                        {stages.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </article>
                  ))}
                {!visible.some((c) => c.stage === column.id) && (
                  <div className="kanban-empty">
                    Espaço para uma
                    <br />
                    nova oportunidade.
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <section className="panel">
          {visible.length ? (
            <div className="table-wrap">
              <table className="customers-table">
                <thead>
                  <tr>
                    <th>NEGÓCIO</th>
                    <th>CONTATO</th>
                    <th>ETAPA</th>
                    <th>ORIGEM</th>
                    <th>ÚLTIMO CONTATO</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <button
                          className="customer-cell"
                          onClick={() => setDetail(c.id)}
                        >
                          <Avatar name={c.name} />
                          <span>
                            <strong>
                              {c.name}
                              {c.demo && (
                                <span className="demo-tag">Exemplo</span>
                              )}
                            </strong>
                            <small>
                              {c.segment || "Sem segmento"} ·{" "}
                              {c.city || "Cidade a definir"}
                            </small>
                          </span>
                        </button>
                      </td>
                      <td>
                        <span className="cell-stack">
                          {c.contact || "—"}
                          <small>{c.phone || "Telefone a cadastrar"}</small>
                        </span>
                      </td>
                      <td>
                        {c.doNotContact ? (
                          <span className="badge blocked">
                            <ShieldOff size={12} />
                            Não contatar
                          </span>
                        ) : (
                          <StageBadge stage={c.stage} />
                        )}
                      </td>
                      <td>{c.source}</td>
                      <td>
                        {c.lastContactAt ? (
                          prettyDate(c.lastContactAt)
                        ) : (
                          <span className="muted">Ainda não registrado</span>
                        )}
                      </td>
                      <td>
                        <button
                          className="icon-button"
                          aria-label={`Abrir ${c.name}`}
                          onClick={() => setDetail(c.id)}
                        >
                          <ArrowRight size={17} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              icon={Users}
              title={
                search || stage !== "all"
                  ? "Nenhum cliente encontrado"
                  : archived
                    ? "Nenhum cliente arquivado"
                    : "Seu primeiro cliente está por vir"
              }
              text={
                search
                  ? "Tente outro nome ou ajuste os filtros."
                  : "Cadastre um negócio ou importe sua lista para começar."
              }
              action={!search && !archived ? "Adicionar cliente" : undefined}
              onClick={() => open({ type: "customer" })}
            />
          )}
        </section>
      )}
      {selected && (
        <CustomerDetail customer={selected} close={() => setDetail("")} />
      )}
    </>
  );
}
function CustomerDetail({
  customer: c,
  close,
}: {
  customer: Customer;
  close: () => void;
}) {
  const { state, open, navigate, mutate, toast } = useStore();
  const tasks = state.tasks.filter((t) => t.customerId === c.id && !t.done);
  const events = state.activity
    .filter((a) => a.customerId === c.id)
    .slice(0, 5);
  async function archive() {
    try {
      await mutate(
        `/customers/${c.id}`,
        "PATCH",
        { archived: !c.archived },
        c.archived ? "Cliente reativado." : "Cliente arquivado.",
      );
      close();
    } catch (e) {
      toast((e as Error).message);
    }
  }
  return (
    <Modal
      title={c.name}
      subtitle={[c.segment, c.neighborhood, c.city].filter(Boolean).join(" · ")}
      onClose={close}
    >
      <div className="customer-detail">
        <div className="detail-top">
          <Avatar name={c.name} />
          <StageBadge stage={c.stage} />
          {c.demo && <span className="demo-tag">Cliente fictício</span>}
        </div>
        <div className="detail-grid">
          <div>
            <small>PESSOA DE CONTATO</small>
            <strong>{c.contact || "Não informada"}</strong>
          </div>
          <div>
            <small>WHATSAPP</small>
            <strong>{c.phone || "Não cadastrado"}</strong>
          </div>
          <div>
            <small>ORIGEM</small>
            <strong>{c.source}</strong>
          </div>
          <div>
            <small>PERMISSÃO DE CONTATO</small>
            <strong>
              {c.doNotContact
                ? "Não contatar"
                : c.consent
                  ? "Autorizado"
                  : "Não registrada"}
            </strong>
          </div>
        </div>
        {c.notes && (
          <div className="detail-note">
            <h3>Anotações</h3>
            <p>{c.notes}</p>
          </div>
        )}
        <div className="detail-actions">
          <button
            className="button primary"
            disabled={c.doNotContact || c.archived}
            onClick={() => {
              close();
              navigate("messages", c.id);
            }}
          >
            <MessageCircle size={16} />
            Preparar mensagem
          </button>
          <button
            className="button secondary"
            onClick={() => {
              close();
              open({ type: "customer", customer: c });
            }}
          >
            <Pencil size={15} />
            Editar
          </button>
          <button
            className="button secondary"
            onClick={() => {
              close();
              open({ type: "task", customer: c });
            }}
          >
            <CalendarPlus size={16} />
            Criar tarefa
          </button>
          <button
            className="button secondary"
            disabled={c.archived}
            onClick={() => {
              close();
              open({ type: "order", customer: c });
            }}
          >
            <Plus size={16} />
            Novo pedido
          </button>
        </div>
        <div className="detail-section">
          <h3>Próximos passos</h3>
          {tasks.length ? (
            tasks.map((t) => (
              <div className="detail-task" key={t.id}>
                <span>{t.title}</span>
                <small>{prettyDate(t.dueDate)}</small>
              </div>
            ))
          ) : (
            <p className="muted">Nenhuma tarefa pendente para esse cliente.</p>
          )}
        </div>
        <div className="detail-section">
          <h3>Histórico recente</h3>
          {events.map((e) => (
            <div className="timeline-item" key={e.id}>
              <span className="timeline-dot" />
              <div>
                <strong>{e.title}</strong>
                <small>
                  {prettyDate(e.createdAt)} ·{" "}
                  {new Date(e.createdAt).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "America/Sao_Paulo",
                  })}
                </small>
              </div>
            </div>
          ))}
        </div>
        <div className="detail-footer">
          <button
            className="text-button"
            disabled={c.doNotContact}
            onClick={() =>
              void mutate(
                `/customers/${c.id}/contact`,
                "POST",
                {},
                "Contato registrado.",
              ).catch((e) => toast(e.message))
            }
          >
            <Phone size={15} />
            Confirmar contato realizado
            <Check size={14} />
          </button>
          <button className="text-button muted" onClick={() => void archive()}>
            <Archive size={15} />
            {c.archived ? "Reativar" : "Arquivar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
