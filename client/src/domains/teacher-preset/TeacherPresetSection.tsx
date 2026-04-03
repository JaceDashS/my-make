import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  Alert,
  Animated,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {ActionButton} from '../../shared/components/ActionButton';
import {SearchHeader} from '../../shared/components/SearchHeader';
import {
  searchPresetInventory,
  type PresetInventoryItemApiResult,
} from '../../shared/lib/accountApi';
import {windowsPressableFocusProps} from '../../shared/ui/windowsFocusProps';
import {
  CATEGORY_CODES,
  createEmptyPresetItems,
  type CategoryCode,
  type PresetItemRef,
  type Preset,
  type PresetBundle,
} from './presetTypes';

type PaletteLike = {
  border: string;
  card?: string;
  muted: string;
  primary: string;
  primaryText: string;
  soft: string;
  text: string;
  textMuted: string;
};

type UiComponents = {
  BodyStrong: React.ComponentType<any>;
  BodyText: React.ComponentType<any>;
  Card: React.ComponentType<any>;
  FieldLabel: React.ComponentType<any>;
  OptionChip: React.ComponentType<any>;
};

type TeacherPresetTexts = {
  presetTitle: string;
  presetNew: string;
  presetName: string;
  presetSave: string;
  presetDelete: string;
  presetDeleteConfirm: string;
  presetShowDetails: string;
  presetHideDetails: string;
  presetSummary: string;
  presetNoItems: string;
  presetCategoryAll: string;
  presetSearch: string;
  presetSearchPlaceholder: string;
  presetManualItemNamePlaceholder: string;
  presetManualAdd: string;
  presetManualCategoryRequired: string;
  presetItemName: string;
  presetSku: string;
  presetLch: string;
  presetCategoryBaseFoundation: string;
  presetCategoryBlush: string;
  presetCategoryLipColor: string;
  presetCategoryEyeshadow: string;
  presetCategoryContour: string;
  presetCategoryHighlighter: string;
  presetCategoryEtc: string;
  cancel: string;
};

type Props = {
  onSaveProfile: (overrides?: {preset?: string}) => Promise<void> | void;
  palette: PaletteLike;
  presetValue: string;
  styles: any;
  texts: TeacherPresetTexts;
  title: string;
  ui: UiComponents;
};

const EMPTY_PRESET_BUNDLE: PresetBundle = {
  version: 2,
  presets: [],
};
const CONTENT_EDGE_INSET = Platform.OS === 'web' ? 18 : 16;
const HEADER_HEIGHT = 100;
const FOOTER_HEIGHT = 112;
const DETAIL_SHEET_ANIMATION_MS = 520;
const CATEGORY_HEADER_LABEL = 'Category';
const IMAGE_COLUMN_LABEL = 'IMG';

