import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useActiveGroup } from "../lib/activeGroup";
import { supabase } from "../lib/supabase";
import ClassSwitcher from "../components/ClassSwitcher";
import { PlusIcon } from "../components/icons";
import { useLanguage } from "../lib/i18n";

type Material = {
  id: string;
  title: string;
  url: string | null;
  file_path: string | null;
  uploader_id: string | null;
  created_at: string;
};

export default function Materials() {
  const { user } = useAuth();
  const { activeGroup, approvedGroups } = useActiveGroup();
  const { t } = useLanguage();

  const [materials, setMaterials] = useState<Material[]>([]);
  const [fileUrls, setFileUrls] = useState<Record<string, string>>({});

  const canPost =
    activeGroup?.role === "admin" ||
    activeGroup?.type === "school_class" ||
    activeGroup?.allowPeerMaterials === true;

  function load() {
    if (!activeGroup) return;
    supabase
      .from("materials")
      .select("id, title, url, file_path, uploader_id, created_at")
      .eq("group_id", activeGroup.group_id)
      .order("created_at", { ascending: false })
      .then(async ({ data }) => {
        const rows = (data as Material[]) ?? [];
        setMaterials(rows);
        const withFiles = rows.filter((m) => m.file_path);
        if (withFiles.length > 0) {
          const entries = await Promise.all(
            withFiles.map(async (m) => {
              const { data: signed } = await supabase.storage
                .from("materials")
                .createSignedUrl(m.file_path!, 3600);
              return [m.id, signed?.signedUrl ?? ""] as const;
            })
          );
          setFileUrls(Object.fromEntries(entries));
        }
      });
  }

  useEffect(load, [activeGroup]);

  async function handleDelete(m: Material) {
    if (m.file_path) {
      await supabase.storage.from("materials").remove([m.file_path]);
    }
    await supabase.from("materials").delete().eq("id", m.id);
    load();
  }

  return (
    <div className="page">
      <div className="pagetitle">{t("materials.title")}</div>
      <ClassSwitcher />

      {approvedGroups.length === 0 ? (
        <div className="empty-state">{t("materials.joinToSee")}</div>
      ) : (
        <>
          {materials.length === 0 ? (
            <div className="empty-state">{t("materials.none")}</div>
          ) : (
            <div className="panel">
              {materials.map((m) => {
                const href = m.url ?? fileUrls[m.id];
                return (
                  <div className="resource-row" key={m.id}>
                    <div className="dot" style={{ background: "#6C63FF" }} />
                    <div style={{ flex: 1 }}>
                      {href ? (
                        <a className="resource-title" href={href} target="_blank" rel="noreferrer">
                          {m.title}
                        </a>
                      ) : (
                        <div className="resource-title">{m.title}</div>
                      )}
                    </div>
                    {(canPost || m.uploader_id === user?.id) && (
                      <button type="button" className="link-btn" onClick={() => handleDelete(m)}>
                        {t("common.remove")}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {canPost && (
            <Link
              to="/materials/add"
              className="list-row"
              style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--radius)" }}
            >
              <span className="list-row-icon">
                <PlusIcon />
              </span>
              <span className="list-row-label">{t("materials.add")}</span>
            </Link>
          )}
        </>
      )}
    </div>
  );
}
