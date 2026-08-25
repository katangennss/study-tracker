import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import type { ReactNode } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./auth";

export type MyGroup = {
  group_id: string;
  role: "student" | "admin";
  status: "pending" | "approved" | "rejected";
  total_sessions: number | null;
  name: string;
  org_name: string;
  type: "school_class" | "course";
  allowPeerMaterials: boolean;
};

type ActiveGroupContextValue = {
  groups: MyGroup[];
  approvedGroups: MyGroup[];
  activeGroupId: string | null;
  activeGroup: MyGroup | null;
  setActiveGroupId: (id: string) => void;
  loading: boolean;
  refresh: () => void;
};

const ActiveGroupContext = createContext<ActiveGroupContextValue>({
  groups: [],
  approvedGroups: [],
  activeGroupId: null,
  activeGroup: null,
  setActiveGroupId: () => {},
  loading: true,
  refresh: () => {},
});

const STORAGE_KEY = "activeGroupId";

type EnrollmentRow = {
  group_id: string;
  role: "student" | "admin";
  status: "pending" | "approved" | "rejected";
  total_sessions: number | null;
  groups: { name: string; org_name: string; type: "school_class" | "course"; allow_peer_materials: boolean } | null;
};

export function ActiveGroupProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [groups, setGroups] = useState<MyGroup[]>([]);
  const [activeGroupId, setActiveGroupIdState] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEY)
  );
  const [loading, setLoading] = useState(true);
  const requestId = useRef(0);

  const load = useCallback(() => {
    const thisRequest = ++requestId.current;

    if (!userId) {
      setGroups([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    supabase
      .from("enrollments")
      .select("group_id, role, status, total_sessions, groups(name, org_name, type, allow_peer_materials)")
      .eq("student_id", userId)
      .then(({ data }) => {
        if (thisRequest !== requestId.current) return; // a newer request already started
        const rows = ((data as unknown as EnrollmentRow[]) ?? []).map((r) => ({
          group_id: r.group_id,
          role: r.role,
          status: r.status,
          total_sessions: r.total_sessions,
          name: r.groups?.name ?? "Unknown class",
          org_name: r.groups?.org_name ?? "",
          type: r.groups?.type ?? "course",
          allowPeerMaterials: r.groups?.allow_peer_materials ?? false,
        }));
        setGroups(rows);
        setLoading(false);
      });
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const approved = groups.filter((g) => g.status === "approved");
    if (approved.length === 0) return;
    if (!activeGroupId || !approved.some((g) => g.group_id === activeGroupId)) {
      setActiveGroupIdState(approved[0].group_id);
    }
  }, [groups, activeGroupId]);

  function setActiveGroupId(id: string) {
    setActiveGroupIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  }

  const approvedGroups = groups.filter((g) => g.status === "approved");
  const activeGroup = approvedGroups.find((g) => g.group_id === activeGroupId) ?? null;

  return (
    <ActiveGroupContext.Provider
      value={{ groups, approvedGroups, activeGroupId, activeGroup, setActiveGroupId, loading, refresh: load }}
    >
      {children}
    </ActiveGroupContext.Provider>
  );
}

export function useActiveGroup() {
  return useContext(ActiveGroupContext);
}
