import React, {useState} from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  createAcademyInventoryItem,
  deleteAcademyInventoryItem,
  fetchAcademyInventoryList,
  sellAcademyInventoryItem,
  updateAcademyInventoryItem,
} from '../../shared/lib/accountApi';
import {windowsPressableFocusProps} from '../../shared/ui/windowsFocusProps';
import type {LanguageMode} from '../../screens/shared/shell-model';

type PaletteLike = {
  border: string;
  card: string;
  muted: string;
  primary: string;
  primaryText: string;
  soft: string;
  text: string;
  textMuted: string;
};

type InventoryTexts = {
  cancel: string;
  inventory: string;
  inventoryList: string;
  inventoryAdd: string;
  inventoryItemName: string;
  inventorySku: string;
  inventoryBarcode: string;
  inventoryCost: string;
  inventoryPrice: string;
  inventoryColorL: string;
  inventoryColorC: string;
  inventoryColorH: string;
  inventoryStock: string;
  inventoryReorderLevel: string;
  inventoryCategory: string;
  inventorySupplier: string;
  inventoryLocation: string;
  inventoryImageUrl: string;
  inventoryNote: string;
  inventoryStatusActive: string;
  inventoryStatusInactive: string;
  inventoryCategoryEtc: string;
  inventoryNoItems: string;
  inventoryAddTitle: string;
  inventoryEdit: string;
  inventoryDelete: string;
  inventoryDeleteConfirmTitle: string;
  inventoryDeleteConfirmMessage: string;
  inventoryDeleteConfirm: string;
  inventorySave: string;
};

type CategoryCode =
  | 'base_foundation'
  | 'blush'
  | 'lip_color'
  | 'eyeshadow'
  | 'contour'
  | 'highlighter'
  | 'etc';

type InventoryItem = {
  id: string;
  itemCode: string;
  sku: string;
  barcode: string;
  itemName: string;
  categoryCode: CategoryCode;
  cost: number;
  price: number;
  lValue: number;
  cValue: number;
  hValue: number;
  imageUrl: string;
  stockCount: number;
  reorderLevel: number;
  supplier: string;
  location: string;
  note: string;
  statusCode: 'ACTIVE' | 'INACTIVE';
};

const CATEGORY_LABELS_JA: Record<CategoryCode, string> = {
  base_foundation: 'ファンデーション',
  blush: 'チーク',
  lip_color: 'リップ',
  eyeshadow: 'アイシャドウ',
  contour: 'コントゥア',
  highlighter: 'ハイライター',
  etc: 'その他',
};

const CATEGORY_LABELS_EN: Record<CategoryCode, string> = {
  base_foundation: 'Foundation',
  blush: 'Blush',
  lip_color: 'Lip Color',
  eyeshadow: 'Eyeshadow',
  contour: 'Contour',
  highlighter: 'Highlighter',
  etc: 'Etc.',
};

const CATEGORY_CODES: CategoryCode[] = [
  'base_foundation',
  'blush',
  'lip_color',
  'eyeshadow',
  'contour',
  'highlighter',
  'etc',
];

const EMPTY_FORM: Omit<InventoryItem, 'id' | 'itemCode'> = {
  sku: '',
  barcode: '',
  itemName: '',
  categoryCode: 'etc',
  cost: 0,
  price: 0,
  lValue: 0,
  cValue: 0,
  hValue: 0,
  imageUrl: '',
  stockCount: 0,
  reorderLevel: 0,
  supplier: '',
  location: '',
  note: '',
  statusCode: 'ACTIVE',
};

const PAGE_SIZE = 10;

type Props = {
  language: LanguageMode;
  palette: PaletteLike;
  texts: InventoryTexts;
};

function getImagePlaceholderCopy(language: LanguageMode, imageUrl: string) {
  if (imageUrl.trim()) {
    return imageUrl;
  }

  return language === 'ja'
    ? '画像プレビューは後で追加します。DB には imageUrl を保存します。'
    : 'Image preview will be added later. The DB will store imageUrl.';
}

