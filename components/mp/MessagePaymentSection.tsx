import { redirect } from "next/navigation";

import api from "@/lib/mp-messages";
import { getServerClient } from "@/lib/supabaseServer";

const MP_LOGO_SRC = "/mp_logo.jpg";

type MessagePaymentSectionProps = {
  title?: string | null;
  description?: string | null;
  textareaPlaceholder?: string;
  emptyStateMessage?: string;
  className?: string;
  returnPath?: string;
  showHistory?: boolean;
  collectMessage?: boolean;
  buttonLabel?: string;
  defaultMessage?: string;
  buttonClassName?: string;
  showMpLogo?: boolean;
};

export default async function MessagePaymentSection(
  props: MessagePaymentSectionProps = {}
) {
  const {
    title = "Mensajes destacados",
    description = "Escribe un mensaje y paga con Mercado Pago para que aparezca en la lista.",
    textareaPlaceholder = "Hola perro",
    emptyStateMessage = "Todavía no hay mensajes pagos.",
    className = "",
    returnPath,
    showHistory = true,
    collectMessage = true,
    buttonLabel = "Enviar y pagar",
    defaultMessage = "Acceso premium",
    buttonClassName,
    showMpLogo = false,
  } = props;

  const messages = showHistory ? await api.message.list() : [];

  async function add(formData: FormData) {
    "use server";

    const baseText = (formData.get("text") ?? "").toString();
    const text = collectMessage ? baseText.trim() : defaultMessage;

    if (collectMessage && !text) {
      throw new Error("El mensaje no puede estar vacío");
    }

    const supabase = await getServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const userId = session?.user?.id ?? null;

    const initPoint = await api.message.submit(text, {
      userId,
      returnPath,
    });
    redirect(initPoint);
  }

  const defaultButtonClasses =
    "flex items-center justify-center gap-2 rounded bg-blue-500 px-4 py-2 text-white transition hover:bg-blue-600";
  const buttonClasses = buttonClassName
    ? `flex items-center justify-center gap-2 ${buttonClassName}`
    : defaultButtonClasses;

  return (
    <section className={`mx-auto grid max-w-2xl gap-8 p-4 ${className}`}>
      {title || description ? (
        <header className="grid gap-2">
          {title ? <h1 className="text-2xl font-semibold">{title}</h1> : null}
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </header>
      ) : null}

      <form action={add} className="grid gap-2 rounded border p-4">
        {collectMessage ? (
          <textarea
            name="text"
            placeholder={textareaPlaceholder}
            rows={3}
            className="min-h-[120px] resize-y rounded border p-2"
          />
        ) : (
          <input type="hidden" name="text" value={defaultMessage} />
        )}
        <button
          type="submit"
          className={buttonClasses}
        >
          {showMpLogo ? (
            <span className="inline-flex items-center gap-1 text-sm font-medium">
              <span className="inline-flex h-6 items-center justify-center rounded bg-white/95 px-2 py-1">
                <img
                  src={MP_LOGO_SRC}
                  alt="Mercado Pago"
                  className="h-4 w-auto"
                />
              </span>
            </span>
          ) : null}
          {buttonLabel}
        </button>
      </form>

      {showHistory ? (
        <ul className="grid gap-2">
          {messages.map((message) => (
            <li
              key={message.id}
              className="rounded border border-blue-500/40 bg-blue-500/10 p-4"
            >
              <p className="whitespace-pre-line">{message.text}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Pago #{message.id}
              </p>
            </li>
          ))}
          {messages.length === 0 && (
            <li className="rounded border border-dashed p-4 text-sm text-muted-foreground">
              {emptyStateMessage}
            </li>
          )}
        </ul>
      ) : null}
    </section>
  );
}
