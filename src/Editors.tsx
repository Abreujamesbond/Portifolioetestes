import { useState } from "react";
import { Download, FileSpreadsheet, Info, Plus, Trash2 } from "lucide-react";
import { Field, Form, Modal } from "./components";
import { cents, download, money, parseCSV, stages, today } from "./lib";
import { useStore } from "./store";
import type { ModalSpec } from "./types";

export default function Editors({
  spec,
  close,
}: {
  spec: NonNullable<ModalSpec>;
  close: () => void;
}) {
  const { state, mutate } = useStore();
  const titles = {
    customer: spec.customer ? "Editar cliente" : "Uma nova conexão",
    task: spec.task ? "Editar tarefa" : "O que vem a seguir?",
    order: "Registrar pedido",
    lot: "Adicionar estoque",
    expense: "Registrar despesa",
    product: spec.product ? "Editar produto" : "Novo produto",
    template: spec.template ? "Editar modelo" : "Novo modelo de mensagem",
    import: "Importar clientes",
  };
  const customerOptions = (
    <>
      <option value="">Selecione um cliente</option>
      {state.customers
        .filter((c) => !c.archived)
        .map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
    </>
  );
  async function save(path: string, body: unknown, method = "POST") {
    await mutate(path, method, body, "Tudo salvo.");
    close();
  }
  return (
    <Modal
      title={titles[spec.type]}
      subtitle={
        spec.type === "customer"
          ? "Os detalhes de hoje ajudam na conversa de amanhã."
          : undefined
      }
      onClose={close}
      wide={spec.type === "import" || spec.type === "order"}
    >
      {spec.type === "customer" && (
        <Form
          onCancel={close}
          submit={spec.customer ? "Salvar alterações" : "Adicionar cliente"}
          onSubmit={(f) =>
            save(
              "/customers" + (spec.customer ? "/" + spec.customer.id : ""),
              {
                name: f.get("name"),
                contact: f.get("contact"),
                phone: f.get("phone"),
                segment: f.get("segment"),
                neighborhood: f.get("neighborhood"),
                city: f.get("city"),
                source: f.get("source"),
                stage: f.get("stage"),
                notes: f.get("notes"),
                consent: f.get("consent") === "on",
                doNotContact: f.get("doNotContact") === "on",
              },
              spec.customer ? "PATCH" : "POST",
            )
          }
        >
          <Field label="Nome do negócio *">
            <input
              name="name"
              required
              maxLength={200}
              defaultValue={spec.customer?.name}
              placeholder="Ex.: Café da Esquina"
            />
          </Field>
          <div className="form-grid">
            <Field label="Pessoa de contato">
              <input
                name="contact"
                maxLength={200}
                defaultValue={spec.customer?.contact}
                placeholder="Como ela se chama?"
              />
            </Field>
            <Field label="WhatsApp com DDD">
              <input
                name="phone"
                type="tel"
                maxLength={25}
                defaultValue={spec.customer?.phone}
                placeholder="(11) 99999-9999"
              />
            </Field>
          </div>
          <div className="form-grid">
            <Field label="Segmento">
              <input
                name="segment"
                list="segments"
                maxLength={200}
                defaultValue={spec.customer?.segment}
                placeholder="Ex.: Cafeteria"
              />
              <datalist id="segments">
                {[
                  "Cafeteria",
                  "Barbearia",
                  "Beleza",
                  "Restaurante",
                  "Pet shop",
                  "Estética",
                  "Automotivo",
                  "Ótica",
                ].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </datalist>
            </Field>
            <Field label="Etapa do funil">
              <select name="stage" defaultValue={spec.customer?.stage || "new"}>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="form-grid">
            <Field label="Bairro">
              <input
                name="neighborhood"
                maxLength={200}
                defaultValue={spec.customer?.neighborhood}
                placeholder="Bairro"
              />
            </Field>
            <Field label="Cidade">
              <input
                name="city"
                maxLength={200}
                defaultValue={spec.customer?.city || state.settings.city}
                placeholder="Cidade"
              />
            </Field>
          </div>
          <Field label="Como esse cliente chegou?">
            <select
              name="source"
              defaultValue={spec.customer?.source || "Cadastro manual"}
            >
              {[
                ...new Set(
                  [
                    "Cadastro manual",
                    "Indicação",
                    "Instagram",
                    "Visita presencial",
                    "Site",
                    "Google",
                    "Evento",
                    spec.customer?.source,
                  ].filter(Boolean),
                ),
              ].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Anotações">
            <textarea
              name="notes"
              rows={3}
              maxLength={5000}
              defaultValue={spec.customer?.notes}
              placeholder="O que você quer lembrar sobre esse negócio?"
            />
          </Field>
          <label className="check-label">
            <input
              type="checkbox"
              name="consent"
              defaultChecked={spec.customer?.consent}
            />
            <span>
              Esse contato autorizou receber minhas mensagens pelo WhatsApp.
            </span>
          </label>
          {spec.customer && (
            <label className="check-label">
              <input
                type="checkbox"
                name="doNotContact"
                defaultChecked={spec.customer.doNotContact}
              />
              <span>
                Não contatar — encerrar os lembretes de contato deste cliente.
              </span>
            </label>
          )}
        </Form>
      )}
      {spec.type === "task" && (
        <Form
          onCancel={close}
          onSubmit={(f) =>
            save(
              "/tasks" + (spec.task ? "/" + spec.task.id : ""),
              {
                title: f.get("title"),
                dueDate: f.get("dueDate"),
                customerId: f.get("customerId"),
                kind: f.get("kind"),
              },
              spec.task ? "PATCH" : "POST",
            )
          }
        >
          <Field label="Tarefa *">
            <input
              name="title"
              required
              maxLength={200}
              defaultValue={spec.task?.title}
              placeholder="Ex.: Retomar a proposta"
            />
          </Field>
          <Field label="Cliente">
            <select
              name="customerId"
              defaultValue={spec.task?.customerId || spec.customer?.id || ""}
            >
              {customerOptions}
            </select>
          </Field>
          <div className="form-grid">
            <Field label="Data *">
              <input
                type="date"
                name="dueDate"
                required
                defaultValue={spec.task?.dueDate || today()}
              />
            </Field>
            <Field label="Tipo">
              <select name="kind" defaultValue={spec.task?.kind || "contact"}>
                <option value="contact">Contato</option>
                <option value="delivery">Entrega</option>
                <option value="general">Tarefa geral</option>
              </select>
            </Field>
          </div>
        </Form>
      )}
      {spec.type === "lot" && (
        <Form
          onCancel={close}
          submit="Registrar entrada"
          onSubmit={(f) =>
            save("/lots", {
              productId: f.get("productId"),
              quantity: Number(f.get("quantity")),
              unitCostCents: cents(f.get("unitCost")),
              date: f.get("date"),
              notes: f.get("notes"),
            })
          }
        >
          <Field label="Produto">
            <select name="productId" defaultValue={spec.product?.id}>
              {state.products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="form-grid">
            <Field label="Quantidade *">
              <input
                name="quantity"
                type="number"
                min={1}
                max={100000}
                step={1}
                required
                placeholder="20"
              />
            </Field>
            <Field label="Custo por unidade (R$) *">
              <input
                name="unitCost"
                type="number"
                min="0.01"
                step="0.01"
                max={1000000}
                required
                placeholder="22,90"
              />
            </Field>
          </div>
          <Field label="Data de entrada *">
            <input
              type="date"
              name="date"
              required
              max={today()}
              defaultValue={today()}
            />
          </Field>
          <Field label="Observações">
            <input
              name="notes"
              maxLength={1000}
              placeholder="Fornecedor, frete incluído…"
            />
          </Field>
          <p className="info-note">
            <Info size={17} />
            Inclua frete e outros custos no valor por unidade. Pedidos já
            registrados mantêm o custo original.
          </p>
        </Form>
      )}
      {spec.type === "product" && (
        <Form
          onCancel={close}
          onSubmit={(f) =>
            save(
              "/products" + (spec.product ? "/" + spec.product.id : ""),
              {
                name: f.get("name"),
                priceCents: cents(f.get("price")),
                minimum: Number(f.get("minimum")),
              },
              spec.product ? "PATCH" : "POST",
            )
          }
        >
          <Field label="Nome do produto *">
            <input
              name="name"
              maxLength={200}
              required
              defaultValue={spec.product?.name}
              placeholder="Ex.: Placa NFC personalizada"
            />
          </Field>
          <div className="form-grid">
            <Field label="Preço de venda (R$) *">
              <input
                name="price"
                type="number"
                min="0.01"
                max={1000000}
                step="0.01"
                required
                defaultValue={spec.product ? spec.product.priceCents / 100 : ""}
              />
            </Field>
            <Field label="Avisar quando restarem">
              <input
                name="minimum"
                type="number"
                min="0"
                max="10000"
                step="1"
                required
                defaultValue={spec.product?.minimum ?? 5}
              />
            </Field>
          </div>
        </Form>
      )}
      {spec.type === "expense" && (
        <Form
          onCancel={close}
          onSubmit={(f) =>
            save("/expenses", {
              title: f.get("title"),
              amountCents: cents(f.get("amount")),
              date: f.get("date"),
            })
          }
        >
          <Field label="Descrição *">
            <input
              name="title"
              required
              maxLength={200}
              placeholder="Ex.: Embalagens para entrega"
            />
          </Field>
          <div className="form-grid">
            <Field label="Valor (R$) *">
              <input
                name="amount"
                type="number"
                required
                min="0.01"
                max={1000000}
                step="0.01"
              />
            </Field>
            <Field label="Data *">
              <input name="date" type="date" required defaultValue={today()} />
            </Field>
          </div>
        </Form>
      )}
      {spec.type === "template" && (
        <Form
          onCancel={close}
          onSubmit={(f) =>
            save(
              "/templates" + (spec.template ? "/" + spec.template.id : ""),
              {
                title: f.get("title"),
                category: f.get("category"),
                body: f.get("body"),
              },
              spec.template ? "PATCH" : "POST",
            )
          }
        >
          <Field label="Nome do modelo *">
            <input
              name="title"
              required
              maxLength={200}
              defaultValue={spec.template?.title}
              placeholder="Ex.: Primeiro contato por indicação"
            />
          </Field>
          <Field label="Categoria">
            <select
              name="category"
              defaultValue={spec.template?.category || "Abordagem"}
            >
              {[
                "Abordagem",
                "Demonstração",
                "Proposta",
                "Retorno",
                "Entrega",
                "Pós-venda",
                "Objeções",
              ].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Mensagem *">
            <textarea
              name="body"
              rows={8}
              maxLength={5000}
              required
              defaultValue={spec.template?.body}
            />
          </Field>
          <p className="info-note">
            Use {"{empresa}"}, {"{contato}"}, {"{meu_nome}"}, {"{meu_negocio}"},{" "}
            {"{cidade}"}, {"{preco_balcao}"} e {"{preco_parede}"} para
            personalizar.
          </p>
        </Form>
      )}
      {spec.type === "order" && (
        <OrderForm close={close} customerId={spec.customer?.id} />
      )}
      {spec.type === "import" && <ImportForm close={close} />}
    </Modal>
  );
}

function OrderForm({
  close,
  customerId,
}: {
  close: () => void;
  customerId?: string;
}) {
  const { state, mutate } = useStore();
  const [items, setItems] = useState([
    {
      productId: state.products[0]?.id || "",
      quantity: 1,
      price: (state.products[0]?.priceCents || 0) / 100,
    },
  ]);
  const [discount, setDiscount] = useState(0);
  const subtotal = items.reduce(
    (sum, item) => sum + Math.round(item.price * 100) * item.quantity,
    0,
  );
  function update(index: number, field: string, value: string) {
    setItems(
      items.map((item, i) =>
        i === index
          ? field === "productId"
            ? {
                ...item,
                productId: value,
                price:
                  (state.products.find((p) => p.id === value)?.priceCents ||
                    0) / 100,
              }
            : { ...item, [field]: Number(value) }
          : item,
      ),
    );
  }
  return (
    <Form
      onCancel={close}
      submit="Registrar pedido"
      onSubmit={async (f) => {
        await mutate(
          "/orders",
          "POST",
          {
            customerId: f.get("customerId"),
            items: items.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
              unitPriceCents: Math.round(i.price * 100),
            })),
            discountCents: Math.round(discount * 100),
            status: f.get("status"),
            deliveryDate: f.get("deliveryDate"),
            notes: f.get("notes"),
          },
          "Pedido registrado e estoque atualizado.",
        );
        close();
      }}
    >
      <Field label="Cliente *">
        <select name="customerId" required defaultValue={customerId || ""}>
          <option value="">Selecione o cliente</option>
          {state.customers
            .filter((c) => !c.archived)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </select>
      </Field>
      {items.map((item, index) => (
        <div className="order-item" key={index}>
          <Field label="Produto">
            <select
              aria-label={`Produto ${index + 1}`}
              value={item.productId}
              onChange={(e) => update(index, "productId", e.target.value)}
            >
              {state.products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (
                  {state.lots
                    .filter((l) => l.productId === p.id)
                    .reduce((sum, l) => sum + l.remaining, 0)}{" "}
                  disponíveis)
                </option>
              ))}
            </select>
          </Field>
          <Field label="Qtd.">
            <input
              aria-label={`Quantidade ${index + 1}`}
              type="number"
              min="1"
              max="100000"
              step="1"
              required
              value={item.quantity}
              onChange={(e) => update(index, "quantity", e.target.value)}
            />
          </Field>
          <Field label="Preço (R$)">
            <input
              aria-label={`Preço ${index + 1}`}
              type="number"
              min="0.01"
              max="1000000"
              step="0.01"
              required
              value={item.price}
              onChange={(e) => update(index, "price", e.target.value)}
            />
          </Field>
          {items.length > 1 && (
            <button
              type="button"
              className="icon-button"
              aria-label={`Remover produto ${index + 1}`}
              onClick={() => setItems(items.filter((_, i) => i !== index))}
            >
              <Trash2 size={17} />
            </button>
          )}
        </div>
      ))}
      {items.length < state.products.length && (
        <button
          type="button"
          className="text-button"
          onClick={() => {
            const product = state.products.find(
              (p) => !items.some((i) => i.productId === p.id),
            );
            if (product)
              setItems([
                ...items,
                {
                  productId: product.id,
                  quantity: 1,
                  price: product.priceCents / 100,
                },
              ]);
          }}
        >
          <Plus size={16} />
          Adicionar produto
        </button>
      )}
      <div className="form-grid">
        <Field label="Desconto total (R$)">
          <input
            type="number"
            min="0"
            max={subtotal / 100}
            step="0.01"
            value={discount}
            onChange={(e) => setDiscount(Number(e.target.value))}
          />
        </Field>
        <Field label="Pagamento">
          <select name="status">
            <option value="pending">A receber</option>
            <option value="paid">Já foi pago</option>
          </select>
        </Field>
      </div>
      <Field label="Entrega prevista (opcional)">
        <input name="deliveryDate" type="date" />
      </Field>
      <Field label="Observações">
        <textarea
          name="notes"
          rows={2}
          maxLength={2000}
          placeholder="Personalização, link da placa ou detalhes da entrega"
        />
      </Field>
      <div className="order-total">
        <span>Total do pedido</span>
        <strong>{money(subtotal - Math.round(discount * 100))}</strong>
      </div>
      <p className="info-note">
        O estoque é reservado ao registrar o pedido. O recebimento entra no
        financeiro quando o pagamento é confirmado.
      </p>
    </Form>
  );
}
function ImportForm({ close }: { close: () => void }) {
  const { mutate } = useStore();
  const [content, setContent] = useState("");
  const parsed = content ? parseCSV(content) : { rows: [], errors: [] };
  return (
    <Form
      onCancel={close}
      submit={`Importar ${parsed.rows.length} clientes`}
      onSubmit={async () => {
        if (parsed.errors.length) throw new Error(parsed.errors[0]);
        if (!parsed.rows.length)
          throw new Error("Selecione ou cole um arquivo CSV com clientes.");
        const result = await mutate<{ imported: number; skipped: number }>(
          "/customers/import",
          "POST",
          { rows: parsed.rows },
        );
        if (result.imported === 0)
          throw new Error(
            `Nenhum cliente novo. ${result.skipped} registros já estavam na lista.`,
          );
        close();
      }}
    >
      <p className="muted">
        Traga sua lista de uma planilha. Revise os dados antes de importar;
        contatos duplicados serão ignorados.
      </p>
      <button
        className="button secondary"
        type="button"
        onClick={() =>
          download(
            "modelo-clientes.csv",
            "\uFEFFnome;contato;telefone;segmento;bairro;cidade\nCafé de Exemplo;Nome do contato;;Cafeteria;Centro;São Paulo\n",
            "text/csv;charset=utf-8",
          )
        }
      >
        <Download size={16} />
        Baixar modelo CSV
      </button>
      <label className="file-drop">
        <FileSpreadsheet size={28} />
        <strong>Escolha sua planilha .csv</strong>
        <span>Até 500 clientes · máximo 1 MB</span>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (file.size > 1000000) {
              setContent("");
              e.target.value = "";
              return;
            }
            setContent(await file.text());
          }}
        />
      </label>
      <Field label="Ou cole o conteúdo do CSV">
        <textarea
          rows={5}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="nome;contato;telefone;segmento;bairro;cidade"
        />
      </Field>
      {parsed.errors.length > 0 && (
        <p role="alert" className="form-error">
          {parsed.errors.slice(0, 3).join(" ")}
        </p>
      )}
      {parsed.rows.length > 0 && (
        <div className="import-preview">
          <strong>{parsed.rows.length} clientes identificados</strong>
          {parsed.rows.slice(0, 4).map((r, i) => (
            <div key={i}>
              <span>{r.name}</span>
              <small>{r.city || "Cidade não informada"}</small>
            </div>
          ))}
        </div>
      )}
      <p className="info-note">
        <Info size={18} />A permissão para contato é registrada individualmente
        no cadastro de cada cliente.
      </p>
    </Form>
  );
}
