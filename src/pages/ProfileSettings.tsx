import { useState } from "react";
import SubpageHeader from "../components/SubpageHeader";
import { applyTheme, getStoredTheme } from "../lib/theme";

export default function ProfileSettings() {
  const [dark, setDark] = useState(getStoredTheme() === "dark");

  function toggleDark() {
    const next = !dark;
    setDark(next);
    applyTheme(next ? "dark" : "light");
  }

  return (
    <div className="page">
      <SubpageHeader title="Settings" />

      <div className="list">
        <div className="switch-row">
          <div>
            <div className="switch-row-label">Dark mode</div>
            <div className="switch-row-sub">Easier on the eyes at night</div>
          </div>
          <button
            className={"switch" + (dark ? " on" : "")}
            role="switch"
            aria-checked={dark}
            aria-label="Dark mode"
            onClick={toggleDark}
          />
        </div>
      </div>

      <div className="list">
        <div className="list-row" style={{ cursor: "default" }}>
          <span className="list-row-label">Language</span>
          <span className="list-row-value">English</span>
        </div>
      </div>
      <div className="field-hint" style={{ marginTop: -8, marginBottom: 14 }}>
        Armenian is coming soon.
      </div>
    </div>
  );
}
