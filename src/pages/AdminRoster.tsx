import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import SubpageHeader from "../components/SubpageHeader";
import { supabase } from "../lib/supabase";
import { useLanguage } from "../lib/i18n";
import { useActiveGroup } from "../lib/activeGroup";

type RosterRow = {
  student_id: string;
  role: "student" | "admin";
  status: "pending" | "approved" | "rejected";
  profiles: { full_name: string } | null;
};

export default function AdminRoster() {
  const { groupId } = useParams<{ groupId: string }>();
  const { t } = useLanguage();
  const { refresh } = useActiveGroup();
  const [rows, setRows] = useState<RosterRow[]>([]);

  function load() {
    if (!groupId) return;
    supabase
      .from("enrollments")
      .select("student_id, role, status, profiles(full_name)")
      .eq("group_id", groupId)
      .then(({ data }) => setRows((data as unknown as RosterRow[]) ?? []));
  }

  useEffect(load, [groupId]);

  async function setStatus(studentId: string, status: "approved" | "rejected") {
    await supabase.from("enrollments").update({ status }).eq("group_id", groupId!).eq("student_id", studentId);
    load();
    refresh();
  }

  async function remove(studentId: string) {
    await supabase.from("enrollments").delete().eq("group_id", groupId!).eq("student_id", studentId);
    load();
    refresh();
  }

  async function makeAdmin(studentId: string) {
    await supabase.from("enrollments").update({ role: "admin" }).eq("group_id", groupId!).eq("student_id", studentId);
    load();
    refresh();
  }

  const pending = rows.filter((r) => r.status === "pending");
  const approved = rows.filter((r) => r.status === "approved");

  return (
    <div className="page">
      <SubpageHeader title={t("adminRoster.title")} back={`/admin/${groupId}`} />

      {pending.length > 0 && (
        <>
          <div className="panel-label">{t("adminRoster.pending")}</div>
          <div className="list">
            {pending.map((r) => (
              <div className="list-row" key={r.student_id} style={{ cursor: "default" }}>
                <span className="list-row-label">{r.profiles?.full_name ?? t("common.unknown")}</span>
                <button
                  type="button"
                  className="link-btn"
                  style={{ marginRight: 10 }}
                  onClick={() => setStatus(r.student_id, "approved")}
                >
                  {t("adminRoster.approve")}
                </button>
                <button
                  type="button"
                  className="link-btn"
                  style={{ color: "#c0392b" }}
                  onClick={() => setStatus(r.student_id, "rejected")}
                >
                  {t("adminRoster.reject")}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="panel-label">{t("adminRoster.members")}</div>
      {approved.length === 0 ? (
        <div className="empty-state">{t("adminRoster.noMembers")}</div>
      ) : (
        <div className="list">
          {approved.map((r) => (
            <div className="list-row" key={r.student_id} style={{ cursor: "default" }}>
              <span className="list-row-label">
                {r.profiles?.full_name ?? t("common.unknown")}
                {r.role === "admin" && ` · ${t("profile.admin")}`}
              </span>
              {r.role !== "admin" && (
                <>
                  <button
                    type="button"
                    className="link-btn"
                    style={{ marginRight: 10 }}
                    onClick={() => makeAdmin(r.student_id)}
                  >
                    {t("adminRoster.makeAdmin")}
                  </button>
                  <button
                    type="button"
                    className="link-btn"
                    style={{ color: "#c0392b" }}
                    onClick={() => remove(r.student_id)}
                  >
                    {t("common.remove")}
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
