import { Link } from "react-router-dom";
import { ChevronLeftIcon } from "./icons";

export default function SubpageHeader({ title, back = "/profile" }: { title: string; back?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
      <Link
        to={back}
        aria-label="Back"
        style={{ color: "var(--ink-soft)", display: "flex", width: 22, height: 22 }}
      >
        <ChevronLeftIcon />
      </Link>
      <div className="pagetitle" style={{ marginBottom: 0 }}>
        {title}
      </div>
    </div>
  );
}
