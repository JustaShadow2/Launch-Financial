import { FormEvent, useEffect, useRef, useState } from "react";
import { api, ApiError } from "../api/client";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "How is my portfolio doing so far?",
  "Explain my most recent trade.",
  "Am I diversified enough?",
  "What should I learn next based on my activity?",
];

export default function CoachPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [available, setAvailable] = useState<boolean | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .get<{ available: boolean }>("/coach/status")
      .then((r) => setAvailable(r.available))
      .catch(() => setAvailable(false));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || sending) return;
    setError("");
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
    setSending(true);
    try {
      const res = await api.post<{ reply: string }>("/coach/chat", { messages: next });
      setMessages([...next, { role: "assistant", content: res.reply }]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The Coach couldn't respond. Try again.");
      // Roll back the optimistic user message so they can retry cleanly.
      setMessages(messages);
      setInput(content);
    } finally {
      setSending(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    send(input);
  }

  return (
    <div className="coach-wrap">
      <h1 className="page-title">Coach</h1>
      <p className="page-sub">
        Your AI learning coach — it knows your simulated portfolio and trades, and helps you learn
        from your decisions.
      </p>

      {available === false && (
        <div className="error-banner">
          The Coach isn't available right now. (The GROQ_API_KEY isn't configured on the server.)
        </div>
      )}

      <div className="card coach-chat">
        <div className="coach-messages" ref={scrollRef}>
          {messages.length === 0 && (
            <div className="coach-empty">
              <div style={{ fontSize: 34 }}>🧑‍🏫</div>
              <h3 style={{ margin: "8px 0 4px" }}>Ask me about your investing</h3>
              <p className="muted" style={{ maxWidth: 460, margin: "0 auto 16px" }}>
                I look at your accounts, holdings, and recent buy/sell decisions to give you
                tailored, educational explanations. It's all simulated — a safe place to learn.
              </p>
              <div className="coach-suggestions">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    className="btn btn-secondary btn-sm"
                    onClick={() => send(s)}
                    disabled={available === false}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`coach-msg ${m.role}`}>
              <div className="coach-bubble">{m.content}</div>
            </div>
          ))}

          {sending && (
            <div className="coach-msg assistant">
              <div className="coach-bubble coach-typing">Thinking…</div>
            </div>
          )}
        </div>

        {error && <div className="error-banner" style={{ margin: "0 16px 12px" }}>{error}</div>}

        <form className="coach-input" onSubmit={onSubmit}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your portfolio, a trade, or a concept…"
            disabled={available === false || sending}
          />
          <button className="btn" disabled={available === false || sending || !input.trim()}>
            Send
          </button>
        </form>
      </div>

      <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
        Educational only — not financial advice. All money and trades are simulated.
      </p>
    </div>
  );
}
