import {
  Database,
  Download,
  LogOut,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import { Field, Form, PageHeading, PanelTitle } from "./components";
import { useStore } from "./store";
import { api, download, PREVIEW_MODE, today } from "./lib";
export default function Settings() {
  const { state, mutate, logout, toast } = useStore();
  return (
    <>
      <PageHeading
        eyebrow="COM A SUA IDENTIDADE"
        title="Seu negócio, do seu jeito"
        subtitle="Essas informações ajudam a deixar cada mensagem mais pessoal."
      />
      <div className="settings-grid">
        <section className="panel settings-panel">
          <PanelTitle
            title="Perfil do negócio"
            subtitle="Seus dados e sua meta diária."
          />
          <Form
            submit="Salvar minhas informações"
            onSubmit={(f) =>
              mutate(
                "/settings",
                "PATCH",
                {
                  name: f.get("name"),
                  business: f.get("business"),
                  city: f.get("city"),
                  dailyGoal: Number(f.get("dailyGoal")),
                },
                "Informações atualizadas.",
              )
            }
          >
            <div className="form-grid">
              <Field label="Seu nome *">
                <input
                  name="name"
                  required
                  maxLength={200}
                  defaultValue={state.settings.name}
                />
              </Field>
              <Field label="Nome do seu negócio *">
                <input
                  name="business"
                  required
                  maxLength={200}
                  defaultValue={state.settings.business}
                />
              </Field>
            </div>
            <Field label="Cidade">
              <input
                name="city"
                maxLength={200}
                defaultValue={state.settings.city}
              />
            </Field>
            <Field
              label="Meta diária de contatos"
              hint="Use uma meta que faça sentido para sua rotina."
            >
              <input
                name="dailyGoal"
                type="number"
                min="1"
                max="500"
                step="1"
                required
                defaultValue={state.settings.dailyGoal}
              />
            </Field>
          </Form>
        </section>
        <div>
          <section className="panel settings-info">
            <span className="empty-icon">
              <Database size={23} />
            </span>
            <h2>Seus dados, com você</h2>
            <p>
              {PREVIEW_MODE
                ? "Esta prévia guarda exemplos somente neste navegador, sem conta ou sincronização. Exporte uma cópia dos testes quando precisar."
                : "Clientes, pedidos e tarefas são salvos na sua conta no servidor. Exporte uma cópia dos registros quando precisar."}
            </p>
            {PREVIEW_MODE ? (
              <button
                className="button secondary"
                onClick={() =>
                  void api("/export")
                    .then((data) =>
                      download(
                        `conecta-previa-${today()}.json`,
                        JSON.stringify(data, null, 2),
                        "application/json",
                      ),
                    )
                    .catch((e) => toast(e.message))
                }
              >
                <Download size={16} />
                Exportar meus testes
              </button>
            ) : (
              <a className="button secondary" href="/api/export" download>
                <Download size={16} />
                Exportar meus dados
              </a>
            )}
          </section>
          <section className="panel settings-info">
            <span className="empty-icon">
              <ShieldCheck size={23} />
            </span>
            <h2>Seu espaço de trabalho</h2>
            <p>
              {PREVIEW_MODE
                ? "Experimente o fluxo com dados fictícios. O acesso com senha e os dados compartilhados entre aparelhos dependem da conexão do banco na Vercel."
                : "Esta versão tem uma conta individual. Você controla os contatos e confirma cada envio no WhatsApp."}
            </p>
            <button className="button secondary" onClick={logout}>
              <LogOut size={16} />
              {PREVIEW_MODE ? "Reiniciar prévia" : "Sair da conta"}
            </button>
          </section>
        </div>
      </div>
      {state.demo && !PREVIEW_MODE && (
        <section className="panel demo-settings">
          <Settings2 size={23} />
          <div>
            <h2>Você está explorando com exemplos</h2>
            <p>
              Antes de cadastrar seus clientes, limpe a base de demonstração.
              Essa ação remove todos os clientes fictícios, tarefas, pedidos e
              estoque da demonstração.
            </p>
          </div>
          <button
            className="button secondary"
            onClick={() => {
              if (
                window.confirm(
                  "Limpar todos os registros desta base de demonstração? Clientes fictícios, tarefas, pedidos, despesas e estoque serão removidos. Exporte uma cópia se precisar.",
                )
              )
                void mutate(
                  "/demo/clear",
                  "POST",
                  {},
                  "Tudo pronto para começar com seus clientes.",
                ).catch((e) => toast(e.message));
            }}
          >
            Começar minha base
          </button>
        </section>
      )}
    </>
  );
}
