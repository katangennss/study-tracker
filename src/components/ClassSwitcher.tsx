import { useActiveGroup } from "../lib/activeGroup";

export default function ClassSwitcher() {
  const { approvedGroups, activeGroupId, setActiveGroupId } = useActiveGroup();

  if (approvedGroups.length <= 1) return null;

  return (
    <div className="class-picker" style={{ marginBottom: 14 }}>
      {approvedGroups.map((g) => (
        <div
          key={g.group_id}
          className={"cchip" + (activeGroupId === g.group_id ? " active" : "")}
          onClick={() => setActiveGroupId(g.group_id)}
        >
          {g.name}
        </div>
      ))}
    </div>
  );
}
