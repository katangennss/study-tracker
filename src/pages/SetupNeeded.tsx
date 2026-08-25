export default function SetupNeeded() {
  return (
    <div className="page" style={{ display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "100%" }}>
      <div className="about-block" style={{ paddingTop: 0 }}>
        <div className="about-mark">A</div>
        <div className="profile-name">Connect Supabase to continue</div>
      </div>
      <div className="list">
        <div className="list-row" style={{ cursor: "default", whiteSpace: "normal" }}>
          <span className="list-row-label">
            1. Create a free project at supabase.com
            <br />
            2. Run supabase/schema.sql in its SQL editor
            <br />
            3. Copy .env.example to .env and paste in your Project URL and anon key
            <br />
            4. Restart the dev server
          </span>
        </div>
      </div>
    </div>
  );
}
