import {
  createEmptyPreferencePointDocument,
  parsePreferencePointDocument,
  serializePreferencePointDocument,
} from '../src/domains/student-options/studentPreferencePointModel';

describe('studentPreferencePointModel', () => {
  test('serializes student preference points as version 3 category map with radius', () => {
    const document = createEmptyPreferencePointDocument();
    document.categories = [
      {
        code: 'base_foundation',
        pointMode: 'single',
        points: [{l: 64.5, c: 13.2, h: 57, radius: 6}],
      },
      {
        code: 'blush',
        pointMode: 'single',
        points: [{l: 66, c: 22, h: 42, radius: 10}],
      },
      {
        code: 'lip_color',
        pointMode: 'multi',
        points: [
          {l: 58, c: 22, h: 42, radius: 8},
          {l: 52, c: 18, h: 20, radius: 5},
        ],
      },
      {code: 'eyeshadow', pointMode: 'multi', points: []},
      {code: 'contour', pointMode: 'single', points: []},
      {code: 'highlighter', pointMode: 'single', points: []},
    ];

    expect(serializePreferencePointDocument(document)).toBe(
      JSON.stringify({
        version: 3,
        space: 'hcl',
        matchMode: 'point-distance',
        categories: {
          base_foundation: {
            pointMode: 'single',
            points: [{l: 64.5, c: 13.2, h: 57, radius: 6}],
          },
          blush: {
            pointMode: 'single',
            points: [{l: 66, c: 22, h: 42, radius: 10}],
          },
          lip_color: {
            pointMode: 'multi',
            points: [
              {l: 58, c: 22, h: 42, radius: 8},
              {l: 52, c: 18, h: 20, radius: 5},
            ],
          },
          eyeshadow: {
            pointMode: 'multi',
            points: [],
          },
          contour: {
            pointMode: 'single',
            points: [],
          },
          highlighter: {
            pointMode: 'single',
            points: [],
          },
        },
      }),
    );
  });

  test('parses seeded version 3 category map into editable categories', () => {
    const parsed = parsePreferencePointDocument(
      '{"version":3,"space":"hcl","matchMode":"point-distance","categories":{"base_foundation":{"pointMode":"single","points":[{"l":64.5,"c":13.2,"h":57,"radius":6}]},"blush":{"pointMode":"single","points":[{"l":66,"c":22,"h":42,"radius":10}]},"lip_color":{"pointMode":"single","points":[{"l":58,"c":22,"h":42,"radius":8}]}}}',
    );

    expect(parsed.version).toBe(3);
    expect(parsed.categories.find(category => category.code === 'base_foundation')?.points).toEqual([
      {l: 64.5, c: 13.2, h: 57, radius: 6},
    ]);
    expect(parsed.categories.find(category => category.code === 'blush')?.points).toEqual([
      {l: 66, c: 22, h: 42, radius: 10},
    ]);
    expect(parsed.categories.find(category => category.code === 'lip_color')?.points).toEqual([
      {l: 58, c: 22, h: 42, radius: 8},
    ]);
  });
});
