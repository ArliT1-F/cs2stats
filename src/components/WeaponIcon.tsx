import { useState, useEffect } from "react";
import { getWeaponIcon, WEAPON_ICON_FALLBACK } from "../lib/weaponIcons";

// Renders the official CS2 in-game weapon model image — the same 3D-rendered
// PNG you see in Steam Market and CS2's buy menu. Tries internalKey first
// (Steam stat key like "m4a1_silencer") then falls back to display name lookup.
//
// Falls back to a simple SVG silhouette if all sources fail.

export function WeaponIcon({
  name,
  internalKey,
  className = "",
  size = 96,
}: {
  name: string;
  internalKey?: string;
  className?: string;
  size?: number;
}) {
  const initial = (internalKey && getWeaponIcon(internalKey)) || getWeaponIcon(name);
  const [src, setSrc] = useState<string | null>(initial);

  // Reset src when name/key changes (e.g. switching tabs)
  useEffect(() => {
    setSrc((internalKey && getWeaponIcon(internalKey)) || getWeaponIcon(name));
  }, [name, internalKey]);

  const failed = !src;

  // Steam-hosted images are full-color realistic renders — show as-is with a
  // subtle drop-shadow. Fallback SVG gets the orange tint via stroke color.
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
