import ClipperLib = require('clipper-lib');

export type PreferencePoint = {
  x: number;
  y: number;
};

export type PreferenceRegion = {
  id: string;
  points: PreferencePoint[];
};

export type PreferenceRangesDocument = {
  version: 1;
  space: 'lch';
  plane: 'h-c';
  hueMode: 'unwrap';
  regions: PreferenceRegion[];
};

type CircleApproximationInput = {
  center: PreferencePoint;
  radius: number;
  regionId: string;
};

const MIN_CIRCLE_VERTEX_COUNT = 12;
const MAX_CIRCLE_VERTEX_COUNT = 96;

export function createEmptyPreferenceRangesDocument(): PreferenceRangesDocument {
  return {
    version: 1,
    space: 'lch',
    plane: 'h-c',
    hueMode: 'unwrap',
    regions: [],
  };
}

export function parsePreferenceRangesDocument(
  value: string | null | undefined,
): PreferenceRangesDocument {
  if (!value || !value.trim()) {
    return createEmptyPreferenceRangesDocument();
  }

  try {
    const parsed = JSON.parse(value) as Partial<PreferenceRangesDocument>;
    if (!Array.isArray(parsed.regions)) {
      return createEmptyPreferenceRangesDocument();
    }

    return {
      version: 1,
      space: 'lch',
      plane: 'h-c',
      hueMode: 'unwrap',
      regions: parsed.regions
        .map((region, index) => ({
          id:
            typeof region?.id === 'string' && region.id.trim()
              ? region.id
              : `region-${index + 1}`,
          points: Array.isArray(region?.points)
            ? region.points
                .filter(point => Number.isFinite(point?.x) && Number.isFinite(point?.y))
                .map(point => ({x: Number(point.x), y: Number(point.y)}))
            : [],
        }))
        .filter(region => region.points.length >= 3),
    };
  } catch {
    return createEmptyPreferenceRangesDocument();
  }
}

export function serializePreferenceRangesDocument(
  document: PreferenceRangesDocument,
): string {
  return JSON.stringify(document);
}

export function approximateCircleRegion({
  center,
  radius,
  regionId,
}: CircleApproximationInput): PreferenceRegion {
  const safeRadius = Math.max(1, radius);
  const vertexCount = Math.max(
    MIN_CIRCLE_VERTEX_COUNT,
    Math.min(
      MAX_CIRCLE_VERTEX_COUNT,
      Math.ceil((Math.PI * safeRadius) / 6),
    ),
  );

  return {
    id: regionId,
    points: Array.from({length: vertexCount}, (_, index) => {
      const angle = (Math.PI * 2 * index) / vertexCount;
      return {
        x: Number((center.x + Math.cos(angle) * safeRadius).toFixed(4)),
        y: Number((center.y + Math.sin(angle) * safeRadius).toFixed(4)),
      };
    }),
  };
}

export function deleteRegionPoint(
  region: PreferenceRegion,
  pointIndex: number,
): PreferenceRegion | null {
  if (pointIndex < 0 || pointIndex >= region.points.length) {
    return region;
  }

  const nextPoints = region.points.filter((_, index) => index !== pointIndex);
  if (nextPoints.length <= 2) {
    return null;
  }

  return {
    ...region,
    points: nextPoints,
  };
}

export function mergePreferenceRegions(
  document: PreferenceRangesDocument,
  nextRegion: PreferenceRegion,
): PreferenceRangesDocument {
  if (nextRegion.points.length < 3) {
    return document;
  }

  const clipper = new ClipperLib.Clipper();
  const solution: ClipperLib.Paths = [];

  clipper.AddPaths(
    document.regions.map(regionToClipperPath),
    ClipperLib.PolyType.ptSubject,
    true,
  );
  clipper.AddPaths(
    [regionToClipperPath(nextRegion)],
    ClipperLib.PolyType.ptClip,
    true,
  );
  clipper.Execute(
    ClipperLib.ClipType.ctUnion,
    solution,
    ClipperLib.PolyFillType.pftNonZero,
    ClipperLib.PolyFillType.pftNonZero,
  );

  return {
    ...document,
    regions: solution
      .map((path, index) => clipperPathToRegion(path, index))
      .filter((region): region is PreferenceRegion => region !== null),
  };
}

function regionToClipperPath(region: PreferenceRegion): ClipperLib.IntPoint[] {
  return region.points.map(point => ({
    X: scaleCoordinate(point.x),
    Y: scaleCoordinate(point.y),
  }));
}

function clipperPathToRegion(
  path: ClipperLib.IntPoint[],
  index: number,
): PreferenceRegion | null {
  const points = path.map(point => ({
    x: unscaleCoordinate(point.X),
    y: unscaleCoordinate(point.Y),
  }));

  if (points.length < 3) {
    return null;
  }

  return {
    id: `region-${index + 1}`,
    points,
  };
}

function scaleCoordinate(value: number) {
  return Math.round(value * 1000);
}

function unscaleCoordinate(value: number) {
  return Number((value / 1000).toFixed(4));
}
