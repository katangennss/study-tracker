import { useEffect, useState } from "react";
import SubpageHeader from "../components/SubpageHeader";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";

export default function ProfileEdit() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single()
      .then(({ data }) => setName(data?.full_name ?? ""));
  }, [user]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    await supabase.from("profiles").update({ full_name: name }).eq("id", user.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="page">
      <SubpageHeader title="Edit Profile" />

      <form onSubmit={handleSave}>
        <div className="field">
          <label className="field-label" htmlFor="name">
            Full name
          </label>
          <input
            id="name"
            className="field-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="email">
            Email
          </label>
          <input id="email" className="field-input" value={user?.email ?? ""} disabled />
        </div>

        <button className="primary-btn" type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save Changes"}
        </button>
        {saved && <div className="saved-note">Saved</div>}
      </form>
    </div>
  );
}
