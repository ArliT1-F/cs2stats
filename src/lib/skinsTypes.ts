// TypeScript types for the /api/inventory response.

export interface SkinPrice {
  lowestPrice: number | null;
  medianPrice: number | null;
  volume: number | null;
  source?: string;
  raw: string | null;
}

export interface SkinItem {
  assetId: string;
  classId: string;
  instanceId: string;
  name: string;
  marketHashName: string;
  weapon: string;
  weaponKey?: string | null;
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
  totalInventoryCount?: number | null;
  totalEstimatedValue?: number;
  pricesIncluded?: boolean;
  pricedCount?: number;
  currency?: number;
  priceSource?: string;
  partial?: boolean;
  diagnostics?: {
    totalInventoryCount?: number | null;
    pagesFetched?: number;
    pagesAttempted?: number;
    httpStatuses?: number[];
    rateLimitHits?: number;
    duplicatesSkipped?: number;
    perPageCounts?: number[];
    stoppedReason?: string;
    lastError?: string | null;
  };
  categories: Record<string, SkinCategory>;
  bestPerWeapon?: Record<string, SkinItem>;
}
