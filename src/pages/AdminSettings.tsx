import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import SubpageHeader from "../components/SubpageHeader";
import { supabase } from "../lib/supabase";
import { useActiveGroup } from "../lib/activeGroup";
import { useLanguage } from "../lib/i18n";

type GroupInfo = { name: string; org_name: string; allow_peer_materials: boolean; type: "school_class" | "course" };

export default function AdminSettings() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { refresh } = useActiveGroup();
  const { t } = useLanguage();

  const [name, setName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [allowPeer, setAllowPeer] = useState(false);
  const [groupType, setGroupType] = useState<"school_class" | "course" | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!groupId) return;
    supabase
      .from("groups")
      .select("name, org_name, allow_peer_materials, type")
      .eq("id", groupId)
      .single()
      .then(({ data }) => {
        const g = data as GroupInfo;
        setGroupType(g?.type ?? null);
        setName(g?.name ?? "");
        setOrgName(g?.org_name ?? "");
        setAllowPeer(g?.allow_peer_materials ?? false);
      });
  }, [groupId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await supabase
      .from("groups")
      .update({ name: name.trim(), org_name: orgName.trim(), allow_peer_materials: allowPeer })
      .eq("id", groupId!);
    setSaving(false);
    setSaved(true);
    refresh();
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleDelete() {
    setDeleting(true);
    await supabase.from("groups").delete().eq("id", groupId!);
    refresh();
    navigate("/profile");
  }

  return (
    <div className="page">
      <SubpageHeader title={t("adminSettings.title")} back={`/admin/${groupId}`} />

      <form onSubmit={handleSave}>
        <div className="field">
          <label className="field-label" htmlFor="name">
            {t("adminSettings.className")}
          </label>
          <input id="name" className="field-input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="org">
            {t("adminSettings.orgName")}
          </label>
          <input id="org" className="field-input" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
        </div>

        {groupType === "school_class" ? (
          <div className="field-hint" style={{ marginBottom: 14 }}>
            {t("adminSettings.schoolHint")}
          </div>
        ) : (
          <div className="switch-row" style={{ border: "1px solid var(--line)", borderRadius: "var(--radius)", marginBottom: 14 }}>
            <div>
              <div className="switch-row-label">{t("adminSettings.allowPeer")}</div>
              <div className="switch-row-sub">{t("adminSettings.allowPeerSub")}</div>
            </div>
            <button
              type="button"
              className={"switch" + (allowPeer ? " on" : "")}
              role="switch"
              aria-checked={allowPeer}
              onClick={() => setAllowPeer((v) => !v)}
            />
          </div>
        )}

        <button className="primary-btn" disabled={saving}>
          {saving ? t("common.saving") : t("common.save")}
        </button>
        {saved && <div className="saved-note">{t("common.saved")}</div>}
      </form>

      <div className="panel-label" style={{ marginTop: 28, color: "#c0392b" }}>
        {t("adminSettings.dangerZone")}
      </div>
      <div className="list">
        {!confirmingDelete ? (
          <button type="button" className="list-row danger" onClick={() => setConfirmingDelete(true)}>
            <span className="list-row-label">{t("adminSettings.deleteClass")}</span>
          </button>
        ) : (
          <div style={{ padding: 16 }}>
            <div className="field-hint" style={{ marginBottom: 12 }}>
              {t("adminSettings.deleteWarning")}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="primary-btn" style={{ background: "#c0392b" }} onClick={handleDelete} disabled={deleting}>
                {deleting ? t("adminSettings.deleting") : t("adminSettings.confirmDelete")}
              </button>
              <button
                type="button"
                className="primary-btn"
                style={{ background: "var(--card)", color: "var(--ink)", border: "1px solid var(--line)" }}
                onClick={() => setConfirmingDelete(false)}
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
