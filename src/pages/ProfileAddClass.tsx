import { useState } from "react";
import { useNavigate } from "react-router-dom";
import SubpageHeader from "../components/SubpageHeader";
import { supabase } from "../lib/supabase";
import { useActiveGroup } from "../lib/activeGroup";

export default function ProfileAddClass() {
  const navigate = useNavigate();
  const { refresh } = useActiveGroup();
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
      setJoinError(error.message.includes("Invalid") ? "That code doesn't match a class." : error.message);
    } else {
      setJoinedName(data?.name ?? "the class");
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
      <SubpageHeader title="Add a Class" back="/profile" />

      <div className="toggle">
        <div className={"toggle-opt" + (mode === "join" ? " active" : "")} onClick={() => setMode("join")}>
          Join with a code
        </div>
        <div className={"toggle-opt" + (mode === "create" ? " active" : "")} onClick={() => setMode("create")}>
          Create a class
        </div>
      </div>

      {mode === "join" ? (
        joinedName ? (
          <div className="empty-state">
            Request sent to join "{joinedName}". An admin needs to approve you before it shows up as an
            active class.
          </div>
        ) : (
          <form onSubmit={handleJoin}>
            <div className="field">
              <label className="field-label" htmlFor="code">
                Class code
              </label>
              <input
                id="code"
                className="field-input"
                placeholder="e.g. TOEFL4F2K"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
              <div className="field-hint">
                Ask your teacher or instructor for the code. Joining sends a request — an admin has to
                approve it before you can see that class's schedule, homework, or materials.
              </div>
            </div>
            {joinError && (
              <div className="field-hint" style={{ color: "#c0392b", marginBottom: 14 }}>
                {joinError}
              </div>
            )}
            <button className="primary-btn" type="submit" disabled={joining}>
              {joining ? "Sending…" : "Request to Join"}
            </button>
          </form>
        )
      ) : createdCode ? (
        <div className="empty-state">
          "{className}" is ready — you're its admin. Share this code so people can request to join:
          <div className="hero-value mono-data" style={{ fontSize: 28, marginTop: 12 }}>
            {createdCode}
          </div>
          <button className="primary-btn" style={{ marginTop: 16 }} onClick={() => navigate("/profile")}>
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={handleCreate}>
          <div className="field">
            <label className="field-label" htmlFor="className">
              Class or course name
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
              School or organization
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
              Type
            </label>
            <select
              id="type"
              className="field-input"
              value={type}
              onChange={(e) => setType(e.target.value as "school_class" | "course")}
            >
              <option value="course">Outside course (test prep, lessons, etc.)</option>
              <option value="school_class">School class</option>
            </select>
          </div>
          <div className="field-hint" style={{ marginBottom: 14 }}>
            You'll be this class's admin — you can approve who joins, review homework, and manage
            materials.
          </div>
          {createError && (
            <div className="field-hint" style={{ color: "#c0392b", marginBottom: 14 }}>
              {createError}
            </div>
          )}
          <button className="primary-btn" type="submit" disabled={creating}>
            {creating ? "Creating…" : "Create Class"}
          </button>
        </form>
      )}
    </div>
  );
}
