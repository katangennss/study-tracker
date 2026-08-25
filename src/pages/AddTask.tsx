import { useState } from "react";
import { useNavigate } from "react-router-dom";
import SubpageHeader from "../components/SubpageHeader";
import { useAuth } from "../lib/auth";
import { useActiveGroup } from "../lib/activeGroup";
import { supabase } from "../lib/supabase";

export default function AddTask() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeGroup } = useActiveGroup();

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
      <SubpageHeader title="Add Task" back="/homework" />

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label className="field-label" htmlFor="text">
            Task name
          </label>
          <input id="text" className="field-input" value={text} onChange={(e) => setText(e.target.value)} />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="due">
            Due date
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
            Attachment or link (optional)
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
            <div className="switch-row-label">Allow file submission</div>
            <div className="switch-row-sub">Let people upload a file for this task</div>
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
          {saving ? "Adding…" : "Add Task"}
        </button>
      </form>
    </div>
  );
}
