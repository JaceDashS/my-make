import {
  approximateCircleRegion,
  createEmptyPreferenceRangesDocument,
  deleteRegionPoint,
  mergePreferenceRegions,
  serializePreferenceRangesDocument,
  type PreferenceRangesDocument,
} from '../src/domains/student-options/studentSkinPreferenceModel';

describe('student skin preference geometry', () => {
  test('serializes preference ranges as unwrap hue-mode LCH document', () => {
    const document = createEmptyPreferenceRangesDocument();

    expect(serializePreferenceRangesDocument(document)).toBe(
      JSON.stringify({
        version: 1,
        space: 'lch',
        plane: 'h-c',
        hueMode: 'unwrap',
        regions: [],
      }),
    );
  });

  test('approximates circles with more vertices as radius grows', () => {
    const small = approximateCircleRegion({
      center: {x: 24, y: 18},
      radius: 12,
      regionId: 'small',
    });
    const large = approximateCircleRegion({
      center: {x: 24, y: 18},
      radius: 64,
      regionId: 'large',
    });

    expect(small.points.length).toBeGreaterThanOrEqual(12);
    expect(large.points.length).toBeGreaterThan(small.points.length);
  });

  test('deleting a point reconnects neighbors and drops polygons with fewer than three points', () => {
    const reduced = deleteRegionPoint(
      {
        id: 'region-1',
        points: [
          {x: 0, y: 0},
          {x: 10, y: 0},
          {x: 10, y: 10},
          {x: 0, y: 10},
        ],
      },
      1,
    );

    expect(reduced).toEqual({
      id: 'region-1',
      points: [
        {x: 0, y: 0},
        {x: 10, y: 10},
        {x: 0, y: 10},
      ],
    });

    const removed = deleteRegionPoint(
      {
        id: 'region-2',
        points: [
          {x: 0, y: 0},
          {x: 10, y: 0},
          {x: 5, y: 10},
        ],
      },
      1,
    );

    expect(removed).toBeNull();
  });

  test('merges overlapping regions and preserves disjoint regions separately', () => {
    const base: PreferenceRangesDocument = {
      version: 1,
      space: 'lch',
      plane: 'h-c',
      hueMode: 'unwrap',
      regions: [
        {
          id: 'base',
          points: [
            {x: 0, y: 0},
            {x: 40, y: 0},
            {x: 40, y: 40},
            {x: 0, y: 40},
          ],
        },
      ],
    };

    const merged = mergePreferenceRegions(
      base,
      approximateCircleRegion({
        center: {x: 20, y: 20},
        radius: 12,
        regionId: 'circle-1',
      }),
    );
    const separated = mergePreferenceRegions(
      merged,
      approximateCircleRegion({
        center: {x: 120, y: 120},
        radius: 10,
        regionId: 'circle-2',
      }),
    );

    expect(merged.regions).toHaveLength(1);
    expect(separated.regions).toHaveLength(2);
  });
});
