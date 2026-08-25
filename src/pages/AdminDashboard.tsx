import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import SubpageHeader from "../components/SubpageHeader";
import { supabase } from "../lib/supabase";

type GroupInfo = { name: string; org_name: string; invite_code: string };

export default function AdminDashboard() {
  const { groupId } = useParams<{ groupId: string }>();
  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!groupId) return;
    supabase
      .from("groups")
      .select("name, org_name, invite_code")
      .eq("id", groupId)
      .single()
      .then(({ data }) => setGroup(data as GroupInfo));

    supabase
      .from("enrollments")
      .select("student_id", { count: "exact", head: true })
      .eq("group_id", groupId)
      .eq("status", "pending")
      .then(({ count }) => setPendingCount(count ?? 0));
  }, [groupId]);

  return (
    <div className="page">
      <SubpageHeader title={group?.name ?? "Manage Class"} back="/profile" />

      <div className="panel-label">{group?.org_name}</div>

      <div className="list">
        <Link className="list-row" to={`/admin/${groupId}/roster`}>
          <span className="list-row-label">Roster</span>
          {pendingCount > 0 && <span className="grade-pill">{pendingCount} pending</span>}
          <span className="list-row-chevron">›</span>
        </Link>
        <Link className="list-row" to={`/admin/${groupId}/homework`}>
          <span className="list-row-label">Homework</span>
          <span className="list-row-chevron">›</span>
        </Link>
        <Link className="list-row" to={`/admin/${groupId}/settings`}>
          <span className="list-row-label">Settings</span>
          <span className="list-row-chevron">›</span>
        </Link>
      </div>

      <div className="hint">
        Materials are managed from the regular Materials tab — switch to this class there and you'll see
        admin controls to add or remove them.
      </div>

      {group && (
        <div className="panel" style={{ textAlign: "center", marginTop: 24 }}>
          <div className="stat-label">Invite code</div>
          <div className="hero-value mono-data" style={{ fontSize: 26 }}>
            {group.invite_code}
          </div>
        </div>
      )}
    </div>
  );
}
