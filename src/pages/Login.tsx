import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function Login() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) {
        setError(error.message);
      } else if (!data.session) {
        setInfo("Check your email to confirm your account, then log in.");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    }

    setSubmitting(false);
  }

  return (
    <div className="page" style={{ display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "100%" }}>
      <div className="about-block" style={{ paddingTop: 0 }}>
        <div className="about-mark">A</div>
        <div className="profile-name">Study Tracker</div>
      </div>

      <form onSubmit={handleSubmit}>
        {mode === "signup" && (
          <div className="field">
            <label className="field-label" htmlFor="fullName">
              Full name
            </label>
            <input
              id="fullName"
              className="field-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
        )}

        <div className="field">
          <label className="field-label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="field-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <div className="field-hint">Any email works — there's no school-email requirement.</div>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="field-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>

        {error && (
          <div className="field-hint" style={{ color: "#c0392b", marginBottom: 14 }}>
            {error}
          </div>
        )}
        {info && (
          <div className="saved-note" style={{ marginTop: 0, marginBottom: 14 }}>
            {info}
          </div>
        )}

        <button className="primary-btn" type="submit" disabled={submitting}>
          {submitting ? "Please wait…" : mode === "signup" ? "Create Account" : "Log In"}
        </button>
      </form>

      <div className="hint" style={{ marginTop: 16 }}>
        {mode === "signup" ? "Already have an account?" : "New here?"}{" "}
        <button
          type="button"
          onClick={() => {
            setMode(mode === "signup" ? "login" : "signup");
            setError(null);
            setInfo(null);
          }}
          style={{ background: "none", border: "none", color: "var(--teal)", font: "inherit", fontWeight: 600, cursor: "pointer", padding: 0 }}
        >
          {mode === "signup" ? "Log in" : "Create an account"}
        </button>
      </div>
    </div>
  );
}
