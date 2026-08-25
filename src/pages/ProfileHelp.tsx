import { useState } from "react";
import SubpageHeader from "../components/SubpageHeader";

const faqs = [
  {
    q: "Only I can see my checked-off homework — is that really private?",
    a: "Yes. Your checkmarks are stored against your account only; classmates and teachers never see them.",
  },
  {
    q: "How is my GPA calculated?",
    a: "Each grade converts to a quality point using your school's 10-point scale, then those are averaged per subject and overall.",
  },
  {
    q: "Can I be part of more than one class?",
    a: "Yes — add any class or course you attend (your school class, TOEFL prep, etc.) from Profile → My Classes.",
  },
];

export default function ProfileHelp() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [question, setQuestion] = useState("");
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    // TODO: write to a `support_questions` table once Supabase is connected
    setSent(true);
    setQuestion("");
  }

  return (
    <div className="page">
      <SubpageHeader title="Help" />

      <div className="panel-label">FREQUENTLY ASKED</div>
      <div className="list">
        {faqs.map((item, i) => {
          const isOpen = openIndex === i;
          return (
            <div key={item.q}>
              <button
                className="list-row"
                onClick={() => setOpenIndex(isOpen ? null : i)}
                style={{ whiteSpace: "normal" }}
              >
                <span className="list-row-label">{item.q}</span>
                <span className="list-row-chevron">{isOpen ? "⌄" : "›"}</span>
              </button>
              {isOpen && (
                <div style={{ padding: "0 16px 14px", fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.6 }}>
                  {item.a}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="panel-label" style={{ marginTop: 8 }}>
        STILL NEED HELP?
      </div>
      {sent ? (
        <div className="empty-state">
          Thanks — your question was sent. We'll get back to you soon.
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label className="field-label" htmlFor="question">
              Ask a question
            </label>
            <textarea
              id="question"
              className="field-input"
              rows={4}
              placeholder="What's going on?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              style={{ resize: "vertical", fontFamily: "inherit" }}
            />
          </div>
          <button className="primary-btn" type="submit">
            Send
          </button>
        </form>
      )}
    </div>
  );
}
