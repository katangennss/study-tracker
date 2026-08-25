import SubpageHeader from "../components/SubpageHeader";
import { useLanguage } from "../lib/i18n";

export default function ProfileAbout() {
  const { t } = useLanguage();
  return (
    <div className="page">
      <SubpageHeader title={t("about.title")} />

      <div className="about-block">
        <div className="about-mark">S</div>
        <div className="profile-name">{t("about.appName")}</div>
        <div className="about-version">{t("about.version")}</div>
      </div>

      <div className="hint">{t("about.hint")}</div>
    </div>
  );
}
