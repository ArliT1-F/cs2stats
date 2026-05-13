import { useState } from "react";
import { getWeaponIcon, WEAPON_ICON_FALLBACK } from "../lib/weaponIcons";

// Renders a CS2 weapon image from Steam's CDN with a graceful SVG fallback
// if the image fails to load (e.g. weapon name unknown or CDN blocked).

export function WeaponIcon({
  name,
  className = "",
  size = 64,
}: {
  name: string;
  className?: string;
  size?: number;
}) {
  const initial = getWeaponIcon(name);
  const [src, setSrc] = useState<string | null>(initial);

  if (!src) {
    return (
      <img
        src={WEAPON_ICON_FALLBACK}
        alt=""
        width={size}
        height={size / 2}
        className={className}
        style={{ filter: "drop-shadow(0 0 6px rgba(245,158,11,0.3))" }}
      />
    );
  }

  return (
    <img
      src={src}
      alt={`${name} weapon`}
      width={size}
      height={size / 2}
      loading="lazy"
      className={className}
      style={{ filter: "drop-shadow(0 0 6px rgba(245,158,11,0.2))" }}
      onError={() => setSrc(null)}
    />
  );
}
