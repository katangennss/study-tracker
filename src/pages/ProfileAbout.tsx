import SubpageHeader from "../components/SubpageHeader";

export default function ProfileAbout() {
  return (
    <div className="page">
      <SubpageHeader title="About" />

      <div className="about-block">
        <div className="about-mark">A</div>
        <div className="profile-name">Study Tracker</div>
        <div className="about-version">Version 0.1.0</div>
      </div>

      <div className="list">
        <div className="list-row" style={{ cursor: "default" }}>
          <span className="list-row-label">School</span>
          <span className="list-row-value">Argishti High School</span>
        </div>
      </div>

      <div className="hint">
        Schedule, homework, grades, and shared materials for your class — all in one place.
      </div>
    </div>
  );
}
