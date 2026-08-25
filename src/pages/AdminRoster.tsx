import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import SubpageHeader from "../components/SubpageHeader";
import { supabase } from "../lib/supabase";

type RosterRow = {
  student_id: string;
  role: "student" | "admin";
  status: "pending" | "approved" | "rejected";
  profiles: { full_name: string } | null;
};

export default function AdminRoster() {
  const { groupId } = useParams<{ groupId: string }>();
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
  }

  async function remove(studentId: string) {
    await supabase.from("enrollments").delete().eq("group_id", groupId!).eq("student_id", studentId);
    load();
  }

  async function makeAdmin(studentId: string) {
    await supabase.from("enrollments").update({ role: "admin" }).eq("group_id", groupId!).eq("student_id", studentId);
    load();
  }

  const pending = rows.filter((r) => r.status === "pending");
  const approved = rows.filter((r) => r.status === "approved");

  return (
    <div className="page">
      <SubpageHeader title="Roster" back={`/admin/${groupId}`} />

      {pending.length > 0 && (
        <>
          <div className="panel-label">PENDING</div>
          <div className="list">
            {pending.map((r) => (
              <div className="list-row" key={r.student_id} style={{ cursor: "default" }}>
                <span className="list-row-label">{r.profiles?.full_name ?? "Unknown"}</span>
                <button
                  type="button"
                  className="link-btn"
                  style={{ background: "none", border: "none", cursor: "pointer", marginRight: 10 }}
                  onClick={() => setStatus(r.student_id, "approved")}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="link-btn"
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#c0392b" }}
                  onClick={() => setStatus(r.student_id, "rejected")}
                >
                  Reject
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="panel-label">MEMBERS</div>
      {approved.length === 0 ? (
        <div className="empty-state">No approved members yet.</div>
      ) : (
        <div className="list">
          {approved.map((r) => (
            <div className="list-row" key={r.student_id} style={{ cursor: "default" }}>
              <span className="list-row-label">
                {r.profiles?.full_name ?? "Unknown"}
                {r.role === "admin" && " · Admin"}
              </span>
              {r.role !== "admin" && (
                <>
                  <button
                    type="button"
                    className="link-btn"
                    style={{ marginRight: 10 }}
                    onClick={() => makeAdmin(r.student_id)}
                  >
                    Make Admin
                  </button>
                  <button
                    type="button"
                    className="link-btn"
                    style={{ color: "#c0392b" }}
                    onClick={() => remove(r.student_id)}
                  >
                    Remove
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
