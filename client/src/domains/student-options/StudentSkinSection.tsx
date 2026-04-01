import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  Alert,
  DeviceEventEmitter,
  Image,
  NativeModules,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import {ActionButton} from '../../shared/components/ActionButton';
import {windowsTextInputFocusProps} from '../../shared/ui/windowsFocusProps';
import type {ProfileDetail} from '../../screens/shared/account-section-model';
import {
  PREFERENCE_CATEGORIES,
  createEmptyPreferencePointDocument,
  parsePreferencePointDocument,
  serializePreferencePointDocument,
  type HclPoint,
  type PreferenceCategoryCode,
  type PreferencePointDocument,
} from './studentPreferencePointModel';
import {buildHclPickerImageDataUri, hclToHexColor} from './hclColorRaster';

type PaletteLike = {
  border: string;
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

type Props = {
  isSubmitting: boolean;
  onDirtyChange?: (isDirty: boolean) => void;
  onOuterScrollLockChange?: (isLocked: boolean) => void;
  palette: PaletteLike;
  profileDetails: ProfileDetail[];
  showDevPreview: boolean;
  styles: any;
  title: string;
  ui: UiComponents;
  onSaveProfile: (overrides?: {
    preferenceRanges?: string;
    skinCValue?: string;
    skinHValue?: string;
    skinLValue?: string;
    skinTraits?: string;
  }) => Promise<void> | void;
};

type DraftState = {
  skinLValue: string;
  skinCValue: string;
  skinHValue: string;
  skinTraits: string;
  preferencePoints: PreferencePointDocument;
};

type SkinSelection = {
  l: number;
  c: number;
  h: number;
};

type SliderEventLike = {
  nativeEvent?: {
    layout?: {width?: number};
    locationX?: number;
    pageX?: number;
  };
};

type SliderGestureLike = {
  moveX?: number;
  x0?: number;
};

type SliderInputPhase = 'grant' | 'move';
type SkinFieldKey = 'skinLValue' | 'skinCValue' | 'skinHValue';

const SKIN_L_MIN = 35;
const SKIN_L_MAX = 75;
const SKIN_C_MIN = 10;
const SKIN_C_MAX = 30;
const SKIN_H_MIN = 45;
const SKIN_H_MAX = 75;
const PICKER_CANVAS_HEIGHT = 300;
const PICKER_RASTER_WIDTH = 180;
const PICKER_RASTER_HEIGHT = 150;
const POINT_L_MAX = 100;
const POINT_C_MIN = 0;
const POINT_C_MAX = 100;
const POINT_H_MIN = 0;
const POINT_H_MAX = 359;
const PREF_PICKER_RASTER_WIDTH = 200;
const PREF_PICKER_RASTER_HEIGHT = 140;


type ViewBounds = {hMin: number; hMax: number; cMin: number; cMax: number};
const DEFAULT_VIEW_BOUNDS: ViewBounds = {
  hMin: POINT_H_MIN,
  hMax: 360,
  cMin: POINT_C_MIN,
  cMax: POINT_C_MAX,
};

type PickerTool = 'select' | 'range';
const PICKER_TOOLS: Array<{id: PickerTool; icon: string; label: string}> = [
  {id: 'select', icon: '◎', label: 'Select point'},
  {id: 'range', icon: '⬡', label: 'Set range'},
];

function resolvePointerButton(nativeEvent?: {
  button?: number;
  buttons?: number;
}): number | null {
  if (typeof nativeEvent?.button === 'number') {
    return nativeEvent.button;
  }
  if (typeof nativeEvent?.buttons === 'number') {
    if ((nativeEvent.buttons & 2) === 2) {
      return 2;
    }
    if ((nativeEvent.buttons & 4) === 4) {
      return 1;
    }
    if ((nativeEvent.buttons & 1) === 1) {
      return 0;
    }
  }
  return null;
}

function describePointerButton(button: number | null): string {
  if (button === 0) {
    return 'left';
  }
  if (button === 1) {
    return 'middle';
  }
  if (button === 2) {
    return 'right';
  }
  return 'unknown';
}

function zoomViewBounds(
  bounds: ViewBounds,
  cursorX: number,
  cursorY: number,
  factor: number,
  bWidth: number,
  bHeight: number,
): ViewBounds {
  const hRange = bounds.hMax - bounds.hMin;
  const cRange = bounds.cMax - bounds.cMin;
  const hCursor = bounds.hMin + (cursorX / Math.max(1, bWidth)) * hRange;
  const cCursor = bounds.cMax - (cursorY / Math.max(1, bHeight)) * cRange;
  const newHRange = Math.max(10, hRange / factor);
  const newCRange = Math.max(5, cRange / factor);
  const hRatio = cursorX / Math.max(1, bWidth);
  const cRatio = cursorY / Math.max(1, bHeight);
  const rawHMin = hCursor - hRatio * newHRange;
  const rawCMax = cCursor + cRatio * newCRange;
  const hMin = Math.max(POINT_H_MIN, Math.min(rawHMin, 360 - newHRange));
  const cMax = Math.max(newCRange, Math.min(rawCMax, POINT_C_MAX));
  return {hMin, hMax: hMin + newHRange, cMin: cMax - newCRange, cMax};
}


const DEFAULT_SKIN_SELECTION = {
  l: 60,
  c: 20,
  h: 57,
} satisfies SkinSelection;

export function StudentSkinSection({
  isSubmitting,
  onDirtyChange,
  onOuterScrollLockChange,
  onSaveProfile,
  palette,
  profileDetails,
  showDevPreview,
  styles,
  title,
  ui: {BodyStrong, Card, FieldLabel, OptionChip},
}: Props) {
  const initialDraft = useMemo(() => buildInitialDraft(profileDetails), [profileDetails]);
  const [draft, setDraft] = useState<DraftState>(initialDraft);
  const [isSkinTraitsEditing, setIsSkinTraitsEditing] = useState(false);
  const [selectedCategoryCode, setSelectedCategoryCode] =
    useState<PreferenceCategoryCode>('base_foundation');
  const [skinPaletteSize, setSkinPaletteSize] = useState({
    width: 320,
    height: 180,
  });
  const [pickerSelection, setPickerSelection] = useState<SkinSelection>(() => ({
    l: toNumberOrDefault(initialDraft.skinLValue, DEFAULT_SKIN_SELECTION.l),
    c: toNumberOrDefault(initialDraft.skinCValue, DEFAULT_SKIN_SELECTION.c),
    h: toNumberOrDefault(initialDraft.skinHValue, DEFAULT_SKIN_SELECTION.h),
  }));
  const [sliderWidths, setSliderWidths] = useState<Record<keyof SkinSelection, number>>({
    l: 1,
    c: 1,
    h: 1,
  });
  const [skinInputCommitVersion, setSkinInputCommitVersion] = useState<
    Record<SkinFieldKey, number>
  >({
    skinLValue: 0,
    skinCValue: 0,
    skinHValue: 0,
  });
  const sliderInteractionState = useRef<
    Record<keyof SkinSelection, {originX: number | null}>
  >({
    l: {originX: null},
    c: {originX: null},
    h: {originX: null},
  });
  const skinInputRefs = useRef<Record<SkinFieldKey, TextInput | null>>({
    skinLValue: null,
    skinCValue: null,
    skinHValue: null,
  });
  const skinInputValueRef = useRef<Record<SkinFieldKey, string>>({
    skinLValue: initialDraft.skinLValue,
    skinCValue: initialDraft.skinCValue,
    skinHValue: initialDraft.skinHValue,
  });
  const skinPaletteOrigin = useRef<{x: number; y: number} | null>(null);

  const pickerPreview = pickerSelection;
  const pickerRasterLightness = Math.round(pickerPreview.l);
  const currentSkinPoint = mapSkinLchToPalettePoint(pickerPreview, skinPaletteSize);
  const pickerImageUri = useMemo(
    () =>
      buildHclPickerImageDataUri({
        chromaMax: SKIN_C_MAX,
        chromaMin: SKIN_C_MIN,
        height: PICKER_RASTER_HEIGHT,
        hueMax: SKIN_H_MAX,
        hueMin: SKIN_H_MIN,
        lightness: pickerRasterLightness,
        width: PICKER_RASTER_WIDTH,
      }),
    [pickerRasterLightness],
  );
  const pickerImageKey = `skin-picker-l-${pickerRasterLightness}`;

  useEffect(() => {
    setDraft(initialDraft);
    skinInputValueRef.current = {
      skinLValue: initialDraft.skinLValue,
      skinCValue: initialDraft.skinCValue,
      skinHValue: initialDraft.skinHValue,
    };
    setPickerSelection({
      l: toNumberOrDefault(initialDraft.skinLValue, DEFAULT_SKIN_SELECTION.l),
      c: toNumberOrDefault(initialDraft.skinCValue, DEFAULT_SKIN_SELECTION.c),
      h: toNumberOrDefault(initialDraft.skinHValue, DEFAULT_SKIN_SELECTION.h),
    });
    setIsSkinTraitsEditing(false);
  }, [initialDraft]);

  useEffect(() => {
    const initialSkinLValue = formatSkinValue(
      toNumberOrDefault(initialDraft.skinLValue, DEFAULT_SKIN_SELECTION.l),
    );
    const initialSkinCValue = formatSkinValue(
      toNumberOrDefault(initialDraft.skinCValue, DEFAULT_SKIN_SELECTION.c),
    );
    const initialSkinHValue = formatSkinValue(
      toNumberOrDefault(initialDraft.skinHValue, DEFAULT_SKIN_SELECTION.h),
    );
    const currentSkinLValue = formatSkinValue(pickerSelection.l);
    const currentSkinCValue = formatSkinValue(pickerSelection.c);
    const currentSkinHValue = formatSkinValue(pickerSelection.h);
    const isDirty =
      currentSkinLValue !== initialSkinLValue ||
      currentSkinCValue !== initialSkinCValue ||
      currentSkinHValue !== initialSkinHValue ||
      draft.skinTraits !== initialDraft.skinTraits ||
      serializePreferencePointDocument(draft.preferencePoints) !==
        serializePreferencePointDocument(initialDraft.preferencePoints);

    onDirtyChange?.(isDirty);
  }, [
    draft.preferencePoints,
    draft.skinTraits,
    initialDraft.preferencePoints,
    initialDraft.skinTraits,
    initialDraft.skinCValue,
    initialDraft.skinHValue,
    initialDraft.skinLValue,
    onDirtyChange,
    pickerSelection.c,
    pickerSelection.h,
    pickerSelection.l,
  ]);

  const handleSkinPaletteLayout = (event: LayoutChangeEvent) => {
    const {width, height} = event.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setSkinPaletteSize({width, height});
    }
  };

  const handleSkinPaletteInteraction = (event: any, phase: 'grant' | 'move') => {
    const locationX: number = event.nativeEvent?.locationX ?? 0;
    const locationY: number = event.nativeEvent?.locationY ?? 0;
    const pageX: number | undefined = event.nativeEvent?.pageX;
    const pageY: number | undefined = event.nativeEvent?.pageY;

    if (phase === 'grant' && pageX != null && pageY != null) {
      skinPaletteOrigin.current = {x: pageX - locationX, y: pageY - locationY};
    }

    const origin = skinPaletteOrigin.current;
    const localX = pageX != null && origin != null ? pageX - origin.x : locationX;
    const localY = pageY != null && origin != null ? pageY - origin.y : locationY;

    const h = clamp(
      SKIN_H_MIN + (localX / Math.max(1, skinPaletteSize.width)) * (SKIN_H_MAX - SKIN_H_MIN),
      SKIN_H_MIN,
      SKIN_H_MAX,
    );
    const c = clamp(
      SKIN_C_MIN + (1 - localY / PICKER_CANVAS_HEIGHT) * (SKIN_C_MAX - SKIN_C_MIN),
      SKIN_C_MIN,
      SKIN_C_MAX,
    );
    setPickerSelection(current => ({
      ...current,
      h: Number(h.toFixed(4)),
      c: Number(c.toFixed(4)),
    }));
  };

  const handlePreferencePickerHclChange = (
    code: PreferenceCategoryCode,
    h: number,
    c: number,
    l: number,
    pointIndex: number,
  ) => {
    setDraft(current => ({
      ...current,
      preferencePoints: {
        ...current.preferencePoints,
        categories: current.preferencePoints.categories.map(cat => {
          if (cat.code !== code) {
            return cat;
          }
          if (cat.points.length === 0) {
            return {
              ...cat,
              points: [{l: Number(l.toFixed(4)), c, h}],
            };
          }
          return {
            ...cat,
            points: cat.points.map((pt, i) => (i === pointIndex ? {...pt, h, c, l} : pt)),
          };
        }),
      },
    }));
  };

  const updatePickerSlider = (key: keyof SkinSelection, ratio: number) => {
    setPickerSelection(current => ({
      ...current,
      [key]:
        key === 'l'
          ? Number(interpolate(SKIN_L_MIN, SKIN_L_MAX, clamp(ratio, 0, 1)).toFixed(4))
          : key === 'h'
          ? Number(interpolate(SKIN_H_MIN, SKIN_H_MAX, clamp(ratio, 0, 1)).toFixed(4))
          : Number(interpolate(SKIN_C_MIN, SKIN_C_MAX, clamp(ratio, 0, 1)).toFixed(4)),
    }));
  };

  const updatePickerSliderFromEvent = (
    key: keyof SkinSelection,
    event: SliderEventLike,
    phase: SliderInputPhase,
    gestureState?: SliderGestureLike,
  ) => {
    const measuredWidth = event.nativeEvent?.layout?.width;
    const width =
      typeof measuredWidth === 'number' && measuredWidth > 0
        ? measuredWidth
        : sliderWidths[key];
    const locationX = event.nativeEvent?.locationX;
    const pageX = event.nativeEvent?.pageX;
    const moveX = gestureState?.moveX;
    const originXFromEvent =
      typeof pageX === 'number' && typeof locationX === 'number'
        ? pageX - locationX
        : null;

    if (phase === 'grant') {
      if (originXFromEvent !== null) {
        sliderInteractionState.current[key].originX = originXFromEvent;
      }
      if (typeof locationX === 'number' && width > 1) {
        updatePickerSlider(key, clamp(locationX / width, 0, 1));
      }
      return;
    }

    const absoluteX =
      typeof moveX === 'number'
        ? moveX
        : typeof pageX === 'number'
        ? pageX
        : null;
    const originX = sliderInteractionState.current[key].originX;
    const localX =
      absoluteX !== null && originX !== null
        ? absoluteX - originX
        : typeof locationX === 'number'
        ? locationX
        : 0;
    const ratio = clamp(localX / Math.max(1, width), 0, 1);

    logSliderEvent('input', {
      absoluteX,
      phase,
      key,
      localX,
      locationX,
      moveX,
      originX,
      pageX,
      ratio,
      width,
    });

    updatePickerSlider(key, ratio);
  };

  const sliderPanResponders = useMemo(
    () => ({
      l: PanResponder.create({
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event, gestureState) => {
          updatePickerSliderFromEvent('l', event, 'grant', gestureState);
        },
        onPanResponderMove: (event, gestureState) => {
          updatePickerSliderFromEvent('l', event, 'move', gestureState);
        },
        onStartShouldSetPanResponder: () => true,
      }),
      h: PanResponder.create({
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event, gestureState) => {
          updatePickerSliderFromEvent('h', event, 'grant', gestureState);
        },
        onPanResponderMove: (event, gestureState) => {
          updatePickerSliderFromEvent('h', event, 'move', gestureState);
        },
        onStartShouldSetPanResponder: () => true,
      }),
      c: PanResponder.create({
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event, gestureState) => {
          updatePickerSliderFromEvent('c', event, 'grant', gestureState);
        },
        onPanResponderMove: (event, gestureState) => {
          updatePickerSliderFromEvent('c', event, 'move', gestureState);
        },
        onStartShouldSetPanResponder: () => true,
      }),
    }),
    [sliderWidths],
  );

  const handleSave = async () => {
    const nextSkinLValue = formatSkinValue(pickerSelection.l);
    const nextSkinCValue = formatSkinValue(pickerSelection.c);
    const nextSkinHValue = formatSkinValue(pickerSelection.h);
    const nextPreferenceRanges = serializePreferencePointDocument(draft.preferencePoints);

    setDraft(current => ({
      ...current,
      skinLValue: nextSkinLValue,
      skinCValue: nextSkinCValue,
      skinHValue: nextSkinHValue,
    }));

    await Promise.resolve(
      onSaveProfile({
        preferenceRanges: nextPreferenceRanges,
        skinCValue: nextSkinCValue,
        skinHValue: nextSkinHValue,
        skinLValue: nextSkinLValue,
        skinTraits: draft.skinTraits,
      }),
    );
  };

  const applySkinFieldInput = (key: SkinFieldKey, rawValue?: string) => {
    const config = getSkinFieldConfig(key);
    const inputValue = rawValue ?? skinInputValueRef.current[key];
    const parsed = Number(inputValue);
    const nextValue = Number.isFinite(parsed)
      ? clamp(parsed, config.min, config.max)
      : pickerSelection[config.selectionKey];
    const nextFormattedValue = formatSkinValue(nextValue);

    skinInputRefs.current[key]?.setNativeProps?.({text: nextFormattedValue});
    skinInputValueRef.current[key] = nextFormattedValue;
    setDraft(current => ({
      ...current,
      [key]: nextFormattedValue,
    }));
    setSkinInputCommitVersion(current => ({
      ...current,
      [key]: current[key] + 1,
    }));
    setPickerSelection(current => ({
      ...current,
      [config.selectionKey]: nextValue,
    }));
  };

  const addPreferencePoint = (code: PreferenceCategoryCode) => {
    const defaultPoint: HclPoint = {
      l: Number(pickerSelection.l.toFixed(4)),
      c: Number(pickerSelection.c.toFixed(4)),
      h: Number(pickerSelection.h.toFixed(4)),
    };
    setDraft(current => ({
      ...current,
      preferencePoints: {
        ...current.preferencePoints,
        categories: current.preferencePoints.categories.map(cat =>
          cat.code === code ? {...cat, points: [...cat.points, defaultPoint]} : cat,
        ),
      },
    }));
  };

  const removePreferencePoint = (code: PreferenceCategoryCode, pointIndex: number) => {
    setDraft(current => ({
      ...current,
      preferencePoints: {
        ...current.preferencePoints,
        categories: current.preferencePoints.categories.map(cat =>
          cat.code === code
            ? {...cat, points: cat.points.filter((_, i) => i !== pointIndex)}
            : cat,
        ),
      },
    }));
  };

  const selectedCatalog = PREFERENCE_CATEGORIES.find(c => c.code === selectedCategoryCode)!;
  const selectedCategoryEntry = draft.preferencePoints.categories.find(
    c => c.code === selectedCategoryCode,
  )!;

  return (
    <View style={styles.stack}>
      <Card palette={palette} title={title}>
        <FieldLabel palette={palette}>Color Picker</FieldLabel>
        <Text style={{color: palette.textMuted, marginBottom: 12}}>
          HCL Color Picker draft. Horizontal axis is Hue, vertical axis is Chroma, and the side controls show Lightness, Hue, and Chroma.
        </Text>
        <Text style={{color: palette.textMuted, marginBottom: 12}}>
          Picker board lightness: {pickerRasterLightness}
        </Text>
        <View style={{gap: 16}}>
          <View
            style={{
              flexDirection: 'row',
              gap: 16,
              alignItems: 'flex-start',
              flexWrap: 'wrap',
            }}>
            <View
              style={{
                flex: 1,
                minWidth: 280,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#dddddd',
                backgroundColor: '#ffffff',
                padding: 16,
                shadowColor: '#000000',
                shadowOpacity: 0.08,
                shadowRadius: 8,
              }}>
              <View
                onLayout={handleSkinPaletteLayout}
                onResponderGrant={e => handleSkinPaletteInteraction(e, 'grant')}
                onResponderMove={e => handleSkinPaletteInteraction(e, 'move')}
                onStartShouldSetResponder={() => true}
                style={{
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#cccccc',
                  overflow: 'hidden',
                  position: 'relative',
                  backgroundColor: '#ffffff',
                }}
                testID="skin-palette-board">
                <View style={{height: 300, width: '100%'}}>
                  <Image
                    key={pickerImageKey}
                    source={{uri: pickerImageUri}}
                    testID="skin-palette-image"
                    style={{width: '100%', height: '100%'}}
                  />
                </View>
                <View
                  style={{
                    position: 'absolute',
                    left: Math.max(0, Math.min(skinPaletteSize.width - 16, currentSkinPoint.x - 8)),
                    top: Math.max(
                      0,
                      Math.min(
                        PICKER_CANVAS_HEIGHT - 16,
                        mapChromaToSurfaceY(pickerPreview.c, PICKER_CANVAS_HEIGHT) - 8,
                      ),
                    ),
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    borderWidth: 2,
                    borderColor: '#ffffff',
                    backgroundColor: 'transparent',
                  }}
                />
                <View
                  style={{
                    position: 'absolute',
                    left: Math.max(
                      0,
                      Math.min(skinPaletteSize.width - 16, currentSkinPoint.x - 10),
                    ),
                    top: Math.max(
                      0,
                      Math.min(
                        PICKER_CANVAS_HEIGHT - 16,
                        mapChromaToSurfaceY(pickerPreview.c, PICKER_CANVAS_HEIGHT) - 10,
                      ),
                    ),
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#000000',
                    backgroundColor: 'transparent',
                  }}
                />
              </View>
            </View>

            <View
              style={{
                width: 320,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#dddddd',
                backgroundColor: '#ffffff',
                padding: 16,
                shadowColor: '#000000',
                shadowOpacity: 0.08,
                shadowRadius: 8,
              }}>
              {[
                {
                  key: 'l' as const,
                  label: 'Lightness (L)',
                  testID: 'skin-slider-l',
                  value: pickerPreview.l.toFixed(0),
                  ratio: (pickerPreview.l - SKIN_L_MIN) / (SKIN_L_MAX - SKIN_L_MIN),
                },
                {
                  key: 'h' as const,
                  label: 'Hue (H)',
                  testID: 'skin-slider-h',
                  value: pickerPreview.h.toFixed(0),
                  ratio: (pickerPreview.h - SKIN_H_MIN) / (SKIN_H_MAX - SKIN_H_MIN),
                },
                {
                  key: 'c' as const,
                  label: 'Chroma (C)',
                  testID: 'skin-slider-c',
                  value: pickerPreview.c.toFixed(0),
                  ratio: (pickerPreview.c - SKIN_C_MIN) / (SKIN_C_MAX - SKIN_C_MIN),
                },
              ].map(control => (
                <View key={control.label} style={{marginBottom: 16}}>
                  <Text style={{fontWeight: '700', color: '#222222', marginBottom: 6}}>
                    {control.label}
                  </Text>
                  <View
                    testID={control.testID}
                    {...sliderPanResponders[control.key].panHandlers}
                    onLayout={event => {
                      const width = event.nativeEvent.layout.width;
                      if (width > 0) {
                        logSliderEvent('layout', {key: control.key, width});
                        setSliderWidths(current => ({...current, [control.key]: width}));
                      }
                    }}
                    onResponderGrant={event =>
                      updatePickerSliderFromEvent(control.key, event, 'grant')
                    }
                    onResponderMove={event =>
                      updatePickerSliderFromEvent(control.key, event, 'move')
                    }
                    onStartShouldSetResponder={() => true}
                    style={{
                      height: 18,
                      borderRadius: 999,
                      backgroundColor: '#ececec',
                      overflow: 'hidden',
                      justifyContent: 'center',
                    }}>
                    <View
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: `${Math.max(0, Math.min(100, control.ratio * 100))}%`,
                        backgroundColor: '#d7d7d7',
                      }}
                    />
                    <View
                      style={{
                        position: 'absolute',
                        left: `${Math.max(0, Math.min(96, control.ratio * 100))}%`,
                        marginLeft: -8,
                        width: 16,
                        height: 16,
                        borderRadius: 8,
                        backgroundColor: '#ffffff',
                        borderWidth: 1,
                        borderColor: '#bbbbbb',
                      }}
                    />
                  </View>
                  <Text style={{fontSize: 14, color: '#555555', marginTop: 4}}>
                    {control.value}
                  </Text>
                </View>
              ))}
            </View>

            <View
              style={{
                width: 160,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#dddddd',
                backgroundColor: '#ffffff',
                padding: 16,
                shadowColor: '#000000',
                shadowOpacity: 0.08,
                shadowRadius: 8,
              }}>
              <View
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#cccccc',
                  marginBottom: 12,
                  backgroundColor: hclToHexColor(
                    pickerPreview.h,
                    pickerPreview.c,
                    pickerPreview.l,
                  ),
                }}
              />
              <Text style={{fontSize: 14, lineHeight: 21, color: '#222222'}}>
                H: {pickerPreview.h.toFixed(0)}{'\n'}
                C: {pickerPreview.c.toFixed(0)}{'\n'}
                L: {pickerPreview.l.toFixed(0)}{'\n\n'}
                Preview only
              </Text>
              <Text style={{fontSize: 12, color: '#666666', marginTop: 8}}>
                Zoomed to a reasonable human-skin HCL range so subtle undertone differences are easier to inspect.
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.optionRow, {alignItems: 'flex-start'}]}>
          {(['skinLValue', 'skinCValue', 'skinHValue'] as const).map(key => (
            <View key={key} style={{flex: 1}}>
              <FieldLabel palette={palette}>{key.replace('skin', '').replace('Value', ' Value')}</FieldLabel>
              <TextInput
                {...windowsTextInputFocusProps}
                key={`${key}:${skinInputCommitVersion[key]}`}
                ref={node => {
                  skinInputRefs.current[key] = node;
                }}
                keyboardType="decimal-pad"
                onFocus={() => logFocusEvent('skin-field-focus', {field: key})}
                onBlur={() => applySkinFieldInput(key)}
                onEndEditing={event => applySkinFieldInput(key, event?.nativeEvent?.text)}
                onChangeText={value => {
                  skinInputValueRef.current[key] = value;
                  setDraft(current => ({...current, [key]: value}));
                }}
                onSubmitEditing={event => {
                  applySkinFieldInput(key, event?.nativeEvent?.text);
                  skinInputRefs.current[key]?.blur?.();
                }}
                placeholder="0.0000"
                placeholderTextColor={palette.textMuted}
                returnKeyType="done"
                style={[
                  styles.input,
                  {
                    backgroundColor: palette.muted,
                    borderColor: palette.border,
                    color: palette.text,
                  },
                ]}
                testID={key}
                value={draft[key]}
              />
            </View>
          ))}
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}>
          <FieldLabel palette={palette}>Skin Traits</FieldLabel>
          <ActionButton
            backgroundColor={palette.soft}
            isLoading={false}
            label={isSkinTraitsEditing ? 'Done' : '✎'}
            onPress={() => {
              logFocusEvent('skin-traits-toggle-press', {editing: isSkinTraitsEditing});
              setIsSkinTraitsEditing(current => !current);
            }}
            style={styles.profileIconButton ?? styles.actionButton}
            textColor={palette.text}
            titleStyle={styles.profileIconButtonText ?? styles.actionText}
          />
        </View>
        <View>
          <View
            pointerEvents={isSkinTraitsEditing ? 'none' : 'auto'}
            style={{
              maxHeight: isSkinTraitsEditing ? 0 : undefined,
              opacity: isSkinTraitsEditing ? 0 : 1,
              overflow: 'hidden',
            }}>
            <View
              style={[
                styles.input,
                styles.profileNoteInput,
                {
                  backgroundColor: palette.muted,
                  borderColor: palette.border,
                  justifyContent: 'center',
                },
              ]}>
              <Text
                style={{color: draft.skinTraits ? palette.text : palette.textMuted}}
                testID="skin-traits-display">
                {draft.skinTraits || 'No skin traits note yet.'}
              </Text>
            </View>
          </View>
          <View
            pointerEvents={isSkinTraitsEditing ? 'auto' : 'none'}
            style={{
              maxHeight: isSkinTraitsEditing ? undefined : 0,
              opacity: isSkinTraitsEditing ? 1 : 0,
              overflow: 'hidden',
            }}>
            <TextInput
              {...windowsTextInputFocusProps}
              multiline
              onFocus={() => logFocusEvent('skin-traits-input-focus', {})}
              onChangeText={value =>
                setDraft(current => ({...current, skinTraits: value}))
              }
              placeholder="Free memo for undertone, sensitivity, finish, or any other note."
              placeholderTextColor={palette.textMuted}
              style={[
                styles.input,
                styles.profileNoteInput,
                {
                  backgroundColor: palette.muted,
                  borderColor: palette.border,
                  color: palette.text,
                },
              ]}
              testID="skin-traits-input"
              value={draft.skinTraits}
            />
          </View>
        </View>
      </Card>

      <Card palette={palette} title="Preference Points">
        <FieldLabel palette={palette}>Category</FieldLabel>
        <View style={[styles.optionRow, {flexWrap: 'wrap', marginBottom: 16}]}>
          {PREFERENCE_CATEGORIES.map(cat => (
            <OptionChip
              key={cat.code}
              active={selectedCategoryCode === cat.code}
              label={cat.label}
              onPress={() => {
                logFocusEvent('category-chip-press', {code: cat.code});
                setSelectedCategoryCode(cat.code);
              }}
              palette={palette}
            />
          ))}
        </View>

        <BodyStrong palette={palette}>
          {selectedCatalog.label}{' '}
          <Text style={{fontWeight: 'normal', color: palette.textMuted}}>
            ({selectedCatalog.pointMode === 'single' ? 'single point' : 'multiple points'})
          </Text>
        </BodyStrong>

        <PreferenceCategoryPicker
          key={selectedCategoryCode}
          onAddPoint={selectedCategoryEntry.points.length < 10 ? () => addPreferencePoint(selectedCategoryCode) : undefined}
          onOuterScrollLockChange={onOuterScrollLockChange}
          onHclChange={(h, c, l, idx) => handlePreferencePickerHclChange(selectedCategoryCode, h, c, l, idx)}
          onRemovePoint={idx => removePreferencePoint(selectedCategoryCode, idx)}
          palette={palette}
          points={selectedCategoryEntry.points}
        />

      </Card>

      <Card palette={palette} title="Actions">
        <View style={styles.optionRow}>
          <ActionButton
            backgroundColor={palette.primary}
            isLoading={isSubmitting}
            label="Save Student Skin"
            onPress={() => {
              logFocusEvent('save-button-press', {});
              handleSave();
            }}
            style={styles.actionButton}
            textColor={palette.primaryText}
            titleStyle={styles.actionText}
          />
          <ActionButton
            backgroundColor={palette.soft}
            isLoading={false}
            label="Reset Draft"
            onPress={() => {
              setDraft(initialDraft);
              setPickerSelection({
                l: toNumberOrDefault(initialDraft.skinLValue, DEFAULT_SKIN_SELECTION.l),
                c: toNumberOrDefault(initialDraft.skinCValue, DEFAULT_SKIN_SELECTION.c),
                h: toNumberOrDefault(initialDraft.skinHValue, DEFAULT_SKIN_SELECTION.h),
              });
            }}
            style={styles.actionButton}
            textColor={palette.text}
            titleStyle={styles.actionText}
          />
        </View>
      </Card>


      {showDevPreview && (() => {
        const doc = draft.preferencePoints;
        const filledCategories = doc.categories.filter(c => c.points.length > 0);
        return (
          <Card palette={palette} title="Student Skin Data">

            {/* Base skin values */}
            <View
              style={{
                flexDirection: 'row',
                gap: 8,
                marginBottom: 12,
                padding: 10,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: palette.border,
                backgroundColor: palette.muted,
              }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: palette.border,
                  backgroundColor: hclToHexColor(
                    parseFloat(draft.skinHValue) || 0,
                    parseFloat(draft.skinCValue) || 0,
                    parseFloat(draft.skinLValue) || 0,
                  ),
                }}
              />
              <View style={{flex: 1, justifyContent: 'center', gap: 2}}>
                <Text style={{fontSize: 12, color: palette.text}}>
                  L {(parseFloat(draft.skinLValue) || 0).toFixed(1)}
                  {'  '}C {(parseFloat(draft.skinCValue) || 0).toFixed(1)}
                  {'  '}H {(parseFloat(draft.skinHValue) || 0).toFixed(1)}
                </Text>
                {draft.skinTraits ? (
                  <Text style={{fontSize: 11, color: palette.textMuted}}>{draft.skinTraits}</Text>
                ) : null}
              </View>
            </View>

            {/* Preference points per category */}
            {filledCategories.length === 0 ? (
              <Text style={{fontSize: 12, color: palette.textMuted}}>No preference points set.</Text>
            ) : (
              filledCategories.map((cat, catIdx) => {
                const label = PREFERENCE_CATEGORIES.find(c => c.code === cat.code)?.label ?? cat.code;
                return (
                  <View
                    key={cat.code}
                    style={{
                      marginTop: catIdx === 0 ? 0 : 10,
                      borderWidth: 1,
                      borderColor: palette.border,
                      borderRadius: 8,
                      overflow: 'hidden',
                    }}>
                    <View
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        backgroundColor: palette.muted,
                        borderBottomWidth: 1,
                        borderBottomColor: palette.border,
                      }}>
                      <Text style={{fontSize: 12, fontWeight: '700', color: palette.text}}>
                        {label}
                      </Text>
                    </View>
                    {cat.points.map((pt, i) => (
                      <View
                        key={i}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 8,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderTopWidth: i === 0 ? 0 : 1,
                          borderTopColor: palette.border,
                        }}>
                        <View
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 4,
                            borderWidth: 1,
                            borderColor: palette.border,
                            backgroundColor: hclToHexColor(pt.h, pt.c, pt.l),
                          }}
                        />
                        <Text style={{fontSize: 11, color: palette.textMuted, minWidth: 20}}>
                          #{i + 1}
                        </Text>
                        <Text style={{fontSize: 12, color: palette.text, flex: 1}}>
                          L {pt.l.toFixed(1)}{'  '}C {pt.c.toFixed(1)}{'  '}H {pt.h.toFixed(1)}
                        </Text>
                      </View>
                    ))}
                  </View>
                );
              })
            )}
          </Card>
        );
      })()}
    </View>
  );
}

