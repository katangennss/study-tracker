import { NavLink } from "react-router-dom";
import { PencilIcon, CalendarIcon, HomeIcon, FolderIcon, ChartIcon, TimerIcon } from "./icons";
import { useActiveGroup } from "../lib/activeGroup";
import { useLanguage } from "../lib/i18n";

export default function BottomNav() {
  const { activeGroup } = useActiveGroup();
  const { t } = useLanguage();
  const scheduleLabel = activeGroup?.type === "course" ? t("nav.sessions") : t("nav.schedule");

  const items = [
    { to: "/homework", label: t("nav.homework"), Icon: PencilIcon },
    { to: "/schedule", label: scheduleLabel, Icon: CalendarIcon },
    { to: "/", label: t("nav.home"), Icon: HomeIcon, end: true },
    { to: "/materials", label: t("nav.materials"), Icon: FolderIcon },
    { to: "/gpa", label: t("nav.grades"), Icon: ChartIcon },
    { to: "/timer", label: t("nav.focus"), Icon: TimerIcon },
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
