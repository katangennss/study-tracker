import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useActiveGroup } from "../lib/activeGroup";
import { supabase } from "../lib/supabase";
import ClassSwitcher from "../components/ClassSwitcher";
import { PlusIcon } from "../components/icons";

type HomeworkItem = {
  id: string;
  text: string;
  due_date: string;
  link_url: string | null;
  allow_file_submission: boolean;
  subjects: { name: string; color: string } | null;
};

type Submission = {
  homework_item_id: string;
  file_path: string;
  score: number | null;
  feedback: string | null;
};

export default function Homework() {
  const { user } = useAuth();
  const { activeGroup, approvedGroups } = useActiveGroup();

  const [items, setItems] = useState<HomeworkItem[]>([]);
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const [submissions, setSubmissions] = useState<Record<string, Submission>>({});
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  function load() {
    if (!activeGroup || !user) return;
    supabase
      .from("homework_items")
      .select("id, text, due_date, link_url, allow_file_submission, subjects(name, color)")
      .eq("group_id", activeGroup.group_id)
      .order("due_date")
      .then(async ({ data }) => {
        const rows = (data as unknown as HomeworkItem[]) ?? [];
        setItems(rows);
        if (rows.length === 0) return;
        const ids = rows.map((r) => r.id);

        const { data: statusRows } = await supabase
          .from("homework_status")
          .select("homework_item_id, done")
          .eq("student_id", user.id)
          .in("homework_item_id", ids);
        setDoneIds(new Set((statusRows ?? []).filter((r) => r.done).map((r) => r.homework_item_id)));

        const { data: subRows } = await supabase
          .from("homework_submissions")
          .select("homework_item_id, file_path, score, feedback")
          .eq("student_id", user.id)
          .in("homework_item_id", ids);
        const map: Record<string, Submission> = {};
        (subRows ?? []).forEach((s) => (map[s.homework_item_id] = s as Submission));
        setSubmissions(map);
      });
  }

  useEffect(load, [activeGroup, user]);

  async function toggleDone(item: HomeworkItem) {
    if (!user) return;
    const nowDone = !doneIds.has(item.id);
    setDoneIds((prev) => {
      const next = new Set(prev);
      if (nowDone) next.add(item.id);
      else next.delete(item.id);
      return next;
    });
    await supabase
      .from("homework_status")
      .upsert({ homework_item_id: item.id, student_id: user.id, done: nowDone });
  }

  async function handleFile(item: HomeworkItem, file: File) {
    if (!user || !activeGroup) return;
    setUploadingId(item.id);
    const path = `${activeGroup.group_id}/${item.id}/${user.id}/${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("homework-submissions")
      .upload(path, file, { upsert: true });
    if (!uploadError) {
      await supabase.rpc("submit_homework", { p_homework_item_id: item.id, p_file_path: path });
      load();
    }
    setUploadingId(null);
  }

  return (
    <div className="page">
      <div className="pagetitle">Homework</div>
      <ClassSwitcher />

      {approvedGroups.length === 0 ? (
        <div className="empty-state">Join or create a class to see homework here.</div>
      ) : (
        <>
          {items.length === 0 ? (
            <div className="empty-state">No homework yet.</div>
          ) : (
            <div className="group">
              {items.map((item) => {
                const submission = submissions[item.id];
                return (
                  <div key={item.id} style={{ borderBottom: "1px solid var(--line)" }}>
                    <div className="item" onClick={() => toggleDone(item)}>
                      <div className="check" style={doneIds.has(item.id) ? { borderColor: "var(--teal)" } : undefined}>
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={3}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ opacity: doneIds.has(item.id) ? 1 : 0, color: "var(--teal)" }}
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                      <div className="item-text" style={doneIds.has(item.id) ? { color: "var(--ink-soft)", textDecoration: "line-through" } : undefined}>
                        {item.text}
                      </div>
                    </div>
                    <div style={{ padding: "0 16px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <span className="resource-sub">
                        {item.subjects?.name ? `${item.subjects.name} · ` : ""}Due {item.due_date}
                        {item.link_url && (
                          <>
                            {" · "}
                            <a className="link-btn" href={item.link_url} target="_blank" rel="noreferrer">
                              View link
                            </a>
                          </>
                        )}
                      </span>
                      {item.allow_file_submission &&
                        (submission ? (
                          <span className="grade-pill">
                            {submission.score != null ? `Scored ${submission.score}` : "Submitted"}
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="link-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              fileInputs.current[item.id]?.click();
                            }}
                            disabled={uploadingId === item.id}
                          >
                            {uploadingId === item.id ? "Uploading…" : "Submit file"}
                          </button>
                        ))}
                      {item.allow_file_submission && (
                        <input
                          type="file"
                          ref={(el) => (fileInputs.current[item.id] = el)}
                          style={{ display: "none" }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFile(item, file);
                          }}
                        />
                      )}
                    </div>
                    {submission?.feedback && (
                      <div className="field-hint" style={{ padding: "0 16px 12px" }}>
                        Feedback: {submission.feedback}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {activeGroup && (
            <Link to="/homework/add" className="list-row" style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--radius)", marginBottom: 14 }}>
              <span className="list-row-icon">
                <PlusIcon />
              </span>
              <span className="list-row-label">Add Task</span>
            </Link>
          )}

          <div className="hint">
            Anyone in the class can add a task. Checking one off is visible to the admin; submitting a
            file is optional, per task.
          </div>
        </>
      )}
    </div>
  );
}
