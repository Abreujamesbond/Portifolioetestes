import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  MessageCircle,
  Plus,
  Radio,
  Target,
  TrendingUp,
  Users,
  CalendarDays,
} from "lucide-react";
import {
  Avatar,
  Empty,
  PageHeading,
  PanelTitle,
  StageBadge,
  Stat,
} from "./components";
import { dateKey, money, prettyDate, stages, today } from "./lib";
import { useStore } from "./store";

export default function Dashboard() {
  const { state, navigate, open, mutate, toast } = useStore();
  const active = state.customers.filter((c) => !c.archived);
  const prospects = active.filter((c) => !["won", "lost"].includes(c.stage));
  const pendingTasks = state.tasks
    .filter((t) => !t.done && t.dueDate <= today())
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const month = today().slice(0, 7);
  const paid = state.orders.filter(
    (o) =>
      o.paidAt &&
      o.status !== "cancelled" &&
      dateKey(new Date(o.paidAt)).startsWith(month),
  );
  const received = paid.reduce((s, o) => s + o.totalCents, 0);
  const contacts = state.activity.filter(
    (a) =>
      a.title === "Contato registrado" &&
      dateKey(new Date(a.createdAt)) === today(),
  ).length;
  const progress = Math.min(100, (contacts / state.settings.dailyGoal) * 100);
  const proposals = active.filter((c) => c.stage === "proposal");
  const chartDays = Array.from({ length: 14 }, (_, i) => {
    const day = dateKey(new Date(Date.now() - (13 - i) * 86400000));
    const total = state.orders
      .filter(
        (o) =>
          o.paidAt &&
          o.status !== "cancelled" &&
          dateKey(new Date(o.paidAt)) === day,
      )
      .reduce((s, o) => s + o.totalCents, 0);
    return { day, total };
  });
  const chartMax = Math.max(10000, ...chartDays.map((d) => d.total));
  const points = chartDays
    .map((d, i) => `${i * 42 + 10},${136 - (d.total / chartMax) * 105}`)
    .join(" ");
  const firstName = state.settings.name.split(" ")[0];
  return (
    <>
      <PageHeading
        eyebrow="SEU NEGÓCIO, MAIS PERTO"
        title={`Vamos fazer conexões, ${firstName}?`}
        subtitle="Um bom relacionamento é o começo de uma boa venda."
      >
        <button
          className="button primary"
          onClick={() => open({ type: "customer" })}
        >
          <Plus size={17} />
          Novo cliente
        </button>
      </PageHeading>
      <section className="hero-card">
        <div className="hero-copy">
          <span className="hero-label">
            <span className="live-dot" />
            CADA CONVERSA CONTA
          </span>
          <h2>
            Pequenas conexões.
            <br />
            <span>Grandes possibilidades.</span>
          </h2>
          <p>
            {pendingTasks.length
              ? `Você tem ${pendingTasks.length} ${pendingTasks.length === 1 ? "tarefa para dar o próximo passo" : "tarefas para dar os próximos passos"}. Vamos colocar as conversas em movimento?`
              : "Seu próximo cliente pode estar na próxima conversa. Organize seus contatos e encontre a melhor hora de agir."}
          </p>
          <button
            className="button lime"
            onClick={() =>
              navigate(pendingTasks.length ? "tasks" : "customers")
            }
          >
            {pendingTasks.length
              ? "Ver minhas tarefas"
              : "Explorar meus clientes"}
            <ArrowUpRight size={18} />
          </button>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="orbit orbit-three" />
          <span className="floating-dot dot-one" />
          <span className="floating-dot dot-two" />
          <div className="nfc-card">
            <Radio size={26} strokeWidth={1.5} />
            <div className="nfc-symbol">
              <Radio size={66} strokeWidth={1.25} />
            </div>
            <span>
              Uma conexão.
              <br />
              <b>Novas oportunidades.</b>
            </span>
            <div className="nfc-bottom">
              <span>conecta.</span>
              <ArrowUpRight size={19} />
            </div>
          </div>
          <div className="connection-chip">
            <span>
              <Check size={16} />
            </span>
            Feito para aproximar.
          </div>
        </div>
      </section>
      <div className="stat-grid">
        <Stat
          label="Clientes no funil"
          value={prospects.length}
          detail="conexões em andamento"
          icon={Users}
        >
          <span className="tiny-dot" />
        </Stat>
        <Stat
          label="Propostas em aberto"
          value={proposals.length}
          detail="oportunidades para acompanhar"
          icon={MessageCircle}
        />
        <Stat
          label="Recebido neste mês"
          value={money(received)}
          detail={`${paid.length} ${paid.length === 1 ? "pedido pago" : "pedidos pagos"} no período`}
          icon={CircleDollarSign}
          tone="stat-green"
        >
          <ArrowDownLeft size={13} />
        </Stat>
        <Stat
          label="Tarefas para hoje"
          value={pendingTasks.length}
          detail={
            pendingTasks.some((t) => t.dueDate < today())
              ? "inclui tarefas em atraso"
              : "próximos passos da sua agenda"
          }
          icon={CalendarDays}
        />
      </div>
      <div className="dashboard-middle">
        <section className="panel pipeline-summary">
          <PanelTitle
            title="Seu funil, de perto"
            subtitle="Cada etapa aproxima você do fechamento."
            action="Ver funil"
            onAction={() => navigate("pipeline")}
          />
          <div className="funnel-rows">
            {stages.slice(0, 5).map((stage, index) => {
              const count = active.filter((c) => c.stage === stage.id).length;
              return (
                <button
                  key={stage.id}
                  className="funnel-row"
                  onClick={() => navigate("pipeline")}
                >
                  <span className="funnel-label">
                    <i style={{ background: stage.color }} />
                    {stage.short}
                  </span>
                  <span className="funnel-track">
                    <span
                      style={{
                        width: `${active.length ? Math.max(4, (count / active.length) * 100) : 0}%`,
                        background: stage.color,
                        opacity: 0.75 + index * 0.05,
                      }}
                    />
                  </span>
                  <b>{count.toString().padStart(2, "0")}</b>
                </button>
              );
            })}
          </div>
          <div className="panel-footer">
            <TrendingUp size={15} />
            <span>
              {active.filter((c) => c.stage === "won").length} clientes com
              venda fechada
            </span>
            <ArrowRight size={15} />
          </div>
        </section>
        <section className="panel today-panel">
          <PanelTitle
            title="Na sua agenda"
            subtitle={new Date().toLocaleDateString("pt-BR", {
              day: "numeric",
              month: "long",
              timeZone: "America/Sao_Paulo",
            })}
            action="Ver todas"
            onAction={() => navigate("tasks")}
          />
          {pendingTasks.length ? (
            <div className="compact-tasks">
              {pendingTasks.slice(0, 3).map((task) => (
                <div className="task-row" key={task.id}>
                  <button
                    className="task-check"
                    aria-label={`Concluir ${task.title}`}
                    onClick={() =>
                      void mutate(
                        `/tasks/${task.id}`,
                        "PATCH",
                        { done: true },
                        "Tarefa concluída.",
                      ).catch((e) => toast(e.message))
                    }
                  >
                    <Check size={13} />
                  </button>
                  <button
                    className="task-info"
                    onClick={() => open({ type: "task", task })}
                  >
                    <strong>{task.title}</strong>
                    <span>
                      {state.customers.find((c) => c.id === task.customerId)
                        ?.name || "Seu negócio"}
                    </span>
                  </button>
                  <span
                    className={
                      "due " + (task.dueDate < today() ? "overdue" : "")
                    }
                  >
                    {task.dueDate < today() ? "Atrasada" : "Hoje"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              icon={CheckCheck}
              title="Tudo em dia por aqui"
              text="Sua próxima ação pode virar um lembrete."
              action="Criar tarefa"
              onClick={() => open({ type: "task" })}
            />
          )}
          <button
            className="add-task-link"
            onClick={() => open({ type: "task" })}
          >
            <Plus size={16} />
            Adicionar uma tarefa
          </button>
        </section>
      </div>
      <div className="dashboard-bottom">
        <section className="panel">
          <PanelTitle
            title="Conexões para cultivar"
            subtitle="Uma boa conversa começa com atenção aos detalhes."
            action="Ver clientes"
            onAction={() => navigate("customers")}
          />
          {prospects.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>NEGÓCIO</th>
                    <th>ETAPA</th>
                    <th>PRÓXIMO PASSO</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {[...prospects]
                    .sort(
                      (a, b) =>
                        Number(b.stage === "proposal") -
                        Number(a.stage === "proposal"),
                    )
                    .slice(0, 4)
                    .map((customer) => (
                      <tr key={customer.id}>
                        <td>
                          <button
                            className="customer-cell"
                            onClick={() => navigate("customers", customer.id)}
                          >
                            <Avatar name={customer.name} small />
                            <span>
                              <strong>{customer.name}</strong>
                              <small>
                                {customer.segment || "Sem segmento"} ·{" "}
                                {customer.neighborhood ||
                                  customer.city ||
                                  "Local a definir"}
                              </small>
                            </span>
                          </button>
                        </td>
                        <td>
                          <StageBadge stage={customer.stage} />
                        </td>
                        <td>
                          <span className="next-step">
                            {customer.stage === "proposal"
                              ? "Acompanhar proposta"
                              : customer.stage === "interested"
                                ? "Apresentar uma solução"
                                : "Iniciar uma conversa"}
                          </span>
                        </td>
                        <td>
                          <button
                            className="icon-button"
                            aria-label={`Abrir ${customer.name}`}
                            onClick={() => navigate("customers", customer.id)}
                          >
                            <ChevronRight size={17} />
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
              title="Sua próxima conexão começa aqui"
              text="Cadastre seu primeiro cliente para acompanhar cada oportunidade."
              action="Adicionar cliente"
              onClick={() => open({ type: "customer" })}
            />
          )}
        </section>
        <section className="panel revenue-panel">
          <PanelTitle
            title="Conexões que dão resultado"
            subtitle="Recebimentos dos últimos 14 dias"
          />
          <div className="revenue-number">
            {money(chartDays.reduce((sum, d) => sum + d.total, 0))}
            <span>
              <TrendingUp size={14} />
              Seu movimento de vendas
            </span>
          </div>
          <div
            className="revenue-chart"
            role="img"
            aria-label={`Gráfico de recebimentos dos últimos 14 dias, total ${money(chartDays.reduce((sum, d) => sum + d.total, 0))}`}
          >
            <svg viewBox="0 0 570 160">
              <defs>
                <linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#62a889" stopOpacity=".28" />
                  <stop offset="100%" stopColor="#62a889" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[30, 80, 136].map((y) => (
                <line
                  key={y}
                  x1="10"
                  y1={y}
                  x2="556"
                  y2={y}
                  stroke="#e9ede9"
                  strokeDasharray="4 4"
                />
              ))}
              <polygon
                points={`10,150 ${points} 556,150`}
                fill="url(#revenue-fill)"
              />
              <polyline
                points={points}
                fill="none"
                stroke="#398765"
                strokeWidth="3"
                strokeLinejoin="round"
              />
              {chartDays.map((d, i) => (
                <circle
                  key={d.day}
                  cx={i * 42 + 10}
                  cy={136 - (d.total / chartMax) * 105}
                  r={d.total ? 3.5 : 0}
                  fill="#398765"
                >
                  <title>
                    {prettyDate(d.day)}: {money(d.total)}
                  </title>
                </circle>
              ))}
            </svg>
            <div className="chart-labels">
              <span>{prettyDate(chartDays[0].day)}</span>
              <span>Hoje</span>
            </div>
          </div>
          <div className="goal-block">
            <div>
              <span>
                <Target size={15} />
                Sua meta de contatos
              </span>
              <b>
                {contacts}
                <small> / {state.settings.dailyGoal}</small>
              </b>
            </div>
            <div className="goal-track">
              <span style={{ width: `${progress}%` }} />
            </div>
            <p>
              <Clock3 size={12} />
              Um passo de cada vez, todos os dias.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
