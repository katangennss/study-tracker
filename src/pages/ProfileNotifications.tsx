import { useEffect, useState } from "react";
import SubpageHeader from "../components/SubpageHeader";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";

const initialPrefs = [
  { id: "homework", label: "Homework reminders", sub: "The evening before something is due", on: true },
  { id: "schedule", label: "Schedule changes", sub: "Room or time changes for your class", on: true },
  { id: "materials", label: "New materials", sub: "When something is shared with your class", on: false },
];

export default function ProfileNotifications() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState(initialPrefs);
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
      <SubpageHeader title="Notifications" />

      <div className="list">
        <div className="switch-row">
          <div>
            <div className="switch-row-label">Payment reminders</div>
            <div className="switch-row-sub">When a course's session package is fully used up</div>
          </div>
          <button
            className={"switch" + (paymentReminders ? " on" : "")}
            role="switch"
            aria-checked={paymentReminders}
            aria-label="Payment reminders"
            onClick={togglePaymentReminders}
          />
        </div>
        {prefs.map((p) => (
          <div className="switch-row" key={p.id}>
            <div>
              <div className="switch-row-label">{p.label}</div>
              <div className="switch-row-sub">{p.sub}</div>
            </div>
            <button
              className={"switch" + (p.on ? " on" : "")}
              role="switch"
              aria-checked={p.on}
              aria-label={p.label}
              onClick={() => toggle(p.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
