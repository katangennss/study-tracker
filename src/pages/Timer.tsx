import { useEffect, useState } from "react";
import { PlayIcon, PauseIcon, ResetIcon, SkipIcon, GearIcon } from "../components/icons";

type Mode = "focus" | "short" | "long";

type Settings = { focus: number; short: number; long: number; cyclesBeforeLong: number };

const DEFAULTS: Settings = { focus: 25, short: 5, long: 15, cyclesBeforeLong: 4 };
const STORAGE_KEY = "pomodoroSettings";

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

const MODE_LABEL: Record<Mode, string> = { focus: "Focus", short: "Short Break", long: "Long Break" };

function beep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 660;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    // ignore — audio isn't essential
  }
}

export default function Timer() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [mode, setMode] = useState<Mode>("focus");
  const [secondsLeft, setSecondsLeft] = useState(settings.focus * 60);
  const [running, setRunning] = useState(false);
  const [cycle, setCycle] = useState(0); // focus sessions completed this sitting
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(settings);

  const modeMinutes = (m: Mode) => (m === "focus" ? settings.focus : m === "short" ? settings.short : settings.long);
  const totalSeconds = modeMinutes(mode) * 60;

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (secondsLeft > 0) return;
    beep();
    if (mode === "focus") {
      const nextCycle = cycle + 1;
      setCycle(nextCycle);
      const next: Mode = nextCycle % settings.cyclesBeforeLong === 0 ? "long" : "short";
      setMode(next);
      setSecondsLeft(modeMinutes(next) * 60);
    } else {
      setMode("focus");
      setSecondsLeft(settings.focus * 60);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  function toggleRunning() {
    setRunning((r) => !r);
  }

  function reset() {
    setRunning(false);
    setSecondsLeft(totalSeconds);
  }

  function skip() {
    setSecondsLeft(0);
  }

  function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSettings(form);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    setRunning(false);
    setMode("focus");
    setCycle(0);
    setSecondsLeft(form.focus * 60);
    setEditing(false);
  }

  const mm = Math.floor(Math.max(secondsLeft, 0) / 60)
    .toString()
    .padStart(2, "0");
  const ss = Math.max(secondsLeft, 0) % 60;
  const ssStr = ss.toString().padStart(2, "0");

  const radius = 100;
  const circumference = 2 * Math.PI * radius;
  const progress = totalSeconds > 0 ? Math.max(secondsLeft, 0) / totalSeconds : 0;
  const dashOffset = circumference * (1 - progress);
  const ringColor = mode === "focus" ? "var(--teal)" : "var(--amber)";

  return (
    <div className="page">
      <div className="pagetitle">Focus</div>

      {editing ? (
        <div className="panel">
          <div className="panel-label">EDIT TIMES (MINUTES)</div>
          <form onSubmit={saveSettings}>
            <div className="field">
              <label className="field-label">Focus</label>
              <input
                className="field-input"
                type="number"
                min={1}
                value={form.focus}
                onChange={(e) => setForm({ ...form, focus: Number(e.target.value) })}
              />
            </div>
            <div className="field">
              <label className="field-label">Short break</label>
              <input
                className="field-input"
                type="number"
                min={1}
                value={form.short}
                onChange={(e) => setForm({ ...form, short: Number(e.target.value) })}
              />
            </div>
            <div className="field">
              <label className="field-label">Long break</label>
              <input
                className="field-input"
                type="number"
                min={1}
                value={form.long}
                onChange={(e) => setForm({ ...form, long: Number(e.target.value) })}
              />
            </div>
            <div className="field">
              <label className="field-label">Focus sessions before a long break</label>
              <input
                className="field-input"
                type="number"
                min={1}
                value={form.cyclesBeforeLong}
                onChange={(e) => setForm({ ...form, cyclesBeforeLong: Number(e.target.value) })}
              />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="primary-btn">Save</button>
              <button
                type="button"
                className="primary-btn"
                style={{ background: "var(--card)", color: "var(--ink)", border: "1px solid var(--line)" }}
                onClick={() => {
                  setForm(settings);
                  setEditing(false);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          <div className="timer-mode-row">
            <span className="timer-mode-label" style={{ color: ringColor }}>
              {MODE_LABEL[mode]}
            </span>
            <button type="button" className="link-btn" onClick={() => setEditing(true)} aria-label="Edit times">
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <GearIcon className="timer-gear" /> Edit times
              </span>
            </button>
          </div>

          <div className="timer-ring-wrap">
            <svg viewBox="0 0 220 220" width="220" height="220">
              <circle cx="110" cy="110" r={radius} fill="none" stroke="var(--line)" strokeWidth="10" />
              <circle
                cx="110"
                cy="110"
                r={radius}
                fill="none"
                stroke={ringColor}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                transform="rotate(-90 110 110)"
                style={{ transition: "stroke-dashoffset 1s linear" }}
              />
            </svg>
            <div className="timer-time mono-data">
              {mm}:{ssStr}
            </div>
          </div>

          <div className="timer-dots">
            {(() => {
              const dotsFilled =
                cycle > 0 && cycle % settings.cyclesBeforeLong === 0
                  ? settings.cyclesBeforeLong
                  : cycle % settings.cyclesBeforeLong;
              return Array.from({ length: settings.cyclesBeforeLong }, (_, i) => (
                <span key={i} className={"timer-dot" + (i < dotsFilled ? " filled" : "")} />
              ));
            })()}
          </div>

          <div className="timer-controls">
            <button type="button" className="timer-ctrl-btn" onClick={reset} aria-label="Reset">
              <ResetIcon />
            </button>
            <button type="button" className="timer-play-btn" onClick={toggleRunning} aria-label={running ? "Pause" : "Start"} style={{ background: ringColor }}>
              {running ? <PauseIcon /> : <PlayIcon />}
            </button>
            <button type="button" className="timer-ctrl-btn" onClick={skip} aria-label="Skip">
              <SkipIcon />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
