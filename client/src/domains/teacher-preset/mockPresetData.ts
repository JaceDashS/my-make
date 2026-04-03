import type {MockInventoryItem, PresetBundle, PresetItemRef} from './presetTypes';

export const MOCK_INVENTORY_ITEMS: MockInventoryItem[] = [
  // base_foundation
  {sku: 'FND-001', itemName: 'Soft Beige Foundation', category: 'base_foundation', lValue: 72, cValue: 14, hValue: 42, cost: 1200, price: 2800},
  {sku: 'FND-002', itemName: 'Warm Ivory Foundation', category: 'base_foundation', lValue: 78, cValue: 10, hValue: 38, cost: 1100, price: 2600},
  {sku: 'FND-003', itemName: 'Natural Ochre Foundation', category: 'base_foundation', lValue: 65, cValue: 18, hValue: 46, cost: 1300, price: 3000},

  // blush
  {sku: 'BLS-001', itemName: 'Coral Flush Blush', category: 'blush', lValue: 62, cValue: 38, hValue: 28, cost: 800, price: 1800},
  {sku: 'BLS-002', itemName: 'Peach Glow Blush', category: 'blush', lValue: 68, cValue: 30, hValue: 32, cost: 750, price: 1700},
  {sku: 'BLS-003', itemName: 'Rose Dust Blush', category: 'blush', lValue: 58, cValue: 26, hValue: 340, cost: 850, price: 1900},

  // lip_color
  {sku: 'LIP-012', itemName: 'Nude Rose Lip', category: 'lip_color', lValue: 55, cValue: 22, hValue: 20, cost: 900, price: 2000},
  {sku: 'LIP-014', itemName: 'Coral Coral Lip', category: 'lip_color', lValue: 52, cValue: 40, hValue: 25, cost: 950, price: 2200},
  {sku: 'LIP-018', itemName: 'Berry Mauve Lip', category: 'lip_color', lValue: 42, cValue: 28, hValue: 330, cost: 1000, price: 2400},

  // eyeshadow
  {sku: 'EYE-021', itemName: 'Terracotta Matte Eye', category: 'eyeshadow', lValue: 48, cValue: 24, hValue: 40, cost: 700, price: 1600},
  {sku: 'EYE-022', itemName: 'Champagne Shimmer Eye', category: 'eyeshadow', lValue: 75, cValue: 16, hValue: 50, cost: 720, price: 1650},
  {sku: 'EYE-023', itemName: 'Taupe Neutral Eye', category: 'eyeshadow', lValue: 55, cValue: 8, hValue: 44, cost: 680, price: 1550},

  // contour
  {sku: 'CON-003', itemName: 'Soft Shadow Contour', category: 'contour', lValue: 44, cValue: 10, hValue: 40, cost: 850, price: 1900},
  {sku: 'CON-004', itemName: 'Warm Sculpt Contour', category: 'contour', lValue: 40, cValue: 14, hValue: 36, cost: 880, price: 2000},
  {sku: 'CON-005', itemName: 'Cool Define Contour', category: 'contour', lValue: 42, cValue: 8, hValue: 280, cost: 830, price: 1850},

  // highlighter
  {sku: 'HIL-001', itemName: 'Pearl Glow Highlighter', category: 'highlighter', lValue: 88, cValue: 6, hValue: 55, cost: 950, price: 2200},
  {sku: 'HIL-003', itemName: 'Gold Dust Highlighter', category: 'highlighter', lValue: 84, cValue: 20, hValue: 52, cost: 1000, price: 2400},
  {sku: 'HIL-005', itemName: 'Rose Gold Highlighter', category: 'highlighter', lValue: 80, cValue: 18, hValue: 30, cost: 980, price: 2300},

  // etc
  {sku: 'FIX-001', itemName: 'Setting Spray', category: 'etc', lValue: 0, cValue: 0, hValue: 0, cost: 600, price: 1400},
  {sku: 'FIX-002', itemName: 'Primer Base', category: 'etc', lValue: 0, cValue: 0, hValue: 0, cost: 700, price: 1600},
  {sku: 'FIX-003', itemName: 'Translucent Powder', category: 'etc', lValue: 90, cValue: 2, hValue: 0, cost: 650, price: 1500},
];

export const MOCK_PRESET_BUNDLE: PresetBundle = {
  version: 2,
  presets: [
    {
      id: '1',
      name: 'Soft Daily Coral',
      createdAt: '2026-04-02T09:00:00+09:00',
      updatedAt: '2026-04-02T09:00:00+09:00',
      note: 'Daily coral tone preset for soft warm classes.',
      items: {
        base_foundation: [toPresetItem('FND-001')],
        blush: [toPresetItem('BLS-002'), toPresetItem('BLS-003')],
        lip_color: [toPresetItem('LIP-014')],
        eyeshadow: [toPresetItem('EYE-021')],
        contour: [toPresetItem('CON-004')],
        highlighter: [toPresetItem('HIL-003')],
        etc: null,
      },
    },
    {
      id: '2',
      name: 'Warm Daily Peach',
      createdAt: '2026-04-02T09:30:00+09:00',
      updatedAt: '2026-04-02T10:10:00+09:00',
      note: 'Peach-focused preset for natural daytime looks.',
      items: {
        base_foundation: [toPresetItem('FND-003')],
        blush: [toPresetItem('BLS-001')],
        lip_color: [toPresetItem('LIP-018')],
        eyeshadow: null,
        contour: [toPresetItem('CON-004')],
        highlighter: null,
        etc: [toPresetItem('FIX-002')],
      },
    },
  ],
};

function toPresetItem(sku: string): PresetItemRef {
  const inventoryItem = MOCK_INVENTORY_ITEMS.find(item => item.sku === sku);
  return {
    source: 'inventory',
    sku,
    itemName: inventoryItem?.itemName ?? sku,
    imageUrl: null,
  };
}
