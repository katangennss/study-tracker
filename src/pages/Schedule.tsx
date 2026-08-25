import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { useActiveGroup } from "../lib/activeGroup";
import { supabase } from "../lib/supabase";
import { formatTime, todayISODate } from "../lib/dates";
import ClassSwitcher from "../components/ClassSwitcher";

type Period = {
  id: string;
  period_num: number;
  room: string | null;
  starts_at: string;
  ends_at: string;
  subjects: { name: string; color: string } | null;
};

type AttendanceRow = { id: string; session_date: string; status: "attended" | "missed" };

function weekDates(): { date: Date; isoDow: number }[] {
  const now = new Date();
  const dow = now.getDay();
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { date: d, isoDow: i + 1 };
  });
}

const DAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI"];

function SchoolSchedule({ groupId }: { groupId: string }) {
  const days = weekDates();
  const todayIso = new Date().getDay() === 0 ? 7 : new Date().getDay();
  const [activeDow, setActiveDow] = useState(days.some((d) => d.isoDow === todayIso) ? todayIso : 1);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [adding, setAdding] = useState(false);
  const [subjectName, setSubjectName] = useState("");
  const [room, setRoom] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    supabase
      .from("schedule_periods")
      .select("id, period_num, room, starts_at, ends_at, subjects(name, color)")
      .eq("group_id", groupId)
      .eq("day_of_week", activeDow)
      .order("period_num")
      .then(({ data }) => setPeriods((data as unknown as Period[]) ?? []));
  }

  useEffect(load, [groupId, activeDow]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!subjectName.trim() || !startsAt || !endsAt) return;
    setSaving(true);

    const { data: existing } = await supabase
      .from("subjects")
      .select("id")
      .eq("group_id", groupId)
      .ilike("name", subjectName.trim())
      .maybeSingle();

    let subjectId = existing?.id as string | undefined;
    if (!subjectId) {
      const { data: created } = await supabase
        .from("subjects")
        .insert({ group_id: groupId, name: subjectName.trim() })
        .select()
        .single();
      subjectId = created?.id;
    }

    if (subjectId) {
      await supabase.from("schedule_periods").insert({
        group_id: groupId,
        day_of_week: activeDow,
        period_num: periods.length + 1,
        subject_id: subjectId,
        room: room.trim() || null,
        starts_at: startsAt,
        ends_at: endsAt,
      });
      setSubjectName("");
      setRoom("");
      setStartsAt("");
      setEndsAt("");
      setAdding(false);
      load();
    }
    setSaving(false);
  }

  async function handleDelete(periodId: string) {
    await supabase.from("schedule_periods").delete().eq("id", periodId);
    load();
  }

  return (
    <>
      <div className="days">
        {days.map((d, i) => (
          <div
            key={d.isoDow}
            className={"day" + (activeDow === d.isoDow ? " active" : "")}
            onClick={() => setActiveDow(d.isoDow)}
          >
            <div className="day-label">{DAY_LABELS[i]}</div>
            <div className="day-num mono-data">{d.date.getDate()}</div>
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="panel-label">{DAY_LABELS[activeDow - 1]}</div>
        {periods.length === 0 ? (
          <div className="empty-state">Nothing scheduled for this day.</div>
        ) : (
          <div className="timeline">
            {periods.map((p) => (
              <div key={p.id} className="period">
                <div className="period-num">{p.period_num}</div>
                <div className="period-body">
                  <div>
                    <div className="period-time mono-data">
                      {formatTime(p.starts_at)}–{formatTime(p.ends_at)}
                    </div>
                    <div className="period-name">{p.subjects?.name ?? "Untitled"}</div>
                    {p.room && <div className="period-room">{p.room}</div>}
                  </div>
                  <button type="button" className="link-btn" onClick={() => handleDelete(p.id)}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {adding ? (
        <div className="panel">
          <div className="panel-label">ADD PERIOD · {DAY_LABELS[activeDow - 1]}</div>
          <form onSubmit={handleAdd}>
            <div className="field">
              <label className="field-label">Subject</label>
              <input className="field-input" value={subjectName} onChange={(e) => setSubjectName(e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">Room (optional)</label>
              <input className="field-input" value={room} onChange={(e) => setRoom(e.target.value)} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div className="field" style={{ flex: 1 }}>
                <label className="field-label">Starts</label>
                <input className="field-input" type="time" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label className="field-label">Ends</label>
                <input className="field-input" type="time" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="primary-btn" disabled={saving}>
                {saving ? "Adding…" : "Add Period"}
              </button>
              <button
                type="button"
                className="primary-btn"
                style={{ background: "var(--card)", color: "var(--ink)", border: "1px solid var(--line)" }}
                onClick={() => setAdding(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        <button type="button" className="list-row" style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--radius)", width: "100%" }} onClick={() => setAdding(true)}>
          <span className="list-row-label">+ Add Period</span>
        </button>
      )}

      <div className="hint">Anyone in the class can edit the schedule — it's shared and visible to everyone.</div>
    </>
  );
}

function CourseSessions({ groupId, totalSessions }: { groupId: string; totalSessions: number | null }) {
  const { user } = useAuth();
  const { refresh } = useActiveGroup();
  const [logs, setLogs] = useState<AttendanceRow[]>([]);
  const [packageInput, setPackageInput] = useState(totalSessions?.toString() ?? "");
  const [savingPackage, setSavingPackage] = useState(false);

  function loadLogs() {
    if (!user) return;
    supabase
      .from("attendance_logs")
      .select("id, session_date, status")
      .eq("group_id", groupId)
      .eq("student_id", user.id)
      .order("session_date", { ascending: false })
      .then(({ data }) => setLogs((data as AttendanceRow[]) ?? []));
  }

  useEffect(loadLogs, [groupId, user]);

  async function logSession(status: "attended" | "missed") {
    if (!user) return;
    await supabase
      .from("attendance_logs")
      .insert({ group_id: groupId, student_id: user.id, status, session_date: todayISODate() });
    loadLogs();
  }

  async function savePackage(e: React.FormEvent) {
    e.preventDefault();
    const total = parseInt(packageInput, 10);
    if (!total || total < 1) return;
    setSavingPackage(true);
    await supabase.rpc("set_my_session_package", { gid: groupId, total });
    setSavingPackage(false);
    refresh();
  }

  const used = logs.length;
  const missed = logs.filter((l) => l.status === "missed").length;

  return (
    <>
      <div className="panel" style={{ textAlign: "center" }}>
        <div className="hero-value mono-data" style={{ fontSize: 32 }}>
          {used}
          {totalSessions ? ` / ${totalSessions}` : ""}
        </div>
        <div className="hero-scale">
          classes used{missed > 0 ? ` · ${missed} missed` : ""}
        </div>
      </div>

      <div className="panel">
        <div className="panel-label">LOG TODAY'S CLASS</div>
        <div style={{ display: "flex", gap: 10 }}>
          <div className="primary-btn" style={{ flex: 1, background: "var(--teal)" }} onClick={() => logSession("attended")}>
            Attended
          </div>
          <div
            className="primary-btn"
            style={{ flex: 1, background: "var(--card)", color: "var(--ink)", border: "1px solid var(--line)" }}
            onClick={() => logSession("missed")}
          >
            Missed
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-label">PACKAGE SIZE</div>
        <form onSubmit={savePackage} style={{ display: "flex", gap: 8 }}>
          <input
            className="field-input"
            type="number"
            min={1}
            placeholder="e.g. 10"
            value={packageInput}
            onChange={(e) => setPackageInput(e.target.value)}
          />
          <button className="primary-btn" style={{ width: "auto", padding: "0 16px" }} disabled={savingPackage}>
            Save
          </button>
        </form>
        <div className="field-hint">How many classes you paid for — this is just for your own tracking.</div>
      </div>

      {logs.length > 0 && (
        <div className="panel">
          <div className="panel-label">HISTORY</div>
          {logs.map((l) => (
            <div className="resource-row" key={l.id}>
              <span className="dot" style={{ background: l.status === "attended" ? "#1D7A6E" : "#E0574B" }} />
              <div style={{ flex: 1 }}>
                <div className="resource-title">{l.session_date}</div>
                <div className="resource-sub">{l.status === "attended" ? "Attended" : "Missed"}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export default function Schedule() {
  const { activeGroup, approvedGroups } = useActiveGroup();

  return (
    <div className="page">
      <div className="pagetitle">{activeGroup?.type === "course" ? "Sessions" : "Schedule"}</div>
      <ClassSwitcher />

      {approvedGroups.length === 0 ? (
        <div className="empty-state">Join or create a class to see its schedule here.</div>
      ) : activeGroup?.type === "school_class" ? (
        <SchoolSchedule groupId={activeGroup.group_id} />
      ) : activeGroup ? (
        <CourseSessions groupId={activeGroup.group_id} totalSessions={activeGroup.total_sessions} />
      ) : null}
    </div>
  );
}
