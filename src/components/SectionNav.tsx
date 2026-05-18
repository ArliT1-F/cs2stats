import { useEffect, useState, useCallback, useMemo } from "react";
import {
  getNavSections,
  GROUP_LABELS,
  GROUP_COLORS,
  type NavSection,
  type SectionGroup,
} from "../lib/sections";

export function useSectionNav(isPublicView: boolean) {
  const sections = useMemo(() => getNavSections(isPublicView), [isPublicView]);
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    setActiveId(sections[0]?.id ?? "");
  }, [sections]);

  useEffect(() => {
    const elements = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el != null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0, 0.1, 0.25, 0.5] }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return { sections, activeId, scrollTo };
}

export function SectionNavRibbon({
  sections,
  activeId,
  onSelect,
}: {
  sections: NavSection[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  let lastGroup: SectionGroup | null = null;

  return (
    <nav
      aria-label="Section navigation"
      className="sticky top-[var(--header-h)] z-30 -mx-4 border-b border-cs-border bg-cs-bg/95 backdrop-blur sm:-mx-6 lg:hidden"
    >
      <div className="nav-ribbon-scroll flex gap-1 overflow-x-auto px-3 py-1.5 sm:px-4">
        {sections.map((s) => {
          const showDivider = lastGroup && lastGroup !== s.group;
          lastGroup = s.group;
          return (
            <span key={s.id} className="flex shrink-0 items-center gap-1">
              {showDivider && (
                <span className="mx-0.5 h-4 w-px shrink-0 bg-cs-border" aria-hidden />
              )}
              <NavPill section={s} active={activeId === s.id} compact onClick={() => onSelect(s.id)} />
            </span>
          );
        })}
      </div>
    </nav>
  );
}

export function SectionNavSidebar({
  sections,
  activeId,
  onSelect,
}: {
  sections: NavSection[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const groups = ["social", "steam", "faceit"] as const;

  return (
    <nav aria-label="Section navigation" className="hidden w-36 shrink-0 lg:block">
      <div className="sticky top-[var(--scroll-offset)] max-h-[calc(100vh-var(--scroll-offset)-1rem)] overflow-y-auto border border-cs-border bg-cs-panel/80 py-2 backdrop-blur">
        {groups.map((group) => {
          const groupSections = sections.filter((s) => s.group === group);
          if (groupSections.length === 0) return null;
          return (
            <div key={group} className="mb-2 last:mb-0">
              <div
                className={`px-3 py-1 font-mono text-[9px] uppercase tracking-widest ${GROUP_COLORS[group]}`}
              >
                {GROUP_LABELS[group]}
              </div>
              {groupSections.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelect(s.id)}
                  className={`block w-full border-l-2 px-3 py-1.5 text-left font-display text-xs font-semibold uppercase tracking-wide transition ${
                    activeId === s.id
                      ? s.group === "steam"
                        ? "border-cs-blue bg-cs-blue/10 text-cs-blue"
                        : s.group === "faceit"
                          ? "border-cs-orange bg-cs-orange/10 text-cs-orange"
                          : "border-slate-400 bg-white/5 text-white"
                      : "border-transparent text-slate-500 hover:border-cs-border hover:text-slate-300"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </nav>
  );
}

function NavPill({
  section,
  active,
  compact,
  onClick,
}: {
  section: NavSection;
  active: boolean;
  compact?: boolean;
  onClick: () => void;
}) {
  const steam = section.group === "steam";
  const faceit = section.group === "faceit";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap px-2.5 py-1 font-display text-[11px] font-bold uppercase tracking-wide transition ${
        active
          ? steam
            ? "bg-cs-blue text-cs-bg"
            : faceit
              ? "bg-cs-orange text-cs-bg"
              : "bg-white text-cs-bg"
          : "bg-cs-panel text-slate-400 hover:text-white"
      }`}
    >
      {compact ? section.shortLabel : section.label}
    </button>
  );
}
