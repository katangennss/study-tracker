import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import SubpageHeader from "../components/SubpageHeader";
import { supabase } from "../lib/supabase";
import { useActiveGroup } from "../lib/activeGroup";

type GroupInfo = { name: string; org_name: string; allow_peer_materials: boolean };

export default function AdminSettings() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { refresh } = useActiveGroup();

  const [name, setName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [allowPeer, setAllowPeer] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!groupId) return;
    supabase
      .from("groups")
      .select("name, org_name, allow_peer_materials")
      .eq("id", groupId)
      .single()
      .then(({ data }) => {
        const g = data as GroupInfo;
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
      <SubpageHeader title="Settings" back={`/admin/${groupId}`} />

      <form onSubmit={handleSave}>
        <div className="field">
          <label className="field-label" htmlFor="name">
            Class name
          </label>
          <input id="name" className="field-input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="org">
            School or organization
          </label>
          <input id="org" className="field-input" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
        </div>

        <div className="switch-row" style={{ border: "1px solid var(--line)", borderRadius: "var(--radius)", marginBottom: 14 }}>
          <div>
            <div className="switch-row-label">Allow peer-shared materials</div>
            <div className="switch-row-sub">Let any member post to Materials, not just admins</div>
          </div>
          <button
            type="button"
            className={"switch" + (allowPeer ? " on" : "")}
            role="switch"
            aria-checked={allowPeer}
            onClick={() => setAllowPeer((v) => !v)}
          />
        </div>

        <button className="primary-btn" disabled={saving}>
          {saving ? "Saving…" : "Save Changes"}
        </button>
        {saved && <div className="saved-note">Saved</div>}
      </form>

      <div className="panel-label" style={{ marginTop: 28, color: "#c0392b" }}>
        DANGER ZONE
      </div>
      <div className="list">
        {!confirmingDelete ? (
          <button type="button" className="list-row danger" onClick={() => setConfirmingDelete(true)}>
            <span className="list-row-label">Delete Class</span>
          </button>
        ) : (
          <div style={{ padding: 16 }}>
            <div className="field-hint" style={{ marginBottom: 12 }}>
              This permanently deletes the class for everyone — schedule, homework, materials, grades,
              everything. This can't be undone.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="primary-btn" style={{ background: "#c0392b" }} onClick={handleDelete} disabled={deleting}>
                {deleting ? "Deleting…" : "Yes, delete it"}
              </button>
              <button
                type="button"
                className="primary-btn"
                style={{ background: "var(--card)", color: "var(--ink)", border: "1px solid var(--line)" }}
                onClick={() => setConfirmingDelete(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
