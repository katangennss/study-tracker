import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import SubpageHeader from "../components/SubpageHeader";
import { supabase } from "../lib/supabase";
import { useLanguage } from "../lib/i18n";

type GroupInfo = { name: string; org_name: string; invite_code: string };

export default function AdminDashboard() {
  const { groupId } = useParams<{ groupId: string }>();
  const { t } = useLanguage();
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
      <SubpageHeader title={group?.name ?? t("admin.manageClass")} back="/profile" />

      <div className="panel-label">{group?.org_name}</div>

      <div className="list">
        <Link className="list-row" to={`/admin/${groupId}/roster`}>
          <span className="list-row-label">{t("admin.roster")}</span>
          {pendingCount > 0 && <span className="grade-pill">{t("admin.pending", { count: pendingCount })}</span>}
          <span className="list-row-chevron">›</span>
        </Link>
        <Link className="list-row" to={`/admin/${groupId}/homework`}>
          <span className="list-row-label">{t("admin.homework")}</span>
          <span className="list-row-chevron">›</span>
        </Link>
        <Link className="list-row" to={`/admin/${groupId}/settings`}>
          <span className="list-row-label">{t("admin.settings")}</span>
          <span className="list-row-chevron">›</span>
        </Link>
      </div>

      <div className="hint">{t("admin.materialsHint")}</div>

      {group && (
        <div className="panel" style={{ textAlign: "center", marginTop: 24 }}>
          <div className="stat-label">{t("admin.inviteCode")}</div>
          <div className="hero-value mono-data" style={{ fontSize: 26 }}>
            {group.invite_code}
          </div>
        </div>
      )}
    </div>
  );
}
