import { useState } from "react";
import { useNavigate } from "react-router-dom";
import SubpageHeader from "../components/SubpageHeader";
import { supabase } from "../lib/supabase";
import { useActiveGroup } from "../lib/activeGroup";
import { useLanguage } from "../lib/i18n";

export default function ProfileAddClass() {
  const navigate = useNavigate();
  const { refresh } = useActiveGroup();
  const { t } = useLanguage();
  const [mode, setMode] = useState<"join" | "create">("join");

  const [code, setCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinedName, setJoinedName] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  const [className, setClassName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [type, setType] = useState<"school_class" | "course">("course");
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setJoining(true);
    setJoinError(null);
    const { data, error } = await supabase.rpc("join_group_with_code", { code: code.trim().toUpperCase() });
    setJoining(false);
    if (error) {
      setJoinError(error.message.includes("Invalid") ? t("addClass.invalidCode") : error.message);
    } else {
      setJoinedName(data?.name ?? "");
      refresh();
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!className.trim() || !orgName.trim()) return;
    setCreating(true);
    setCreateError(null);
    const { data, error } = await supabase.rpc("create_group", {
      p_name: className.trim(),
      p_org_name: orgName.trim(),
      p_type: type,
    });
    setCreating(false);
    if (error) {
      setCreateError(error.message);
    } else {
      setCreatedCode(data?.invite_code ?? null);
      refresh();
    }
  }

  return (
    <div className="page">
      <SubpageHeader title={t("addClass.title")} back="/profile" />

      <div className="toggle">
        <div className={"toggle-opt" + (mode === "join" ? " active" : "")} onClick={() => setMode("join")}>
          {t("addClass.joinWithCode")}
        </div>
        <div className={"toggle-opt" + (mode === "create" ? " active" : "")} onClick={() => setMode("create")}>
          {t("addClass.createClass")}
        </div>
      </div>

      {mode === "join" ? (
        joinedName ? (
          <div className="empty-state">{t("addClass.joinedMessage", { name: joinedName })}</div>
        ) : (
          <form onSubmit={handleJoin}>
            <div className="field">
              <label className="field-label" htmlFor="code">
                {t("addClass.classCode")}
              </label>
              <input
                id="code"
                className="field-input"
                placeholder="e.g. TOEFL4F2K"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
              <div className="field-hint">{t("addClass.joinHint")}</div>
            </div>
            {joinError && (
              <div className="field-hint" style={{ color: "#c0392b", marginBottom: 14 }}>
                {joinError}
              </div>
            )}
            <button className="primary-btn" type="submit" disabled={joining}>
              {joining ? t("addClass.sending") : t("addClass.requestToJoin")}
            </button>
          </form>
        )
      ) : createdCode ? (
        <div className="empty-state">
          {t("addClass.createdMessage", { name: className })}
          <div className="hero-value mono-data" style={{ fontSize: 28, marginTop: 12 }}>
            {createdCode}
          </div>
          <button className="primary-btn" style={{ marginTop: 16 }} onClick={() => navigate("/profile")}>
            {t("addClass.done")}
          </button>
        </div>
      ) : (
        <form onSubmit={handleCreate}>
          <div className="field">
            <label className="field-label" htmlFor="className">
              {t("addClass.className")}
            </label>
            <input
              id="className"
              className="field-input"
              placeholder="e.g. TOEFL Prep"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="orgName">
              {t("addClass.orgName")}
            </label>
            <input
              id="orgName"
              className="field-input"
              placeholder="e.g. Bright Minds Tutoring"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="type">
              {t("addClass.type")}
            </label>
            <select
              id="type"
              className="field-input"
              value={type}
              onChange={(e) => setType(e.target.value as "school_class" | "course")}
            >
              <option value="course">{t("addClass.typeCourse")}</option>
              <option value="school_class">{t("addClass.typeSchool")}</option>
            </select>
          </div>
          <div className="field-hint" style={{ marginBottom: 14 }}>
            {t("addClass.createHint")}
          </div>
          {createError && (
            <div className="field-hint" style={{ color: "#c0392b", marginBottom: 14 }}>
              {createError}
            </div>
          )}
          <button className="primary-btn" type="submit" disabled={creating}>
            {creating ? t("addClass.creating") : t("addClass.createClassBtn")}
          </button>
        </form>
      )}
    </div>
  );
}
