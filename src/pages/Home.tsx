import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { useActiveGroup } from "../lib/activeGroup";
import { isoDayOfWeek, todayISODate, formatTime } from "../lib/dates";
import ClassSwitcher from "../components/ClassSwitcher";
import { useLanguage } from "../lib/i18n";

type Period = {
  id: string;
  period_num: number;
  room: string | null;
  starts_at: string;
  ends_at: string;
  subjects: { name: string; color: string } | null;
};

type HomeworkRow = {
  id: string;
  text: string;
  due_date: string;
  subjects: { name: string; color: string } | null;
};

type MaterialRow = { id: string; title: string; created_at: string };

export default function Home() {
  const { user } = useAuth();
  const { activeGroup, approvedGroups, loading: groupsLoading, totalPendingRequests } = useActiveGroup();
  const { t } = useLanguage();

  function greeting() {
    const h = new Date().getHours();
    return h < 12 ? t("home.greetingMorning") : h < 18 ? t("home.greetingAfternoon") : t("home.greetingEvening");
  }

  const [periods, setPeriods] = useState<Period[]>([]);
  const [homework, setHomework] = useState<HomeworkRow[]>([]);
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [attendance, setAttendance] = useState<{ attended: number }>({ attended: 0 });
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name").eq("id", user.id).single().then(({ data }) => {
      setFullName(data?.full_name?.split(" ")[0] ?? "");
    });
  }, [user]);

  useEffect(() => {
    if (!activeGroup || !user) {
      setPeriods([]);
      setHomework([]);
      setMaterials([]);
      return;
    }

    if (activeGroup.type === "school_class") {
      supabase
        .from("schedule_periods")
        .select("id, period_num, room, starts_at, ends_at, subjects(name, color)")
        .eq("group_id", activeGroup.group_id)
        .eq("day_of_week", isoDayOfWeek(new Date()))
        .order("period_num")
        .then(({ data }) => setPeriods((data as unknown as Period[]) ?? []));
    } else {
      supabase
        .from("attendance_logs")
        .select("created_at")
        .eq("group_id", activeGroup.group_id)
        .eq("student_id", user.id)
        .gte("created_at", activeGroup.sessionsResetAt)
        .then(({ data }) => {
          setAttendance({ attended: (data ?? []).length });
        });
    }

    supabase
      .from("homework_items")
      .select("id, text, due_date, subjects(name, color)")
      .eq("group_id", activeGroup.group_id)
      .gte("due_date", todayISODate())
      .order("due_date")
      .limit(5)
      .then(async ({ data }) => {
        const items = (data as unknown as HomeworkRow[]) ?? [];
        setHomework(items);
        if (items.length > 0) {
          const { data: statusRows } = await supabase
            .from("homework_status")
            .select("homework_item_id, done")
            .eq("student_id", user.id)
            .in("homework_item_id", items.map((i) => i.id));
          setDoneIds(new Set((statusRows ?? []).filter((r) => r.done).map((r) => r.homework_item_id)));
        }
      });

    supabase
      .from("materials")
      .select("id, title, created_at")
      .eq("group_id", activeGroup.group_id)
      .order("created_at", { ascending: false })
      .limit(3)
      .then(({ data }) => setMaterials((data as MaterialRow[]) ?? []));
  }, [activeGroup, user]);

  return (
    <div className="page">
      <div className="topbar">
        <div>
          <div className="school">{activeGroup?.org_name ?? "Study Tracker"}</div>
          <div className="greeting">
            {greeting()},
            <br />
            {fullName || "…"}
          </div>
        </div>
        <Link to="/profile" className="avatar-link" aria-label="Profile">
          <div className="avatar-wrap">
            <div className="avatar">{fullName ? fullName[0].toUpperCase() : "?"}</div>
            {totalPendingRequests > 0 && <span className="notif-dot" />}
          </div>
        </Link>
      </div>

      <ClassSwitcher />

      {!groupsLoading && approvedGroups.length === 0 ? (
        <div className="panel">
          <div className="empty-state">
            {t("home.noClassesYet")}
            <br />
            <Link to="/profile/add-class" className="link-btn" style={{ color: "var(--accent, var(--teal))" }}>
              {t("home.joinOrCreate")}
            </Link>
          </div>
        </div>
      ) : activeGroup?.type === "school_class" ? (
        <div className="panel">
          <h2>{t("home.todaysSchedule")}</h2>
          {periods.length === 0 ? (
            <div className="empty-state">{t("home.nothingScheduledToday")}</div>
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
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeGroup ? (
        <div className="panel">
          <h2>{t("home.sessions")}</h2>
          <div className="stat-row">
            <div className="stat">
              <div className="stat-label">{t("home.attendedThisPackage")}</div>
              <div className="stat-value mono-data">
                {attendance.attended}
                {activeGroup.total_sessions ? ` / ${activeGroup.total_sessions}` : ""}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {activeGroup && (
        <div className="panel">
          <h2>{t("home.dueSoon")}</h2>
          {homework.length === 0 ? (
            <div className="empty-state">{t("home.nothingDue")}</div>
          ) : (
            homework.map((h) => (
              <div className="resource-row" key={h.id}>
                <span className="dot" style={{ background: doneIds.has(h.id) ? "#1D7A6E" : (h.subjects?.color ?? "#999") }} />
                <div style={{ flex: 1 }}>
                  <div className="resource-title">{h.text}</div>
                  <div className="resource-sub">
                    {h.subjects?.name} · {t("homework.due", { date: h.due_date })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeGroup && materials.length > 0 && (
        <div className="panel">
          <h2>{t("home.newInMaterials")}</h2>
          {materials.map((m) => (
            <div className="resource-row" key={m.id}>
              <div className="dot" style={{ background: "#6C63FF" }} />
              <div style={{ flex: 1 }}>
                <div className="resource-title">{m.title}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