function buildTimestamp() {
  const now = new Date();
  const offsetMinutes = -now.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const hours = String(Math.floor(Math.abs(offsetMinutes) / 60)).padStart(2, '0');
  const minutes = String(Math.abs(offsetMinutes) % 60).padStart(2, '0');
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hour}:${minute}:${second}${sign}${hours}:${minutes}`;
}

function createPresetName(index: number) {
  return `Preset ${index}`;
}

function getCategoryLabel(code: CategoryCode, texts: TeacherPresetTexts): string {
  switch (code) {
    case 'base_foundation':
      return texts.presetCategoryBaseFoundation;
    case 'blush':
      return texts.presetCategoryBlush;
    case 'lip_color':
      return texts.presetCategoryLipColor;
    case 'eyeshadow':
      return texts.presetCategoryEyeshadow;
    case 'contour':
      return texts.presetCategoryContour;
    case 'highlighter':
      return texts.presetCategoryHighlighter;
    case 'etc':
      return texts.presetCategoryEtc;
  }
}

function normalizePresetBundle(value: string): PresetBundle {
  const trimmed = value.trim();
  if (!trimmed || trimmed === '-') {
    return EMPTY_PRESET_BUNDLE;
  }

  try {
    const parsed = JSON.parse(trimmed);
    const presets = Array.isArray(parsed?.presets) ? parsed.presets : null;
    if (!presets) {
      return EMPTY_PRESET_BUNDLE;
    }

    const normalizedPresets: Preset[] = presets
      .map((preset: any, index: number): Preset | null => {
        const id =
          typeof preset?.id === 'string' || typeof preset?.id === 'number'
            ? String(preset.id).trim()
            : '';
        const name =
          typeof preset?.name === 'string' && preset.name.trim()
            ? preset.name.trim()
            : createPresetName(index + 1);
        if (!id) {
          return null;
        }

        const items = createEmptyPresetItems();
        const rawItems = preset?.items && typeof preset.items === 'object' ? preset.items : {};
        for (const category of CATEGORY_CODES) {
          const valueForCategory = rawItems[category];
          if (valueForCategory === null || valueForCategory === undefined) {
            items[category] = null;
            continue;
          }
          items[category] = normalizePresetItemRefs(valueForCategory);
        }

        return {
          id,
          name,
          createdAt:
            typeof preset?.createdAt === 'string' && preset.createdAt.trim()
              ? preset.createdAt.trim()
              : buildTimestamp(),
          updatedAt:
            typeof preset?.updatedAt === 'string' && preset.updatedAt.trim()
              ? preset.updatedAt.trim()
              : buildTimestamp(),
          note:
            typeof preset?.note === 'string' && preset.note.trim() ? preset.note.trim() : '',
          items,
        };
      })
      .filter((preset: Preset | null): preset is Preset => preset !== null);

    return {
      version: 2,
      presets: normalizedPresets,
    };
  } catch {
    return EMPTY_PRESET_BUNDLE;
  }
}

function normalizePresetItemRefs(value: unknown): PresetItemRef[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const nextItems = value
    .map((entry: unknown): PresetItemRef | null => {
      if (typeof entry === 'string') {
        const sku = entry.trim();
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

      if (!entry || typeof entry !== 'object') {
        return null;
      }

      const source = (entry as any).source === 'manual' ? 'manual' : 'inventory';
      const sku =
        typeof (entry as any).sku === 'string' && (entry as any).sku.trim()
          ? (entry as any).sku.trim()
          : null;
      const itemName =
        typeof (entry as any).itemName === 'string' && (entry as any).itemName.trim()
          ? (entry as any).itemName.trim()
          : sku ?? '';
      if (!itemName) {
        return null;
      }

      return {
        source,
        sku,
        itemName,
        imageUrl:
          typeof (entry as any).imageUrl === 'string' && (entry as any).imageUrl.trim()
            ? (entry as any).imageUrl.trim()
            : null,
      };
    })
    .filter((entry): entry is PresetItemRef => entry !== null);

  return nextItems.length > 0 ? nextItems : null;
}

function serializePresetBundle(bundle: PresetBundle): string {
  return JSON.stringify({
    version: 2,
    presets: bundle.presets.map(preset => ({
      id: preset.id,
      name: preset.name,
      createdAt: preset.createdAt,
      updatedAt: preset.updatedAt,
      note: preset.note,
      items: Object.fromEntries(
        CATEGORY_CODES.map(category => [
          category,
          preset.items[category]?.map(item => ({
            source: item.source,
            sku: item.sku ?? null,
            itemName: item.itemName,
            imageUrl: item.imageUrl ?? null,
          })) ?? null,
        ]),
      ),
    })),
  });
}

function getPresetItemIdentity(item: PresetItemRef) {
  return item.sku?.trim() || `${item.source}:${item.itemName.trim()}`;
}

function renderTableImage(
  imageUrl: string | null | undefined,
  itemName: string,
  palette: PaletteLike,
) {
  return (
    <View
      style={[
        presetStyles.tableImageCell,
        {
          borderColor: palette.border,
          backgroundColor: palette.muted,
        },
      ]}>
      {imageUrl ? (
        <Image source={{uri: imageUrl}} style={presetStyles.tableImage} />
      ) : (
        <Text style={[presetStyles.tableImageFallbackText, {color: palette.textMuted}]}>No Image</Text>
      )}
    </View>
  );
}

function createEmptyCustomItemForm() {
  return {
    category: '' as CategoryCode | '',
    imageUrl: '',
    itemName: '',
    sku: '',
  };
}

export function TeacherPresetSection({
  onSaveProfile,
  palette,
  presetValue,
  styles,
  texts,
  title,
  ui: {BodyText, Card, FieldLabel, OptionChip},
}: Props) {
  const isWeb = Platform.OS === 'web';
  const [bundle, setBundle] = useState<PresetBundle>(() => normalizePresetBundle(presetValue));
  const [inventoryItems, setInventoryItems] = useState<PresetInventoryItemApiResult[]>([]);
  const [hasSearchedInventory, setHasSearchedInventory] = useState(false);
  const [isInventoryLoading, setIsInventoryLoading] = useState(false);
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [hasUnsavedPresetChanges, setHasUnsavedPresetChanges] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string>(() => {
    const initialBundle = normalizePresetBundle(presetValue);
    return initialBundle.presets[0]?.id ?? '';
  });
  const [selectedCategory, setSelectedCategory] = useState<CategoryCode | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPresetMenuOpen, setIsPresetMenuOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCustomItemPopupOpen, setIsCustomItemPopupOpen] = useState(false);
  const [isCustomCategoryMenuOpen, setIsCustomCategoryMenuOpen] = useState(false);
  const [customItemForm, setCustomItemForm] = useState(createEmptyCustomItemForm);
  const searchInputRef = useRef<TextInput | null>(null);
  const detailAnimation = useRef(new Animated.Value(0)).current;
  const isInventoryIdleState = !hasSearchedInventory && !isInventoryLoading;

  useEffect(() => {
    const nextBundle = normalizePresetBundle(presetValue);
    setBundle(nextBundle);
    setHasUnsavedPresetChanges(false);
    setSelectedPresetId(currentSelectedPresetId => {
      if (nextBundle.presets.some(preset => preset.id === currentSelectedPresetId)) {
        return currentSelectedPresetId;
      }
      return nextBundle.presets[0]?.id ?? '';
    });
  }, [presetValue]);

  useEffect(() => {
    if (!isDetailOpen) {
      closeCustomItemPopup();
    }
  }, [isDetailOpen]);

  useEffect(() => {
    if (isWeb) {
      return;
    }

    if (!isDetailOpen) {
      console.log('[preset] detail closed');
      detailAnimation.setValue(0);
      return;
    }

    console.log('[preset] detail opening animation start');
    detailAnimation.setValue(0);
    Animated.timing(detailAnimation, {
      duration: DETAIL_SHEET_ANIMATION_MS,
      toValue: 1,
      useNativeDriver: true,
    }).start(result => {
      console.log('[preset] detail opening animation end', {
        finished: result?.finished ?? null,
      });
    });
  }, [detailAnimation, isDetailOpen]);

  const selectedPreset = useMemo(
    () => bundle.presets.find(preset => preset.id === selectedPresetId),
    [bundle.presets, selectedPresetId],
  );
  const inventoryBySku = useMemo(
    () => new Map(inventoryItems.map(item => [item.sku, item])),
    [inventoryItems],
  );

  const filteredInventoryItems = useMemo(() => {
    if (selectedCategory === 'all') {
      return inventoryItems;
    }

    return inventoryItems.filter(item => item.category === selectedCategory);
  }, [inventoryItems, selectedCategory]);

  async function runInventorySearch(query: string) {
    setHasSearchedInventory(true);
    setIsInventoryLoading(true);
    try {
      const result = await searchPresetInventory({
        query: query.trim() || undefined,
      });
      const nextItems = result.items ?? [];
      setInventoryItems(nextItems);
    } catch (error) {
      console.warn('[preset] inventory search failed', error);
      setInventoryItems([]);
    } finally {
      setIsInventoryLoading(false);
    }
  }

  const persistBundle = async (nextBundle: PresetBundle) => {
    setIsSavingPreset(true);
    try {
      await Promise.resolve(
        onSaveProfile({
          preset: serializePresetBundle(nextBundle),
        }),
      );
      setHasUnsavedPresetChanges(false);
    } finally {
      setIsSavingPreset(false);
    }
  };

  const applyBundleDraft = (nextBundle: PresetBundle) => {
    setBundle(nextBundle);
    setHasUnsavedPresetChanges(true);
  };

  const selectPresetById = (presetId: string) => {
    setSelectedPresetId(presetId);
    setIsPresetMenuOpen(false);
    closeCustomItemPopup();
  };

  const handleSavePreset = () => {
    if (!selectedPreset || !hasUnsavedPresetChanges || isSavingPreset) {
      return;
    }

    setIsPresetMenuOpen(false);
    setIsDetailOpen(false);
    void persistBundle(bundle);
  };

  const deletePresetById = (presetId: string) => {
    const targetPreset = bundle.presets.find(preset => preset.id === presetId);
    if (!targetPreset) {
      return;
    }

    const nextPresets = bundle.presets.filter(preset => preset.id !== presetId);
    const nextSelectedPreset = nextPresets[0] ?? null;
    const nextBundle: PresetBundle = {
      version: 2,
      presets: nextPresets,
    };

    setSelectedPresetId(nextSelectedPreset?.id ?? '');
    setIsPresetMenuOpen(false);
    setIsDetailOpen(false);
    applyBundleDraft(nextBundle);
  };

  const promptDeletePreset = (presetId: string) => {
    if (!bundle.presets.some(preset => preset.id === presetId)) {
      return;
    }

    if (Platform.OS === 'web') {
      const confirmDialog = (globalThis as {confirm?: (message?: string) => boolean}).confirm;
      if (typeof confirmDialog === 'function' && confirmDialog(texts.presetDeleteConfirm)) {
        deletePresetById(presetId);
      }
      return;
    }

    Alert.alert(texts.presetDelete, texts.presetDeleteConfirm, [
      {
        text: texts.cancel,
        style: 'cancel',
      },
      {
        text: texts.presetDelete,
        style: 'destructive',
        onPress: () => deletePresetById(presetId),
      },
    ]);
  };

  const handleDeletePreset = () => {
    if (!selectedPreset) {
      return;
    }
    promptDeletePreset(selectedPreset.id);
  };

  const handleSelectItem = (category: CategoryCode, sku: string) => {
    if (!selectedPresetId) {
      return;
    }

    const inventoryItem = inventoryBySku.get(sku);
    const nextBundle: PresetBundle = {
      ...bundle,
      presets: bundle.presets.map(preset => {
        if (preset.id !== selectedPresetId) {
          return preset;
        }

        const currentItems = preset.items[category] ?? [];
        const hasItem = currentItems.some(item => item.sku === sku);
        const nextItemsForCategory = hasItem
          ? currentItems.filter(item => item.sku !== sku)
          : [
              ...currentItems,
              {
                source: 'inventory',
                sku,
                itemName: inventoryItem?.itemName ?? sku,
                imageUrl: inventoryItem?.imageUrl ?? null,
              } satisfies PresetItemRef,
            ];

        return {
          ...preset,
          updatedAt: buildTimestamp(),
          items: {
            ...preset.items,
            [category]: nextItemsForCategory.length > 0 ? nextItemsForCategory : null,
          },
        };
      }),
    };

    applyBundleDraft(nextBundle);
  };

  const handleRemovePresetItem = (category: CategoryCode, targetItem: PresetItemRef) => {
    if (!selectedPresetId) {
      return;
    }

    const targetIdentity = getPresetItemIdentity(targetItem);
    const nextBundle: PresetBundle = {
      ...bundle,
      presets: bundle.presets.map(preset => {
        if (preset.id !== selectedPresetId) {
          return preset;
        }

        const currentItems = preset.items[category] ?? [];
        const nextItemsForCategory = currentItems.filter(
          item => getPresetItemIdentity(item) !== targetIdentity,
        );

        return {
          ...preset,
          updatedAt: buildTimestamp(),
          items: {
            ...preset.items,
            [category]: nextItemsForCategory.length > 0 ? nextItemsForCategory : null,
          },
        };
      }),
    };

    applyBundleDraft(nextBundle);
  };

  const handleSearch = () => {
    searchInputRef.current?.blur();
    void runInventorySearch(searchQuery);
  };

  const handleSearchAll = () => {
    setSelectedCategory('all');
    setSearchQuery('');
    searchInputRef.current?.blur();
    void runInventorySearch('');
  };

  const handleCreatePreset = () => {
    const nextId = String(
      bundle.presets.reduce((maxId, preset) => {
        const numericId = Number(preset.id);
        return Number.isFinite(numericId) ? Math.max(maxId, numericId) : maxId;
      }, 0) + 1,
    );
    const nextPreset: Preset = {
      id: nextId,
      name: createPresetName(bundle.presets.length + 1),
      createdAt: buildTimestamp(),
      updatedAt: buildTimestamp(),
      note: '',
      items: createEmptyPresetItems(),
    };
    const nextBundle: PresetBundle = {
      version: 2,
      presets: [...bundle.presets, nextPreset],
    };
    setSelectedPresetId(nextId);
    setIsPresetMenuOpen(false);
    setIsDetailOpen(false);
    applyBundleDraft(nextBundle);
  };

  const resetCustomItemForm = () => {
    setCustomItemForm(createEmptyCustomItemForm());
    setIsCustomCategoryMenuOpen(false);
  };

  const closeCustomItemPopup = () => {
    setIsCustomItemPopupOpen(false);
    resetCustomItemForm();
  };

  const openCustomItemPopup = () => {
    setIsCustomItemPopupOpen(true);
    setIsCustomCategoryMenuOpen(false);
  };

  const handleAddCustomItem = () => {
    if (!selectedPresetId) {
      return;
    }
    const nextItemName = customItemForm.itemName.trim();
    const nextCategory = customItemForm.category;
    if (!nextItemName || !nextCategory) {
      return;
    }

    const nextManualItem: PresetItemRef = {
      source: 'manual',
      itemName: nextItemName,
      sku: customItemForm.sku.trim() || null,
      imageUrl: customItemForm.imageUrl.trim() || null,
    };

    const nextBundle: PresetBundle = {
      ...bundle,
      presets: bundle.presets.map(preset => {
        if (preset.id !== selectedPresetId) {
          return preset;
        }

        const currentItems = preset.items[nextCategory] ?? [];
        return {
          ...preset,
          updatedAt: buildTimestamp(),
          items: {
            ...preset.items,
            [nextCategory]: [...currentItems, nextManualItem],
          },
        };
      }),
    };

    closeCustomItemPopup();
    applyBundleDraft(nextBundle);
  };

  const visibleFooterPresets = bundle.presets;
  const canSubmitCustomItem =
    !!selectedPresetId &&
    !!customItemForm.itemName.trim() &&
    !!customItemForm.category;
  const customCategoryLabel = customItemForm.category
    ? getCategoryLabel(customItemForm.category, texts)
    : texts.presetManualCategoryRequired;
  const selectedItemSummary = useMemo(() => {
    if (!selectedPreset) {
      return texts.presetNoItems;
    }

    const selectedItemNames = CATEGORY_CODES.flatMap(
      category =>
        selectedPreset.items[category]?.map(item => {
          const inventoryName =
            item.sku && inventoryBySku.has(item.sku)
              ? inventoryBySku.get(item.sku)?.itemName
              : null;
          return inventoryName ?? item.itemName;
        }) ?? [],
    ).filter((itemName): itemName is string => !!itemName);

    if (selectedItemNames.length === 0) {
      return texts.presetNoItems;
    }

    return selectedItemNames.join(' | ');
  }, [inventoryBySku, selectedPreset, texts.presetNoItems]);

  const selectedCategorySections = useMemo(() => {
    if (!selectedPreset) {
      return [];
    }

    return CATEGORY_CODES.map(category => {
      const items =
        selectedPreset.items[category]?.map(item => {
          const inventoryItem = item.sku ? inventoryBySku.get(item.sku) : null;
          return {
            category,
            identity: getPresetItemIdentity(item),
            item,
            imageUrl: inventoryItem?.imageUrl ?? item.imageUrl ?? null,
            itemName: inventoryItem?.itemName ?? item.itemName,
            sku: item.sku ?? '-',
            lch: inventoryItem
              ? `${inventoryItem.lValue}/${inventoryItem.cValue}/${inventoryItem.hValue}`
              : '-',
          };
        }) ?? [];

      return {
        category,
        label: getCategoryLabel(category, texts),
        items,
      };
    }).filter(section => section.items.length > 0);
  }, [inventoryBySku, selectedPreset, texts]);

  return (
    <View style={presetStyles.sectionRoot}>
      <View style={presetStyles.topOverlayWrap}>
        <SearchHeader edgeInset={CONTENT_EDGE_INSET} palette={palette}>
          <View style={presetStyles.searchBlock}>
            <View style={presetStyles.searchRow2}>
              <TextInput
                ref={searchInputRef}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
                placeholder={texts.presetSearchPlaceholder}
                placeholderTextColor={palette.textMuted}
                style={[
                  presetStyles.searchInput,
                  presetStyles.searchRowInput,
                  {backgroundColor: palette.muted, borderColor: palette.border, color: palette.text},
                ]}
                value={searchQuery}
              />
              <View style={presetStyles.searchButtonsRow}>
                <ActionButton
                  backgroundColor={palette.primary}
                  isLoading={isInventoryLoading}
                  label={texts.presetSearch}
                  onPress={handleSearch}
                  style={presetStyles.searchButton}
                  textColor={palette.primaryText}
                />
                <ActionButton
                  backgroundColor={palette.muted}
                  isLoading={false}
                  label={texts.presetCategoryAll}
                  onPress={handleSearchAll}
                  style={presetStyles.searchButton}
                  textColor={palette.text}
                />
              </View>
            </View>
            <View style={presetStyles.categoryChipRow}>
              {(['all', ...CATEGORY_CODES] as const).map(category => (
                <OptionChip
                  key={category}
                  active={selectedCategory === category}
                  label={
                    category === 'all'
                      ? texts.presetCategoryAll
                      : getCategoryLabel(category, texts)
                  }
                  onPress={() => setSelectedCategory(category)}
                  palette={palette}
                />
              ))}
            </View>
          </View>
        </SearchHeader>
      </View>

      <ScrollView
        contentContainerStyle={presetStyles.scrollContent}
        scrollEventThrottle={16}
        style={[
          presetStyles.scrollRoot,
          {
            backgroundColor: palette.card ?? palette.soft,
          },
        ]}>
        <View
          style={{
            paddingHorizontal: CONTENT_EDGE_INSET,
            paddingBottom: FOOTER_HEIGHT + 16,
          }}>
          <Card
            palette={
              isInventoryIdleState
                ? {
                    ...palette,
                    border: 'transparent',
                    card: 'transparent',
                  }
                : palette
            }
            title={texts.presetItemName}>
            <View>
              <View
                style={[
                  presetStyles.tableHeaderRow,
                  {
                    borderColor: isInventoryIdleState ? 'transparent' : palette.border,
                  },
                ]}>
                <View style={presetStyles.tableCheckboxCell} />
                <Text numberOfLines={1} style={presetStyles.tableImageHeader}>
                  {IMAGE_COLUMN_LABEL}
                </Text>
                <Text numberOfLines={1} style={presetStyles.tableNameHeader}>{texts.presetItemName}</Text>
                <Text numberOfLines={1} style={presetStyles.tableSkuHeader}>{texts.presetSku}</Text>
                <Text numberOfLines={1} style={presetStyles.tableCategoryHeader}>{CATEGORY_HEADER_LABEL}</Text>
                <Text numberOfLines={1} style={presetStyles.tableLchHeader}>{texts.presetLch}</Text>
              </View>

              {!hasSearchedInventory ? (
                <View style={{paddingVertical: 16, paddingHorizontal: 4}}>
                  <BodyText palette={palette}>{texts.presetSearchPlaceholder}</BodyText>
                </View>
              ) : !isInventoryLoading && inventoryItems.length === 0 ? (
                <View style={{paddingVertical: 16, paddingHorizontal: 4}}>
                  <BodyText palette={palette}>{texts.presetNoItems}</BodyText>
                </View>
              ) : (
                filteredInventoryItems.map(item => {
                  const selectedItems = selectedPreset?.items[item.category] ?? [];
                  const isSelected = selectedItems.some(selectedItem => selectedItem.sku === item.sku);
                  return (
                    <Pressable
                      {...windowsPressableFocusProps}
                      key={item.sku}
                      onPress={() => handleSelectItem(item.category, item.sku)}
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: isSelected ? `${palette.primary}20` : 'transparent',
                        borderBottomWidth: 1,
                        borderColor: palette.border,
                        paddingVertical: 8,
                        paddingHorizontal: 4,
                      }}
                      testID={`preset-item-${item.category}-${item.sku}`}>
                      <View style={presetStyles.tableCheckboxCell}>
                        <View
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 4,
                            borderWidth: 2,
                            borderColor: isSelected ? palette.primary : palette.border,
                            backgroundColor: isSelected ? palette.primary : 'transparent',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                          {isSelected ? (
                            <Text
                              style={{
                                color: palette.primaryText,
                                fontSize: 12,
                                fontWeight: '700',
                              }}>
                              ✓
                            </Text>
                          ) : null}
                        </View>
                      </View>
                      {renderTableImage(item.imageUrl, item.itemName, palette)}
                      <Text
                        numberOfLines={1}
                        style={[
                          presetStyles.tableNameCell,
                          {color: isSelected ? palette.primary : palette.text},
                        ]}>
                        {item.itemName}
                      </Text>
                      <Text numberOfLines={1} style={[presetStyles.tableSkuCell, {color: palette.textMuted}]}>
                        {item.sku}
                      </Text>
                      <Text numberOfLines={1} style={[presetStyles.tableCategoryCell, {color: palette.textMuted}]}>
                        {getCategoryLabel(item.category, texts)}
                      </Text>
                      <Text numberOfLines={1} style={[presetStyles.tableLchCell, {color: palette.textMuted}]}>
                        {item.lValue}/{item.cValue}/{item.hValue}
                      </Text>
                    </Pressable>
                  );
                })
              )}
            </View>
          </Card>
        </View>
      </ScrollView>

      {!isWeb && isDetailOpen ? (
        <Animated.View
          style={[
            presetStyles.detailSheetOverlay,
            {
              opacity: detailAnimation.interpolate({
                inputRange: [0, 0.01, 1],
                outputRange: [0, 1, 1],
              }),
            },
          ]}>
          <Animated.View
            style={[
              presetStyles.detailSheetSurface,
              {
                backgroundColor: palette.card ?? palette.soft,
                borderColor: palette.border,
                transform: [
                  {
                    translateY: detailAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [520, 0],
                    }),
                  },
                ],
              },
            ]}>
            <View
              style={[
                presetStyles.detailHeader,
                {
                  borderColor: palette.border,
                },
              ]}>
              <Text style={{color: palette.text, fontSize: 20, fontWeight: '800'}}>
                {selectedPreset?.name ?? texts.presetShowDetails}
              </Text>
              <View style={presetStyles.detailHeaderActions}>
                <ActionButton
                  backgroundColor={palette.primary}
                  disabled={!selectedPreset}
                  isLoading={false}
                  label={texts.presetSave}
                  onPress={handleSavePreset}
                  style={presetStyles.detailActionButton}
                  textColor={palette.primaryText}
                />
                <ActionButton
                  backgroundColor={palette.muted}
                  isLoading={false}
                  label={texts.presetHideDetails}
                  onPress={() => setIsDetailOpen(false)}
                  style={presetStyles.detailCloseButton}
                  textColor={palette.text}
                />
                <ActionButton
                  backgroundColor="#fee2e2"
                  disabled={!selectedPreset}
                  isLoading={false}
                  label={texts.presetDelete}
                  onPress={handleDeletePreset}
                  style={presetStyles.detailDeleteButton}
                  textColor="#b91c1c"
                />
              </View>
            </View>

            <ScrollView
              contentContainerStyle={presetStyles.detailBody}
              showsVerticalScrollIndicator={false}
              style={presetStyles.detailScroll}>
              <View
                style={[
                  presetStyles.detailSummaryCard,
                  {
                    borderColor: palette.border,
                    backgroundColor: palette.muted,
                  },
                ]}>
                <Text style={{color: palette.textMuted, fontSize: 12, fontWeight: '700'}}>
                  {texts.presetSummary}
                </Text>
                <Text style={{color: palette.text, fontSize: 14, lineHeight: 22}}>
                  {selectedItemSummary}
                </Text>
              </View>

              <View style={presetStyles.detailPresetList}>
                {bundle.presets.map((preset, index) => {
                  const isActive = preset.id === selectedPresetId;
                  return (
                    <View
                      key={`detail-${preset.id}`}
                      style={[
                        presetStyles.detailPresetItem,
                        {
                          backgroundColor: isActive ? `${palette.primary}18` : palette.muted,
                          borderColor: isActive ? palette.primary : palette.border,
                        },
                      ]}>
                      <Pressable
                        {...windowsPressableFocusProps}
                        onPress={() => selectPresetById(preset.id)}
                        style={presetStyles.presetSelectArea}>
                        <Text
                          numberOfLines={1}
                          style={{
                            color: isActive ? palette.primary : palette.text,
                            fontSize: 14,
                            fontWeight: '700',
                          }}>
                          {preset.name || createPresetName(index + 1)}
                        </Text>
                      </Pressable>
                      <Pressable
                        {...windowsPressableFocusProps}
                        onPress={() => promptDeletePreset(preset.id)}
                        style={[
                          presetStyles.presetDeleteChip,
                          {
                            borderColor: palette.border,
                            backgroundColor: isActive ? `${palette.primary}16` : palette.card ?? palette.soft,
                          },
                        ]}
                        testID={`preset-delete-detail-${preset.id}`}>
                        <Text style={{color: palette.textMuted, fontSize: 12, fontWeight: '800'}}>
                          {texts.presetDelete}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </Animated.View>
        </Animated.View>
      ) : null}

      <View
        pointerEvents="box-none"
        style={[
          presetStyles.bottomStickyWrap,
          isWeb
            ? ({
                left: -CONTENT_EDGE_INSET,
                right: -CONTENT_EDGE_INSET,
                height: isDetailOpen ? '103%' : FOOTER_HEIGHT,
                transition: `height ${DETAIL_SHEET_ANIMATION_MS}ms ease`,
              } as any)
            : null,
        ]}>
        <View
          style={[
            presetStyles.footerSurface,
            {
              borderColor: palette.border,
              backgroundColor: palette.card ?? palette.soft,
            },
          ]}>
          <View style={presetStyles.footerCollapsedArea}>
            <View style={presetStyles.footerContent}>
              <View style={presetStyles.footerPresetMenuAnchor}>
                <View
                  style={[
                    presetStyles.footerPresetRail,
                    {
                      borderColor: palette.border,
                    },
                  ]}>
                  <ScrollView
                    horizontal
                    contentContainerStyle={presetStyles.footerPresetRailContent}
                    showsHorizontalScrollIndicator={false}
                    style={presetStyles.footerPresetScroller}>
                    {visibleFooterPresets.map((preset, index) => {
                      const isActive = preset.id === selectedPresetId;
                      return (
                        <View
                          key={preset.id}
                          style={[
                            presetStyles.footerPresetChip,
                            {
                              backgroundColor: isActive ? palette.primary : palette.muted,
                              borderColor: isActive ? palette.primary : palette.border,
                            },
                          ]}>
                          <Pressable
                            {...windowsPressableFocusProps}
                            onPress={() => selectPresetById(preset.id)}
                            style={presetStyles.footerPresetSelectArea}>
                            <Text
                              numberOfLines={1}
                              style={{
                                color: isActive ? palette.primaryText : palette.text,
                                fontSize: 13,
                                fontWeight: '700',
                              }}>
                              {preset.name || createPresetName(index + 1)}
                            </Text>
                          </Pressable>
                          <Pressable
                            {...windowsPressableFocusProps}
                            onPress={() => promptDeletePreset(preset.id)}
                            style={[
                              presetStyles.footerPresetDeleteButton,
                              {
                                borderColor: isActive ? `${palette.primaryText}66` : palette.border,
                                backgroundColor: isActive ? `${palette.primaryText}22` : palette.card ?? palette.soft,
                              },
                            ]}
                            testID={`preset-delete-footer-${preset.id}`}>
                            <Text
                              style={{
                                color: isActive ? palette.primaryText : palette.textMuted,
                                fontSize: 12,
                                fontWeight: '800',
                              }}>
                              ×
                            </Text>
                          </Pressable>
                        </View>
                      );
                    })}
                  </ScrollView>

                  <Pressable
                    {...windowsPressableFocusProps}
                    onPress={() => setIsPresetMenuOpen(current => !current)}
                    style={[
                      presetStyles.footerMenuButton,
                      {
                        borderColor: palette.border,
                        backgroundColor: palette.muted,
                      },
                    ]}>
                    <Text style={{color: palette.text, fontSize: 16, fontWeight: '700'}}>
                      {isPresetMenuOpen ? '▾' : '▴'}
                    </Text>
                  </Pressable>
                </View>

                {isPresetMenuOpen ? (
                  <View
                    style={[
                      presetStyles.presetDropdown,
                      isDetailOpen ? presetStyles.presetDropdownBelow : presetStyles.presetDropdownAbove,
                      {
                        backgroundColor: palette.card ?? palette.soft,
                        borderColor: palette.border,
                      },
                    ]}>
                    <ScrollView
                      contentContainerStyle={presetStyles.presetDropdownContent}
                      showsVerticalScrollIndicator={false}
                      style={presetStyles.presetDropdownScroller}>
                      {bundle.presets.map((preset, index) => {
                        const isActive = preset.id === selectedPresetId;
                        return (
                          <View
                            key={`dropdown-${preset.id}`}
                            style={[
                              presetStyles.presetDropdownItem,
                              {
                                backgroundColor: isActive ? `${palette.primary}18` : 'transparent',
                                borderColor: isActive ? palette.primary : palette.border,
                              },
                            ]}>
                            <Pressable
                              {...windowsPressableFocusProps}
                              onPress={() => selectPresetById(preset.id)}
                              style={presetStyles.presetSelectArea}>
                              <Text
                                numberOfLines={1}
                                style={{
                                  color: isActive ? palette.primary : palette.text,
                                  fontSize: 13,
                                  fontWeight: '700',
                                }}>
                                {preset.name || createPresetName(index + 1)}
                              </Text>
                            </Pressable>
                            <Pressable
                              {...windowsPressableFocusProps}
                              onPress={() => promptDeletePreset(preset.id)}
                              style={[
                                presetStyles.presetDeleteChip,
                                {
                                  borderColor: palette.border,
                                  backgroundColor: palette.muted,
                                },
                              ]}
                              testID={`preset-delete-dropdown-${preset.id}`}>
                              <Text style={{color: palette.textMuted, fontSize: 11, fontWeight: '800'}}>
                                {texts.presetDelete}
                              </Text>
                            </Pressable>
                          </View>
                        );
                      })}
                    </ScrollView>
                  </View>
                ) : null}
              </View>

              <View style={presetStyles.footerAddWrap}>
              <ActionButton
                backgroundColor={palette.primary}
                isLoading={false}
                label={texts.presetNew}
                onPress={handleCreatePreset}
                style={presetStyles.footerAddButton}
                textColor={palette.primaryText}
              />
              </View>
            </View>

            <View style={presetStyles.footerBottomRow}>
              <View
                style={[
                  presetStyles.footerSummaryWrap,
                  {
                    borderColor: palette.border,
                    backgroundColor: palette.muted,
                  },
                ]}>
                <Text
                  numberOfLines={1}
                  style={[
                    presetStyles.footerSummaryText,
                    {
                      color: palette.text,
                    },
                  ]}>
                  {selectedItemSummary}
                </Text>
              </View>

                <ActionButton
                  backgroundColor={palette.primary}
                  disabled={!selectedPreset || !hasUnsavedPresetChanges}
                  isLoading={isSavingPreset}
                  label={texts.presetSave}
                  onPress={handleSavePreset}
                  style={presetStyles.footerSaveButton}
                  textColor={palette.primaryText}
              />

              <ActionButton
                backgroundColor={palette.muted}
                isLoading={false}
                label={isDetailOpen ? texts.presetHideDetails : texts.presetShowDetails}
                onPress={() => {
                  console.log('[preset] detail toggle button pressed', {
                    nextOpen: !isDetailOpen,
                  });
                  setIsPresetMenuOpen(false);
                  setIsDetailOpen(current => !current);
                }}
                style={presetStyles.footerDetailButton}
                textColor={palette.text}
              />
            </View>
          </View>

          {isWeb && isDetailOpen ? (
            <ScrollView
              contentContainerStyle={presetStyles.footerExpandedScrollContent}
              showsVerticalScrollIndicator={false}
              style={presetStyles.footerExpandedArea}>
              <Card
                headerRight={
                  <ActionButton
                    backgroundColor={palette.primary}
                    disabled={!selectedPreset}
                    isLoading={false}
                    label="Add Custom"
                    onPress={() => {
                      if (!isCustomItemPopupOpen) {
                        openCustomItemPopup();
                        return;
                      }
                      closeCustomItemPopup();
                    }}
                    style={presetStyles.customItemActionButton}
                    textColor={palette.primaryText}
                  />
                }
                palette={palette}
                title={texts.presetItemName}>
                <View style={presetStyles.expandedCardBody}>
                  {isCustomItemPopupOpen ? (
                    <View
                      style={[
                        presetStyles.customItemPopup,
                        {
                          borderColor: palette.border,
                          backgroundColor: palette.card ?? palette.soft,
                        },
                      ]}>
                      <View style={presetStyles.customItemPopupHeader}>
                        <Text style={{color: palette.text, fontSize: 15, fontWeight: '800'}}>
                          Add Custom
                        </Text>
                        <Pressable
                          {...windowsPressableFocusProps}
                          onPress={closeCustomItemPopup}
                          style={[
                            presetStyles.customItemPopupClose,
                            {
                              borderColor: palette.border,
                              backgroundColor: palette.muted,
                            },
                          ]}>
                          <Text style={{color: palette.text, fontSize: 12, fontWeight: '800'}}>
                            {texts.cancel}
                          </Text>
                        </Pressable>
                      </View>

                      <View style={presetStyles.customItemFieldGroup}>
                        <View style={presetStyles.customItemFieldLabelWrap}>
                          <FieldLabel palette={palette}>Item Name *</FieldLabel>
                        </View>
                        <View style={presetStyles.customItemFieldControl}>
                          <TextInput
                            onChangeText={value =>
                              setCustomItemForm(current => ({...current, itemName: value}))
                            }
                            placeholder={texts.presetManualItemNamePlaceholder}
                            placeholderTextColor={palette.textMuted}
                            style={[
                              presetStyles.customItemInput,
                              {
                                borderColor: palette.border,
                                backgroundColor: palette.muted,
                                color: palette.text,
                              },
                            ]}
                            value={customItemForm.itemName}
                          />
                        </View>
                      </View>

                      <View style={presetStyles.customItemFieldGroup}>
                        <View style={presetStyles.customItemFieldLabelWrap}>
                          <FieldLabel palette={palette}>Category *</FieldLabel>
                        </View>
                        <View style={presetStyles.customItemFieldControl}>
                          <View style={presetStyles.customItemSelectWrap}>
                            <Pressable
                              {...windowsPressableFocusProps}
                              onPress={() =>
                                setIsCustomCategoryMenuOpen(current => !current)
                              }
                              style={[
                                presetStyles.customItemSelectButton,
                                {
                                  borderColor: palette.border,
                                  backgroundColor: palette.muted,
                                },
                              ]}>
                              <View style={presetStyles.customItemSelectContent}>
                                <Text
                                  numberOfLines={1}
                                  style={{
                                    flex: 1,
                                    color: customItemForm.category ? palette.text : palette.textMuted,
                                    fontSize: 13,
                                    fontWeight: customItemForm.category ? '700' : '500',
                                  }}>
                                  {customCategoryLabel}
                                </Text>
                                <Text
                                  style={[
                                    presetStyles.customItemSelectArrow,
                                    {color: palette.textMuted},
                                  ]}>
                                  {isCustomCategoryMenuOpen ? '▴' : '▾'}
                                </Text>
                              </View>
                            </Pressable>

                            {isCustomCategoryMenuOpen ? (
                              <View
                                style={[
                                  presetStyles.customItemSelectMenu,
                                  {
                                    borderColor: palette.border,
                                    backgroundColor: palette.card ?? palette.soft,
                                  },
                                ]}>
                                {CATEGORY_CODES.map(category => (
                                  <Pressable
                                    {...windowsPressableFocusProps}
                                    key={`custom-category-${category}`}
                                    onPress={() => {
                                      setCustomItemForm(current => ({...current, category}));
                                      setIsCustomCategoryMenuOpen(false);
                                    }}
                                    style={[
                                      presetStyles.customItemSelectOption,
                                      {
                                        backgroundColor:
                                          customItemForm.category === category
                                            ? `${palette.primary}16`
                                            : 'transparent',
                                      },
                                    ]}>
                                    <Text
                                      style={{
                                        color:
                                          customItemForm.category === category
                                            ? palette.primary
                                            : palette.text,
                                        fontSize: 13,
                                        fontWeight: '700',
                                      }}>
                                      {getCategoryLabel(category, texts)}
                                    </Text>
                                  </Pressable>
                                ))}
                              </View>
                            ) : null}
                          </View>
                        </View>
                      </View>

                      <View style={presetStyles.customItemFieldGroup}>
                        <View style={presetStyles.customItemFieldLabelWrap}>
                          <FieldLabel palette={palette}>SKU</FieldLabel>
                        </View>
                        <View style={presetStyles.customItemFieldControl}>
                          <TextInput
                            onChangeText={value =>
                              setCustomItemForm(current => ({...current, sku: value}))
                            }
                            placeholder={texts.presetSku}
                            placeholderTextColor={palette.textMuted}
                            style={[
                              presetStyles.customItemInput,
                              {
                                borderColor: palette.border,
                                backgroundColor: palette.muted,
                                color: palette.text,
                              },
                            ]}
                            value={customItemForm.sku}
                          />
                        </View>
                      </View>

                      <View style={presetStyles.customItemFieldGroup}>
                        <View style={presetStyles.customItemFieldLabelWrap}>
                          <FieldLabel palette={palette}>Image URL</FieldLabel>
                        </View>
                        <View style={presetStyles.customItemFieldControl}>
                          <TextInput
                            onChangeText={value =>
                              setCustomItemForm(current => ({...current, imageUrl: value}))
                            }
                            placeholder="https://example.com/image.jpg"
                            placeholderTextColor={palette.textMuted}
                            style={[
                              presetStyles.customItemInput,
                              {
                                borderColor: palette.border,
                                backgroundColor: palette.muted,
                                color: palette.text,
                              },
                            ]}
                            value={customItemForm.imageUrl}
                          />
                        </View>
                      </View>

                      <View style={presetStyles.customItemPopupFooter}>
                        <ActionButton
                          backgroundColor={palette.muted}
                          isLoading={false}
                          label={texts.cancel}
                          onPress={closeCustomItemPopup}
                          style={presetStyles.customItemFooterButton}
                          textColor={palette.text}
                        />
                        <ActionButton
                          backgroundColor={palette.primary}
                          disabled={!canSubmitCustomItem}
                          isLoading={false}
                          label={texts.presetManualAdd}
                          onPress={handleAddCustomItem}
                          style={presetStyles.customItemFooterButton}
                          textColor={palette.primaryText}
                        />
                      </View>
                    </View>
                  ) : null}

                  <View
                    style={[
                      presetStyles.tableHeaderRow,
                      {
                        borderColor: palette.border,
                      },
                    ]}>
                    <View style={presetStyles.tableCheckboxCell} />
                    <Text numberOfLines={1} style={presetStyles.tableImageHeader}>
                      {IMAGE_COLUMN_LABEL}
                    </Text>
                    <Text numberOfLines={1} style={presetStyles.tableNameHeader}>{texts.presetItemName}</Text>
                    <Text numberOfLines={1} style={presetStyles.tableSkuHeader}>{texts.presetSku}</Text>
                    <Text numberOfLines={1} style={presetStyles.tableCategoryHeader}>{CATEGORY_HEADER_LABEL}</Text>
                    <Text numberOfLines={1} style={presetStyles.tableLchHeader}>{texts.presetLch}</Text>
                  </View>

                  {selectedCategorySections.length === 0 ? (
                    <View style={presetStyles.expandedEmptyState}>
                      <BodyText palette={palette}>{texts.presetNoItems}</BodyText>
                    </View>
                  ) : (
                    selectedCategorySections.map(section => (
                      <View key={section.category} style={presetStyles.expandedCategoryBlock}>
                        <Text style={[presetStyles.expandedCategoryTitle, {color: palette.primary}]}>
                          {section.label}
                        </Text>
                        {section.items.map(entry => (
                          <Pressable
                            {...windowsPressableFocusProps}
                            key={entry.identity}
                            onPress={() => handleRemovePresetItem(section.category, entry.item)}
                            style={[
                              presetStyles.expandedItemRow,
                              {
                                borderColor: palette.border,
                              },
                            ]}>
                            <View style={presetStyles.tableCheckboxCell}>
                              <View
                                style={[
                                  presetStyles.expandedRemoveBadge,
                                  {
                                    borderColor: palette.border,
                                    backgroundColor: palette.muted,
                                  },
                                ]}>
                                <Text style={{color: palette.text, fontSize: 12, fontWeight: '700'}}>
                                  -
                                </Text>
                              </View>
                            </View>
                            {renderTableImage(entry.imageUrl, entry.itemName, palette)}
                            <Text numberOfLines={1} style={[presetStyles.tableNameCell, {color: palette.text}]}>
                              {entry.itemName}
                            </Text>
                            <Text numberOfLines={1} style={[presetStyles.tableSkuCell, {color: palette.textMuted}]}>
                              {entry.sku}
                            </Text>
                            <Text numberOfLines={1} style={[presetStyles.tableCategoryCell, {color: palette.textMuted}]}>
                              {section.label}
                            </Text>
                            <Text numberOfLines={1} style={[presetStyles.tableLchCell, {color: palette.textMuted}]}>
                              {entry.lch}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    ))
                  )}
                </View>
              </Card>
            </ScrollView>
          ) : null}

        </View>
      </View>
    </View>
  );
}

const presetStyles = StyleSheet.create({
  sectionRoot: {
    flex: 1,
    minHeight: 0,
    alignSelf: 'stretch',
    position: 'relative',
  },
  scrollRoot: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    minHeight: 0,
  },
  scrollContent: {
    gap: 16,
    paddingTop: HEADER_HEIGHT + 16,
    paddingBottom: FOOTER_HEIGHT + CONTENT_EDGE_INSET + 16,
  },
  topOverlayWrap: {
    zIndex: 10,
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
  },
  detailSheetOverlay: {
    zIndex: 25,
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'flex-end',
  },
  detailSheetSurface: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  detailHeader: {
    minHeight: HEADER_HEIGHT,
    borderBottomWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 4,
  },
  detailActionButton: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  detailCloseButton: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  detailDeleteButton: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  detailScroll: {
    flex: 1,
  },
  detailBody: {
    gap: 12,
    padding: 18,
    paddingBottom: 28,
  },
  detailSummaryCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 8,
  },
  detailPresetList: {
    gap: 10,
  },
  detailPresetItem: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bottomStickyWrap: {
    zIndex: 10,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'visible',
    justifyContent: 'flex-end',
  },
  footerPresetMenuAnchor: {
    flex: 1,
    minWidth: 0,
    position: 'relative',
    overflow: 'visible',
  },
  presetDropdown: {
    position: 'absolute',
    right: 0,
    width: 280,
    maxHeight: 220,
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: {width: 0, height: 6},
    elevation: 8,
    zIndex: 40,
  },
  presetDropdownAbove: {
    bottom: '100%',
    marginBottom: 8,
  },
  presetDropdownBelow: {
    top: '100%',
    marginTop: 8,
  },
  presetDropdownScroller: {
    maxHeight: 204,
  },
  presetDropdownContent: {
    gap: 6,
    paddingHorizontal: 8,
  },
  presetDropdownItem: {
    minHeight: 40,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  presetSelectArea: {
    flex: 1,
    minHeight: 40,
    justifyContent: 'center',
  },
  presetDeleteChip: {
    minHeight: 28,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBlock: {
    gap: 6,
    marginTop: 0,
  },
  searchRow2: {
    display: 'flex',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  searchRowInput: {
    flex: 1,
  },
  categoryChipRow: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  searchInput: {
    borderRadius: 16,
    borderWidth: 1,
    fontSize: 14,
    height: 40,
    paddingHorizontal: 12,
  },
  searchButtonsRow: {
    display: 'flex',
    flexDirection: 'row',
    gap: 6,
  },
  searchButton: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  tableHeaderRow: {
    display: 'flex',
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  tableCheckboxCell: {
    width: 32,
    alignItems: 'center',
  },
  tableImageHeader: {
    width: 52,
    color: '#667085',
    fontSize: 12,
    fontWeight: '700',
  },
  tableImageCell: {
    width: 40,
    height: 40,
    marginRight: 12,
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  tableImage: {
    width: '100%',
    height: '100%',
  },
  tableImageFallbackText: {
    fontSize: 8,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 3,
  },
  headerText: {
    color: '#667085',
    fontSize: 12,
    fontWeight: '700',
  },
  tableNameHeader: {
    flex: 2.2,
    color: '#667085',
    fontSize: 12,
    fontWeight: '700',
  },
  tableSkuHeader: {
    flex: 1.4,
    color: '#667085',
    fontSize: 12,
    fontWeight: '700',
  },
  tableCategoryHeader: {
    flex: 1.3,
    color: '#667085',
    fontSize: 12,
    fontWeight: '700',
  },
  tableLchHeader: {
    flex: 1.1,
    color: '#667085',
    fontSize: 12,
    fontWeight: '700',
  },
  tableNameCell: {
    flex: 2.2,
    fontSize: 13,
  },
  tableSkuCell: {
    flex: 1.4,
    fontSize: 12,
  },
  tableCategoryCell: {
    flex: 1.3,
    fontSize: 12,
  },
  tableLchCell: {
    flex: 1.1,
    fontSize: 12,
  },
  footerSurface: {
    flex: 1,
    minHeight: 112,
    borderTopWidth: 1,
  },
  footerCollapsedArea: {
    gap: 0,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  footerExpandedArea: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  expandedCardBody: {
    position: 'relative',
  },
  customItemActionButton: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  customItemPopup: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 30,
    width: 360,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 10,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: {width: 0, height: 8},
    elevation: 10,
  },
  customItemPopupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  customItemPopupClose: {
    minHeight: 30,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customItemFieldGroup: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  customItemFieldLabelWrap: {
    width: 84,
    minHeight: 40,
    justifyContent: 'center',
    flexShrink: 0,
  },
  customItemFieldControl: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  customItemSelectWrap: {
    position: 'relative',
    zIndex: 2,
  },
  customItemInput: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 13,
    height: 40,
    paddingHorizontal: 12,
    paddingVertical: 0,
  },
  customItemSelectButton: {
    width: '100%',
    height: 40,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 0,
    justifyContent: 'center',
  },
  customItemSelectContent: {
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    flexWrap: 'nowrap',
    width: '100%',
  },
  customItemSelectArrow: {
    fontSize: 12,
    lineHeight: 12,
    fontWeight: '800',
    flexShrink: 0,
  },
  customItemSelectMenu: {
    position: 'absolute',
    top: 44,
    right: 0,
    left: 0,
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    zIndex: 20,
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 6},
    elevation: 8,
  },
  customItemSelectOption: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  customItemPopupFooter: {
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  customItemFooterButton: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  footerExpandedScrollContent: {
    paddingBottom: 18,
  },
  expandedEmptyState: {
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  expandedCategoryBlock: {
    paddingTop: 14,
  },
  expandedCategoryTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  expandedItemRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  expandedRemoveBadge: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailPlaceholderArea: {
    flex: 1,
  },
  footerContent: {
    minHeight: 40,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    overflow: 'visible',
    minWidth: 0,
  },
  footerBottomRow: {
    marginTop: 10,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  footerAddWrap: {
    flexShrink: 0,
    justifyContent: 'flex-end',
  },
  footerAddButton: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  footerPresetRail: {
    flex: 1,
    minWidth: 0,
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 18,
    paddingLeft: 10,
    paddingRight: 6,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  footerPresetScroller: {
    flex: 1,
    minWidth: 0,
  },
  footerPresetRailContent: {
    alignItems: 'center',
    gap: 8,
    paddingRight: 8,
    flexGrow: 0,
  },
  footerSummaryWrap: {
    flex: 1,
    minHeight: 38,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  footerSummaryText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  },
  footerDetailButton: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  footerSaveButton: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  footerPresetChip: {
    minHeight: 36,
    borderWidth: 1,
    borderRadius: 999,
    paddingLeft: 14,
    paddingRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  footerPresetSelectArea: {
    maxWidth: 160,
    justifyContent: 'center',
  },
  footerPresetDeleteButton: {
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  footerMenuButton: {
    width: 28,
    height: 36,
    marginLeft: 8,
    borderLeftWidth: 1,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
