import { useEffect, useState } from "react";
import SubpageHeader from "../components/SubpageHeader";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { useLanguage, type TranslationKey } from "../lib/i18n";

const PREF_KEYS: { id: string; labelKey: TranslationKey; subKey: TranslationKey; on: boolean }[] = [
  { id: "homework", labelKey: "notifications.homework", subKey: "notifications.homeworkSub", on: true },
  { id: "schedule", labelKey: "notifications.schedule", subKey: "notifications.scheduleSub", on: true },
  { id: "materials", labelKey: "notifications.materials", subKey: "notifications.materialsSub", on: false },
];

export default function ProfileNotifications() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [prefs, setPrefs] = useState(PREF_KEYS);
  const [paymentReminders, setPaymentReminders] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("payment_reminders_enabled")
      .eq("id", user.id)
      .single()
      .then(({ data }) => setPaymentReminders(data?.payment_reminders_enabled ?? true));
  }, [user]);

  function toggle(id: string) {
    setPrefs((prev) => prev.map((p) => (p.id === id ? { ...p, on: !p.on } : p)));
  }

  async function togglePaymentReminders() {
    if (!user) return;
    const next = !paymentReminders;
    setPaymentReminders(next);
    await supabase.from("profiles").update({ payment_reminders_enabled: next }).eq("id", user.id);
  }

  return (
    <div className="page">
      <SubpageHeader title={t("notifications.title")} />

      <div className="list">
        <div className="switch-row">
          <div>
            <div className="switch-row-label">{t("notifications.payment")}</div>
            <div className="switch-row-sub">{t("notifications.paymentSub")}</div>
          </div>
          <button
            className={"switch" + (paymentReminders ? " on" : "")}
            role="switch"
            aria-checked={paymentReminders}
            aria-label={t("notifications.payment")}
            onClick={togglePaymentReminders}
          />
        </div>
        {prefs.map((p) => (
          <div className="switch-row" key={p.id}>
            <div>
              <div className="switch-row-label">{t(p.labelKey)}</div>
              <div className="switch-row-sub">{t(p.subKey)}</div>
            </div>
            <button
              className={"switch" + (p.on ? " on" : "")}
              role="switch"
              aria-checked={p.on}
              aria-label={t(p.labelKey)}
              onClick={() => toggle(p.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
