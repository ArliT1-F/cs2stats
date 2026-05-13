import { useState } from "react";
import { getWeaponIcon, WEAPON_ICON_FALLBACK } from "../lib/weaponIcons";

// Renders the official CS2 in-game weapon model image — the same 3D-rendered
// PNG you see in Steam Market and CS2's buy menu. Pulled from Steam's economy
// CDN (community.akamai.steamstatic.com) for popular weapons, and from
// ByMykel's counter-strike-image-tracker GitHub mirror for the rest.
//
// Falls back to a simple inline SVG silhouette if both sources fail.

export function WeaponIcon({
  name,
  className = "",
  size = 96,
}: {
  name: string;
  className?: string;
  size?: number;
}) {
  const initial = getWeaponIcon(name);
  const [src, setSrc] = useState<string | null>(initial);
  const failed = !src;

  // Steam-hosted images are full-color realistic renders — show as-is with a
  // subtle orange glow. Fallback SVG gets the orange tint via the path stroke.
  const filter = failed
    ? "drop-shadow(0 0 6px rgba(245,158,11,0.3))"
    : "drop-shadow(0 1px 4px rgba(0,0,0,0.5)) drop-shadow(0 0 8px rgba(245,158,11,0.15))";

  return (
    <img
      src={src || WEAPON_ICON_FALLBACK}
      alt={`${name} weapon`}
      width={size}
      height={size / 2}
      loading="lazy"
      className={className}
      style={{ filter }}
      onError={() => setSrc(null)}
    />
  );
}
