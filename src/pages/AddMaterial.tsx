import { useState } from "react";
import { useNavigate } from "react-router-dom";
import SubpageHeader from "../components/SubpageHeader";
import { useAuth } from "../lib/auth";
import { useActiveGroup } from "../lib/activeGroup";
import { supabase } from "../lib/supabase";
import { useLanguage } from "../lib/i18n";

export default function AddMaterial() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeGroup } = useActiveGroup();
  const { t } = useLanguage();

  const [mode, setMode] = useState<"link" | "file">("link");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !activeGroup || !title.trim()) return;
    if (mode === "link" && !url.trim()) return;
    if (mode === "file" && !file) return;

    setSaving(true);
    setError(null);

    let filePath: string | null = null;
    if (mode === "file" && file) {
      filePath = `${activeGroup.group_id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("materials").upload(filePath, file);
      if (uploadError) {
        setError(uploadError.message);
        setSaving(false);
        return;
      }
    }

    const { error: insertError } = await supabase.from("materials").insert({
      group_id: activeGroup.group_id,
      uploader_id: user.id,
      title: title.trim(),
      url: mode === "link" ? url.trim() : null,
      file_path: filePath,
    });

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
    } else {
      navigate("/materials");
    }
  }

  return (
    <div className="page">
      <SubpageHeader title={t("addMaterial.title")} back="/materials" />

      <div className="toggle">
        <div className={"toggle-opt" + (mode === "link" ? " active" : "")} onClick={() => setMode("link")}>
          {t("addMaterial.link")}
        </div>
        <div className={"toggle-opt" + (mode === "file" ? " active" : "")} onClick={() => setMode("file")}>
          {t("addMaterial.fileOrPhoto")}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label className="field-label" htmlFor="title">
            {t("addMaterial.titleField")}
          </label>
          <input id="title" className="field-input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        {mode === "link" ? (
          <div className="field">
            <label className="field-label" htmlFor="url">
              {t("addMaterial.linkField")}
            </label>
            <input
              id="url"
              className="field-input"
              placeholder="https://…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
        ) : (
          <div className="field">
            <label className="field-label" htmlFor="file">
              {t("addMaterial.fileField")}
            </label>
            <input
              id="file"
              className="field-input"
              type="file"
              accept="image/*,application/pdf,.doc,.docx,.ppt,.pptx"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
        )}

        {error && (
          <div className="field-hint" style={{ color: "#c0392b", marginBottom: 14 }}>
            {error}
          </div>
        )}

        <button className="primary-btn" disabled={saving}>
          {saving ? t("addMaterial.adding") : t("addMaterial.title")}
        </button>
      </form>
    </div>
  );
}
