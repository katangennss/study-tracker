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

type AttendanceRow = { id: string; session_date: string; created_at: string };
type Reminder = { id: string };

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

function CourseSessions({
  groupId,
  totalSessions,
  sessionsResetAt,
}: {
  groupId: string;
  totalSessions: number | null;
  sessionsResetAt: string;
}) {
  const { user } = useAuth();
  const { refresh } = useActiveGroup();
  const [logs, setLogs] = useState<AttendanceRow[]>([]);
  const [reminder, setReminder] = useState<Reminder | null>(null);
  const [packageInput, setPackageInput] = useState(totalSessions?.toString() ?? "");
  const [savingPackage, setSavingPackage] = useState(false);

  function loadLogs() {
    if (!user) return;
    supabase
      .from("attendance_logs")
      .select("id, session_date, created_at")
      .eq("group_id", groupId)
      .eq("student_id", user.id)
      .order("session_date", { ascending: false })
      .then(({ data }) => setLogs((data as AttendanceRow[]) ?? []));
  }

  async function loadReminder() {
    if (!user) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("payment_reminders_enabled")
      .eq("id", user.id)
      .single();
    if (profile?.payment_reminders_enabled === false) {
      setReminder(null);
      return;
    }
    const { data } = await supabase
      .from("payment_reminders")
      .select("id")
      .eq("group_id", groupId)
      .eq("student_id", user.id)
      .eq("acknowledged", false)
      .limit(1)
      .maybeSingle();
    setReminder(data as Reminder | null);
  }

  useEffect(loadLogs, [groupId, user]);
  useEffect(() => {
    loadReminder();
  }, [groupId, user]);

  const usedThisCycle = logs.filter((l) => l.created_at >= sessionsResetAt).length;

  async function logAttended() {
    if (!user) return;
    await supabase
      .from("attendance_logs")
      .insert({ group_id: groupId, student_id: user.id, status: "attended", session_date: todayISODate() });

    if (totalSessions && usedThisCycle + 1 >= totalSessions) {
      await supabase.from("enrollments").update({ sessions_reset_at: new Date().toISOString() }).eq("group_id", groupId).eq("student_id", user.id);
      await supabase.from("payment_reminders").insert({ group_id: groupId, student_id: user.id });
      refresh();
      loadReminder();
    }
    loadLogs();
  }

  async function deleteLog(id: string) {
    await supabase.from("attendance_logs").delete().eq("id", id);
    loadLogs();
  }

  async function dismissReminder() {
    if (!reminder) return;
    await supabase.from("payment_reminders").update({ acknowledged: true }).eq("id", reminder.id);
    setReminder(null);
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

  return (
    <>
      {reminder && (
        <div className="panel" style={{ background: "var(--amber-soft)", borderColor: "var(--amber)" }}>
          <div className="resource-title">Time to pay for this class</div>
          <div className="resource-sub" style={{ marginBottom: 10 }}>
            You've used your full {totalSessions}-class package.
          </div>
          <button type="button" className="link-btn" onClick={dismissReminder}>
            Got it
          </button>
        </div>
      )}

      <div className="panel" style={{ textAlign: "center" }}>
        <div className="hero-value mono-data" style={{ fontSize: 32 }}>
          {usedThisCycle}
          {totalSessions ? ` / ${totalSessions}` : ""}
        </div>
        <div className="hero-scale">classes attended this package</div>
      </div>

      <div className="panel">
        <div className="panel-label">LOG TODAY'S CLASS</div>
        <div className="primary-btn" onClick={logAttended}>
          Attended
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
        <div className="field-hint">
          How many classes you paid for. Once you hit this many attended, the count resets to 0 and
          you'll get a reminder it's time to pay again.
        </div>
      </div>

      {logs.length > 0 && (
        <div className="panel">
          <div className="panel-label">HISTORY</div>
          {logs.map((l) => (
            <div className="resource-row" key={l.id}>
              <span className="dot" style={{ background: "#1D7A6E" }} />
              <div style={{ flex: 1 }}>
                <div className="resource-title">{l.session_date}</div>
                <div className="resource-sub">Attended</div>
              </div>
              <button type="button" className="link-btn" style={{ color: "#c0392b" }} onClick={() => deleteLog(l.id)}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18" />
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                </svg>
              </button>
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
        <CourseSessions
          groupId={activeGroup.group_id}
          totalSessions={activeGroup.total_sessions}
          sessionsResetAt={activeGroup.sessionsResetAt}
        />
      ) : null}
    </div>
  );
}
