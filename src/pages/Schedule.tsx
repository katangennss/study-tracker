import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { useActiveGroup } from "../lib/activeGroup";
import { supabase } from "../lib/supabase";
import { formatTime, todayISODate } from "../lib/dates";
import ClassSwitcher from "../components/ClassSwitcher";
import { useLanguage, type TranslationKey } from "../lib/i18n";

type Period = {
  id: string;
  period_num: number;
  room: string | null;
  starts_at: string;
  ends_at: string;
  subject_id: string | null;
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

const DAY_KEYS: TranslationKey[] = [
  "schedule.dayMon",
  "schedule.dayTue",
  "schedule.dayWed",
  "schedule.dayThu",
  "schedule.dayFri",
];

function SchoolSchedule({ groupId, isAdmin }: { groupId: string; isAdmin: boolean }) {
  const { t } = useLanguage();
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
      .select("id, period_num, room, starts_at, ends_at, subject_id, subjects(name, color)")
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

  async function handleDelete(periodId: string, subjectId: string | null, subjectName: string) {
    await supabase.from("schedule_periods").delete().eq("id", periodId);

    if (subjectId) {
      const { count: remainingPeriods } = await supabase
        .from("schedule_periods")
        .select("id", { count: "exact", head: true })
        .eq("subject_id", subjectId);
      if ((remainingPeriods ?? 0) === 0) {
        const confirmed = window.confirm(t("schedule.confirmDeleteSubject", { subject: subjectName }));
        if (confirmed) {
          await supabase.from("subjects").delete().eq("id", subjectId);
        }
      }
    }

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
            <div className="day-label">{t(DAY_KEYS[i])}</div>
            <div className="day-num mono-data">{d.date.getDate()}</div>
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="panel-label">{t(DAY_KEYS[activeDow - 1])}</div>
        {periods.length === 0 ? (
          <div className="empty-state">{t("schedule.nothingThisDay")}</div>
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
                    <div className="period-name">{p.subjects?.name ?? t("common.untitled")}</div>
                    {p.room && <div className="period-room">{p.room}</div>}
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() => handleDelete(p.id, p.subject_id, p.subjects?.name ?? t("common.untitled"))}
                    >
                      {t("common.remove")}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isAdmin && (
        <>
          {adding ? (
            <div className="panel">
              <div className="panel-label">{t("schedule.addPeriodFor", { day: t(DAY_KEYS[activeDow - 1]) })}</div>
              <form onSubmit={handleAdd}>
                <div className="field">
                  <label className="field-label">{t("schedule.subject")}</label>
                  <input className="field-input" value={subjectName} onChange={(e) => setSubjectName(e.target.value)} />
                </div>
                <div className="field">
                  <label className="field-label">{t("schedule.roomOptional")}</label>
                  <input className="field-input" value={room} onChange={(e) => setRoom(e.target.value)} />
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <div className="field" style={{ flex: 1 }}>
                    <label className="field-label">{t("schedule.starts")}</label>
                    <input className="field-input" type="time" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
                  </div>
                  <div className="field" style={{ flex: 1 }}>
                    <label className="field-label">{t("schedule.ends")}</label>
                    <input className="field-input" type="time" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button className="primary-btn" disabled={saving}>
                    {saving ? t("schedule.adding") : t("schedule.addPeriod")}
                  </button>
                  <button
                    type="button"
                    className="primary-btn"
                    style={{ background: "var(--card)", color: "var(--ink)", border: "1px solid var(--line)" }}
                    onClick={() => setAdding(false)}
                  >
                    {t("common.cancel")}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <button type="button" className="list-row" style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--radius)", width: "100%" }} onClick={() => setAdding(true)}>
              <span className="list-row-label">{t("schedule.addPeriodBtn")}</span>
            </button>
          )}
          <div className="hint">{t("schedule.editHint")}</div>
        </>
      )}
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
  const { t } = useLanguage();
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
          <div className="resource-title">{t("schedule.payReminderTitle")}</div>
          <div className="resource-sub" style={{ marginBottom: 10 }}>
            {t("schedule.payReminderBody", { total: totalSessions ?? "" })}
          </div>
          <button type="button" className="link-btn" onClick={dismissReminder}>
            {t("schedule.gotIt")}
          </button>
        </div>
      )}

      <div className="panel" style={{ textAlign: "center" }}>
        <div className="hero-value mono-data" style={{ fontSize: 32 }}>
          {usedThisCycle}
          {totalSessions ? ` / ${totalSessions}` : ""}
        </div>
        <div className="hero-scale">{t("schedule.classesAttended")}</div>
      </div>

      <div className="panel">
        <div className="panel-label">{t("schedule.logToday")}</div>
        <div className="primary-btn" onClick={logAttended}>
          {t("schedule.attended")}
        </div>
      </div>

      <div className="panel">
        <div className="panel-label">{t("schedule.packageSize")}</div>
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
            {t("common.save")}
          </button>
        </form>
        <div className="field-hint">{t("schedule.packageHint")}</div>
      </div>

      {logs.length > 0 && (
        <div className="panel">
          <div className="panel-label">{t("schedule.history")}</div>
          {logs.map((l) => (
            <div className="resource-row" key={l.id}>
              <span className="dot" style={{ background: "#1D7A6E" }} />
              <div style={{ flex: 1 }}>
                <div className="resource-title">{l.session_date}</div>
                <div className="resource-sub">{t("schedule.attended")}</div>
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
  const { t } = useLanguage();

  return (
    <div className="page">
      <div className="pagetitle">{activeGroup?.type === "course" ? t("schedule.sessionsTitle") : t("schedule.title")}</div>
      <ClassSwitcher />

      {approvedGroups.length === 0 ? (
        <div className="empty-state">{t("schedule.joinToSee")}</div>
      ) : activeGroup?.type === "school_class" ? (
        <SchoolSchedule groupId={activeGroup.group_id} isAdmin={activeGroup.role === "admin"} />
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
