// TypeScript types for the /api/inventory response.

export interface SkinPrice {
  lowestPrice: number | null;
  medianPrice: number | null;
  volume: number | null;
  raw: string | null;
}

export interface SkinItem {
  assetId: string;
  classId: string;
  instanceId: string;
  name: string;
  marketHashName: string;
  weapon: string;
  skin: string | null;
  wear: string | null;
  iconUrl: string | null;
  iconUrlLarge: string | null;
  rarityColor: string | null;
  rarity: string | null;
  type: string | null;
  stattrak: boolean;
  souvenir: boolean;
  category: string;
  tradable: boolean;
  marketable: boolean;
  price: SkinPrice | null;
}

export interface SkinCategory {
  items: SkinItem[];
  totalValue: number;
  count: number;
}

export interface InventoryResponse {
  error?: string;
  message?: string;
  totalItems?: number;
  totalEstimatedValue?: number;
  pricesIncluded?: boolean;
  pricedCount?: number;
  currency?: number;
  categories: Record<string, SkinCategory>;
  bestPerWeapon?: Record<string, SkinItem>;
}
