import { useState } from "react";
import SubpageHeader from "../components/SubpageHeader";
import { useLanguage, type TranslationKey } from "../lib/i18n";

const FAQ_KEYS: { qKey: TranslationKey; aKey: TranslationKey }[] = [
  { qKey: "help.faq1q", aKey: "help.faq1a" },
  { qKey: "help.faq2q", aKey: "help.faq2a" },
  { qKey: "help.faq3q", aKey: "help.faq3a" },
];

export default function ProfileHelp() {
  const { t } = useLanguage();
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
      <SubpageHeader title={t("help.title")} />

      <div className="panel-label">{t("help.faq")}</div>
      <div className="list">
        {FAQ_KEYS.map((item, i) => {
          const isOpen = openIndex === i;
          return (
            <div key={item.qKey}>
              <button
                className="list-row"
                onClick={() => setOpenIndex(isOpen ? null : i)}
                style={{ whiteSpace: "normal" }}
              >
                <span className="list-row-label">{t(item.qKey)}</span>
                <span className="list-row-chevron">{isOpen ? "⌄" : "›"}</span>
              </button>
              {isOpen && (
                <div style={{ padding: "0 16px 14px", fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.6 }}>
                  {t(item.aKey)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="panel-label" style={{ marginTop: 8 }}>
        {t("help.stillNeedHelp")}
      </div>
      {sent ? (
        <div className="empty-state">{t("help.sent")}</div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label className="field-label" htmlFor="question">
              {t("help.askQuestion")}
            </label>
            <textarea
              id="question"
              className="field-input"
              rows={4}
              placeholder={t("help.placeholder")}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              style={{ resize: "vertical", fontFamily: "inherit" }}
            />
          </div>
          <button className="primary-btn" type="submit">
            {t("help.send")}
          </button>
        </form>
      )}
    </div>
  );
}
