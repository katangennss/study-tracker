import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PencilIcon, BellIcon, GearIcon, InfoIcon, HelpCircleIcon, LogOutIcon, PlusIcon } from "../components/icons";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { useActiveGroup } from "../lib/activeGroup";
import { useLanguage } from "../lib/i18n";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export default function Profile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { groups, loading } = useActiveGroup();
  const { t } = useLanguage();
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single()
      .then(({ data }) => setFullName(data?.full_name ?? ""));
  }, [user]);

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  const approvedCount = groups.filter((g) => g.status === "approved").length;

  return (
    <div className="page">
      <div className="pagetitle">{t("profile.title")}</div>

      <div className="profile-header">
        <div className="avatar-lg">{initials(fullName)}</div>
        <div className="profile-name">{fullName || "…"}</div>
        <div className="profile-sub">
          {approvedCount} {approvedCount === 1 ? t("profile.class") : t("profile.classes")}
        </div>
      </div>

      <div className="panel-label">{t("profile.myClasses")}</div>
      <div className="list">
        {loading ? (
          <div className="list-row" style={{ cursor: "default" }}>
            <span className="list-row-label">…</span>
          </div>
        ) : (
          groups.map((g) => (
            <div className="list-row" key={g.group_id} style={{ cursor: "default" }}>
              <span className="dot" style={{ background: g.type === "school_class" ? "#1D7A6E" : "#6C63FF" }} />
              <span style={{ flex: 1 }}>
                <span className="list-row-label" style={{ display: "block" }}>
                  {g.name}
                </span>
                <span className="resource-sub">
                  {g.org_name} · {g.type === "school_class" ? t("profile.schoolClass") : t("profile.course")}
                  {g.status === "pending" && ` · ${t("profile.pendingApproval")}`}
                  {g.role === "admin" && ` · ${t("profile.admin")}`}
                </span>
              </span>
              {g.role === "admin" && g.status === "approved" && (
                <button type="button" className="link-btn" onClick={() => navigate(`/admin/${g.group_id}`)}>
                  {t("profile.manage")}
                </button>
              )}
            </div>
          ))
        )}
        <button className="list-row" onClick={() => navigate("/profile/add-class")}>
          <span className="list-row-icon">
            <PlusIcon />
          </span>
          <span className="list-row-label">{t("profile.addClass")}</span>
        </button>
      </div>

      <div className="list">
        <Link className="list-row" to="/profile/edit">
          <span className="list-row-icon">
            <PencilIcon />
          </span>
          <span className="list-row-label">{t("profile.editProfile")}</span>
          <span className="list-row-chevron">›</span>
        </Link>
        <Link className="list-row" to="/profile/notifications">
          <span className="list-row-icon">
            <BellIcon />
          </span>
          <span className="list-row-label">{t("profile.notifications")}</span>
          <span className="list-row-chevron">›</span>
        </Link>
        <Link className="list-row" to="/profile/settings">
          <span className="list-row-icon">
            <GearIcon />
          </span>
          <span className="list-row-label">{t("profile.settings")}</span>
          <span className="list-row-chevron">›</span>
        </Link>
        <Link className="list-row" to="/profile/help">
          <span className="list-row-icon">
            <HelpCircleIcon />
          </span>
          <span className="list-row-label">{t("profile.help")}</span>
          <span className="list-row-chevron">›</span>
        </Link>
        <Link className="list-row" to="/profile/about">
          <span className="list-row-icon">
            <InfoIcon />
          </span>
          <span className="list-row-label">{t("profile.about")}</span>
          <span className="list-row-chevron">›</span>
        </Link>
      </div>

      <div className="list">
        <button className="list-row danger" onClick={handleSignOut}>
          <span className="list-row-icon">
            <LogOutIcon />
          </span>
          <span className="list-row-label">{t("profile.signOut")}</span>
        </button>
      </div>
    </div>
  );
}
