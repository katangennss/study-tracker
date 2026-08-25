import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import SubpageHeader from "../components/SubpageHeader";
import { supabase } from "../lib/supabase";

type HomeworkItem = {
  id: string;
  text: string;
  due_date: string;
  allow_file_submission: boolean;
  subjects: { name: string } | null;
};
type Submission = {
  id: string;
  student_id: string;
  file_path: string;
  score: number | null;
  feedback: string | null;
  profiles: { full_name: string } | null;
};
type StatusRow = { student_id: string; done: boolean; profiles: { full_name: string } | null };

function SubmissionRow({ sub, onGraded }: { sub: Submission; onGraded: () => void }) {
  const [score, setScore] = useState(sub.score?.toString() ?? "");
  const [feedback, setFeedback] = useState(sub.feedback ?? "");
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.storage
      .from("homework-submissions")
      .createSignedUrl(sub.file_path, 300)
      .then(({ data }) => setFileUrl(data?.signedUrl ?? null));
  }, [sub.file_path]);

  async function handleGrade(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await supabase.rpc("grade_homework_submission", {
      p_submission_id: sub.id,
      p_score: score ? Number(score) : null,
      p_feedback: feedback || null,
    });
    setSaving(false);
    onGraded();
  }

  return (
    <div className="item" style={{ cursor: "default", flexDirection: "column", alignItems: "stretch", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span className="item-text">{sub.profiles?.full_name ?? "Unknown"}</span>
        {fileUrl && (
          <a className="link-btn" href={fileUrl} target="_blank" rel="noreferrer">
            View file
          </a>
        )}
      </div>
      <form onSubmit={handleGrade} style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          className="field-input"
          style={{ width: 70 }}
          placeholder="Score"
          value={score}
          onChange={(e) => setScore(e.target.value)}
        />
        <input
          className="field-input"
          placeholder="Feedback (optional)"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
        />
        <button className="primary-btn" style={{ width: "auto", padding: "0 14px" }} disabled={saving}>
          Save
        </button>
      </form>
    </div>
  );
}

export default function AdminHomework() {
  const { groupId } = useParams<{ groupId: string }>();
  const [items, setItems] = useState<HomeworkItem[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [statuses, setStatuses] = useState<StatusRow[]>([]);

  useEffect(() => {
    if (!groupId) return;
    supabase
      .from("homework_items")
      .select("id, text, due_date, allow_file_submission, subjects(name)")
      .eq("group_id", groupId)
      .order("due_date", { ascending: false })
      .then(({ data }) => setItems((data as unknown as HomeworkItem[]) ?? []));
  }, [groupId]);

  function loadDetail(item: HomeworkItem) {
    if (item.allow_file_submission) {
      supabase
        .from("homework_submissions")
        .select("id, student_id, file_path, score, feedback, profiles(full_name)")
        .eq("homework_item_id", item.id)
        .then(({ data }) => setSubmissions((data as unknown as Submission[]) ?? []));
    } else {
      supabase
        .from("homework_status")
        .select("student_id, done, profiles(full_name)")
        .eq("homework_item_id", item.id)
        .then(({ data }) => setStatuses((data as unknown as StatusRow[]) ?? []));
    }
  }

  function toggleOpen(item: HomeworkItem) {
    if (openId === item.id) {
      setOpenId(null);
      setSubmissions([]);
      setStatuses([]);
    } else {
      setOpenId(item.id);
      loadDetail(item);
    }
  }

  return (
    <div className="page">
      <SubpageHeader title="Homework" back={`/admin/${groupId}`} />
      <div className="hint" style={{ marginTop: 0 }}>
        Anyone in the class can add tasks from the regular Homework tab. Here you can see who's completed
        or submitted each one.
      </div>

      {items.length === 0 ? (
        <div className="empty-state">Nothing assigned yet.</div>
      ) : (
        <div className="group">
          {items.map((item) => (
            <div key={item.id}>
              <div className="group-head" style={{ cursor: "pointer" }} onClick={() => toggleOpen(item)}>
                <div className="group-title">
                  <div className="group-name">{item.text}</div>
                  <div className="group-due">
                    {item.subjects?.name ? `${item.subjects.name} · ` : ""}Due {item.due_date}
                  </div>
                </div>
                <div className="chevron" style={openId === item.id ? { transform: "rotate(90deg)" } : undefined}>
                  ›
                </div>
              </div>
              {openId === item.id && (
                <div style={{ padding: "8px 16px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                  {item.allow_file_submission ? (
                    submissions.length === 0 ? (
                      <div className="empty-state" style={{ padding: "12px 0" }}>
                        No submissions yet.
                      </div>
                    ) : (
                      submissions.map((s) => (
                        <SubmissionRow key={s.id} sub={s} onGraded={() => loadDetail(item)} />
                      ))
                    )
                  ) : statuses.length === 0 ? (
                    <div className="empty-state" style={{ padding: "12px 0" }}>
                      No one has checked this off yet.
                    </div>
                  ) : (
                    statuses.map((s) => (
                      <div className="resource-row" key={s.student_id}>
                        <span className="dot" style={{ background: s.done ? "#1D7A6E" : "#DCE2E6" }} />
                        <div style={{ flex: 1 }}>{s.profiles?.full_name ?? "Unknown"}</div>
                        <span className="resource-sub">{s.done ? "Done" : "Not yet"}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
