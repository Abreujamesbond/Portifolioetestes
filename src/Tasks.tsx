import { useState } from "react";
import {
  CalendarDays,
  Check,
  CheckCheck,
  ChevronRight,
  Plus,
  Trash2,
} from "lucide-react";
import { Avatar, Empty, PageHeading } from "./components";
import { prettyDate, today } from "./lib";
import { useStore } from "./store";
export default function Tasks() {
  const { state, open, mutate, toast } = useStore();
  const [filter, setFilter] = useState("today");
  const tasks = state.tasks
    .filter((t) =>
      filter === "completed"
        ? t.done
        : !t.done &&
          (filter === "all" ||
            (filter === "today" ? t.dueDate <= today() : t.dueDate > today())),
    )
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return (
    <>
      <PageHeading
        eyebrow="UM PASSO DE CADA VEZ"
        title="Sua agenda de conexões"
        subtitle="Lembretes para acompanhar, entregar e manter a conversa viva."
      >
        <button
          className="button primary"
          onClick={() => open({ type: "task" })}
        >
          <Plus size={17} />
          Nova tarefa
        </button>
      </PageHeading>
      <div className="task-overview">
        <div>
          <span className="overview-icon">
            <CalendarDays size={24} />
          </span>
          <div>
            <strong>
              {
                state.tasks.filter((t) => !t.done && t.dueDate <= today())
                  .length
              }
            </strong>
            <span>tarefas para hoje</span>
          </div>
        </div>
        <p>
          Reserve um momento do dia para cuidar dos seus clientes.
          <br />
          <b>Consistência faz a diferença.</b>
        </p>
        <div className="overview-decoration">
          <CheckCheck size={66} strokeWidth={1} />
        </div>
      </div>
      <div className="tabs" role="tablist" aria-label="Filtrar tarefas">
        {[
          ["today", "Hoje e atrasadas"],
          ["upcoming", "Próximas"],
          ["all", "Todas as pendentes"],
          ["completed", "Concluídas"],
        ].map(([key, label]) => (
          <button
            role="tab"
            aria-selected={filter === key}
            key={key}
            className={filter === key ? "active" : ""}
            onClick={() => setFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <section className="panel task-list">
        {tasks.length ? (
          tasks.map((t) => {
            const c = state.customers.find((c) => c.id === t.customerId);
            return (
              <div
                className={"task-row " + (t.done ? "completed" : "")}
                key={t.id}
              >
                <button
                  className={"task-check " + (t.done ? "checked" : "")}
                  aria-label={`${t.done ? "Reabrir" : "Concluir"} ${t.title}`}
                  onClick={() =>
                    void mutate(
                      `/tasks/${t.id}`,
                      "PATCH",
                      { done: !t.done },
                      t.done ? "Tarefa reaberta." : "Mais um passo concluído.",
                    ).catch((e) => toast(e.message))
                  }
                >
                  <Check size={14} />
                </button>
                <button
                  className="task-info"
                  onClick={() => open({ type: "task", task: t })}
                >
                  <strong>{t.title}</strong>
                  <span>
                    {c ? c.name : "Seu negócio"}
                    <i>·</i>
                    {t.kind === "contact"
                      ? "Contato"
                      : t.kind === "delivery"
                        ? "Entrega"
                        : "Geral"}
                  </span>
                </button>
                {c && <Avatar name={c.name} small />}
                <span
                  className={
                    "due " + (!t.done && t.dueDate < today() ? "overdue" : "")
                  }
                >
                  {t.dueDate === today() ? "Hoje" : prettyDate(t.dueDate)}
                </span>
                <button
                  className="icon-button"
                  aria-label={`Editar ${t.title}`}
                  onClick={() => open({ type: "task", task: t })}
                >
                  <ChevronRight size={17} />
                </button>
                <button
                  className="icon-button danger-hover"
                  aria-label={`Excluir ${t.title}`}
                  onClick={() => {
                    if (window.confirm("Excluir esta tarefa?"))
                      void mutate(
                        `/tasks/${t.id}`,
                        "DELETE",
                        {},
                        "Tarefa excluída.",
                      ).catch((e) => toast(e.message));
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            );
          })
        ) : (
          <Empty
            icon={CheckCheck}
            title={
              filter === "completed"
                ? "Cada passo concluído aparece aqui"
                : "Tudo em dia, por aqui"
            }
            text="Crie lembretes para as próximas conversas e entregas."
            action="Criar tarefa"
            onClick={() => open({ type: "task" })}
          />
        )}
      </section>
    </>
  );
}
