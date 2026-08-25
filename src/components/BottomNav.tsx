import { NavLink } from "react-router-dom";
import { PencilIcon, CalendarIcon, HomeIcon, FolderIcon, ChartIcon } from "./icons";
import { useActiveGroup } from "../lib/activeGroup";

export default function BottomNav() {
  const { activeGroup } = useActiveGroup();
  const scheduleLabel = activeGroup?.type === "course" ? "Sessions" : "Schedule";

  const items = [
    { to: "/homework", label: "Homework", Icon: PencilIcon },
    { to: "/schedule", label: scheduleLabel, Icon: CalendarIcon },
    { to: "/", label: "Home", Icon: HomeIcon, end: true },
    { to: "/materials", label: "Materials", Icon: FolderIcon },
    { to: "/gpa", label: "Grades", Icon: ChartIcon },
  ];

  return (
    <nav className="bottomnav">
      {items.map(({ to, label, Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => "navitem" + (isActive ? " active" : "")}
        >
          <span className="navicon">
            <Icon />
          </span>
          <span className="navlabel">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
