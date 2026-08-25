import { useState } from "react";
import SubpageHeader from "../components/SubpageHeader";

const initialPrefs = [
  { id: "homework", label: "Homework reminders", sub: "The evening before something is due", on: true },
  { id: "grades", label: "Grade updates", sub: "When a new grade is added", on: true },
  { id: "schedule", label: "Schedule changes", sub: "Room or time changes for your class", on: true },
  { id: "materials", label: "New materials", sub: "When something is shared with your class", on: false },
];

export default function ProfileNotifications() {
  const [prefs, setPrefs] = useState(initialPrefs);

  function toggle(id: string) {
    setPrefs((prev) => prev.map((p) => (p.id === id ? { ...p, on: !p.on } : p)));
  }

  return (
    <div className="page">
      <SubpageHeader title="Notifications" />

      <div className="list">
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
