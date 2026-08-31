import { FormEvent, ReactNode, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../api/client";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

// ── Minimal Markdown rendering for the coach's structured replies ────────────
// Supports: #/##/### headings, - bullet lists, 1. ordered lists, GFM tables,
// blank-line paragraphs, **bold**, and lesson links written as
// [Title](lesson:<id>). Lesson links become in-app navigation to
// /learn/lesson/<id>; regular http links open in a new tab.

const INLINE_RE = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;

// A table row is a line that starts and ends with a pipe (after trimming).
function isTableRow(line: string): boolean {
  const t = line.trim();
  return t.startsWith("|") && t.lastIndexOf("|") > 0 && t.length > 1;
}

// The separator row under a table header: | --- | :---: | etc.
function isTableSep(line: string): boolean {
  const t = line.trim();
  if (!t.startsWith("|")) return false;
  return /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/.test(t);
}

function splitRow(line: string): string[] {
  let t = line.trim();
  if (t.startsWith("|")) t = t.slice(1);
  if (t.endsWith("|")) t = t.slice(0, -1);
  return t.split("|").map((c) => c.trim());
}

function renderInline(text: string, onLesson: (id: string) => void, keyBase: string): ReactNode[] {
  const parts = text.split(INLINE_RE).filter(Boolean);
  return parts.map((part, i) => {
    const key = `${keyBase}-${i}`;
    // Bold
    const bold = /^\*\*([^*]+)\*\*$/.exec(part);
    if (bold) return <strong key={key}>{bold[1]}</strong>;
    // Link: [label](target)
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (link) {
      const label = link[1];
      const target = link[2];
      if (target.startsWith("lesson:")) {
        const id = target.slice("lesson:".length);
        return (
          <button
            key={key}
            type="button"
            className="coach-lesson-link"
            onClick={() => onLesson(id)}
          >
            {label}
          </button>
        );
      }
      return (
        <a key={key} href={target} target="_blank" rel="noreferrer">
          {label}
        </a>
      );
    }
    return <span key={key}>{part}</span>;
  });
}

function renderMarkdown(md: string, onLesson: (id: string) => void): ReactNode {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  let listOrdered = false;
  let para: string[] = [];
  let key = 0;

  const flushList = () => {
    if (list.length === 0) return;
    const items = list;
    const ordered = listOrdered;
    list = [];
    const children = items.map((item, i) => (
      <li key={i}>{renderInline(item, onLesson, `li-${key}-${i}`)}</li>
    ));
    blocks.push(
      ordered ? (
        <ol key={`ol-${key++}`}>{children}</ol>
      ) : (
        <ul key={`ul-${key++}`}>{children}</ul>
      )
    );
  };
  const flushPara = () => {
    if (para.length === 0) return;
    const text = para.join(" ");
    para = [];
    blocks.push(<p key={`p-${key++}`}>{renderInline(text, onLesson, `p-${key}`)}</p>);
  };
  const flushAll = () => {
    flushList();
    flushPara();
  };

  const startList = (ordered: boolean, item: string) => {
    // Switching list type ends the previous list.
    if (list.length > 0 && listOrdered !== ordered) flushList();
    flushPara();
    listOrdered = ordered;
    list.push(item);
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trimEnd();
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    const ordered = /^\s*\d+[.)]\s+(.*)$/.exec(line);

    // Table: a row followed by a separator row starts a table block.
    if (isTableRow(line) && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      flushAll();
      const header = splitRow(line);
      i += 2; // skip header + separator; body starts next
      const rows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i])) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      i--; // for-loop will ++ back to the first non-row line
      blocks.push(
        <div className="coach-md-table-wrap" key={`t-${key++}`}>
          <table className="coach-md-table">
            <thead>
              <tr>
                {header.map((c, ci) => (
                  <th key={ci}>{renderInline(c, onLesson, `th-${key}-${ci}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri}>
                  {header.map((_, ci) => (
                    <td key={ci}>{renderInline(r[ci] ?? "", onLesson, `td-${key}-${ri}-${ci}`)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    if (heading) {
      flushAll();
      const level = heading[1].length;
      const text = heading[2];
      blocks.push(
        <div
          key={`h-${key++}`}
          className={`coach-md-h ${level <= 2 ? "coach-md-h-lg" : ""}`.trim()}
        >
          {renderInline(text, onLesson, `h-${key}`)}
        </div>
      );
    } else if (bullet) {
      startList(false, bullet[1]);
    } else if (ordered) {
      startList(true, ordered[1]);
    } else if (line.trim() === "") {
      flushAll();
    } else {
      flushList();
      para.push(line);
    }
  }
  flushAll();
  return <div className="coach-md">{blocks}</div>;
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
  const navigate = useNavigate();

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

          {messages.map((m, i) => {
            const wide = m.role === "assistant" && /\n\s*\|?\s*:?-{2,}:?\s*\|/.test(m.content);
            return (
              <div key={i} className={`coach-msg ${m.role}`}>
                <div className={`coach-bubble${wide ? " coach-bubble-wide" : ""}`}>
                  {m.role === "assistant"
                    ? renderMarkdown(m.content, (id) => navigate(`/learn/lesson/${id}`))
                    : m.content}
                </div>
              </div>
            );
          })}

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
