import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { useActiveGroup } from "../lib/activeGroup";
import { isoDayOfWeek, todayISODate, formatTime } from "../lib/dates";
import ClassSwitcher from "../components/ClassSwitcher";

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

const GREETINGS = ["Good morning", "Good afternoon", "Good evening"];
function greeting() {
  const h = new Date().getHours();
  return GREETINGS[h < 12 ? 0 : h < 18 ? 1 : 2];
}

export default function Home() {
  const { user } = useAuth();
  const { activeGroup, approvedGroups, loading: groupsLoading } = useActiveGroup();

  const [periods, setPeriods] = useState<Period[]>([]);
  const [homework, setHomework] = useState<HomeworkRow[]>([]);
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [attendance, setAttendance] = useState<{ attended: number; missed: number }>({ attended: 0, missed: 0 });
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
        .select("status")
        .eq("group_id", activeGroup.group_id)
        .eq("student_id", user.id)
        .then(({ data }) => {
          const rows = data ?? [];
          setAttendance({
            attended: rows.filter((r) => r.status === "attended").length,
            missed: rows.filter((r) => r.status === "missed").length,
          });
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
          <div className="avatar">{fullName ? fullName[0].toUpperCase() : "?"}</div>
        </Link>
      </div>

      <ClassSwitcher />

      {!groupsLoading && approvedGroups.length === 0 ? (
        <div className="panel">
          <div className="empty-state">
            You're not in any classes yet.
            <br />
            <Link to="/profile/add-class" className="link-btn" style={{ color: "var(--accent, var(--teal))" }}>
              Join or create one →
            </Link>
          </div>
        </div>
      ) : activeGroup?.type === "school_class" ? (
        <div className="panel">
          <h2>Today's Schedule</h2>
          {periods.length === 0 ? (
            <div className="empty-state">Nothing scheduled today.</div>
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
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeGroup ? (
        <div className="panel">
          <h2>Sessions</h2>
          <div className="stat-row">
            <div className="stat">
              <div className="stat-label">Used</div>
              <div className="stat-value mono-data">
                {attendance.attended + attendance.missed}
                {activeGroup.total_sessions ? ` / ${activeGroup.total_sessions}` : ""}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Missed</div>
              <div className="stat-value mono-data">{attendance.missed}</div>
            </div>
          </div>
        </div>
      ) : null}

      {activeGroup && (
        <div className="panel">
          <h2>Due Soon</h2>
          {homework.length === 0 ? (
            <div className="empty-state">Nothing due.</div>
          ) : (
            homework.map((h) => (
              <div className="resource-row" key={h.id}>
                <span className="dot" style={{ background: doneIds.has(h.id) ? "#1D7A6E" : (h.subjects?.color ?? "#999") }} />
                <div style={{ flex: 1 }}>
                  <div className="resource-title">{h.text}</div>
                  <div className="resource-sub">
                    {h.subjects?.name} · Due {h.due_date}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeGroup && materials.length > 0 && (
        <div className="panel">
          <h2>New in Materials</h2>
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
