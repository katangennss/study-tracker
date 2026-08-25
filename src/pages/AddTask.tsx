import { useState } from "react";
import { useNavigate } from "react-router-dom";
import SubpageHeader from "../components/SubpageHeader";
import { useAuth } from "../lib/auth";
import { useActiveGroup } from "../lib/activeGroup";
import { supabase } from "../lib/supabase";
import { useLanguage } from "../lib/i18n";

export default function AddTask() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeGroup } = useActiveGroup();
  const { t } = useLanguage();

  const [text, setText] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [allowFileSubmission, setAllowFileSubmission] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !activeGroup || !text.trim() || !dueDate) return;
    setSaving(true);
    await supabase.from("homework_items").insert({
      group_id: activeGroup.group_id,
      text: text.trim(),
      due_date: dueDate,
      link_url: linkUrl.trim() || null,
      allow_file_submission: allowFileSubmission,
      created_by: user.id,
    });
    setSaving(false);
    navigate("/homework");
  }

  return (
    <div className="page">
      <SubpageHeader title={t("addTask.title")} back="/homework" />

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label className="field-label" htmlFor="text">
            {t("addTask.taskName")}
          </label>
          <input id="text" className="field-input" value={text} onChange={(e) => setText(e.target.value)} />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="due">
            {t("addTask.dueDate")}
          </label>
          <input
            id="due"
            className="field-input"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="link">
            {t("addTask.linkOptional")}
          </label>
          <input
            id="link"
            className="field-input"
            placeholder="https://…"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
          />
        </div>

        <div className="switch-row" style={{ border: "1px solid var(--line)", borderRadius: "var(--radius)", marginBottom: 14 }}>
          <div>
            <div className="switch-row-label">{t("addTask.allowFileSubmission")}</div>
            <div className="switch-row-sub">{t("addTask.allowFileSub")}</div>
          </div>
          <button
            type="button"
            className={"switch" + (allowFileSubmission ? " on" : "")}
            role="switch"
            aria-checked={allowFileSubmission}
            onClick={() => setAllowFileSubmission((v) => !v)}
          />
        </div>

        <button className="primary-btn" disabled={saving}>
          {saving ? t("addTask.adding") : t("addTask.title")}
        </button>
      </form>
    </div>
  );
}
