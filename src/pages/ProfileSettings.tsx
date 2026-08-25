import { useState } from "react";
import SubpageHeader from "../components/SubpageHeader";
import { applyTheme, getStoredTheme } from "../lib/theme";
import { useLanguage } from "../lib/i18n";

export default function ProfileSettings() {
  const [dark, setDark] = useState(getStoredTheme() === "dark");
  const { language, setLanguage, t } = useLanguage();

  function toggleDark() {
    const next = !dark;
    setDark(next);
    applyTheme(next ? "dark" : "light");
  }

  return (
    <div className="page">
      <SubpageHeader title={t("settings.title")} />

      <div className="list">
        <div className="switch-row">
          <div>
            <div className="switch-row-label">{t("settings.darkMode")}</div>
            <div className="switch-row-sub">{t("settings.darkModeSub")}</div>
          </div>
          <button
            className={"switch" + (dark ? " on" : "")}
            role="switch"
            aria-checked={dark}
            aria-label={t("settings.darkMode")}
            onClick={toggleDark}
          />
        </div>
      </div>

      <div className="panel-label">{t("settings.language")}</div>
      <div className="toggle">
        <div className={"toggle-opt" + (language === "en" ? " active" : "")} onClick={() => setLanguage("en")}>
          {t("settings.languageEnglish")}
        </div>
        <div className={"toggle-opt" + (language === "hy" ? " active" : "")} onClick={() => setLanguage("hy")}>
          {t("settings.languageArmenian")}
        </div>
      </div>
    </div>
  );
}
