export type SectionGroup = "social" | "steam" | "faceit";

export interface NavSection {
  id: string;
  label: string;
  shortLabel: string;
  group: SectionGroup;
}

export function getNavSections(isPublicView: boolean): NavSection[] {
  const items: NavSection[] = [];

  if (!isPublicView) {
    items.push({ id: "friends", label: "Friends", shortLabel: "Friends", group: "social" });
  }

  items.push(
    { id: "overview", label: "Overview", shortLabel: "Overview", group: "steam" },
    { id: "weapons", label: "Weapons", shortLabel: "Weapons", group: "steam" },
    { id: "maps", label: "Maps", shortLabel: "Maps", group: "steam" },
  );

  if (!isPublicView) {
    items.push({ id: "skins", label: "Inventory", shortLabel: "Skins", group: "steam" });
  }

  items.push(
    { id: "faceit", label: "FACEIT Profile", shortLabel: "FACEIT", group: "faceit" },
    { id: "faceit-stats", label: "Detailed Stats", shortLabel: "Stats", group: "faceit" },
    { id: "faceit-maps", label: "FACEIT Maps", shortLabel: "F.Maps", group: "faceit" },
    { id: "matches", label: "Matches", shortLabel: "Matches", group: "faceit" },
    { id: "demos", label: "Demos", shortLabel: "Demos", group: "faceit" },
  );

  return items;
}

export const GROUP_LABELS: Record<SectionGroup, string> = {
  social: "Social",
  steam: "Steam",
  faceit: "FACEIT",
};

export const GROUP_COLORS: Record<SectionGroup, string> = {
  social: "text-slate-400",
  steam: "text-cs-blue",
  faceit: "text-cs-orange",
};