function buildInitialDraft(profileDetails: ProfileDetail[]): DraftState {
  const read = (key: string) =>
    profileDetails.find(detail => detail.key === key)?.value ?? '';

  return {
    skinLValue: read('skinLValue'),
    skinCValue: read('skinCValue'),
    skinHValue: read('skinHValue'),
    skinTraits: read('skinTraits') === '-' ? '' : read('skinTraits'),
    preferencePoints:
      parsePreferencePointDocument(read('preferenceRanges')) ??
      createEmptyPreferencePointDocument(),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function interpolate(start: number, end: number, ratio: number) {
  return start + (end - start) * ratio;
}

function mapSkinLchToPalettePoint(
  input: {l: number; c: number; h: number},
  size: {width: number; height: number},
) {
  const xRatio = clamp((input.h - SKIN_H_MIN) / (SKIN_H_MAX - SKIN_H_MIN), 0, 1);
  return {
    x: xRatio * size.width,
    y: mapChromaToSurfaceY(input.c, size.height),
  };
}

function mapChromaToSurfaceY(chroma: number, height: number) {
  const ratio = clamp((chroma - SKIN_C_MIN) / (SKIN_C_MAX - SKIN_C_MIN), 0, 1);
  return height - ratio * height;
}

function toNumberOrDefault(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatSkinValue(value: number) {
  return value.toFixed(4);
}

function getSkinFieldConfig(key: SkinFieldKey) {
  if (key === 'skinLValue') {
    return {max: SKIN_L_MAX, min: SKIN_L_MIN, selectionKey: 'l' as const};
  }

  if (key === 'skinCValue') {
    return {max: SKIN_C_MAX, min: SKIN_C_MIN, selectionKey: 'c' as const};
  }

  return {max: SKIN_H_MAX, min: SKIN_H_MIN, selectionKey: 'h' as const};
}


function logSliderEvent(event: string, payload: Record<string, unknown>) {
  console.log(`[student-skin-slider] ${event}`, payload);
}

function logFocusEvent(event: string, payload: Record<string, unknown>) {
  console.log(`[student-skin-focus] ${event}`, payload);
}

function logWheelEvent(
  event: string,
  payload: {
    boardRect?: {left: number; top: number; right: number; bottom: number} | null;
    clientX?: number;
    clientY?: number;
    ctrlKey?: boolean;
    currentTargetName?: string;
    defaultPrevented?: boolean;
    deltaMode?: number;
    deltaX?: number;
    deltaY?: number;
    eventPhase?: number;
    hover?: boolean;
    focused?: boolean;
    insideBoard?: boolean;
    pressedCtrl?: boolean;
    targetName?: string;
  },
) {
  console.log(`[student-skin-wheel] ${event}`, payload);
}

type PreferenceCategoryPickerProps = {
  palette: PaletteLike;
  points: HclPoint[];
  onAddPoint?: () => void;
  onOuterScrollLockChange?: (isLocked: boolean) => void;
  onHclChange?: (h: number, c: number, l: number, pointIndex: number) => void;
  onRemovePoint?: (pointIndex: number) => void;
};

function PreferenceCategoryPicker({
  palette,
  points,
  onAddPoint,
  onOuterScrollLockChange,
  onHclChange,
  onRemovePoint,
}: PreferenceCategoryPickerProps) {
  const [activeTool, setActiveTool] = useState<PickerTool>('select');
  const [isRangeHoldActive, setIsRangeHoldActive] = useState(false);
  const [isBoardFocused, setIsBoardFocused] = useState(false);
  const [isBoardHovered, setIsBoardHovered] = useState(false);
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);
  const activeButtonRef = useRef<number | null>(null); // 0=left 1=middle 2=right
  const isRightHeldRef = useRef(false); // true while right button is physically held down
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(
    points.length > 0 ? 0 : null,
  );
  const [boardSize, setBoardSize] = useState({width: 1, height: 180});
  const [previewL, setPreviewL] = useState(points[0]?.l ?? 58);
  const [hoverSampleText, setHoverSampleText] = useState<string | null>(null);
  const [pointRanges, setPointRanges] = useState<Record<number, number>>({});
  const [viewBounds, setViewBounds] = useState<ViewBounds>(DEFAULT_VIEW_BOUNDS);
  const boardRef = useRef<any>(null);
  const boardOrigin = useRef<{x: number; y: number} | null>(null);
  const boardPageOriginRef = useRef<{x: number; y: number} | null>(null);
  const lSliderWidth = useRef(1);
  const lSliderOrigin = useRef<number | null>(null);
  const prevLengthRef = useRef(points.length);
  const selectedIndexRef = useRef(selectedPointIndex);
  selectedIndexRef.current = selectedPointIndex;
  const viewBoundsRef = useRef(viewBounds);
  viewBoundsRef.current = viewBounds;
  const boardSizeRef = useRef(boardSize);
  boardSizeRef.current = boardSize;
  const pointsRef = useRef(points);
  pointsRef.current = points;
  const previewLRef = useRef(previewL);
  previewLRef.current = previewL;
  const isBoardFocusedRef = useRef(false);
  isBoardFocusedRef.current = isBoardFocused;
  const isBoardHoveredRef = useRef(false);
  isBoardHoveredRef.current = isBoardHovered;
  const effectiveActiveTool: PickerTool = isRangeHoldActive ? 'range' : activeTool;

  useEffect(() => {
    const prev = prevLengthRef.current;
    const curr = points.length;
    prevLengthRef.current = curr;

    if (curr === 0) {
      setSelectedPointIndex(null);
    } else if (curr > prev) {
      setSelectedPointIndex(curr - 1);
    } else if (selectedIndexRef.current !== null && selectedIndexRef.current >= curr) {
      setSelectedPointIndex(curr - 1);
    }
  }, [points.length]);

  // Sync previewL when selected point changes
  useEffect(() => {
    const idx =
      selectedPointIndex !== null && selectedPointIndex < points.length
        ? selectedPointIndex
        : points.length > 0
        ? 0
        : null;
    if (idx !== null) {
      setPreviewL(points[idx].l);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPointIndex]);

  // Drop ranges for removed points
  useEffect(() => {
    setPointRanges(prev => {
      const next: Record<number, number> = {};
      for (const [k, v] of Object.entries(prev)) {
        if (Number(k) < points.length) {
          next[Number(k)] = v;
        }
      }
      return next;
    });
  }, [points.length]);

  // Zoom via scroll when zoom mode active; middle-mouse drag → pan (DOM events, web only)
  useEffect(() => {
    const doc = (globalThis as any).document;
    const win = (globalThis as any).window;
    if (!doc || typeof doc.addEventListener !== 'function') {
      return;
    }

    const getBoardDomEl = () => {
      const rawBoardEl = boardRef.current;
      if (!rawBoardEl) {
        return null;
      }
      return rawBoardEl.getBoundingClientRect ? rawBoardEl : (rawBoardEl as any)._hostNode ?? null;
    };

    const getBoardDomRect = (): {left: number; top: number; right: number; bottom: number} | null => {
      const boardDomEl: any = getBoardDomEl();
      if (!boardDomEl || typeof boardDomEl.getBoundingClientRect !== 'function') {
        return null;
      }
      return boardDomEl.getBoundingClientRect();
    };

    const buildWheelPayload = (e: any) => {
      const rect = getBoardDomRect();
      const insideBoard =
        !!rect &&
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;

      return {
        boardRect: rect,
        clientX: e.clientX,
        clientY: e.clientY,
        ctrlKey: e.ctrlKey,
        currentTargetName:
          e.currentTarget === win
            ? 'window'
            : e.currentTarget === doc
            ? 'document'
            : e.currentTarget?.nodeName ?? typeof e.currentTarget,
        defaultPrevented: e.defaultPrevented,
        deltaMode: e.deltaMode,
        deltaX: e.deltaX,
        deltaY: e.deltaY,
        eventPhase: e.eventPhase,
        focused: isBoardFocusedRef.current,
        hover: isBoardHoveredRef.current,
        insideBoard,
        targetName: e.target?.nodeName ?? typeof e.target,
      };
    };

    const logWheelProbe = (label: string) => (e: any) => {
      logWheelEvent(label, buildWheelPayload(e));
    };

    const onWheel = (e: any) => {
      logWheelEvent('zoom-handler-entry', buildWheelPayload(e));
      if (!isBoardHoveredRef.current) {
        logWheelEvent('zoom-handler-skip', buildWheelPayload(e));
        return;
      }
      const rect = getBoardDomRect();
      if (!rect) return;
      if (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      ) {
        logWheelEvent('zoom-handler-outside', buildWheelPayload(e));
        return;
      }
      e.preventDefault();
      logWheelEvent('zoom-handler-prevent-default', buildWheelPayload(e));
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.25 : 1 / 1.25;
      const {width, height} = boardSizeRef.current;
      setViewBounds(prev => zoomViewBounds(prev, cx, cy, factor, width, height));
    };

    // Middle-button drag: right = zoom in, left = zoom out
    let midDragStart: {pageX: number; bounds: ViewBounds; cx: number; cy: number} | null = null;
    // Right-button drag: set range from selected point to cursor
    let rightDragActive = false;

    const localCoordsFromClient = (clientX: number, clientY: number, rect: {left: number; top: number; right: number; bottom: number}) => {
      const {hMin, hMax, cMin, cMax} = viewBoundsRef.current;
      const {width, height} = boardSizeRef.current;
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;
      const h = clamp(hMin + (localX / Math.max(1, width)) * (hMax - hMin), POINT_H_MIN, POINT_H_MAX);
      const c = clamp(cMax - (localY / Math.max(1, height)) * (cMax - cMin), POINT_C_MIN, POINT_C_MAX);
      return {h, c};
    };

    // Pointer events are registered directly on the board DOM element to bypass
    // RN-Windows's Responder system which strips button/buttons from nativeEvent.
    // See: https://github.com/microsoft/react-native-windows/issues/15827
    const onBoardPointerDown = (e: any) => {
      activeButtonRef.current = e.button;
      logFocusEvent('board-pointer-down', {button: e.button, buttons: e.buttons});
      if (e.button === 1) {
        e.preventDefault();
        const rect = getBoardDomRect();
        if (!rect) return;
        midDragStart = {
          pageX: e.pageX,
          bounds: viewBoundsRef.current,
          cx: e.clientX - rect.left,
          cy: e.clientY - rect.top,
        };
      } else if (e.button === 2) {
        e.preventDefault();
        logFocusEvent('picker-right-click', {x: e.clientX, y: e.clientY});
        rightDragActive = true;
        isRightHeldRef.current = true;
        setIsRangeHoldActive(true);
        setActiveTool('range');
        const rect = getBoardDomRect();
        if (!rect) return;
        const ptIdx = selectedIndexRef.current;
        if (ptIdx !== null) {
          const pt = pointsRef.current[ptIdx];
          if (pt) {
            const {h, c} = localCoordsFromClient(e.clientX, e.clientY, rect);
            const dH = h - pt.h;
            const dC = c - pt.c;
            const dL = previewLRef.current - pt.l;
            const radius = Math.sqrt(dH * dH + dC * dC + dL * dL);
            if (radius > 0) {
              setPointRanges(prev => ({...prev, [ptIdx]: radius}));
            }
          }
        }
      }
    };
    // pointermove/up stay on document so dragging outside the board still works
    const onPointerMove = (e: any) => {
      if (midDragStart) {
        const dx = e.pageX - midDragStart.pageX;
        const factor = Math.pow(1.01, dx);
        const {width, height} = boardSizeRef.current;
        setViewBounds(zoomViewBounds(midDragStart.bounds, midDragStart.cx, midDragStart.cy, factor, width, height));
      } else if (rightDragActive) {
        const rect = getBoardDomRect();
        if (!rect) return;
        const idx = selectedIndexRef.current;
        if (idx === null) return;
        const {h, c} = localCoordsFromClient(e.clientX, e.clientY, rect);
        setPointRanges(prev => {
          const ptIdx = selectedIndexRef.current;
          if (ptIdx === null) return prev;
          const pt = pointsRef.current[ptIdx];
          if (!pt) return prev;
          const dH = h - pt.h;
          const dC = c - pt.c;
          const dL = previewLRef.current - pt.l;
          const radius = Math.sqrt(dH * dH + dC * dC + dL * dL);
          if (radius <= 0) return prev;
          return {...prev, [ptIdx]: radius};
        });
      }
    };
    const onPointerUp = (e: any) => {
      if (e.button === activeButtonRef.current) activeButtonRef.current = null;
      if (e.button === 1) midDragStart = null;
      if (e.button === 2) {
        rightDragActive = false;
        isRightHeldRef.current = false;
        setIsRangeHoldActive(false);
        setActiveTool('select');
      }
    };
    const onBoardContextMenu = (e: any) => {
      e.preventDefault();
    };

    const boardWheelCaptureLogger = logWheelProbe('board-wheel-capture');
    const boardWheelBubbleLogger = logWheelProbe('board-wheel-bubble');
    const documentWheelCaptureLogger = logWheelProbe('document-wheel-capture');
    const documentWheelBubbleLogger = logWheelProbe('document-wheel-bubble');
    const windowWheelCaptureLogger = logWheelProbe('window-wheel-capture');
    const windowWheelBubbleLogger = logWheelProbe('window-wheel-bubble');

    // boardDomEl may be null at mount time — retry until available
    let registeredBoardEl: any = null;
    let retryTimer: any = null;

    const attachBoardListeners = () => {
      const raw = boardRef.current;
      const el = getBoardDomEl();
      console.log('[board-dom-probe]', {
        rawExists: !!raw,
        rawType: raw ? typeof raw : 'null',
        rawConstructor: raw?.constructor?.name,
        rawKeys: raw ? Object.keys(raw).slice(0, 20) : [],
        hasBCR: !!raw?.getBoundingClientRect,
        hasHostNode: !!(raw as any)?._hostNode,
        hasNativeNode: !!(raw as any)?._nativeNode,
        hasGetNode: typeof (raw as any)?.getNode === 'function',
        hasSetNativeProps: typeof (raw as any)?.setNativeProps === 'function',
        elExists: !!el,
        elHasAddEventListener: !!el?.addEventListener,
      });
      if (!el?.addEventListener) {
        retryTimer = setTimeout(attachBoardListeners, 100);
        return;
      }
      registeredBoardEl = el;
      el.addEventListener('wheel', boardWheelCaptureLogger, {capture: true, passive: true});
      el.addEventListener('wheel', boardWheelBubbleLogger, {passive: true});
      el.addEventListener('pointerdown', onBoardPointerDown);
      el.addEventListener('contextmenu', onBoardContextMenu);
      logFocusEvent('board-dom-listeners-attached', {});
    };
    attachBoardListeners();

    doc.addEventListener('wheel', documentWheelCaptureLogger, {capture: true, passive: true});
    doc.addEventListener('wheel', onWheel, {passive: false});
    doc.addEventListener('wheel', documentWheelBubbleLogger, {passive: true});
    win?.addEventListener?.('wheel', windowWheelCaptureLogger, {capture: true, passive: true});
    win?.addEventListener?.('wheel', windowWheelBubbleLogger, {passive: true});
    doc.addEventListener('pointermove', onPointerMove);
    doc.addEventListener('pointerup', onPointerUp);
    return () => {
      if (retryTimer) clearTimeout(retryTimer);
      if (registeredBoardEl?.removeEventListener) {
        registeredBoardEl.removeEventListener('wheel', boardWheelCaptureLogger, {capture: true} as any);
        registeredBoardEl.removeEventListener('wheel', boardWheelBubbleLogger);
        registeredBoardEl.removeEventListener('pointerdown', onBoardPointerDown);
        registeredBoardEl.removeEventListener('contextmenu', onBoardContextMenu);
      }
      doc.removeEventListener('wheel', documentWheelCaptureLogger, {capture: true} as any);
      doc.removeEventListener('wheel', onWheel);
      doc.removeEventListener('wheel', documentWheelBubbleLogger);
      win?.removeEventListener?.('wheel', windowWheelCaptureLogger, {capture: true} as any);
      win?.removeEventListener?.('wheel', windowWheelBubbleLogger);
      doc.removeEventListener('pointermove', onPointerMove);
      doc.removeEventListener('pointerup', onPointerUp);
    };
  }, []); // refs keep interaction state current

  const safeSelectedIndex =
    selectedPointIndex !== null && selectedPointIndex < points.length
      ? selectedPointIndex
      : points.length > 0
      ? 0
      : null;

  const displayPoint = safeSelectedIndex !== null ? points[safeSelectedIndex] : null;
  const rasterL = Math.round(previewL);

  const applyBoardInteractionAtLocalPoint = (
    localX: number,
    localY: number,
    toolOverride?: PickerTool,
  ) => {
    if (safeSelectedIndex === null) {
      return;
    }

    const {hMin, hMax, cMin, cMax} = viewBoundsRef.current;
    const h = clamp(
      hMin + (localX / Math.max(1, boardSizeRef.current.width)) * (hMax - hMin),
      POINT_H_MIN,
      POINT_H_MAX,
    );
    const c = clamp(
      cMax - (localY / Math.max(1, boardSizeRef.current.height)) * (cMax - cMin),
      POINT_C_MIN,
      POINT_C_MAX,
    );
    const effectiveTool = toolOverride ?? (activeButtonRef.current === 2 ? 'range' : effectiveActiveTool);

    if (effectiveTool === 'select') {
      onHclChange?.(
        Number(h.toFixed(4)),
        Number(c.toFixed(4)),
        Number(previewLRef.current.toFixed(4)),
        safeSelectedIndex,
      );
      return;
    }

    const pt = pointsRef.current[safeSelectedIndex];
    if (!pt) {
      return;
    }
    const dH = h - pt.h;
    const dC = c - pt.c;
    const dL = previewLRef.current - pt.l;
    const radius = Math.sqrt(dH * dH + dC * dC + dL * dL);
    if (radius > 0) {
      setPointRanges(prev => ({...prev, [safeSelectedIndex]: radius}));
    }
  };

  const handleBoardInteraction = (event: any, phase: 'grant' | 'move') => {
    if (safeSelectedIndex === null) {
      return;
    }
    const locationX: number = event.nativeEvent?.locationX ?? 0;
    const locationY: number = event.nativeEvent?.locationY ?? 0;
    const pageX: number | undefined = event.nativeEvent?.pageX;
    const pageY: number | undefined = event.nativeEvent?.pageY;

    if (phase === 'grant' && pageX != null && pageY != null) {
      boardOrigin.current = {x: pageX - locationX, y: pageY - locationY};
    }

    const origin = boardOrigin.current;
    const localX = pageX != null && origin != null ? pageX - origin.x : locationX;
    const localY = pageY != null && origin != null ? pageY - origin.y : locationY;

    const {hMin, hMax, cMin, cMax} = viewBounds;
    const h = clamp(
      hMin + (localX / Math.max(1, boardSize.width)) * (hMax - hMin),
      POINT_H_MIN,
      POINT_H_MAX,
    );
    const c = clamp(
      cMax - (localY / Math.max(1, boardSize.height)) * (cMax - cMin),
      POINT_C_MIN,
      POINT_C_MAX,
    );

    // activeButtonRef is set by onBoardPointerDown (direct DOM listener on the board element),
    // which fires before the responder grant. Responder events don't carry button info on RN-Windows.
    const effectiveTool = activeButtonRef.current === 2 ? 'range' : effectiveActiveTool;
    const resolvedButton = resolvePointerButton(event.nativeEvent);
    logFocusEvent('board-interaction', {
      phase,
      button: event.nativeEvent?.button,
      buttonLabel: describePointerButton(resolvedButton),
      buttons: event.nativeEvent?.buttons,
      activeButtonRef: activeButtonRef.current,
      activeButtonLabel: describePointerButton(activeButtonRef.current),
      activeTool,
      effectiveActiveTool,
      effectiveTool,
      localX,
      localY,
      h: Number(h.toFixed(2)),
      c: Number(c.toFixed(2)),
    });
    applyBoardInteractionAtLocalPoint(localX, localY, effectiveTool);
  };

  const handleLSliderInteraction = (event: any, phase: 'grant' | 'move') => {
    const locationX: number = event.nativeEvent?.locationX ?? 0;
    const pageX: number | undefined = event.nativeEvent?.pageX;

    const applyL = (l: number) => {
      setPreviewL(l);
    };

    if (phase === 'grant') {
      if (pageX != null) {
        lSliderOrigin.current = pageX - locationX;
      }
      if (lSliderWidth.current > 1) {
        applyL(clamp(locationX / lSliderWidth.current, 0, 1) * POINT_L_MAX);
      }
      logFocusEvent('l-slider-grant', {
        locationX,
        pageX,
        capturedOrigin: lSliderOrigin.current,
        sliderWidth: lSliderWidth.current,
      });
      return;
    }

    const origin = lSliderOrigin.current;
    const localX = pageX != null && origin != null ? pageX - origin : locationX;
    const ratio = clamp(localX / Math.max(1, lSliderWidth.current), 0, 1);
    logFocusEvent('l-slider-move', {
      locationX,
      pageX,
      origin,
      localX,
      ratio,
      sliderWidth: lSliderWidth.current,
      nextPreviewL: ratio * POINT_L_MAX,
    });
    applyL(ratio * POINT_L_MAX);
  };

  const imageUri = useMemo(
    () =>
      buildHclPickerImageDataUri({
        chromaMax: viewBounds.cMax,
        chromaMin: viewBounds.cMin,
        height: PREF_PICKER_RASTER_HEIGHT,
        hueMax: viewBounds.hMax,
        hueMin: viewBounds.hMin,
        lightness: rasterL,
        width: PREF_PICKER_RASTER_WIDTH,
      }),
    [rasterL, viewBounds],
  );

  const lRatio = previewL / POINT_L_MAX;
  const cRatio = (displayPoint?.c ?? 0) / POINT_C_MAX;
  const hRatio = (displayPoint?.h ?? 0) / 360;
  const handleBoardFocus = () => {
    logFocusEvent('board-focus', {});
    setIsBoardFocused(true);
  };

  const handleBoardBlur = () => {
    logFocusEvent('board-blur', {});
    setIsBoardFocused(false);
    setIsBoardHovered(false);
    setIsCtrlPressed(false);
  };

  const handleBoardKeyDown = (event: any) => {
    if (event?.nativeEvent?.key === 'Control') {
      logFocusEvent('board-keydown-control', {});
      setIsCtrlPressed(true);
    }
  };

  const handleBoardKeyUp = (event: any) => {
    if (event?.nativeEvent?.key === 'Control') {
      logFocusEvent('board-keyup-control', {});
      setIsCtrlPressed(false);
    }
  };

  const handleBoardPointerEnter = () => {
    logFocusEvent('board-hover-enter', {});
    if (typeof boardRef.current?.focus === 'function') {
      boardRef.current.focus();
      logFocusEvent('board-hover-focus-request', {});
    }
    setIsBoardHovered(true);
  };

  const handleBoardPointerLeave = () => {
    logFocusEvent('board-hover-leave', {});
    setIsBoardHovered(false);
    boardPageOriginRef.current = null;
    setHoverSampleText(null);
  };

  const handleBoardMouseDown = (event: any) => {
    const nativeEvent = event?.nativeEvent ?? {};
    const resolvedButton = resolvePointerButton(nativeEvent);
    activeButtonRef.current = resolvedButton;

    logFocusEvent('board-mouse-down', {
      button: nativeEvent?.button,
      buttonLabel: describePointerButton(resolvedButton),
      buttons: nativeEvent?.buttons,
      locationX: nativeEvent?.locationX,
      locationY: nativeEvent?.locationY,
      pageX: nativeEvent?.pageX,
      pageY: nativeEvent?.pageY,
    });

    if (typeof boardRef.current?.focus === 'function') {
      boardRef.current.focus();
    }

    if (resolvedButton === 2) {
      isRightHeldRef.current = true;
      setIsRangeHoldActive(true);
      event?.preventDefault?.();

      const localX = nativeEvent?.locationX ?? 0;
      const localY = nativeEvent?.locationY ?? 0;
      applyBoardInteractionAtLocalPoint(localX, localY, 'range');
    }
  };

  const handleBoardMouseUp = (event: any) => {
    const nativeEvent = event?.nativeEvent ?? {};
    const resolvedButton = resolvePointerButton(nativeEvent);

    logFocusEvent('board-mouse-up', {
      button: nativeEvent?.button,
      buttonLabel: describePointerButton(resolvedButton),
      buttons: nativeEvent?.buttons,
    });

    if (resolvedButton === 2 || activeButtonRef.current === 2) {
      isRightHeldRef.current = false;
      setIsRangeHoldActive(false);
      setActiveTool('select');
    }
    activeButtonRef.current = null;
  };

  const handleBoardMouseMove = (event: any) => {
    updateHoverSample(event);

    const nativeEvent = event?.nativeEvent ?? {};
    const resolvedButton = resolvePointerButton(nativeEvent);
    if (resolvedButton !== null) {
      activeButtonRef.current = resolvedButton;
    }

    const isRightHeld =
      resolvedButton === 2 ||
      activeButtonRef.current === 2 ||
      isRightHeldRef.current;
    if (!isRightHeld) {
      return;
    }

    if (!isRightHeldRef.current) {
      isRightHeldRef.current = true;
      setIsRangeHoldActive(true);
    }

    const localX = nativeEvent?.locationX;
    const localY = nativeEvent?.locationY;
    if (typeof localX === 'number' && typeof localY === 'number') {
      applyBoardInteractionAtLocalPoint(localX, localY, 'range');
    }
  };


  useEffect(() => {
    if (Platform.OS !== 'windows') {
      return;
    }

    NativeModules.PointerWheelModule?.installHook?.();

    const subscription = DeviceEventEmitter.addListener(
      'WindowsPointerWheelChanged',
      (payload: {
        ctrlKey?: boolean;
        deltaY?: number;
        isHorizontal?: boolean;
        pageX?: number;
        pageY?: number;
        shiftKey?: boolean;
      }) => {
        if (payload.isHorizontal) {
          return;
        }

        const origin = boardPageOriginRef.current;
        if (
          !origin ||
          typeof payload.pageX !== 'number' ||
          typeof payload.pageY !== 'number'
        ) {
          return;
        }

        const cx = clamp(payload.pageX - origin.x, 0, boardSizeRef.current.width);
        const cy = clamp(payload.pageY - origin.y, 0, boardSizeRef.current.height);
        const factor = (payload.deltaY ?? 0) < 0 ? 1.25 : 1 / 1.25;

        logWheelEvent('windows-pointer-wheel', {
          clientX: cx,
          clientY: cy,
          ctrlKey: payload.ctrlKey,
          currentTargetName: 'native-pointer-wheel',
          deltaY: payload.deltaY,
          focused: isBoardFocusedRef.current,
          hover: isBoardHoveredRef.current,
          insideBoard: true,
          });

        setViewBounds(prev => zoomViewBounds(
          prev,
          cx,
          cy,
          factor,
          boardSizeRef.current.width,
          boardSizeRef.current.height,
        ));
      },
    );

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    onOuterScrollLockChange?.(isBoardHovered);
    return () => {
      onOuterScrollLockChange?.(false);
    };
  }, [isBoardHovered, onOuterScrollLockChange]);

  const handleBoardWheel = (event: any) => {
    const nativeEvent = event?.nativeEvent ?? event;
    const ctrlKey = nativeEvent?.ctrlKey ?? false;
    const deltaY = nativeEvent?.deltaY ?? 0;
    const locationX = nativeEvent?.locationX;
    const locationY = nativeEvent?.locationY;

    logWheelEvent('board-prop-wheel-entry', {
      clientX: nativeEvent?.clientX,
      clientY: nativeEvent?.clientY,
      ctrlKey,
      currentTargetName: 'preference-picker-board',
      defaultPrevented: nativeEvent?.defaultPrevented ?? false,
      deltaY,
      focused: isBoardFocusedRef.current,
      hover: isBoardHoveredRef.current,
      targetName: nativeEvent?.target?.nodeName ?? typeof nativeEvent?.target,
    });

    event?.preventDefault?.();
    event?.stopPropagation?.();
    nativeEvent?.preventDefault?.();
    nativeEvent?.stopPropagation?.();
    nativeEvent?.stopImmediatePropagation?.();

    logWheelEvent('board-prop-wheel-stop', {
      ctrlKey,
      currentTargetName: 'preference-picker-board',
      defaultPrevented: nativeEvent?.defaultPrevented ?? false,
      deltaY,
      focused: isBoardFocusedRef.current,
      hover: isBoardHoveredRef.current,
    });

    const rect = {
      left: 0,
      top: 0,
      right: boardSizeRef.current.width,
      bottom: boardSizeRef.current.height,
    };
    const cx =
      typeof locationX === 'number'
        ? locationX
        : clamp(boardSizeRef.current.width / 2, 0, boardSizeRef.current.width);
    const cy =
      typeof locationY === 'number'
        ? locationY
        : clamp(boardSizeRef.current.height / 2, 0, boardSizeRef.current.height);
    const factor = deltaY < 0 ? 1.25 : 1 / 1.25;

    logWheelEvent('board-prop-wheel-zoom', {
      boardRect: rect,
      ctrlKey,
      deltaY,
      focused: isBoardFocusedRef.current,
      hover: isBoardHoveredRef.current,
      insideBoard: true,
      clientX: cx,
      clientY: cy,
    });

    setViewBounds(prev => zoomViewBounds(
      prev,
      cx,
      cy,
      factor,
      boardSizeRef.current.width,
      boardSizeRef.current.height,
    ));
  };

  const updateHoverSample = (event: any) => {
    const nativeEvent = event?.nativeEvent ?? event;
    const locationX =
      nativeEvent?.locationX ?? nativeEvent?.offsetX ?? nativeEvent?.layerX;
    const locationY =
      nativeEvent?.locationY ?? nativeEvent?.offsetY ?? nativeEvent?.layerY;
    const pageX = nativeEvent?.pageX;
    const pageY = nativeEvent?.pageY;

    if (typeof locationX !== 'number' || typeof locationY !== 'number') {
      return;
    }

    if (typeof pageX === 'number' && typeof pageY === 'number') {
      boardPageOriginRef.current = {x: pageX - locationX, y: pageY - locationY};
    }

    const {hMin, hMax, cMin, cMax} = viewBoundsRef.current;
    const width = Math.max(1, boardSizeRef.current.width);
    const height = Math.max(1, boardSizeRef.current.height);
    const h = clamp(
      hMin + (locationX / width) * (hMax - hMin),
      POINT_H_MIN,
      POINT_H_MAX,
    );
    const c = clamp(
      cMax - (locationY / height) * (cMax - cMin),
      POINT_C_MIN,
      POINT_C_MAX,
    );

    setHoverSampleText(`L ${previewL.toFixed(1)}  C ${c.toFixed(1)}  H ${h.toFixed(1)}`);
  };


  return (
    <View style={{marginTop: 12, marginBottom: 8}}>
      <View style={{flexDirection: 'row', gap: 8}}>

        {/* LEFT: tool buttons */}
        <View style={{width: 32, height: 180, gap: 4, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 2}}>
          {PICKER_TOOLS.map(tool => (
            <Pressable
              key={tool.id}
              onPress={() => setActiveTool(tool.id)}
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                borderWidth: 1,
                borderColor: effectiveActiveTool === tool.id ? palette.primary : palette.border,
                backgroundColor: effectiveActiveTool === tool.id ? palette.primary : palette.muted,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Text style={{fontSize: 14, color: effectiveActiveTool === tool.id ? palette.primaryText : palette.text}}>
                {tool.icon}
              </Text>
            </Pressable>
          ))}
          <View
            testID="preference-picker-ctrl-indicator"
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              borderWidth: 1,
              borderColor: isCtrlPressed ? '#3366ff' : '#555555',
              backgroundColor: isCtrlPressed ? '#3366ff' : '#222222',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text style={{fontSize: 11, fontWeight: '700', color: isCtrlPressed ? '#ffffff' : '#cfcfcf'}}>
              C
            </Text>
          </View>
        </View>

        {/* CENTER: picker board */}
        <View
          ref={boardRef}
          focusable={true}
          tabIndex={0}
          onLayout={e => {
            const {width, height} = e.nativeEvent.layout;
            if (width > 0 && height > 0) {
              setBoardSize({width, height});
            }
          }}
          onFocus={handleBoardFocus}
          onBlur={handleBoardBlur}
          {...({onKeyDown: handleBoardKeyDown, onKeyUp: handleBoardKeyUp} as any)}
          {...({onMouseEnter: handleBoardPointerEnter, onMouseLeave: handleBoardPointerLeave} as any)}
          {...({onMouseDown: handleBoardMouseDown, onMouseUp: handleBoardMouseUp} as any)}
          {...({onMouseMove: handleBoardMouseMove} as any)}
          {...({onPointerEnter: handleBoardPointerEnter, onPointerLeave: handleBoardPointerLeave} as any)}
          {...({onPointerDown: (e: any) => {
            console.log('[POINTER-TEST] onPointerDown fired', {
              button: e.nativeEvent?.button,
              buttons: e.nativeEvent?.buttons,
              pointerId: e.nativeEvent?.pointerId,
              pointerType: e.nativeEvent?.pointerType,
              nativeEventKeys: e.nativeEvent ? Object.keys(e.nativeEvent) : [],
            });
            handleBoardMouseDown(e);
          }, onPointerUp: handleBoardMouseUp} as any)}
          {...({onPointerMove: handleBoardMouseMove} as any)}
          {...({onWheel: handleBoardWheel} as any)}
          onResponderGrant={e => {
            console.log('[RESPONDER-TEST] grant fired — ref check', {
              hasBCR: typeof boardRef.current?.getBoundingClientRect === 'function',
              hasSPC: typeof boardRef.current?.setPointerCapture === 'function',
              hasAEL: typeof boardRef.current?.addEventListener === 'function',
              refConstructor: boardRef.current?.constructor?.name,
              refKeys: boardRef.current ? Object.keys(boardRef.current).slice(0, 15) : [],
              protoKeys: boardRef.current ? Object.getOwnPropertyNames(Object.getPrototypeOf(boardRef.current)).slice(0, 30) : [],
            });
            handleBoardInteraction(e, 'grant');
          }}
          onResponderMove={e => handleBoardInteraction(e, 'move')}
          onStartShouldSetResponder={() => {
            if (isRightHeldRef.current) {
              return false;
            }
            if (typeof boardRef.current?.focus === 'function') {
              boardRef.current.focus();
            }
            return safeSelectedIndex !== null;
          }}
          style={{
            flex: 1,
            height: 180,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: isBoardFocused ? palette.primary : palette.border,
            overflow: 'hidden',
            position: 'relative',
          }}
          testID="preference-picker-board">
          <Image
            key={`pref-picker-l-${rasterL}`}
            source={{uri: imageUri}}
            style={{width: '100%', height: '100%'}}
          />
          {hoverSampleText ? (
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 8,
                left: 8,
                paddingHorizontal: 8,
                paddingVertical: 5,
                borderRadius: 6,
                backgroundColor: 'rgba(0,0,0,0.72)',
              }}>
              <Text style={{fontSize: 11, color: '#ffffff'}}>
                {hoverSampleText}
              </Text>
            </View>
          ) : null}
          {/* Range sphere cross-sections */}
          {Object.entries(pointRanges).map(([idxStr, r]) => {
            const idx = Number(idxStr);
            const pt = points[idx];
            if (!pt || r <= 0) return null;

            const dL = Math.abs(previewL - pt.l);
            if (dL >= r) return null;

            const rSlice = Math.sqrt(r * r - dL * dL);
            const opacity = 1 - dL / r;
            const hRange = viewBounds.hMax - viewBounds.hMin;
            const cRange = viewBounds.cMax - viewBounds.cMin;
            const centerX = ((pt.h - viewBounds.hMin) / hRange) * boardSize.width;
            const centerY = ((viewBounds.cMax - pt.c) / cRange) * boardSize.height;
            const radiusH = (rSlice / hRange) * boardSize.width;
            const radiusC = (rSlice / cRange) * boardSize.height;

            return (
              <React.Fragment key={`range-${idx}`}>
                {/* black shadow ring */}
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: centerX - radiusH - 2,
                    top: centerY - radiusC - 2,
                    width: radiusH * 2 + 4,
                    height: radiusC * 2 + 4,
                    borderRadius: 9999,
                    borderWidth: 3,
                    borderColor: `rgba(0,0,0,${(opacity * 0.55).toFixed(2)})`,
                    backgroundColor: 'transparent',
                  }}
                />
                {/* white border ring */}
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: centerX - radiusH,
                    top: centerY - radiusC,
                    width: radiusH * 2,
                    height: radiusC * 2,
                    borderRadius: 9999,
                    borderWidth: 2,
                    borderColor: `rgba(255,255,255,${opacity.toFixed(2)})`,
                    backgroundColor: `rgba(255,255,255,${(opacity * 0.06).toFixed(2)})`,
                  }}
                />
              </React.Fragment>
            );
          })}

          {points.map((pt, i) => {
            const isSelected = i === safeSelectedIndex;
            const xPct = clamp(((pt.h - viewBounds.hMin) / (viewBounds.hMax - viewBounds.hMin)) * 100, -5, 105);
            const yPct = clamp(((viewBounds.cMax - pt.c) / (viewBounds.cMax - viewBounds.cMin)) * 100, -5, 105);
            const dL = Math.abs(previewL - pt.l);
            const DEFAULT_MARKER_FADE = 20;
            const r = pointRanges[i];
            const markerOpacity =
              r !== undefined
                ? (() => {
                    const cutoff = Math.min(r, DEFAULT_MARKER_FADE);
                    return dL >= cutoff ? 0 : Math.max(0, 1 - dL / cutoff);
                  })()
                : Math.max(0, 1 - dL / DEFAULT_MARKER_FADE);
            return (
              <React.Fragment key={i}>
                <View
                  style={{
                    position: 'absolute',
                    left: `${xPct}%`,
                    top: `${yPct}%`,
                    marginLeft: -7,
                    marginTop: -7,
                    width: 14,
                    height: 14,
                    borderRadius: 7,
                    borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected ? palette.primary : '#000000',
                    backgroundColor: 'transparent',
                    opacity: markerOpacity,
                  }}
                />
                <View
                  style={{
                    position: 'absolute',
                    left: `${xPct}%`,
                    top: `${yPct}%`,
                    marginLeft: -6,
                    marginTop: -6,
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    borderWidth: 2,
                    borderColor: '#ffffff',
                    backgroundColor: isSelected ? 'rgba(255,255,255,0.35)' : 'transparent',
                    opacity: markerOpacity,
                  }}
                />
              </React.Fragment>
            );
          })}

        </View>

        {/* RIGHT: points list + add button */}
        <View style={{width: 72, height: 180}}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            onScroll={event => {
              logWheelEvent('point-list-scroll', {
                currentTargetName: 'point-list-scrollview',
                deltaY: event.nativeEvent?.contentOffset?.y ?? 0,
                focused: isBoardFocusedRef.current,
                hover: isBoardHoveredRef.current,
                      });
            }}
            scrollEventThrottle={16}
            style={{flex: 1}}
            contentContainerStyle={{gap: 4, paddingBottom: 4}}>
            {points.map((pt, i) => {
              const isSelected = i === safeSelectedIndex;
              return (
                <Pressable
                  key={i}
                  onPress={() => {
                    logFocusEvent('point-item-press', {index: i});
                    setSelectedPointIndex(i);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    paddingHorizontal: 6,
                    paddingVertical: 5,
                    borderRadius: 6,
                    borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected ? palette.primary : palette.border,
                    backgroundColor: isSelected ? palette.primary : palette.muted,
                  }}>
                  <View
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 3,
                      borderWidth: 1,
                      borderColor: isSelected ? palette.primaryText : palette.border,
                      backgroundColor: hclToHexColor(pt.h, pt.c, pt.l),
                    }}
                  />
                  <Text style={{fontSize: 11, flex: 1, color: isSelected ? palette.primaryText : palette.text}}>
                    {i + 1}
                  </Text>
                  {onRemovePoint && (
                    <Pressable
                      onPress={() =>
                        Alert.alert(
                          '포인트 삭제',
                          `Point ${i + 1}을 삭제하시겠습니까?`,
                          [
                            {text: '취소', style: 'cancel'},
                            {
                              text: '삭제',
                              style: 'destructive',
                              onPress: () => onRemovePoint(i),
                            },
                          ],
                        )
                      }
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 4,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(0,0,0,0.15)',
                      }}>
                      <Text style={{fontSize: 9, color: isSelected ? palette.primaryText : palette.text, lineHeight: 16}}>
                        ✕
                      </Text>
                    </Pressable>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
          {onAddPoint && (
            <Pressable
              onPress={() => {
                logFocusEvent('add-point-press', {});
                onAddPoint!();
              }}
              style={{
                height: 30,
                borderRadius: 6,
                borderWidth: 1,
                borderColor: palette.border,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: palette.muted,
                marginTop: 4,
              }}>
              <Text style={{fontSize: 18, color: palette.text, lineHeight: 22}}>＋</Text>
            </Pressable>
          )}
        </View>

      </View>

      {/* Sliders: L (interactive), H / C (read-only) */}
      <View style={{marginTop: 10, gap: 6}}>

        {/* L slider — interactive, controls previewL for range sphere visualization */}
        <View>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3}}>
            <Text style={{fontSize: 12, fontWeight: '600', color: palette.text}}>Lightness (L)</Text>
            <Text style={{fontSize: 12, color: palette.textMuted}}>{Math.round(previewL)}</Text>
          </View>
          <View
            onLayout={e => { lSliderWidth.current = e.nativeEvent.layout.width || 1; }}
            onResponderGrant={e => handleLSliderInteraction(e, 'grant')}
            onResponderMove={e => handleLSliderInteraction(e, 'move')}
            onStartShouldSetResponder={() => true}
            style={{
              height: 14,
              borderRadius: 999,
              backgroundColor: '#e0e0e0',
              overflow: 'hidden',
            }}>
            <View
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: `${clamp(lRatio * 100, 0, 100)}%`,
                backgroundColor: '#c0c0c0',
              }}
            />
            <View
              style={{
                position: 'absolute',
                left: `${clamp(lRatio * 100, 0, 96)}%`,
                marginLeft: -7,
                width: 14,
                height: 14,
                borderRadius: 7,
                backgroundColor: '#ffffff',
                borderWidth: 1,
                borderColor: '#aaaaaa',
              }}
            />
          </View>
        </View>

        {/* H and C — read-only, visually disabled when range tool is active */}
        {([
          {label: 'Hue (H)', ratio: hRatio, value: Math.round(displayPoint?.h ?? 0)},
          {label: 'Chroma (C)', ratio: cRatio, value: Math.round(displayPoint?.c ?? 0)},
        ] as const).map(({label, ratio, value}) => {
          const disabled = effectiveActiveTool === 'range';
          return (
            <View key={label} style={{opacity: disabled ? 0.35 : 1}}>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3}}>
                <Text style={{fontSize: 12, fontWeight: '600', color: disabled ? palette.textMuted : palette.text}}>
                  {label}
                </Text>
                <Text style={{fontSize: 12, color: palette.textMuted}}>{value}</Text>
              </View>
              <View
                style={{
                  height: 14,
                  borderRadius: 999,
                  backgroundColor: '#e0e0e0',
                  overflow: 'hidden',
                }}>
                <View
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${clamp(ratio * 100, 0, 100)}%`,
                    backgroundColor: disabled ? '#d8d8d8' : '#c0c0c0',
                  }}
                />
                <View
                  style={{
                    position: 'absolute',
                    left: `${clamp(ratio * 100, 0, 96)}%`,
                    marginLeft: -7,
                    width: 14,
                    height: 14,
                    borderRadius: 7,
                    backgroundColor: disabled ? '#eeeeee' : '#ffffff',
                    borderWidth: 1,
                    borderColor: disabled ? '#cccccc' : '#aaaaaa',
                  }}
                />
              </View>
            </View>
          );
        })}
      </View>

    </View>
  );
}
