import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  CheckCheck,
  ChevronRight,
  Copy,
  FilePenLine,
  Info,
  MessageCircle,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Avatar, Empty, PageHeading } from "./components";
import { normalizePhone, personalize, PREVIEW_MODE } from "./lib";
import { useStore } from "./store";
export default function Messages() {
  const { state, open, selectedCustomer, mutate, toast } = useStore();
  const [customerId, setCustomerId] = useState(selectedCustomer),
    [templateId, setTemplateId] = useState(state.templates[0]?.id || ""),
    [category, setCategory] = useState("Todos");
  const template = state.templates.find((t) => t.id === templateId);
  const customer = state.customers.find((c) => c.id === customerId);
  const generated = template ? personalize(template.body, customer, state) : "";
  const [body, setBody] = useState(generated);
  useEffect(() => {
    setBody(generated);
  }, [generated]);
  useEffect(() => {
    if (selectedCustomer) setCustomerId(selectedCustomer);
  }, [selectedCustomer]);
  const missing = body.match(/\{[^}]+\}/g) || [];
  const canSend =
    !PREVIEW_MODE &&
    Boolean(
      customer?.phone &&
      customer.consent &&
      !customer.doNotContact &&
      !customer.archived &&
      !missing.length &&
      body.trim(),
    );
  const templates = state.templates.filter(
    (t) => category === "Todos" || t.category === category,
  );
  async function copy() {
    try {
      await navigator.clipboard.writeText(body);
      toast("Mensagem copiada. O status do cliente foi mantido.");
    } catch {
      toast("Não foi possível copiar. Selecione o texto e copie manualmente.");
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="CONVERSAS COM PROPÓSITO"
        title="As palavras certas, do seu jeito"
        subtitle="Prepare, personalize e revise antes de iniciar uma conversa."
      >
        <button
          className="button primary"
          onClick={() => open({ type: "template" })}
        >
          <Plus size={17} />
          Novo modelo
        </button>
      </PageHeading>
      <div className="messages-layout">
        <aside className="panel template-library">
          <div className="library-title">
            <FilePenLine size={18} />
            <h2>Seus modelos</h2>
            <span>{state.templates.length}</span>
          </div>
          <select
            aria-label="Categoria dos modelos"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {["Todos", ...new Set(state.templates.map((t) => t.category))].map(
              (c) => (
                <option key={c}>{c}</option>
              ),
            )}
          </select>
          <div className="template-list">
            {templates.map((t) => (
              <button
                key={t.id}
                className={
                  "template-card " + (t.id === templateId ? "selected" : "")
                }
                onClick={() => setTemplateId(t.id)}
              >
                <span>{t.category}</span>
                <strong>{t.title}</strong>
                <p>{t.body.slice(0, 85)}…</p>
                <ChevronRight size={16} />
              </button>
            ))}
          </div>
        </aside>
        <section className="panel message-editor">
          {template ? (
            <>
              <div className="message-title">
                <div>
                  <span className="eyebrow">{template.category}</span>
                  <h2>{template.title}</h2>
                </div>
                <button
                  className="icon-button"
                  aria-label="Editar modelo"
                  onClick={() => open({ type: "template", template })}
                >
                  <Pencil size={17} />
                </button>
                <button
                  className="icon-button danger-hover"
                  aria-label="Excluir modelo"
                  onClick={() => {
                    if (window.confirm("Excluir este modelo de mensagem?"))
                      void mutate(
                        `/templates/${template.id}`,
                        "DELETE",
                        {},
                        "Modelo excluído.",
                      )
                        .then(() =>
                          setTemplateId(
                            state.templates.find((t) => t.id !== template.id)
                              ?.id || "",
                          ),
                        )
                        .catch((e) => toast(e.message));
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <label className="field">
                <span>Para quem vamos escrever?</span>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                >
                  <option value="">Escolha um cliente</option>
                  {state.customers
                    .filter((c) => !c.archived)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="field">
                <span>Seu toque pessoal</span>
                <textarea
                  aria-label="Texto da mensagem"
                  className="message-textarea"
                  value={body}
                  maxLength={5000}
                  onChange={(e) => setBody(e.target.value)}
                />
              </label>
              <div className="message-meta">
                <span>{body.length} caracteres</span>
                <button
                  className="text-button"
                  onClick={() => setBody(generated)}
                >
                  Restaurar modelo
                </button>
              </div>
              {missing.length > 0 && (
                <p className="info-note warning">
                  <Info size={16} />
                  Preencha os campos: {[...new Set(missing)].join(", ")}.
                </p>
              )}
              <div className="message-actions">
                <button
                  className="button secondary"
                  disabled={!body.trim()}
                  onClick={() => void copy()}
                >
                  <Copy size={16} />
                  Copiar texto
                </button>
                <button
                  className="button primary"
                  disabled={!canSend}
                  onClick={() => {
                    if (canSend && customer)
                      window.open(
                        `https://wa.me/${normalizePhone(customer.phone)}?text=${encodeURIComponent(body)}`,
                        "_blank",
                        "noopener,noreferrer",
                      );
                  }}
                >
                  <MessageCircle size={17} />
                  Abrir no WhatsApp
                  <ArrowUpRight size={15} />
                </button>
              </div>
              {PREVIEW_MODE && (
                <p className="info-note">
                  Prévia: você pode editar e copiar o texto. Abrir uma conversa
                  fica disponível na versão conectada à sua conta.
                </p>
              )}
              {customer && !canSend && !PREVIEW_MODE && (
                <p className="muted small-text">
                  {customer.doNotContact
                    ? "Esse cliente pediu para não receber contato."
                    : !customer.phone
                      ? "Cadastre o telefone do cliente para abrir a conversa."
                      : !customer.consent
                        ? "Registre no cadastro a autorização do cliente para receber mensagens."
                        : "Complete a mensagem antes de continuar."}{" "}
                  <button
                    className="inline-link"
                    onClick={() => open({ type: "customer", customer })}
                  >
                    Editar cadastro
                  </button>
                </p>
              )}
              <div className="manual-confirm">
                <CheckCheck size={20} />
                <div>
                  <strong>Já conversou com esse cliente?</strong>
                  <p>Registre o contato depois de realizá-lo.</p>
                </div>
                <button
                  className="button secondary small-button"
                  disabled={!customer || customer.doNotContact}
                  onClick={() =>
                    customer &&
                    void mutate(
                      `/customers/${customer.id}/contact`,
                      "POST",
                      {},
                      "Contato registrado.",
                    ).catch((e) => toast(e.message))
                  }
                >
                  Confirmar contato
                </button>
              </div>
            </>
          ) : (
            <Empty
              icon={MessageCircle}
              title="Uma mensagem com a sua voz"
              text="Escolha ou crie um modelo para começar."
              action="Criar modelo"
              onClick={() => open({ type: "template" })}
            />
          )}
        </section>
        <aside className="message-preview">
          <span className="eyebrow">UMA PRÉVIA DA CONVERSA</span>
          <div className="phone-preview">
            <div className="phone-top">
              <Avatar name={customer?.name || "Seu cliente"} small />
              <div>
                <strong>{customer?.name || "Seu cliente"}</strong>
                <span>WhatsApp · prévia</span>
              </div>
              <MessageCircle size={17} />
            </div>
            <div className="chat-area">
              <span className="chat-day">HOJE</span>
              {body && (
                <div className="chat-bubble">
                  {body}
                  <span>
                    Agora <CheckCheck size={13} />
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="preview-note">
            <ShieldCheck size={20} />
            <p>
              Conversa boa tem contexto.
              <br />
              <strong>Revise cada mensagem antes de enviar.</strong>
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
