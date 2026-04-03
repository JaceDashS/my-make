export type CategoryCode =
  | 'base_foundation'
  | 'blush'
  | 'lip_color'
  | 'eyeshadow'
  | 'contour'
  | 'highlighter'
  | 'etc';

export const CATEGORY_CODES: CategoryCode[] = [
  'base_foundation',
  'blush',
  'lip_color',
  'eyeshadow',
  'contour',
  'highlighter',
  'etc',
];

export type MockInventoryItem = {
  sku: string;
  itemName: string;
  category: CategoryCode;
  lValue: number;
  cValue: number;
  hValue: number;
  cost: number;
  price: number;
};

export type PresetItemSource = 'inventory' | 'manual';

export type PresetItemRef = {
  source: PresetItemSource;
  itemName: string;
  imageUrl?: string | null;
  sku?: string | null;
};

export type PresetItems = Record<CategoryCode, PresetItemRef[] | null>;

export type Preset = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  note: string;
  items: PresetItems;
};

export type PresetBundle = {
  version: 2;
  presets: Preset[];
};

export function createEmptyPresetItems(): PresetItems {
  return {
    base_foundation: null,
    blush: null,
    lip_color: null,
    eyeshadow: null,
    contour: null,
    highlighter: null,
    etc: null,
  };
}