function renderItemThumbnail(
  imageUrl: string,
  itemName: string,
  palette: PaletteLike,
) {
  const hasImage = imageUrl.trim().length > 0;

  return (
    <View
      style={[
        styles.itemThumbnailCell,
        {
          borderColor: palette.border,
          backgroundColor: palette.muted,
        },
      ]}>
      {hasImage ? (
        <Image source={{uri: imageUrl}} style={styles.itemThumbnailImage} />
      ) : (
        <Text style={[styles.itemThumbnailFallbackText, {color: palette.textMuted}]}>
          No Image
        </Text>
      )}
    </View>
  );
}

export function InventoryHomeScreen({language, palette, texts}: Props) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedInventory, setHasLoadedInventory] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<CategoryCode | 'all'>(
    'all',
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSearchQuery, setAppliedSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const categoryLabels =
    language === 'ja' ? CATEGORY_LABELS_JA : CATEGORY_LABELS_EN;
  const cardLabels =
    language === 'ja'
      ? {
          productName: 'Product Name',
          itemCode: 'Item Code',
          sku: 'SKU',
          barcode: 'Barcode',
          category: 'Category',
          cost: 'Cost',
          price: 'Price',
          colorL: 'L',
          colorC: 'C',
          colorH: 'H',
          stock: 'Stock Qty',
          reorderLevel: 'Reorder Level',
          supplier: 'Supplier',
          location: 'Location',
          status: 'Status',
          note: 'Note',
          photo: 'Photo',
          sell: 'Sell',
        }
      : {
          productName: 'Product Name',
          itemCode: 'Item Code',
          sku: 'SKU',
          barcode: 'Barcode',
          category: 'Category',
          cost: 'Cost',
          price: 'Price',
          colorL: 'L',
          colorC: 'C',
          colorH: 'H',
          stock: 'Stock Qty',
          reorderLevel: 'Reorder Level',
          supplier: 'Supplier',
          location: 'Location',
          status: 'Status',
          note: 'Note',
          photo: 'Photo',
          sell: 'Sell',
        };

  const normalizedSearchQuery = appliedSearchQuery.trim().toLowerCase();
  const searchFilteredItems =
    normalizedSearchQuery === ''
      ? items
      : items.filter(item => {
          const searchTarget = [
            item.itemName,
            item.itemCode,
            item.sku,
            item.barcode,
            item.supplier,
            item.location,
            item.note,
          ]
            .join(' ')
            .toLowerCase();
          return searchTarget.includes(normalizedSearchQuery);
        });

  const filtered =
    filterCategory === 'all'
      ? searchFilteredItems
      : searchFilteredItems.filter(item => item.categoryCode === filterCategory);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedItems = filtered.slice(
    (safeCurrentPage - 1) * PAGE_SIZE,
    safeCurrentPage * PAGE_SIZE,
  );

  const handleSearch = async () => {
    setCurrentPage(1);
    setAppliedSearchQuery(searchQuery);
    await loadInventory();
  };

  const handleResetFilters = async () => {
    setCurrentPage(1);
    setSearchQuery('');
    setAppliedSearchQuery('');
    setFilterCategory('all');
    await loadInventory();
  };

  const handleSearchPress = () => {
    handleSearch().catch(() => undefined);
  };

  const handleResetFiltersPress = () => {
    handleResetFilters().catch(() => undefined);
  };

  async function loadInventory() {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await fetchAcademyInventoryList();
      setItems(result.items ?? []);
      setCurrentPage(1);
      setHasLoadedInventory(true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to load inventory.';
      setErrorMessage(message);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowAddForm(true);
  };

  const openEdit = (item: InventoryItem) => {
    setForm({
      sku: item.sku,
      barcode: item.barcode,
      itemName: item.itemName,
      categoryCode: item.categoryCode,
      cost: item.cost,
      price: item.price,
      lValue: item.lValue,
      cValue: item.cValue,
      hValue: item.hValue,
      imageUrl: item.imageUrl,
      stockCount: item.stockCount,
      reorderLevel: item.reorderLevel,
      supplier: item.supplier,
      location: item.location,
      note: item.note,
      statusCode: item.statusCode,
    });
    setEditingId(item.id);
    setShowAddForm(true);
  };

  const handleSave = async () => {
    if (!form.itemName.trim()) {
      return;
    }
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const payload = {
        itemCode: editingId ?? '',
        sku: form.sku,
        barcode: form.barcode,
        itemName: form.itemName,
        categoryCode: form.categoryCode,
        cost: String(form.cost),
        price: String(form.price),
        lValue: String(form.lValue),
        cValue: String(form.cValue),
        hValue: String(form.hValue),
        imageUrl: form.imageUrl,
        stockCount: String(form.stockCount),
        reorderLevel: String(form.reorderLevel),
        supplier: form.supplier,
        location: form.location,
        note: form.note,
        statusCode: form.statusCode,
      };

      if (editingId !== null) {
        await updateAcademyInventoryItem(payload);
      } else {
        await createAcademyInventoryItem({
          sku: payload.sku,
          barcode: payload.barcode,
          itemName: payload.itemName,
          categoryCode: payload.categoryCode,
          cost: payload.cost,
          price: payload.price,
          lValue: payload.lValue,
          cValue: payload.cValue,
          hValue: payload.hValue,
          imageUrl: payload.imageUrl,
          stockCount: payload.stockCount,
          reorderLevel: payload.reorderLevel,
          supplier: payload.supplier,
          location: payload.location,
          note: payload.note,
          statusCode: payload.statusCode,
        });
      }
      await loadInventory();
      setShowAddForm(false);
      setEditingId(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to save inventory.';
      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (item: InventoryItem) => {
    const message = texts.inventoryDeleteConfirmMessage.replace(
      '{name}',
      item.itemName,
    );
    const confirmDialog =
      typeof globalThis === 'object' && 'confirm' in globalThis
        ? (globalThis as {confirm?: (nextMessage: string) => boolean}).confirm
        : undefined;

    if (typeof confirmDialog === 'function') {
      if (confirmDialog(message)) {
        try {
          await deleteAcademyInventoryItem({itemCode: item.itemCode});
          await loadInventory();
        } catch (error) {
          const nextMessage =
            error instanceof Error ? error.message : 'Failed to delete inventory.';
          setErrorMessage(nextMessage);
        }
      }
      return;
    }

    Alert.alert(texts.inventoryDeleteConfirmTitle, message, [
      {text: texts.cancel, style: 'cancel'},
      {
        text: texts.inventoryDeleteConfirm,
        style: 'destructive',
        onPress: () => {
          deleteAcademyInventoryItem({itemCode: item.itemCode})
            .then(loadInventory)
            .catch(error => {
              const nextMessage =
                error instanceof Error
                  ? error.message
                  : 'Failed to delete inventory.';
              setErrorMessage(nextMessage);
            });
        },
      },
    ]);
  };

  const handleSell = async (item: InventoryItem) => {
    if (item.stockCount <= 0) {
      return;
    }
    try {
      await sellAcademyInventoryItem({itemCode: item.itemCode});
      await loadInventory();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to update inventory.';
      setErrorMessage(message);
    }
  };

  if (showAddForm) {
    return (
      <ScrollView
        style={[styles.container, {backgroundColor: palette.muted}]}
        contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.sectionTitle, {color: palette.text}]}>
          {editingId ? texts.inventoryEdit : texts.inventoryAddTitle}
        </Text>
        {errorMessage ? (
          <Text style={[styles.errorText, {color: '#b42318'}]}>{errorMessage}</Text>
        ) : null}

        <View
          style={[
            styles.formCard,
            {backgroundColor: palette.card, borderColor: palette.border},
          ]}>
          <Text style={[styles.fieldLabel, {color: palette.text}]}>
            {texts.inventoryItemName}
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: palette.muted,
                borderColor: palette.border,
                color: palette.text,
              },
            ]}
            value={form.itemName}
            onChangeText={v => setForm(f => ({...f, itemName: v}))}
            placeholderTextColor={palette.textMuted}
          />

          <Text style={[styles.fieldLabel, {color: palette.text}]}>
            {texts.inventorySku}
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: palette.muted,
                borderColor: palette.border,
                color: palette.text,
              },
            ]}
            value={form.sku}
            onChangeText={v => setForm(f => ({...f, sku: v}))}
            placeholder="FND-001"
            placeholderTextColor={palette.textMuted}
          />

          <Text style={[styles.fieldLabel, {color: palette.text}]}>
            {texts.inventoryBarcode}
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: palette.muted,
                borderColor: palette.border,
                color: palette.text,
              },
            ]}
            value={form.barcode}
            onChangeText={v => setForm(f => ({...f, barcode: v}))}
            placeholderTextColor={palette.textMuted}
            keyboardType="numeric"
          />

          <Text style={[styles.fieldLabel, {color: palette.text}]}>
            {texts.inventoryCategory}
          </Text>
          <View style={styles.chipRow}>
            {CATEGORY_CODES.map(code => (
              <Pressable
                {...windowsPressableFocusProps}
                key={code}
                onPress={() => setForm(f => ({...f, categoryCode: code}))}
                style={[
                  styles.chip,
                  {
                    backgroundColor:
                      form.categoryCode === code ? palette.primary : palette.muted,
                    borderColor:
                      form.categoryCode === code ? palette.primary : palette.border,
                  },
                ]}>
                <Text
                  style={[
                    styles.chipText,
                    {
                      color:
                        form.categoryCode === code
                          ? palette.primaryText
                          : palette.text,
                    },
                  ]}>
                  {categoryLabels[code]}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.fieldLabel, {color: palette.text}]}>
            {texts.inventoryCost}
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: palette.muted,
                borderColor: palette.border,
                color: palette.text,
              },
            ]}
            value={form.cost === 0 ? '' : String(form.cost)}
            keyboardType="numeric"
            onChangeText={v => setForm(f => ({...f, cost: Number(v) || 0}))}
            placeholderTextColor={palette.textMuted}
          />

          <Text style={[styles.fieldLabel, {color: palette.text}]}>
            {texts.inventoryPrice}
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: palette.muted,
                borderColor: palette.border,
                color: palette.text,
              },
            ]}
            value={form.price === 0 ? '' : String(form.price)}
            keyboardType="numeric"
            onChangeText={v => setForm(f => ({...f, price: Number(v) || 0}))}
            placeholderTextColor={palette.textMuted}
          />

          <Text style={[styles.fieldLabel, {color: palette.text}]}>
            {texts.inventoryColorL}
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: palette.muted,
                borderColor: palette.border,
                color: palette.text,
              },
            ]}
            value={form.lValue === 0 ? '' : String(form.lValue)}
            keyboardType="numeric"
            onChangeText={v => setForm(f => ({...f, lValue: Number(v) || 0}))}
            placeholderTextColor={palette.textMuted}
          />

          <Text style={[styles.fieldLabel, {color: palette.text}]}>
            {texts.inventoryColorC}
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: palette.muted,
                borderColor: palette.border,
                color: palette.text,
              },
            ]}
            value={form.cValue === 0 ? '' : String(form.cValue)}
            keyboardType="numeric"
            onChangeText={v => setForm(f => ({...f, cValue: Number(v) || 0}))}
            placeholderTextColor={palette.textMuted}
          />

          <Text style={[styles.fieldLabel, {color: palette.text}]}>
            {texts.inventoryColorH}
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: palette.muted,
                borderColor: palette.border,
                color: palette.text,
              },
            ]}
            value={form.hValue === 0 ? '' : String(form.hValue)}
            keyboardType="numeric"
            onChangeText={v => setForm(f => ({...f, hValue: Number(v) || 0}))}
            placeholderTextColor={palette.textMuted}
          />

          <Text style={[styles.fieldLabel, {color: palette.text}]}>
            {texts.inventoryStock}
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: palette.muted,
                borderColor: palette.border,
                color: palette.text,
              },
            ]}
            value={form.stockCount === 0 ? '' : String(form.stockCount)}
            keyboardType="numeric"
            onChangeText={v => setForm(f => ({...f, stockCount: Number(v) || 0}))}
            placeholderTextColor={palette.textMuted}
          />

          <Text style={[styles.fieldLabel, {color: palette.text}]}>
            {texts.inventoryReorderLevel}
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: palette.muted,
                borderColor: palette.border,
                color: palette.text,
              },
            ]}
            value={form.reorderLevel === 0 ? '' : String(form.reorderLevel)}
            keyboardType="numeric"
            onChangeText={v =>
              setForm(f => ({...f, reorderLevel: Number(v) || 0}))
            }
            placeholderTextColor={palette.textMuted}
          />

          <Text style={[styles.fieldLabel, {color: palette.text}]}>
            {texts.inventorySupplier}
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: palette.muted,
                borderColor: palette.border,
                color: palette.text,
              },
            ]}
            value={form.supplier}
            onChangeText={v => setForm(f => ({...f, supplier: v}))}
            placeholderTextColor={palette.textMuted}
          />

          <Text style={[styles.fieldLabel, {color: palette.text}]}>
            {texts.inventoryLocation}
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: palette.muted,
                borderColor: palette.border,
                color: palette.text,
              },
            ]}
            value={form.location}
            onChangeText={v => setForm(f => ({...f, location: v}))}
            placeholderTextColor={palette.textMuted}
          />

          <Text style={[styles.fieldLabel, {color: palette.text}]}>
            {texts.inventoryImageUrl}
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: palette.muted,
                borderColor: palette.border,
                color: palette.text,
              },
            ]}
            value={form.imageUrl}
            onChangeText={v => setForm(f => ({...f, imageUrl: v}))}
            placeholderTextColor={palette.textMuted}
            autoCapitalize="none"
          />
          <View
            style={[
              styles.imagePlaceholder,
              {
                backgroundColor: palette.muted,
                borderColor: palette.border,
              },
            ]}>
            <Text style={[styles.imagePlaceholderTitle, {color: palette.text}]}>
              {language === 'ja' ? '写真プレースホルダー' : 'Photo Placeholder'}
            </Text>
            <Text
              style={[styles.imagePlaceholderBody, {color: palette.textMuted}]}>
              {getImagePlaceholderCopy(language, form.imageUrl)}
            </Text>
          </View>

          <Text style={[styles.fieldLabel, {color: palette.text}]}>
            {texts.inventoryNote}
          </Text>
          <TextInput
            style={[
              styles.inputMultiline,
              {
                backgroundColor: palette.muted,
                borderColor: palette.border,
                color: palette.text,
              },
            ]}
            value={form.note}
            multiline
            numberOfLines={3}
            onChangeText={v => setForm(f => ({...f, note: v}))}
            placeholderTextColor={palette.textMuted}
          />

          <View style={styles.chipRow}>
            {(['ACTIVE', 'INACTIVE'] as const).map(code => (
              <Pressable
                {...windowsPressableFocusProps}
                key={code}
                onPress={() => setForm(f => ({...f, statusCode: code}))}
                style={[
                  styles.chip,
                  {
                    backgroundColor:
                      form.statusCode === code ? palette.primary : palette.muted,
                    borderColor:
                      form.statusCode === code ? palette.primary : palette.border,
                  },
                ]}>
                <Text
                  style={[
                    styles.chipText,
                    {
                      color:
                        form.statusCode === code
                          ? palette.primaryText
                          : palette.text,
                    },
                  ]}>
                  {code === 'ACTIVE'
                    ? texts.inventoryStatusActive
                    : texts.inventoryStatusInactive}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.formActions}>
          <Pressable
            {...windowsPressableFocusProps}
            onPress={() => setShowAddForm(false)}
            style={[
              styles.actionBtn,
              {backgroundColor: palette.muted, borderColor: palette.border},
            ]}>
            <Text style={[styles.actionBtnText, {color: palette.text}]}>
              {texts.cancel}
            </Text>
          </Pressable>
          <Pressable
            {...windowsPressableFocusProps}
            onPress={handleSave}
            style={[
              styles.actionBtn,
              {backgroundColor: palette.primary, borderColor: palette.primary},
            ]}>
            <Text style={[styles.actionBtnText, {color: palette.primaryText}]}>
              {isSaving ? 'Saving...' : texts.inventorySave}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={[styles.container, {backgroundColor: palette.muted}]}
      contentContainerStyle={styles.scrollContent}>
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, {color: palette.text}]}>
          {texts.inventoryList}
        </Text>
        <Pressable
          {...windowsPressableFocusProps}
          onPress={openAdd}
          style={[styles.addBtn, {backgroundColor: palette.primary}]}>
          <Text style={[styles.addBtnText, {color: palette.primaryText}]}>
            + {texts.inventoryAdd}
          </Text>
        </Pressable>
      </View>
      {errorMessage ? (
        <Text style={[styles.errorText, {color: '#b42318'}]}>{errorMessage}</Text>
      ) : null}

      <View style={styles.searchRow}>
        <TextInput
          style={[
            styles.searchInput,
            {
              backgroundColor: palette.card,
              borderColor: palette.border,
              color: palette.text,
            },
          ]}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearchPress}
          placeholder={
            language === 'ja'
              ? '品目名 / SKU / バーコードで検索'
              : 'Search by item name, SKU, or barcode'
          }
          placeholderTextColor={palette.textMuted}
        />
        <View style={styles.searchActionsRow}>
          <Pressable
            {...windowsPressableFocusProps}
            onPress={handleSearchPress}
            style={[
              styles.searchActionButton,
              {backgroundColor: palette.primary, borderColor: palette.primary},
            ]}>
            <Text style={[styles.searchActionText, {color: palette.primaryText}]}>
              {language === 'ja' ? '検索' : 'Search'}
            </Text>
          </Pressable>
          <Pressable
            {...windowsPressableFocusProps}
            onPress={handleResetFiltersPress}
            style={[
              styles.searchActionButton,
              {backgroundColor: palette.card, borderColor: palette.border},
            ]}>
            <Text style={[styles.searchActionText, {color: palette.text}]}>All</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterContent}>
        <Pressable
          {...windowsPressableFocusProps}
          onPress={() => {
            setFilterCategory('all');
            setCurrentPage(1);
          }}
          style={[
            styles.chip,
            {
              backgroundColor:
                filterCategory === 'all' ? palette.primary : palette.card,
              borderColor:
                filterCategory === 'all' ? palette.primary : palette.border,
            },
          ]}>
          <Text
            style={[
              styles.chipText,
              {
                color:
                  filterCategory === 'all' ? palette.primaryText : palette.text,
              },
            ]}>
            {language === 'ja' ? '全て' : 'All'}
          </Text>
        </Pressable>
        {CATEGORY_CODES.map(code => (
          <Pressable
            {...windowsPressableFocusProps}
            key={code}
            onPress={() => {
              setFilterCategory(code);
              setCurrentPage(1);
            }}
            style={[
              styles.chip,
              {
                backgroundColor:
                  filterCategory === code ? palette.primary : palette.card,
                borderColor:
                  filterCategory === code ? palette.primary : palette.border,
              },
            ]}>
            <Text
              style={[
                styles.chipText,
                {
                  color:
                    filterCategory === code ? palette.primaryText : palette.text,
                },
              ]}>
              {categoryLabels[code]}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {isLoading ? (
        <Text style={[styles.emptyText, {color: palette.textMuted}]}>
          {language === 'ja' ? '読み込み中...' : 'Loading...'}
        </Text>
      ) : !hasLoadedInventory ? (
        <Text style={[styles.emptyText, {color: palette.textMuted}]}>
          {language === 'ja'
            ? '検索または All を押すと在庫を読み込みます。'
            : 'Press Search or All to load inventory.'}
        </Text>
      ) : filtered.length === 0 ? (
        <Text style={[styles.emptyText, {color: palette.textMuted}]}>
          {texts.inventoryNoItems}
        </Text>
      ) : (
        paginatedItems.map(item => (
          <View
            key={item.id}
            style={[
              styles.itemCard,
              {
                backgroundColor: palette.card,
                borderColor: palette.border,
                opacity: item.statusCode === 'INACTIVE' ? 0.6 : 1,
              },
            ]}>
            <View style={styles.itemCardRow}>
              {renderItemThumbnail(item.imageUrl, item.itemName, palette)}
              <View style={styles.itemMain}>
                <View style={styles.itemHeader}>
                  <View style={styles.itemTitleBlock}>
                    <Text style={[styles.itemName, {color: palette.text}]}>
                      {item.itemName}
                    </Text>
                    <Text style={[styles.itemLabel, {color: palette.textMuted}]}>
                      {categoryLabels[item.categoryCode]}
                    </Text>
                  </View>
                  <View style={styles.itemActions}>
                    <Pressable
                      {...windowsPressableFocusProps}
                      onPress={() => handleSell(item)}
                      style={[
                        styles.primaryActionBtn,
                        {
                          backgroundColor:
                            item.stockCount > 0 ? palette.primary : palette.muted,
                          borderColor:
                            item.stockCount > 0 ? palette.primary : palette.border,
                        },
                      ]}>
                      <Text
                        style={[
                          styles.primaryActionText,
                          {
                            color:
                              item.stockCount > 0
                                ? palette.primaryText
                                : palette.textMuted,
                          },
                        ]}>
                        {cardLabels.sell}
                      </Text>
                    </Pressable>
                    <Pressable
                      {...windowsPressableFocusProps}
                      onPress={() => openEdit(item)}
                      style={[styles.iconBtn, {borderColor: palette.border}]}>
                      <Text style={[styles.iconBtnText, {color: palette.text}]}>
                        {texts.inventoryEdit}
                      </Text>
                    </Pressable>
                    <Pressable
                      {...windowsPressableFocusProps}
                      onPress={() => handleDelete(item)}
                      style={[styles.iconBtn, {borderColor: palette.border}]}>
                      <Text style={[styles.iconBtnText, {color: palette.text}]}>
                        {texts.inventoryDelete}
                      </Text>
                    </Pressable>
                  </View>
                </View>
                <View style={styles.detailsGrid}>
                  {([
                    [cardLabels.itemCode, item.itemCode],
                    [cardLabels.sku, item.sku || '-'],
                    [cardLabels.barcode, item.barcode || '-'],
                    [cardLabels.cost, `¥${item.cost.toLocaleString()}`],
                    [cardLabels.price, `¥${item.price.toLocaleString()}`],
                    [`${cardLabels.colorL}/${cardLabels.colorC}/${cardLabels.colorH}`, `${item.lValue}/${item.cValue}/${item.hValue}`],
                    [cardLabels.stock, String(item.stockCount)],
                    [cardLabels.reorderLevel, String(item.reorderLevel)],
                    [cardLabels.supplier, item.supplier || '-'],
                    [cardLabels.location, item.location || '-'],
                    [cardLabels.status, item.statusCode === 'ACTIVE' ? texts.inventoryStatusActive : texts.inventoryStatusInactive],
                    [cardLabels.note, item.note || '-'],
                  ] as [string, string][]).map(([label, value]) => (
                    <Text key={label} style={[styles.detailTag, {color: palette.text}]}>
                      <Text style={[styles.detailTagLabel, {color: palette.textMuted}]}>{label} </Text>
                      {value}
                    </Text>
                  ))}
                </View>
              </View>
            </View>
          </View>
        ))
      )}
      {!isLoading && filtered.length > 0 ? (
        <View style={styles.paginationSection}>
          <Text style={[styles.paginationSummary, {color: palette.textMuted}]}>
            {`${safeCurrentPage} / ${totalPages} · ${filtered.length}`}
          </Text>
          <View style={styles.paginationRow}>
            <Pressable
              {...windowsPressableFocusProps}
              disabled={safeCurrentPage <= 1}
              onPress={() => setCurrentPage(page => Math.max(1, page - 1))}
              style={[
                styles.paginationButton,
                {
                  backgroundColor:
                    safeCurrentPage <= 1 ? palette.muted : palette.card,
                  borderColor: palette.border,
                },
              ]}>
              <Text
                style={[
                  styles.paginationButtonText,
                  {
                    color:
                      safeCurrentPage <= 1 ? palette.textMuted : palette.text,
                  },
                ]}>
                {language === 'ja' ? 'Prev' : 'Prev'}
              </Text>
            </Pressable>
            <Pressable
              {...windowsPressableFocusProps}
              disabled={safeCurrentPage >= totalPages}
              onPress={() =>
                setCurrentPage(page => Math.min(totalPages, page + 1))
              }
              style={[
                styles.paginationButton,
                {
                  backgroundColor:
                    safeCurrentPage >= totalPages ? palette.muted : palette.card,
                  borderColor: palette.border,
                },
              ]}>
              <Text
                style={[
                  styles.paginationButtonText,
                  {
                    color:
                      safeCurrentPage >= totalPages
                        ? palette.textMuted
                        : palette.text,
                  },
                ]}>
                {language === 'ja' ? 'Next' : 'Next'}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    gap: 8,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  addBtn: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  filterRow: {
    flexGrow: 0,
    marginBottom: 4,
  },
  searchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    fontSize: 14,
    height: 46,
    paddingHorizontal: 14,
  },
  searchActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  searchActionButton: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchActionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  filterContent: {
    gap: 8,
    paddingBottom: 4,
  },
  chip: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
    marginTop: 4,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 32,
    textAlign: 'center',
  },
  paginationSection: {
    alignItems: 'center',
    gap: 8,
    paddingBottom: 4,
    paddingTop: 8,
  },
  paginationSummary: {
    fontSize: 12,
    fontWeight: '500',
  },
  paginationRow: {
    flexDirection: 'row',
    gap: 8,
  },
  paginationButton: {
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 92,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  paginationButtonText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
  },
  itemCardRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
  },
  itemMain: {
    flex: 1,
    gap: 8,
  },
  itemThumbnailCell: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    height: 72,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 72,
  },
  itemThumbnailImage: {
    height: '100%',
    resizeMode: 'cover',
    width: '100%',
  },
  itemThumbnailFallbackText: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  itemHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemTitleBlock: {
    flex: 1,
    gap: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
  },
  itemLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  itemActions: {
    flexWrap: 'wrap',
    flexDirection: 'row',
    gap: 6,
    marginLeft: 8,
  },
  primaryActionBtn: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  primaryActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  iconBtn: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  iconBtnText: {
    fontSize: 12,
    fontWeight: '500',
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  detailTag: {
    fontSize: 12,
    lineHeight: 18,
  },
  detailTagLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  noteText: {
    fontSize: 12,
    lineHeight: 18,
  },
  formCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
    marginTop: 10,
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inputMultiline: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
    marginBottom: 4,
    minHeight: 72,
    paddingHorizontal: 12,
    paddingVertical: 8,
    textAlignVertical: 'top',
  },
  imagePlaceholder: {
    borderRadius: 12,
    borderStyle: 'dashed',
    borderWidth: 1,
    marginBottom: 8,
    marginTop: 8,
    minHeight: 96,
    padding: 12,
  },
  cardImagePlaceholder: {
    borderRadius: 12,
    borderStyle: 'dashed',
    borderWidth: 1,
    minHeight: 72,
    padding: 12,
  },
  imagePlaceholderTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  imagePlaceholderBody: {
    fontSize: 12,
    lineHeight: 18,
  },
  formActions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  actionBtn: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 9,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
