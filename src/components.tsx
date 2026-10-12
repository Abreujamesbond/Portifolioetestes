import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
  type FormEvent,
} from "react";
import {
  ArrowRight,
  Check,
  LoaderCircle,
  Plus,
  X,
  type LucideIcon,
} from "lucide-react";
import { initials, stages } from "./lib";
import type { Stage } from "./types";

export function Logo({ small = false }: { small?: boolean }) {
  return (
    <div className={"logo " + (small ? "small-logo" : "")}>
      <img src={"data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2040%2040%22%3E%3Crect%20width%3D%2240%22%20height%3D%2240%22%20rx%3D%2212%22%20fill%3D%22%23176b50%22/%3E%3Cpath%20d%3D%22M24%2011a10%2010%200%201%200%200%2018M25%2016a5%205%200%201%200%200%208%22%20fill%3D%22none%22%20stroke%3D%22%23ddf5b9%22%20stroke-width%3D%223.5%22%20stroke-linecap%3D%22round%22/%3E%3Ccircle%20cx%3D%2229%22%20cy%3D%2220%22%20r%3D%222%22%20fill%3D%22%23ddf5b9%22/%3E%3C/svg%3E"} alt="" />
      <span>
        conecta<span className="logo-dot">.</span>
      </span>
    </div>
  );
}
export function Avatar({
  name,
  small = false,
}: {
  name: string;
  small?: boolean;
}) {
  const color = ["sage", "sand", "lavender", "blue"][
    [...name].reduce((s, c) => s + c.charCodeAt(0), 0) % 4
  ];
  return (
    <span className={`avatar ${color} ${small ? "avatar-sm" : ""}`}>
      {initials(name)}
    </span>
  );
}
export function StageBadge({ stage }: { stage: Stage }) {
  return (
    <span className={`badge stage-${stage}`}>
      <i />
      {stages.find((s) => s.id === stage)?.label}
    </span>
  );
}
export function Empty({
  icon: Icon,
  title,
  text,
  action,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  action?: string;
  onClick?: () => void;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon size={25} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action && (
        <button className="button secondary" onClick={onClick}>
          <Plus size={16} />
          {action}
        </button>
      )}
    </div>
  );
}
export function PageHeading({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="heading-actions">{children}</div>
    </div>
  );
}
export function PanelTitle({
  title,
  subtitle,
  action,
  onAction,
}: {
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="panel-title">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action && (
        <button className="text-button" onClick={onAction}>
          {action}
          <ArrowRight size={15} />
        </button>
      )}
    </div>
  );
}
export function Stat({
  label,
  value,
  detail,
  icon: Icon,
  tone = "",
  children,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: LucideIcon;
  tone?: string;
  children?: ReactNode;
}) {
  return (
    <div className={"stat-card " + tone}>
      <div className="stat-top">
        <span>{label}</span>
        <span className="stat-icon">
          <Icon size={18} />
        </span>
      </div>
      <strong>{value}</strong>
      <div className="stat-foot">
        {children}
        {detail}
      </div>
    </div>
  );
}
export function Modal({
  title,
  subtitle,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current
      ?.querySelector<HTMLElement>("input, select, textarea, button")
      ?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") {
        const items = Array.from(
          ref.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
          ) || [],
        ).filter((el) => el.offsetParent !== null);
        if (!items.length) return;
        if (event.shiftKey && document.activeElement === items[0]) {
          event.preventDefault();
          items.at(-1)?.focus();
        }
        if (!event.shiftKey && document.activeElement === items.at(-1)) {
          event.preventDefault();
          items[0].focus();
        }
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", keydown);
      previous?.focus();
    };
  }, [onClose]);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        className={"modal " + (wide ? "modal-wide" : "")}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="modal-heading">
          <div>
            <h2 id="modal-title">{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button
            className="icon-button"
            aria-label="Fechar janela"
            onClick={onClose}
          >
            <X size={21} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function Form({
  children,
  onSubmit,
  submit = "Salvar",
  onCancel,
}: {
  children: ReactNode;
  onSubmit: (form: FormData) => Promise<unknown>;
  submit?: string;
  onCancel?: () => void;
}) {
  const [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  async function handle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const data = new FormData(event.currentTarget);
    setSaving(true);
    setError("");
    try {
      await onSubmit(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <form className="form" onSubmit={handle}>
      <fieldset disabled={saving}>{children}</fieldset>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        {onCancel && (
          <button type="button" className="button secondary" onClick={onCancel}>
            Cancelar
          </button>
        )}
        <button type="submit" className="button primary" disabled={saving}>
          {saving ? (
            <LoaderCircle className="spin" size={16} />
          ) : (
            <Check size={16} />
          )}
          {saving ? "Salvando…" : submit}
        </button>
      </div>
    </form>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {Children.map(children, (child) => {
        if (
          !isValidElement(child) ||
          !["input", "textarea", "select"].includes(child.type as string)
        )
          return child;
        const control = child as ReactElement<{ "aria-label"?: string }>;
        return cloneElement(control, {
          "aria-label": control.props["aria-label"] || label,
        });
      })}
      {hint && <small>{hint}</small>}
    </label>
  );
}
