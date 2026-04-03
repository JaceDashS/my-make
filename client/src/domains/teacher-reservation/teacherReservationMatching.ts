import type {PresetInventoryItemApiResult} from '../../shared/lib/accountApi';
import type {
  CategoryCode,
  PresetItemRef,
  PresetItems,
} from '../teacher-preset/presetTypes';

type PresetPoint = {
  l: number;
  c: number;
  h: number;
  radius: number;
};

type ParsedPreset = {
  id: string;
  items: PresetItems;
  name: string;
  note: string;
};

export type TeacherReservationItemMatch = {
  category: CategoryCode;
  itemName: string;
  matched: boolean | null;
  reason: 'match' | 'mismatch' | 'no-preference' | 'unverified';
  sku: string;
};

export function parseTeacherReservationPresets(value: string): ParsedPreset[] {
  const trimmed = value.trim();
  if (!trimmed || trimmed === '-') {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed) as {presets?: Array<Record<string, unknown>>};
    if (!Array.isArray(parsed?.presets)) {
      return [];
    }

    return parsed.presets
      .map(preset => {
        const id =
          typeof preset.id === 'string' || typeof preset.id === 'number'
            ? String(preset.id).trim()
            : '';
        if (!id) {
          return null;
        }

        return {
          id,
          items: normalizePresetItems(preset.items),
          name:
            typeof preset.name === 'string' && preset.name.trim()
              ? preset.name.trim()
              : id,
          note:
            typeof preset.note === 'string' && preset.note.trim()
              ? preset.note.trim()
              : '',
        } satisfies ParsedPreset;
      })
      .filter((preset): preset is ParsedPreset => preset !== null);
  } catch {
    return [];
  }
}

export function buildTeacherReservationItemMatches(params: {
  inventoryItems: PresetInventoryItemApiResult[];
  preferenceRangesValue?: string;
  presetItems?: PresetItems | null;
}): TeacherReservationItemMatch[] {
  const {inventoryItems, preferenceRangesValue, presetItems} = params;
  if (!presetItems) {
    return [];
  }

  const inventoryBySku = new Map(inventoryItems.map(item => [item.sku, item]));
  const preferenceMap = parseTeacherReservationPreferenceRanges(preferenceRangesValue);
  const matches: TeacherReservationItemMatch[] = [];

  for (const category of CATEGORY_ORDER) {
    const categoryItems = presetItems[category] ?? [];
    for (const presetItem of categoryItems) {
      const sku = presetItem.sku?.trim() ?? '';
      const inventoryItem = sku ? inventoryBySku.get(sku) : undefined;
      if (!inventoryItem) {
        matches.push({
          category,
          itemName: presetItem.itemName,
          matched: null,
          reason: sku ? 'unverified' : 'no-preference',
          sku: sku || presetItem.itemName,
        });
        continue;
      }

      const preferencePoints = preferenceMap.get(category) ?? [];
      if (preferencePoints.length === 0) {
        matches.push({
          category,
          itemName: inventoryItem.itemName,
          matched: null,
          reason: 'no-preference',
          sku,
        });
        continue;
      }

      const itemPoint = {
        c: inventoryItem.cValue,
        h: inventoryItem.hValue,
        l: inventoryItem.lValue,
      };
      const matched = preferencePoints.some(point =>
        computeHclDistance(itemPoint, point) <= point.radius,
      );

      matches.push({
        category,
        itemName: inventoryItem.itemName,
        matched,
        reason: matched ? 'match' : 'mismatch',
        sku,
      });
    }
  }

  return matches;
}

function normalizePresetItems(value: unknown): PresetItems {
  const source = (value ?? {}) as Record<string, unknown>;
  return {
    base_foundation: normalizePresetItemList(source.base_foundation),
    blush: normalizePresetItemList(source.blush),
    lip_color: normalizePresetItemList(source.lip_color),
    eyeshadow: normalizePresetItemList(source.eyeshadow),
    contour: normalizePresetItemList(source.contour),
    highlighter: normalizePresetItemList(source.highlighter),
    etc: normalizePresetItemList(source.etc),
  };
}

