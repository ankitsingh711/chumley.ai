import PostalMime from "postal-mime";

const WORKER_SOURCE = "cloudflare_email_worker";
const USER_AGENT = "chumley-cloudflare-email-worker/1.0";
const MAX_BODY_LENGTH = 1_000_000;
const MAX_RAW_SNIPPET = 8_000;

const truncate = (value, maxLength) => {
  if (typeof value !== "string") return undefined;
  if (value.length <= maxLength) return value;
  return value.slice(0, maxLength);
};

const pickAddress = (value) => {
  if (!value) return undefined;
  if (typeof value === "string" && value.trim()) return value.trim();

  if (typeof value === "object") {
    if (typeof value.address === "string" && value.address.trim()) {
      return value.address.trim();
    }

    if (Array.isArray(value.value)) {
      for (const entry of value.value) {
        if (entry && typeof entry.address === "string" && entry.address.trim()) {
          return entry.address.trim();
        }
      }
    }
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const candidate = pickAddress(item);
      if (candidate) return candidate;
    }
  }

  return undefined;
};

const extractFallbackBody = (rawEmail) => {
  if (typeof rawEmail !== "string" || !rawEmail.trim()) return undefined;
  const sections = rawEmail.split(/\r?\n\r?\n/);
  if (sections.length < 2) return undefined;

  const body = sections.slice(1).join("\n\n").trim();
  if (!body) return undefined;
  return body;
};

const createPayload = ({ message, parsedEmail, rawEmail }) => {
  const text = typeof parsedEmail.text === "string" ? parsedEmail.text.trim() : "";
  const html = typeof parsedEmail.html === "string" ? parsedEmail.html.trim() : "";
  const fallbackBody = extractFallbackBody(rawEmail);
  const finalText = text || (!html ? fallbackBody : "");

  const fromAddress =
    pickAddress(parsedEmail.from) ||
    message.headers.get("Reply-To") ||
    message.headers.get("From") ||
    message.from;

  const toAddress =
    message.to ||
    pickAddress(parsedEmail.to) ||
    message.headers.get("Delivered-To") ||
    message.headers.get("To");

  return {
    source: WORKER_SOURCE,
    from: fromAddress,
    to: toAddress,
    subject: parsedEmail.subject || message.headers.get("Subject") || undefined,
    text: truncate(finalText || "", MAX_BODY_LENGTH),
    html: truncate(html || undefined, MAX_BODY_LENGTH),
    messageId:
      parsedEmail.messageId ||
      message.headers.get("Message-ID") ||
      message.headers.get("Message-Id") ||
      undefined,
    envelope: {
      from: message.from,
      to: message.to,
    },
    headers: {
      from: message.headers.get("From") || undefined,
      replyTo: message.headers.get("Reply-To") || undefined,
      to: message.headers.get("To") || undefined,
      deliveredTo: message.headers.get("Delivered-To") || undefined,
      subject: message.headers.get("Subject") || undefined,
      messageId:
        message.headers.get("Message-ID") ||
        message.headers.get("Message-Id") ||
        undefined,
      contentType: message.headers.get("Content-Type") || undefined,
    },
    rawSnippet: truncate(rawEmail || undefined, MAX_RAW_SNIPPET),
  };
};

const postInboundReply = async (payload, env) => {
  if (!env.SUPPLIER_INBOUND_WEBHOOK_URL) {
    throw new Error("Missing SUPPLIER_INBOUND_WEBHOOK_URL");
  }

  if (!env.SUPPLIER_INBOUND_WEBHOOK_SECRET) {
    throw new Error("Missing SUPPLIER_INBOUND_WEBHOOK_SECRET");
  }

  const response = await fetch(env.SUPPLIER_INBOUND_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-webhook-secret": env.SUPPLIER_INBOUND_WEBHOOK_SECRET,
      "user-agent": USER_AGENT,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Webhook failed with ${response.status}: ${body.slice(0, 400)}`);
  }
};

export default {
  async email(message, env, ctx) {
    try {
      const rawArrayBuffer = await new Response(message.raw).arrayBuffer();
      const rawEmail = new TextDecoder().decode(rawArrayBuffer);

      const parser = new PostalMime();
      const parsedEmail = await parser.parse(rawArrayBuffer);
      const payload = createPayload({ message, parsedEmail, rawEmail });

      if (!payload.text && !payload.html) {
        payload.text = "Inbound email received with no parseable body.";
      }

      await postInboundReply(payload, env);
    } catch (error) {
      // Surface failure to Cloudflare logs and SMTP sender.
      console.error("Failed to process inbound supplier email", error);
      message.setReject("Unable to process email reply right now. Please try again shortly.");
    }
  },

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return new Response("ok", { status: 200 });
    }

    return new Response("Email worker is running", { status: 200 });
  },
};
