export type HclPoint = {
  l: number;
  c: number;
  h: number;
};

export type PointMode = 'single' | 'multi';

export type PreferenceCategoryCode =
  | 'base_foundation'
  | 'blush'
  | 'lip_color'
  | 'eyeshadow'
  | 'contour'
  | 'highlighter';

export type CategoryCatalogEntry = {
  code: PreferenceCategoryCode;
  label: string;
  pointMode: PointMode;
};

export type PreferenceCategoryEntry = {
  code: PreferenceCategoryCode;
  pointMode: PointMode;
  points: HclPoint[];
};

export type PreferencePointDocument = {
  version: 2;
  space: 'hcl';
  matchMode: 'point-distance';
  categories: PreferenceCategoryEntry[];
};

export type HclDistanceWeights = {
  wL: number;
  wC: number;
  wH: number;
};

const DEFAULT_WEIGHTS: HclDistanceWeights = {wL: 1, wC: 1, wH: 1};

export const PREFERENCE_CATEGORIES: CategoryCatalogEntry[] = [
  {code: 'base_foundation', label: 'Base / Foundation', pointMode: 'single'},
  {code: 'blush', label: 'Blush', pointMode: 'single'},
  {code: 'lip_color', label: 'Lip Color', pointMode: 'multi'},
  {code: 'eyeshadow', label: 'Eyeshadow', pointMode: 'multi'},
  {code: 'contour', label: 'Contour', pointMode: 'single'},
  {code: 'highlighter', label: 'Highlighter', pointMode: 'single'},
];

export function circularHueDistance(h1: number, h2: number): number {
  const diff = Math.abs(((h1 - h2 + 180) % 360) - 180);
  return diff;
}

export function hclPointDistance(
  a: HclPoint,
  b: HclPoint,
  weights: HclDistanceWeights = DEFAULT_WEIGHTS,
): number {
  const dL = a.l - b.l;
  const dC = a.c - b.c;
  const dH = circularHueDistance(a.h, b.h);
  return Math.sqrt(
    weights.wL * dL * dL +
    weights.wC * dC * dC +
    weights.wH * dH * dH,
  );
}

export function createEmptyPreferencePointDocument(): PreferencePointDocument {
  return {
    version: 2,
    space: 'hcl',
    matchMode: 'point-distance',
    categories: PREFERENCE_CATEGORIES.map(entry => ({
      code: entry.code,
      pointMode: entry.pointMode,
      points: [],
    })),
  };
}

export function parsePreferencePointDocument(
  value: string | null | undefined,
): PreferencePointDocument {
  if (!value || !value.trim()) {
    return createEmptyPreferencePointDocument();
  }

  try {
    const parsed = JSON.parse(value) as Partial<PreferencePointDocument>;

    if (parsed.version !== 2 || !Array.isArray(parsed.categories)) {
      return createEmptyPreferencePointDocument();
    }

    const categoryMap = new Map(
      parsed.categories
        .filter(entry => isValidCategoryCode(entry?.code))
        .map(entry => [
          entry.code,
          {
            code: entry.code as PreferenceCategoryCode,
            pointMode: PREFERENCE_CATEGORIES.find(c => c.code === entry.code)!.pointMode,
            points: Array.isArray(entry.points)
              ? entry.points
                  .filter(p => isValidHclPoint(p))
                  .map(p => ({l: Number(p.l), c: Number(p.c), h: Number(p.h)}))
              : [],
          },
        ]),
    );

    return {
      version: 2,
      space: 'hcl',
      matchMode: 'point-distance',
      categories: PREFERENCE_CATEGORIES.map(catalog =>
        categoryMap.get(catalog.code) ?? {
          code: catalog.code,
          pointMode: catalog.pointMode,
          points: [],
        },
      ),
    };
  } catch {
    return createEmptyPreferencePointDocument();
  }
}

export function serializePreferencePointDocument(
  document: PreferencePointDocument,
): string {
  return JSON.stringify(document);
}

function isValidCategoryCode(code: unknown): code is PreferenceCategoryCode {
  return PREFERENCE_CATEGORIES.some(c => c.code === code);
}

function isValidHclPoint(p: unknown): p is HclPoint {
  if (!p || typeof p !== 'object') {
    return false;
  }
  const point = p as Record<string, unknown>;
  return (
    Number.isFinite(Number(point.l)) &&
    Number.isFinite(Number(point.c)) &&
    Number.isFinite(Number(point.h))
  );
}