function normalizePresetItemList(value: unknown): PresetItemRef[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const nextValues = value
    .map(normalizePresetItemRef)
    .filter((entry): entry is PresetItemRef => entry !== null);
  return nextValues.length > 0 ? nextValues : null;
}

function normalizePresetItemRef(value: unknown): PresetItemRef | null {
  if (typeof value === 'string') {
    const sku = value.trim();
    if (!sku) {
      return null;
    }
    return {
      source: 'inventory',
      sku,
      itemName: sku,
      imageUrl: null,
    };
  }

  if (!value || typeof value !== 'object') {
    return null;
  }

  const source = (value as any).source === 'manual' ? 'manual' : 'inventory';
  const itemName =
    typeof (value as any).itemName === 'string' && (value as any).itemName.trim()
      ? (value as any).itemName.trim()
      : typeof (value as any).sku === 'string' && (value as any).sku.trim()
      ? (value as any).sku.trim()
      : '';
  if (!itemName) {
    return null;
  }

  const sku =
    typeof (value as any).sku === 'string' && (value as any).sku.trim()
      ? (value as any).sku.trim()
      : null;
  const imageUrl =
    typeof (value as any).imageUrl === 'string' && (value as any).imageUrl.trim()
      ? (value as any).imageUrl.trim()
      : null;

  return {
    source,
    itemName,
    imageUrl,
    sku,
  };
}

function parseTeacherReservationPreferenceRanges(value?: string) {
  const map = new Map<CategoryCode, PresetPoint[]>();
  const trimmed = value?.trim() ?? '';
  if (!trimmed || trimmed === '-') {
    return map;
  }

  try {
    const parsed = JSON.parse(trimmed) as Record<string, any>;
    if (Array.isArray(parsed.categories)) {
      for (const category of parsed.categories) {
        const code = normalizeCategoryCode(category?.code);
        if (!code) {
          continue;
        }
        map.set(code, normalizePreferencePoints(category?.points));
      }
      return map;
    }

    if (parsed.categories && typeof parsed.categories === 'object') {
      for (const [rawCode, category] of Object.entries(parsed.categories)) {
        const code = normalizeCategoryCode(rawCode);
        if (!code) {
          continue;
        }
        map.set(code, normalizePreferencePoints((category as any)?.points));
      }
    }
  } catch {
    return map;
  }

  return map;
}

function normalizePreferencePoints(value: unknown): PresetPoint[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(entry => {
      const l = Number((entry as any)?.l);
      const c = Number((entry as any)?.c);
      const h = Number((entry as any)?.h);
      const radius = Number((entry as any)?.radius ?? 0);
      if (!Number.isFinite(l) || !Number.isFinite(c) || !Number.isFinite(h)) {
        return null;
      }

      return {
        c,
        h,
        l,
        radius: Number.isFinite(radius) && radius > 0 ? radius : 0,
      } satisfies PresetPoint;
    })
    .filter((point): point is PresetPoint => point !== null);
}

function normalizeCategoryCode(value: unknown): CategoryCode | null {
  switch (value) {
    case 'base_foundation':
    case 'blush':
    case 'lip_color':
    case 'eyeshadow':
    case 'contour':
    case 'highlighter':
    case 'etc':
      return value;
    default:
      return null;
  }
}

function computeHclDistance(
  item: {l: number; c: number; h: number},
  point: PresetPoint,
) {
  const dL = item.l - point.l;
  const dC = item.c - point.c;
  const rawHue = Math.abs(((item.h - point.h + 180) % 360) - 180);
  return Math.sqrt(dL * dL + dC * dC + rawHue * rawHue);
}

const CATEGORY_ORDER: CategoryCode[] = [
  'base_foundation',
  'blush',
  'lip_color',
  'eyeshadow',
  'contour',
  'highlighter',
  'etc',
];
