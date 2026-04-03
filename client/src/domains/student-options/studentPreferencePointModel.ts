export type HclPoint = {
  l: number;
  c: number;
  h: number;
  radius: number;
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
  version: 3;
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
    version: 3,
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

    const categoryMap = new Map<PreferenceCategoryCode, PreferenceCategoryEntry>();

    if (Array.isArray(parsed.categories)) {
      for (const entry of parsed.categories) {
        if (!isValidCategoryCode(entry?.code)) {
          continue;
        }
        categoryMap.set(entry.code, {
          code: entry.code as PreferenceCategoryCode,
          pointMode: PREFERENCE_CATEGORIES.find(c => c.code === entry.code)!.pointMode,
          points: normalizeHclPoints(entry.points),
        });
      }
    } else if (parsed.categories && typeof parsed.categories === 'object') {
      for (const [rawCode, rawEntry] of Object.entries(parsed.categories)) {
        if (!isValidCategoryCode(rawCode)) {
          continue;
        }
        categoryMap.set(rawCode, {
          code: rawCode,
          pointMode: PREFERENCE_CATEGORIES.find(c => c.code === rawCode)!.pointMode,
          points: normalizeHclPoints((rawEntry as PreferenceCategoryEntry | undefined)?.points),
        });
      }
    } else {
      return createEmptyPreferencePointDocument();
    }

    return {
      version: 3,
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
  const categories = Object.fromEntries(
    PREFERENCE_CATEGORIES.map(catalog => {
      const category =
        document.categories.find(entry => entry.code === catalog.code) ?? {
          code: catalog.code,
          pointMode: catalog.pointMode,
          points: [],
        };
      return [
        catalog.code,
        {
          pointMode: catalog.pointMode,
          points: category.points.map(point => ({
            l: Number(point.l),
            c: Number(point.c),
            h: Number(point.h),
            radius: Number(point.radius),
          })),
        },
      ];
    }),
  );

  return JSON.stringify({
    version: 3,
    space: 'hcl',
    matchMode: 'point-distance',
    categories,
  });
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

function normalizeHclPoints(value: unknown): HclPoint[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(point => isValidHclPoint(point))
    .map(point => ({
      l: Number(point.l),
      c: Number(point.c),
      h: Number(point.h),
      radius: Number.isFinite(Number(point.radius)) ? Number(point.radius) : 0,
    }));
}
