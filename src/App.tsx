import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Bell,
  CalendarCheck2,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  LayoutDashboard,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Menu,
  MessageCircle,
  Package,
  PanelsTopLeft,
  Radio,
  Settings2,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { Avatar, Field, Form, Logo } from "./components";
import Dashboard from "./Dashboard";
import Customers from "./Customers";
import Tasks from "./Tasks";
import Messages from "./Messages";
import Orders from "./Orders";
import Settings from "./Settings";
import Editors from "./Editors";
import { api, today, PREVIEW_MODE } from "./lib";
import { StoreContext } from "./store";
import type { ModalSpec, Page, State } from "./types";

const navigation = [
  { id: "dashboard", title: "Visão geral", icon: LayoutDashboard },
  { id: "pipeline", title: "Funil de vendas", icon: PanelsTopLeft },
  { id: "customers", title: "Clientes", icon: Users },
  { id: "tasks", title: "Minha agenda", icon: CalendarCheck2 },
  { id: "messages", title: "Mensagens", icon: MessageCircle },
  { id: "orders", title: "Pedidos & estoque", icon: Package },
] as const;
function pageFromHash(): Page {
  const key = window.location.hash.slice(1);
  return [...navigation.map((n) => n.id), "settings"].includes(key)
    ? (key as Page)
    : "dashboard";
}
export default function App() {
  const [auth, setAuth] = useState<{
      authenticated: boolean;
      setupRequired: boolean;
      setupKeyRequired?: boolean;
    } | null>(null),
    [state, setState] = useState<State | null>(null),
    [error, setError] = useState("");
  const [page, setPage] = useState<Page>(pageFromHash),
    [selectedCustomer, setSelectedCustomer] = useState(""),
    [modal, setModal] = useState<ModalSpec>(null),
    [mobileOpen, setMobileOpen] = useState(false),
    [notification, setNotification] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const close = useCallback(() => setModal(null), []);
  function toast(message: string) {
    setNotification(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setNotification(""), 5000);
  }
  const load = useCallback(async () => {
    setError("");
    try {
      const result = await api<{
        authenticated: boolean;
        setupRequired: boolean;
        setupKeyRequired?: boolean;
      }>("/auth/status");
      setAuth(result);
      if (result.authenticated) setState(await api<State>("/state"));
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    void load();
    const expire = () => {
      setAuth({ authenticated: false, setupRequired: false });
      setState(null);
    };
    window.addEventListener("session-expired", expire);
    const hash = () => setPage(pageFromHash());
    window.addEventListener("hashchange", hash);
    return () => {
      window.removeEventListener("session-expired", expire);
      window.removeEventListener("hashchange", hash);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [load]);
  function navigate(next: Page, customerId = "") {
    setPage(next);
    setSelectedCustomer(customerId);
    setMobileOpen(false);
    window.location.hash = next;
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  async function mutate<T = unknown>(
    path: string,
    method: string,
    body?: unknown,
    success?: string,
  ): Promise<T> {
    const result = await api<T>(path, method, body);
    setState(await api<State>("/state"));
    if (success) toast(success);
    return result;
  }
  async function logout() {
    if (PREVIEW_MODE) {
      if (
        window.confirm("Reiniciar a prévia e remover as alterações de teste?")
      ) {
        await mutate("/preview/reset", "POST", {}, "Prévia reiniciada.");
        navigate("dashboard");
      }
      return;
    }
    try {
      await api("/auth/logout", "POST", {});
      setState(null);
      setAuth({ authenticated: false, setupRequired: false });
      setModal(null);
    } catch (e) {
      toast((e as Error).message);
    }
  }
  if (error)
    return (
      <div className="app-loading">
        <Logo />
        <h2>Não conseguimos conectar agora.</h2>
        <p>{error}</p>
        <button className="button primary" onClick={() => void load()}>
          Tentar novamente
        </button>
      </div>
    );
  if (!auth || (auth.authenticated && !state))
    return (
      <div className="app-loading">
        <Logo />
        <LoaderCircle className="spin" size={24} />
        <p>Preparando suas conexões…</p>
      </div>
    );
  if (!auth.authenticated || !state)
    return (
      <Auth
        setup={auth.setupRequired}
        setupKeyRequired={auth.setupKeyRequired}
        onSuccess={load}
      />
    );
  const tasksToday = state.tasks.filter(
    (t) => !t.done && t.dueDate <= today(),
  ).length;
  const pageTitle =
    page === "settings"
      ? "Configurações"
      : navigation.find((n) => n.id === page)?.title;
  return (
    <StoreContext.Provider
      value={{
        state,
        page,
        navigate,
        selectedCustomer,
        open: setModal,
        mutate,
        toast,
        logout: () => void logout(),
      }}
    >
      <a className="skip-link" href="#main-content">
        Ir para o conteúdo
      </a>
      <div className="app-shell">
        {mobileOpen && (
          <div
            className="sidebar-overlay"
            onClick={() => setMobileOpen(false)}
          />
        )}
        <aside className={"sidebar " + (mobileOpen ? "sidebar-open" : "")}>
          <div className="sidebar-brand">
            <Logo />
            <button
              className="icon-button mobile-only"
              aria-label="Fechar menu"
              onClick={() => setMobileOpen(false)}
            >
              <X size={20} />
            </button>
          </div>
          <button
            className="workspace-switch"
            onClick={() => navigate("settings")}
            aria-label="Configurar meu negócio"
          >
            <span className="workspace-icon">
              <Radio size={18} />
            </span>
            <div>
              <strong>{state.settings.business}</strong>
              <span>Seu espaço de trabalho</span>
            </div>
            <ChevronDown size={15} />
          </button>
          <p className="nav-caption">ESPAÇO DE TRABALHO</p>
          <nav aria-label="Menu principal">
            {navigation.map(({ id, title, icon: Icon }) => (
              <button
                key={id}
                className={"nav-item " + (page === id ? "active" : "")}
                aria-label={title}
                aria-current={page === id ? "page" : undefined}
                onClick={() => navigate(id)}
              >
                <Icon size={19} strokeWidth={1.75} />
                <span>{title}</span>
                {id === "tasks" && tasksToday > 0 && <b>{tasksToday}</b>}
                {page === id && id !== "tasks" && (
                  <span className="nav-active-dot" />
                )}
              </button>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="sidebar-tip">
              <span>
                <Sparkles size={18} />
              </span>
              <h3>Conexões que ficam.</h3>
              <p>
                Uma boa venda começa
                <br />
                com uma boa conversa.
              </p>
              <button onClick={() => navigate("messages")}>
                Prepare sua próxima
                <ArrowRight size={14} />
              </button>
            </div>
            <button
              className={"nav-item " + (page === "settings" ? "active" : "")}
              onClick={() => navigate("settings")}
            >
              <Settings2 size={19} />
              <span>Configurações</span>
            </button>
            <div className="sidebar-profile">
              <Avatar name={state.settings.name} small />
              <button onClick={() => navigate("settings")}>
                <strong>{state.settings.name}</strong>
                <span>Minha conta</span>
              </button>
              <button
                className="icon-button"
                aria-label={PREVIEW_MODE ? "Reiniciar prévia" : "Sair da conta"}
                onClick={() => void logout()}
              >
                <LogOut size={17} />
              </button>
            </div>
          </div>
        </aside>
        <div className="main-shell">
          <header className="topbar">
            <div className="breadcrumb">
              <button
                className="icon-button mobile-only"
                aria-label="Abrir menu"
                onClick={() => setMobileOpen(true)}
              >
                <Menu size={21} />
              </button>
              <span className="breadcrumb-home">Meu espaço</span>
              <ChevronRight size={13} />
              <strong>{pageTitle}</strong>
            </div>
            <div className="topbar-right">
              <span className="topbar-date">
                {new Date().toLocaleDateString("pt-BR", {
                  day: "numeric",
                  month: "long",
                  timeZone: "America/Sao_Paulo",
                })}
              </span>
              <span className="topbar-divider" />
              <button
                className="icon-button notification-bell"
                aria-label={`${tasksToday} tarefas para hoje`}
                onClick={() => navigate("tasks")}
              >
                <Bell size={18} />
                {tasksToday > 0 && <i />}
              </button>
              <button
                className="profile-button"
                aria-label="Minha conta"
                onClick={() => navigate("settings")}
              >
                <Avatar name={state.settings.name} small />
              </button>
            </div>
          </header>
          <main id="main-content" className="main-content">
            {(PREVIEW_MODE || state.demo) && (
              <div className="demo-banner">
                <Sparkles size={14} />
                <span>
                  {PREVIEW_MODE
                    ? "Prévia interativa · alterações ficam apenas neste navegador. Use dados de exemplo."
                    : "Você está explorando com dados fictícios."}
                </span>
                <button onClick={() => navigate("settings")}>
                  {PREVIEW_MODE
                    ? "Sobre esta prévia"
                    : "Começar com meus clientes"}
                  <ArrowRight size={13} />
                </button>
              </div>
            )}
            {page === "dashboard" && <Dashboard />}
            {page === "pipeline" && <Customers key="pipeline" pipeline />}
            {page === "customers" && <Customers key="customers" />}
            {page === "tasks" && <Tasks />}
            {page === "messages" && <Messages />}
            {page === "orders" && <Orders />}
            {page === "settings" && <Settings />}
            <footer className="page-footer">
              <span>Feito para conectar pessoas e negócios.</span>
              <span>
                conecta<span className="logo-dot">.</span>
              </span>
            </footer>
          </main>
        </div>
      </div>
      <nav className="mobile-nav" aria-label="Atalhos do celular">
        {navigation.slice(0, 5).map(({ id, icon: Icon }) => (
          <button
            className={page === id ? "active" : ""}
            key={id}
            onClick={() => navigate(id)}
          >
            <Icon size={20} />
            <span>
              {
                {
                  dashboard: "Início",
                  pipeline: "Funil",
                  customers: "Clientes",
                  tasks: "Agenda",
                  messages: "Mensagens",
                }[
                  id as
                    | "dashboard"
                    | "pipeline"
                    | "customers"
                    | "tasks"
                    | "messages"
                ]
              }
            </span>
          </button>
        ))}
        <button onClick={() => setMobileOpen(true)}>
          <Menu size={20} />
          <span>Mais</span>
        </button>
      </nav>
      {modal && <Editors spec={modal} close={close} />}
      {notification && (
        <div className="toast" role="status">
          <Check size={17} />
          <span>{notification}</span>
          <button aria-label="Fechar aviso" onClick={() => setNotification("")}>
            <X size={15} />
          </button>
        </div>
      )}
    </StoreContext.Provider>
  );
}
function Auth({
  setup,
  setupKeyRequired = false,
  onSuccess,
}: {
  setup: boolean;
  setupKeyRequired?: boolean;
  onSuccess: () => Promise<void>;
}) {
  return (
    <div className="auth-layout">
      <section className="auth-story">
        <Logo />
        <div className="auth-story-main">
          <span className="hero-label">
            <span className="live-dot" />
            FEITO PARA QUEM EMPREENDE
          </span>
          <h1>
            Seu próximo
            <br />
            negócio começa
            <br />
            com uma <em>conexão.</em>
          </h1>
          <p>
            Menos oportunidades esquecidas.
            <br />
            Mais tempo para conversar, vender e crescer.
          </p>
          <div className="auth-feature">
            <span>
              <Users size={20} />
            </span>
            <div>
              <strong>Um lugar para cada cliente</strong>
              <p>Organize contatos e acompanhe suas oportunidades.</p>
            </div>
          </div>
          <div className="auth-feature">
            <span>
              <MessageCircle size={20} />
            </span>
            <div>
              <strong>Conversas com a sua identidade</strong>
              <p>Mensagens personalizadas, no seu ritmo.</p>
            </div>
          </div>
          <div className="auth-feature">
            <span>
              <Package size={20} />
            </span>
            <div>
              <strong>Do primeiro contato à entrega</strong>
              <p>Seus pedidos, estoque e resultados sempre à mão.</p>
            </div>
          </div>
        </div>
        <div className="auth-story-footer">
          <Radio size={21} />
          <span>Tecnologia que aproxima. Vendas que conectam.</span>
        </div>
      </section>
      <section className="auth-form-side">
        <div className="auth-mobile-logo">
          <Logo />
        </div>
        <div className="auth-form-card">
          <span className="auth-icon">
            <LockKeyhole size={22} />
          </span>
          <p className="eyebrow">SEU ESPAÇO NO CONECTA</p>
          <h2>{setup ? "Vamos começar?" : "Bom ter você de volta."}</h2>
          <p>
            {setup
              ? "Crie seu acesso e dê espaço às próximas oportunidades."
              : "Entre para cuidar das suas próximas conexões."}
          </p>
          <Form
            submit={setup ? "Criar meu espaço" : "Entrar no meu espaço"}
            onSubmit={async (f) => {
              await api(setup ? "/auth/setup" : "/auth/login", "POST", {
                email: f.get("email"),
                password: f.get("password"),
                ...(setup
                  ? {
                      name: f.get("name"),
                      business: f.get("business"),
                      demo: f.get("demo") === "on",
                      setupKey: f.get("setupKey") || "",
                    }
                  : {}),
              });
              await onSuccess();
            }}
          >
            {setup && (
              <div className="form-grid">
                <Field label="Seu nome">
                  <input
                    autoComplete="given-name"
                    name="name"
                    required
                    maxLength={100}
                    placeholder="Como podemos te chamar?"
                  />
                </Field>
                <Field label="Seu negócio">
                  <input
                    name="business"
                    autoComplete="organization"
                    required
                    maxLength={100}
                    placeholder="Nome da sua marca"
                  />
                </Field>
              </div>
            )}
            {setup && setupKeyRequired && (
              <Field
                label="Chave de configuração"
                hint="Use a chave privada que você definiu na Vercel. Ela é necessária apenas para criar o primeiro acesso."
              >
                <input
                  name="setupKey"
                  type="password"
                  required
                  autoComplete="off"
                />
              </Field>
            )}
            <Field label="E-mail">
              <input
                name="email"
                type="email"
                autoComplete="username"
                required
                maxLength={200}
                placeholder="voce@exemplo.com"
              />
            </Field>
            <Field
              label="Senha"
              hint={setup ? "Use pelo menos 10 caracteres." : undefined}
            >
              <input
                name="password"
                type="password"
                autoComplete={setup ? "new-password" : "current-password"}
                required
                minLength={10}
                maxLength={200}
                placeholder={setup ? "Crie uma senha segura" : "Sua senha"}
              />
            </Field>
            {setup && (
              <label className="check-label auth-demo">
                <input name="demo" type="checkbox" />
                <span>
                  Quero explorar com clientes e vendas fictícios antes de
                  começar.
                </span>
              </label>
            )}
          </Form>
          <div className="auth-security">
            <ShieldCheck size={15} />
            <span>Um espaço individual, protegido pelo seu acesso.</span>
          </div>
        </div>
        <div className="auth-bottom">
          <CircleHelp size={15} />
          <span>
            {setup
              ? "Você poderá editar suas informações a qualquer momento."
              : "Entre com o acesso criado neste ambiente."}
          </span>
        </div>
      </section>
    </div>
  );
}
