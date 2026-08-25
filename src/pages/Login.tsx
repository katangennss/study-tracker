import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useLanguage } from "../lib/i18n";

export default function Login() {
  const { language, setLanguage, t } = useLanguage();
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
        setInfo(t("login.confirmEmail"));
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    }

    setSubmitting(false);
  }

  return (
    <div className="page" style={{ display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "100%" }}>
      <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 8 }}>
        <button
          type="button"
          className="link-btn"
          style={{ opacity: language === "en" ? 1 : 0.5 }}
          onClick={() => setLanguage("en")}
        >
          EN
        </button>
        <span style={{ color: "var(--ink-soft)" }}>·</span>
        <button
          type="button"
          className="link-btn"
          style={{ opacity: language === "hy" ? 1 : 0.5 }}
          onClick={() => setLanguage("hy")}
        >
          ՀԱՅ
        </button>
      </div>

      <div className="about-block" style={{ paddingTop: 0 }}>
        <div className="about-mark">S</div>
        <div className="profile-name">{t("login.appName")}</div>
      </div>

      <form onSubmit={handleSubmit}>
        {mode === "signup" && (
          <div className="field">
            <label className="field-label" htmlFor="fullName">
              {t("login.fullName")}
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
            {t("login.email")}
          </label>
          <input
            id="email"
            type="email"
            className="field-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <div className="field-hint">{t("login.emailHint")}</div>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="password">
            {t("login.password")}
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
          {submitting ? t("login.pleaseWait") : mode === "signup" ? t("login.createAccount") : t("login.logIn")}
        </button>
      </form>

      <div className="hint" style={{ marginTop: 16 }}>
        {mode === "signup" ? t("login.alreadyHaveAccount") : t("login.newHere")}{" "}
        <button
          type="button"
          onClick={() => {
            setMode(mode === "signup" ? "login" : "signup");
            setError(null);
            setInfo(null);
          }}
          style={{ background: "none", border: "none", color: "var(--teal)", font: "inherit", fontWeight: 600, cursor: "pointer", padding: 0 }}
        >
          {mode === "signup" ? t("login.logInLink") : t("login.createAccountLink")}
        </button>
      </div>
    </div>
  );
}
