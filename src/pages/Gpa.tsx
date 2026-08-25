import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { useActiveGroup } from "../lib/activeGroup";
import { supabase } from "../lib/supabase";
import ClassSwitcher from "../components/ClassSwitcher";

type Subject = { id: string; name: string; color: string };
type Grade = { id: string; subject_id: string | null; label: string | null; value: number; graded_at: string };

// School's official 10-point -> 4.0 quality-point conversion table.
const QUALITY_POINTS: Record<number, number> = {
  10: 4.0, 9: 4.0, 8: 3.8, 7: 3.6, 6: 3.4, 5: 2.8, 4: 2.1, 3: 1.4, 2: 0.7, 1: 0.0,
};

const average = (nums: number[]) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0);
const toQualityPoints = (grade: number) => QUALITY_POINTS[Math.round(grade)] ?? 0;
const gpa4Average = (grades: number[]) => average(grades.map(toQualityPoints));

function SchoolGrades({ groupId, userId }: { groupId: string; userId: string }) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [gradesBySubject, setGradesBySubject] = useState<Record<string, number[]>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [gpaMode, setGpaMode] = useState(false);

  function load() {
    supabase.from("subjects").select("id, name, color").eq("group_id", groupId).then(({ data }) => setSubjects((data as Subject[]) ?? []));
    supabase
      .from("grades")
      .select("subject_id, value")
      .eq("group_id", groupId)
      .eq("student_id", userId)
      .then(({ data }) => {
        const map: Record<string, number[]> = {};
        ((data as { subject_id: string | null; value: number }[]) ?? []).forEach((g) => {
          if (!g.subject_id) return;
          map[g.subject_id] = [...(map[g.subject_id] ?? []), g.value];
        });
        setGradesBySubject(map);
      });
  }

  useEffect(load, [groupId, userId]);

  async function addGrade(subjectId: string, value: number) {
    await supabase.from("grades").insert({ group_id: groupId, student_id: userId, subject_id: subjectId, value });
    load();
  }

  const subjectsWithGrades = subjects.filter((s) => (gradesBySubject[s.id] ?? []).length > 0);
  const overall10 = average(subjectsWithGrades.map((s) => average(gradesBySubject[s.id])));
  const overallGpa4 = average(subjectsWithGrades.map((s) => gpa4Average(gradesBySubject[s.id])));

  if (subjects.length === 0) {
    return <div className="empty-state">No subjects set up for this class yet.</div>;
  }

  return (
    <>
      {subjectsWithGrades.length > 0 && (
        <div className="hero" onClick={() => setGpaMode((m) => !m)}>
          <div className="hero-label">{gpaMode ? "GPA (US scale)" : "Overall average"}</div>
          <div className="hero-value mono-data">{(gpaMode ? overallGpa4 : overall10).toFixed(gpaMode ? 2 : 1)}</div>
          <div className="hero-scale">
            {gpaMode ? "out of 4.0 · tap for the 10-point scale" : "out of 10 · tap for the 4.0 scale"}
          </div>
        </div>
      )}

      <div className="subjects">
        {subjects.map((s) => {
          const grades = gradesBySubject[s.id] ?? [];
          const isOpen = openId === s.id;
          const displayAvg = grades.length ? (gpaMode ? gpa4Average(grades) : average(grades)) : null;
          return (
            <div className={"subject" + (isOpen ? " open" : "")} key={s.id}>
              <div className="subject-row" onClick={() => setOpenId(isOpen ? null : s.id)}>
                <div className="dot" style={{ background: s.color }} />
                <div className="subject-name">{s.name}</div>
                <div className="subject-avg mono-data">{displayAvg == null ? "—" : displayAvg.toFixed(gpaMode ? 2 : 1)}</div>
                <div className="chevron">›</div>
              </div>
              <div className="subject-detail">
                <div className="grade-history">
                  {grades.map((g, i) => (
                    <span className="grade-pill" key={i}>
                      {gpaMode ? toQualityPoints(g).toFixed(1) : g}
                    </span>
                  ))}
                </div>
                <div className="add-label">Add a grade</div>
                <div className="grade-picker">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                    <div className="grade-btn" key={n} onClick={() => addGrade(s.id, n)}>
                      {n}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function CourseGrades({ groupId, userId }: { groupId: string; userId: string }) {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    supabase
      .from("grades")
      .select("id, subject_id, label, value, graded_at")
      .eq("group_id", groupId)
      .eq("student_id", userId)
      .order("graded_at", { ascending: false })
      .then(({ data }) => setGrades((data as Grade[]) ?? []));
  }

  useEffect(load, [groupId, userId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim() || !value.trim()) return;
    setSaving(true);
    await supabase.from("grades").insert({
      group_id: groupId,
      student_id: userId,
      label: label.trim(),
      value: Number(value),
    });
    setSaving(false);
    setLabel("");
    setValue("");
    load();
  }

  const overall = average(grades.map((g) => g.value));

  return (
    <>
      {grades.length > 0 && (
        <div className="panel" style={{ textAlign: "center" }}>
          <div className="hero-value mono-data" style={{ fontSize: 32 }}>
            {overall.toFixed(1)}
          </div>
          <div className="hero-scale">average of {grades.length} entries</div>
        </div>
      )}

      <div className="panel">
        <div className="panel-label">ADD A SCORE</div>
        <form onSubmit={handleAdd} style={{ display: "flex", gap: 8 }}>
          <input
            className="field-input"
            placeholder="e.g. Practice Test 1"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <input
            className="field-input"
            style={{ width: 80 }}
            type="number"
            placeholder="95"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <button className="primary-btn" style={{ width: "auto", padding: "0 14px" }} disabled={saving}>
            Add
          </button>
        </form>
        <div className="field-hint">Track whatever scores matter for this course — any scale.</div>
      </div>

      {grades.length > 0 && (
        <div className="panel">
          <div className="panel-label">HISTORY</div>
          {grades.map((g) => (
            <div className="resource-row" key={g.id}>
              <div style={{ flex: 1 }}>
                <div className="resource-title">{g.label}</div>
                <div className="resource-sub">{g.graded_at}</div>
              </div>
              <div className="subject-avg mono-data">{g.value}</div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export default function Gpa() {
  const { user } = useAuth();
  const { activeGroup, approvedGroups } = useActiveGroup();

  return (
    <div className="page">
      <div className="pagetitle">Grades</div>
      <ClassSwitcher />

      {approvedGroups.length === 0 ? (
        <div className="empty-state">Join or create a class to track grades here.</div>
      ) : !activeGroup || !user ? null : activeGroup.type === "school_class" ? (
        <SchoolGrades groupId={activeGroup.group_id} userId={user.id} />
      ) : (
        <CourseGrades groupId={activeGroup.group_id} userId={user.id} />
      )}
    </div>
  );
}
