import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import {TeacherPresetSection} from '../src/domains/teacher-preset/TeacherPresetSection';
import {searchPresetInventory} from '../src/shared/lib/accountApi';

jest.mock('../src/shared/lib/accountApi', () => ({
  searchPresetInventory: jest.fn(),
}));

function collectText(node: any): string[] {
  if (node == null) {
    return [];
  }

  if (typeof node === 'string' || typeof node === 'number') {
    return [String(node)];
  }

  if (Array.isArray(node)) {
    return node.flatMap(collectText);
  }

  return collectText(node.children ?? []);
}

function createProps(): React.ComponentProps<typeof TeacherPresetSection> {
  return {
    onSaveProfile: () => undefined,
    palette: {
      border: '#333333',
      card: '#111111',
      muted: '#222222',
      primary: '#3366ff',
      primaryText: '#ffffff',
      soft: '#dddddd',
      text: '#ffffff',
      textMuted: '#cccccc',
    },
    presetValue:
      '{"version":2,"presets":[{"id":"1","name":"Warm Daily","createdAt":"2026-04-03T10:00:00+09:00","updatedAt":"2026-04-03T10:00:00+09:00","note":"Warm tones","items":{"base_foundation":[{"source":"inventory","sku":"FND-001","itemName":"Foundation","imageUrl":null}],"blush":null,"lip_color":null,"eyeshadow":null,"contour":null,"highlighter":null,"etc":null}}]}',
    styles: {
      actionText: {},
      optionRow: {flexDirection: 'row', gap: 8},
    },
    texts: {
      cancel: 'Cancel',
      presetTitle: 'Preset List',
      presetNew: '+ New Preset',
      presetName: 'Preset Name',
      presetSave: 'Save Preset',
      presetDelete: 'Delete Preset',
      presetDeleteConfirm: 'Delete this preset?',
      presetShowDetails: 'Show Details',
      presetHideDetails: 'Hide Details',
      presetSummary: 'Summary',
      presetNoItems: 'No items.',
      presetCategoryAll: 'All',
      presetSearch: 'Search',
      presetSearchPlaceholder: 'Search by name or SKU',
      presetManualItemNamePlaceholder: 'Manual item name',
      presetManualAdd: 'Add Item',
      presetManualCategoryRequired: 'Choose a category',
      presetItemName: 'Item Name',
      presetSku: 'SKU',
      presetLch: 'L / C / H',
      presetCategoryBaseFoundation: 'Base Foundation',
      presetCategoryBlush: 'Blush',
      presetCategoryLipColor: 'Lip Color',
      presetCategoryEyeshadow: 'Eyeshadow',
      presetCategoryContour: 'Contour',
      presetCategoryHighlighter: 'Highlighter',
      presetCategoryEtc: 'Etc',
    },
    title: 'Preset',
    ui: {
      BodyStrong: ({children}: any) => <>{children}</>,
      BodyText: ({children}: any) => <>{children}</>,
      Card: ({children, title}: any) => (
        <>
          {title}
          {children}
        </>
      ),
      FieldLabel: ({children}: any) => <>{children}</>,
      OptionChip: ({label}: any) => <>{label}</>,
    },
  };
}

describe('TeacherPresetSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (searchPresetInventory as jest.Mock).mockResolvedValue({
      items: [],
      message: 'ok',
      status: 'ok',
    });
  });

  test('renders without crashing in the native renderer', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<TeacherPresetSection {...createProps()} />);
    });

    const textContent = collectText(renderer!.toJSON()).join(' ');
    expect(textContent).toContain('Preset');
    expect(textContent).toContain('Warm Daily');
    expect(textContent).toContain('Show Details');
  });
});
