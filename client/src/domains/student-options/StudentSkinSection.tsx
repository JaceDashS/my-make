import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  Alert,
  DeviceEventEmitter,
  Image,
  type LayoutChangeEvent,
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

type SkinTexts = {
  cancel: string;
  studentOptionsSkinData: string;
  studentOptionsMySkin: string;
  studentOptionsTraits: string;
  studentOptionsPreferencePoints: string;
  studentOptionsCategory: string;
  studentOptionsActions: string;
  studentOptionsLightness: string;
  studentOptionsHue: string;
  studentOptionsChroma: string;
  studentOptionsRangeRadius: string;
  studentOptionsSave: string;
  studentOptionsReset: string;
  studentOptionsDone: string;
  studentOptionsToolSelect: string;
  studentOptionsToolRange: string;
  studentOptionsZoom: string;
  studentOptionsTraitsPlaceholder: string;
  studentOptionsNoTraits: string;
  studentOptionsNoPoints: string;
  studentOptionsPoints: string;
  studentOptionsDeleteTitle: string;
  studentOptionsDeleteMessage: string;
  studentOptionsDeleteConfirm: string;
  studentOptionsUseFullSkinRange: string;
};

type Props = {
  isSubmitting: boolean;
  onDirtyChange?: (isDirty: boolean) => void;
  onOuterScrollLockChange?: (isLocked: boolean) => void;
  palette: PaletteLike;
  profileDetails: ProfileDetail[];
  showDevPreview: boolean;
  styles: any;
  texts: SkinTexts;
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
  currentTarget?: any;
  nativeEvent?: any;
};

type SliderGestureLike = {
  moveX?: number;
  x0?: number;
};

type SliderInputPhase = 'grant' | 'move';
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
const RANGE_RADIUS_MAX = 120;
const RANGE_RADIUS_GROWTH = 3.5;
const DEFAULT_POINT_RANGE = 10;

function getSkinPlaneBounds(useFullRange: boolean) {
  if (useFullRange) {
    return {
      cMax: POINT_C_MAX,
      cMin: POINT_C_MIN,
      hMax: POINT_H_MAX,
      hMin: POINT_H_MIN,
    };
  }

  return {
    cMax: SKIN_C_MAX,
    cMin: SKIN_C_MIN,
    hMax: SKIN_H_MAX,
    hMin: SKIN_H_MIN,
  };
}

function getSkinLightnessBounds(useFullRange: boolean) {
  if (useFullRange) {
    return {
      lMax: POINT_L_MAX,
      lMin: 0,
    };
  }

  return {
    lMax: SKIN_L_MAX,
    lMin: SKIN_L_MIN,
  };
}


type ViewBounds = {hMin: number; hMax: number; cMin: number; cMax: number};
const DEFAULT_VIEW_BOUNDS: ViewBounds = {
  hMin: POINT_H_MIN,
  hMax: 360,
  cMin: POINT_C_MIN,
  cMax: POINT_C_MAX,
};
const FIXED_BOARD_ASPECT_RATIO =
  (DEFAULT_VIEW_BOUNDS.hMax - DEFAULT_VIEW_BOUNDS.hMin) /
  Math.max(1, DEFAULT_VIEW_BOUNDS.cMax - DEFAULT_VIEW_BOUNDS.cMin);

type PickerTool = 'select' | 'range';
const PICKER_TOOL_IDS: PickerTool[] = ['select', 'range'];

function PickerSidebarIcon({
  palette,
  type,
  active,
}: {
  palette: PaletteLike;
  type: PickerTool | 'grip' | 'zoom';
  active: boolean;
}) {
  const stroke = active ? palette.primaryText : palette.text;
  const softStroke = active ? palette.primaryText : palette.textMuted;

  if (type === 'select') {
    return (
      <View style={{width: 16, height: 16, alignItems: 'center', justifyContent: 'center'}}>
        <View
          style={{
            position: 'absolute',
            width: 12,
            height: 12,
            borderRadius: 999,
            borderWidth: 1.5,
            borderColor: stroke,
          }}
        />
        <View
          style={{
            position: 'absolute',
            width: 2,
            height: 12,
            backgroundColor: stroke,
          }}
        />
        <View
          style={{
            position: 'absolute',
            width: 12,
            height: 2,
            backgroundColor: stroke,
          }}
        />
        <View
          style={{
            width: 4,
            height: 4,
            borderRadius: 999,
            backgroundColor: stroke,
          }}
        />
      </View>
    );
  }

  if (type === 'range') {
    return (
      <View style={{width: 16, height: 16, alignItems: 'center', justifyContent: 'center'}}>
        <View
          style={{
            position: 'absolute',
            width: 14,
            height: 14,
            borderRadius: 999,
            borderWidth: 1.5,
            borderColor: stroke,
          }}
        />
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            borderWidth: 1.5,
            borderColor: stroke,
            backgroundColor: 'transparent',
          }}
        />
      </View>
    );
  }

  if (type === 'grip') {
    return (
      <Text
        style={{
          fontSize: 12,
          lineHeight: 14,
          fontWeight: '700',
          color: stroke,
          letterSpacing: -1,
        }}>
        |||
      </Text>
    );
  }

  return (
    <Text
      style={{
        fontSize: 14,
        lineHeight: 16,
        fontWeight: '700',
        color: stroke,
      }}>
      Q
    </Text>
  );
}

function resolvePointerButton(nativeEvent?: unknown): number | null {
  const pointerEvent = nativeEvent as
    | {button?: number; buttons?: number}
    | undefined;

  if (typeof pointerEvent?.button === 'number') {
    return pointerEvent.button;
  }
  if (typeof pointerEvent?.buttons === 'number') {
    if ((pointerEvent.buttons & 2) === 2) {
      return 2;
    }
    if ((pointerEvent.buttons & 4) === 4) {
      return 1;
    }
    if ((pointerEvent.buttons & 1) === 1) {
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
  const defaultHRange = DEFAULT_VIEW_BOUNDS.hMax - DEFAULT_VIEW_BOUNDS.hMin;
  const defaultCRange = DEFAULT_VIEW_BOUNDS.cMax - DEFAULT_VIEW_BOUNDS.cMin;
  const hRange = bounds.hMax - bounds.hMin;
  const cRange = bounds.cMax - bounds.cMin;
  const hCursor = bounds.hMin + (cursorX / Math.max(1, bWidth)) * hRange;
  const cCursor = bounds.cMax - (cursorY / Math.max(1, bHeight)) * cRange;
  const currentScale = Math.min(hRange / defaultHRange, cRange / defaultCRange);
  const minScale = Math.max(10 / defaultHRange, 5 / defaultCRange);
  const nextScale = clamp(currentScale / factor, minScale, 1);
  const newHRange = defaultHRange * nextScale;
  const newCRange = defaultCRange * nextScale;

  if (newHRange >= defaultHRange && newCRange >= defaultCRange) {
    return {...DEFAULT_VIEW_BOUNDS};
  }

  const hRatio = cursorX / Math.max(1, bWidth);
  const cRatio = cursorY / Math.max(1, bHeight);
  const rawHMin = hCursor - hRatio * newHRange;
  const rawCMax = cCursor + cRatio * newCRange;
  const hMin =
    newHRange >= defaultHRange
      ? DEFAULT_VIEW_BOUNDS.hMin
      : Math.max(POINT_H_MIN, Math.min(rawHMin, 360 - newHRange));
  const cMax =
    newCRange >= defaultCRange
      ? DEFAULT_VIEW_BOUNDS.cMax
      : Math.max(newCRange, Math.min(rawCMax, POINT_C_MAX));
  return {hMin, hMax: hMin + newHRange, cMin: cMax - newCRange, cMax};
}

function panViewBounds(
  bounds: ViewBounds,
  deltaX: number,
  deltaY: number,
  bWidth: number,
  bHeight: number,
): ViewBounds {
  const hRange = bounds.hMax - bounds.hMin;
  const cRange = bounds.cMax - bounds.cMin;
  const nextHMin = clamp(
    bounds.hMin - (deltaX / Math.max(1, bWidth)) * hRange,
    DEFAULT_VIEW_BOUNDS.hMin,
    DEFAULT_VIEW_BOUNDS.hMax - hRange,
  );
  const nextCMax = clamp(
    bounds.cMax + (deltaY / Math.max(1, bHeight)) * cRange,
    cRange,
    DEFAULT_VIEW_BOUNDS.cMax,
  );

  return {
    hMin: nextHMin,
    hMax: nextHMin + hRange,
    cMin: nextCMax - cRange,
    cMax: nextCMax,
  };
}

function rangeSliderRatioToRadius(ratio: number) {
  const safeRatio = clamp(ratio, 0, 1);
  const growthBase = Math.exp(RANGE_RADIUS_GROWTH) - 1;
  return RANGE_RADIUS_MAX * ((Math.exp(RANGE_RADIUS_GROWTH * safeRatio) - 1) / growthBase);
}

function rangeRadiusToSliderRatio(radius: number) {
  const safeRadius = clamp(radius, 0, RANGE_RADIUS_MAX);
  if (safeRadius <= 0) {
    return 0;
  }
  const growthBase = Math.exp(RANGE_RADIUS_GROWTH) - 1;
  return Math.log(1 + (safeRadius / RANGE_RADIUS_MAX) * growthBase) / RANGE_RADIUS_GROWTH;
}


const DEFAULT_SKIN_SELECTION = {
  l: 60,
  c: 20,
  h: 57,
} satisfies SkinSelection;

function isLeftPointerPressed(nativeEvent?: unknown) {
  const pointerEvent = nativeEvent as
    | {button?: number; buttons?: number}
    | undefined;

  if (
    pointerEvent &&
    typeof pointerEvent.button !== 'number' &&
    typeof pointerEvent.buttons !== 'number'
  ) {
    return true;
  }

  return (
    pointerEvent?.button === 0 ||
    pointerEvent?.buttons === 1 ||
    (typeof pointerEvent?.buttons === 'number' && (pointerEvent.buttons & 1) === 1)
  );
}

function isLeftPointerMoveActive(nativeEvent?: unknown) {
  const pointerEvent = nativeEvent as {buttons?: number} | undefined;

  if (!pointerEvent || typeof pointerEvent.buttons !== 'number') {
    return true;
  }

  return pointerEvent.buttons === 1 || (pointerEvent.buttons & 1) === 1;
}

function resolveSliderLocalX(event: SliderEventLike, width: number) {
  const nativeEvent = event.nativeEvent;
  const rect =
    event.currentTarget && typeof event.currentTarget.getBoundingClientRect === 'function'
      ? event.currentTarget.getBoundingClientRect()
      : null;
  const rawX =
    nativeEvent?.locationX ??
    nativeEvent?.offsetX ??
    (rect && typeof nativeEvent?.clientX === 'number'
      ? nativeEvent.clientX - rect.left
      : undefined);

  return typeof rawX === 'number' ? clamp(rawX, 0, Math.max(1, width)) : undefined;
}

export function StudentSkinSection({
  isSubmitting,
  onDirtyChange,
  onOuterScrollLockChange,
  onSaveProfile,
  palette,
  profileDetails,
  showDevPreview,
  styles,
  texts,
  title,
  ui: {BodyStrong, Card, FieldLabel, OptionChip},
}: Props) {
  const initialDraft = useMemo(() => buildInitialDraft(profileDetails), [profileDetails]);
  const normalizedInitialDraft = useMemo(
    () => normalizeDraftSkinValues(initialDraft, false),
    [initialDraft],
  );
  const [draft, setDraft] = useState<DraftState>(normalizedInitialDraft);
  const [isSkinTraitsEditing, setIsSkinTraitsEditing] = useState(false);
  const [selectedCategoryCode, setSelectedCategoryCode] =
    useState<PreferenceCategoryCode>('base_foundation');
  const [skinPaletteSize, setSkinPaletteSize] = useState({
    width: 320,
    height: 180,
  });
  const [pickerSelection, setPickerSelection] = useState<SkinSelection>(() => ({
    l: toNumberOrDefault(normalizedInitialDraft.skinLValue, DEFAULT_SKIN_SELECTION.l),
    c: toNumberOrDefault(normalizedInitialDraft.skinCValue, DEFAULT_SKIN_SELECTION.c),
    h: toNumberOrDefault(normalizedInitialDraft.skinHValue, DEFAULT_SKIN_SELECTION.h),
  }));
  const [sliderWidths, setSliderWidths] = useState<Record<keyof SkinSelection, number>>({
    l: 1,
    c: 1,
    h: 1,
  });
  const sliderInteractionState = useRef<
    Record<keyof SkinSelection, {originX: number | null}>
  >({
    l: {originX: null},
    c: {originX: null},
    h: {originX: null},
  });
  const skinPaletteOrigin = useRef<{x: number; y: number} | null>(null);
  const isSkinPaletteDraggingRef = useRef(false);
  const lastDirtyStateRef = useRef<boolean | null>(null);
  const [isSkinFullRange, setIsSkinFullRange] = useState(false);
  const skinPlaneBounds = useMemo(
    () => getSkinPlaneBounds(isSkinFullRange),
    [isSkinFullRange],
  );
  const skinLightnessBounds = useMemo(
    () => getSkinLightnessBounds(isSkinFullRange),
    [isSkinFullRange],
  );

  const pickerPreview = pickerSelection;
  const pickerRasterLightness = Math.round(pickerPreview.l);
  const currentSkinPoint = mapSkinLchToPalettePoint(
    pickerPreview,
    skinPaletteSize,
    skinPlaneBounds,
  );
  const pickerImageUri = useMemo(
    () =>
      buildHclPickerImageDataUri({
        chromaMax: skinPlaneBounds.cMax,
        chromaMin: skinPlaneBounds.cMin,
        height: PICKER_RASTER_HEIGHT,
        hueMax: skinPlaneBounds.hMax,
        hueMin: skinPlaneBounds.hMin,
        lightness: pickerRasterLightness,
        width: PICKER_RASTER_WIDTH,
      }),
    [pickerRasterLightness, skinPlaneBounds],
  );
  const pickerImageKey = `skin-picker-l-${pickerRasterLightness}-${skinPlaneBounds.hMin}-${skinPlaneBounds.hMax}-${skinPlaneBounds.cMin}-${skinPlaneBounds.cMax}`;

  useEffect(() => {
    const initialSkinLValue = normalizedInitialDraft.skinLValue;
    const initialSkinCValue = normalizedInitialDraft.skinCValue;
    const initialSkinHValue = normalizedInitialDraft.skinHValue;
    const currentSkinLValue = formatSkinValue(pickerSelection.l);
    const currentSkinCValue = formatSkinValue(pickerSelection.c);
    const currentSkinHValue = formatSkinValue(pickerSelection.h);
    const isDirty =
      currentSkinLValue !== initialSkinLValue ||
      currentSkinCValue !== initialSkinCValue ||
      currentSkinHValue !== initialSkinHValue ||
      draft.skinTraits !== normalizedInitialDraft.skinTraits ||
      serializePreferencePointDocument(draft.preferencePoints) !==
        serializePreferencePointDocument(normalizedInitialDraft.preferencePoints);

    if (lastDirtyStateRef.current !== isDirty) {
      lastDirtyStateRef.current = isDirty;
      onDirtyChange?.(isDirty);
    }
  }, [
    draft.preferencePoints,
    draft.skinTraits,
    normalizedInitialDraft.preferencePoints,
    normalizedInitialDraft.skinTraits,
    normalizedInitialDraft.skinCValue,
    normalizedInitialDraft.skinHValue,
    normalizedInitialDraft.skinLValue,
    onDirtyChange,
    pickerSelection.c,
    pickerSelection.h,
    pickerSelection.l,
  ]);

  const handleSkinPaletteLayout = (event: LayoutChangeEvent) => {
    const {width, height} = event.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setSkinPaletteSize(current =>
        current.width === width && current.height === height ? current : {width, height},
      );
    }
  };

  const handleSkinPaletteInteraction = (event: any, phase: 'grant' | 'move') => {
    const nativeEvent = event?.nativeEvent ?? event;
    const currentTarget = event?.currentTarget;
    const rect =
      currentTarget && typeof currentTarget.getBoundingClientRect === 'function'
        ? currentTarget.getBoundingClientRect()
        : null;
    const locationX: number =
      nativeEvent?.locationX ??
      nativeEvent?.offsetX ??
      (rect && typeof nativeEvent?.clientX === 'number' ? nativeEvent.clientX - rect.left : 0);
    const locationY: number =
      nativeEvent?.locationY ??
      nativeEvent?.offsetY ??
      (rect && typeof nativeEvent?.clientY === 'number' ? nativeEvent.clientY - rect.top : 0);
    const pageX: number | undefined = event.nativeEvent?.pageX;
    const pageY: number | undefined = event.nativeEvent?.pageY;

    const button = nativeEvent?.button;
    const buttons = nativeEvent?.buttons;

    if (phase === 'grant') {
      const isLeftButtonDown =
        button === 0 ||
        buttons === 1 ||
        (typeof buttons === 'number' && (buttons & 1) === 1);
      if (!isLeftButtonDown) {
        return;
      }
      isSkinPaletteDraggingRef.current = true;
    }

    if (phase === 'move') {
      const isLeftButtonStillDown =
        isSkinPaletteDraggingRef.current &&
        (buttons == null ||
          buttons === 1 ||
          (typeof buttons === 'number' && (buttons & 1) === 1));
      if (!isLeftButtonStillDown) {
        return;
      }
    }

    if (phase === 'grant' && pageX != null && pageY != null) {
      skinPaletteOrigin.current = {x: pageX - locationX, y: pageY - locationY};
    }

    const origin = skinPaletteOrigin.current;
    const localX = pageX != null && origin != null ? pageX - origin.x : locationX;
    const localY = pageY != null && origin != null ? pageY - origin.y : locationY;

    const h = clamp(
      skinPlaneBounds.hMin +
        (localX / Math.max(1, skinPaletteSize.width)) *
          (skinPlaneBounds.hMax - skinPlaneBounds.hMin),
      skinPlaneBounds.hMin,
      skinPlaneBounds.hMax,
    );
    const c = clamp(
      skinPlaneBounds.cMin +
        (1 - localY / Math.max(1, skinPaletteSize.height)) *
          (skinPlaneBounds.cMax - skinPlaneBounds.cMin),
      skinPlaneBounds.cMin,
      skinPlaneBounds.cMax,
    );
    setPickerSelection(current => ({
      ...current,
      h: Number(h.toFixed(4)),
      c: Number(c.toFixed(4)),
    }));
  };

  useEffect(() => {
    const win = (globalThis as any).window;
    if (!win?.addEventListener) {
      return;
    }

    const stopSkinPaletteDrag = () => {
      isSkinPaletteDraggingRef.current = false;
    };

    win.addEventListener('mouseup', stopSkinPaletteDrag);
    win.addEventListener('pointerup', stopSkinPaletteDrag);
    win.addEventListener('pointercancel', stopSkinPaletteDrag);
    win.addEventListener('blur', stopSkinPaletteDrag);

    return () => {
      win.removeEventListener('mouseup', stopSkinPaletteDrag);
      win.removeEventListener('pointerup', stopSkinPaletteDrag);
      win.removeEventListener('pointercancel', stopSkinPaletteDrag);
      win.removeEventListener('blur', stopSkinPaletteDrag);
    };
  }, []);

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
              points: [{l: Number(l.toFixed(4)), c, h, radius: DEFAULT_POINT_RANGE}],
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

  const handlePreferencePointRadiusChange = (
    code: PreferenceCategoryCode,
    radius: number,
    pointIndex: number,
  ) => {
    setDraft(current => ({
      ...current,
      preferencePoints: {
        ...current.preferencePoints,
        categories: current.preferencePoints.categories.map(cat =>
          cat.code === code
            ? {
                ...cat,
                points: cat.points.map((pt, i) =>
                  i === pointIndex ? {...pt, radius: Number(radius.toFixed(4))} : pt,
                ),
              }
            : cat,
        ),
      },
    }));
  };

  const updatePickerSlider = (key: keyof SkinSelection, ratio: number) => {
    const hBounds = {
      max: skinPlaneBounds.hMax,
      min: skinPlaneBounds.hMin,
    };
    const cBounds = {
      max: skinPlaneBounds.cMax,
      min: skinPlaneBounds.cMin,
    };
    setPickerSelection(current => ({
      ...current,
      [key]:
        key === 'l'
          ? Number(
              interpolate(
                skinLightnessBounds.lMin,
                skinLightnessBounds.lMax,
                clamp(ratio, 0, 1),
              ).toFixed(4),
            )
          : key === 'h'
          ? Number(interpolate(hBounds.min, hBounds.max, clamp(ratio, 0, 1)).toFixed(4))
          : Number(interpolate(cBounds.min, cBounds.max, clamp(ratio, 0, 1)).toFixed(4)),
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
    const locationX = resolveSliderLocalX(event, width);
    const pageX = event.nativeEvent?.pageX;
    const moveX = gestureState?.moveX;
    const originXFromEvent =
      typeof pageX === 'number' && typeof locationX === 'number'
        ? pageX - locationX
        : null;

    const nativeEvent = (event as any)?.nativeEvent;

    if (phase === 'grant' && !isLeftPointerPressed(nativeEvent)) {
      return;
    }

    if (phase === 'move' && !isLeftPointerMoveActive(nativeEvent)) {
      return;
    }

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
        onMoveShouldSetPanResponder: event => isLeftPointerPressed(event?.nativeEvent),
        onPanResponderGrant: (event, gestureState) => {
          updatePickerSliderFromEvent('l', event, 'grant', gestureState);
        },
        onPanResponderMove: (event, gestureState) => {
          updatePickerSliderFromEvent('l', event, 'move', gestureState);
        },
        onStartShouldSetPanResponder: event => isLeftPointerPressed(event?.nativeEvent),
      }),
      h: PanResponder.create({
        onMoveShouldSetPanResponder: event => isLeftPointerPressed(event?.nativeEvent),
        onPanResponderGrant: (event, gestureState) => {
          updatePickerSliderFromEvent('h', event, 'grant', gestureState);
        },
        onPanResponderMove: (event, gestureState) => {
          updatePickerSliderFromEvent('h', event, 'move', gestureState);
        },
        onStartShouldSetPanResponder: event => isLeftPointerPressed(event?.nativeEvent),
      }),
      c: PanResponder.create({
        onMoveShouldSetPanResponder: event => isLeftPointerPressed(event?.nativeEvent),
        onPanResponderGrant: (event, gestureState) => {
          updatePickerSliderFromEvent('c', event, 'grant', gestureState);
        },
        onPanResponderMove: (event, gestureState) => {
          updatePickerSliderFromEvent('c', event, 'move', gestureState);
        },
        onStartShouldSetPanResponder: event => isLeftPointerPressed(event?.nativeEvent),
      }),
    }),
    [skinPlaneBounds, sliderWidths],
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

  const setSkinFullRange = (enabled: boolean) => {
    const nextBounds = getSkinPlaneBounds(enabled);
    const nextLightnessBounds = getSkinLightnessBounds(enabled);
    const nextSelection = {
      l: clamp(pickerSelection.l, nextLightnessBounds.lMin, nextLightnessBounds.lMax),
      c: clamp(pickerSelection.c, nextBounds.cMin, nextBounds.cMax),
      h: clamp(pickerSelection.h, nextBounds.hMin, nextBounds.hMax),
    };
    const nextSkinLValue = formatSkinValue(nextSelection.l);
    const nextSkinCValue = formatSkinValue(nextSelection.c);
    const nextSkinHValue = formatSkinValue(nextSelection.h);

    setDraft(current => ({
      ...current,
      skinLValue: nextSkinLValue,
      skinCValue: nextSkinCValue,
      skinHValue: nextSkinHValue,
    }));
    setPickerSelection(current => ({
      ...current,
      l: nextSelection.l,
      c: nextSelection.c,
      h: nextSelection.h,
    }));
    setIsSkinFullRange(enabled);
  };

  const addPreferencePoint = (code: PreferenceCategoryCode) => {
    const defaultPoint: HclPoint = {
      l: Number(pickerSelection.l.toFixed(4)),
      c: Number(pickerSelection.c.toFixed(4)),
      h: Number(pickerSelection.h.toFixed(4)),
      radius: DEFAULT_POINT_RANGE,
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
    <View
      style={[
        styles.stack,
        {
          alignSelf: 'stretch',
          backgroundColor: palette.card ?? '#ffffff',
          minWidth: 0,
          width: '100%',
        },
      ]}>
      <Card palette={palette} title={title}>
        <FieldLabel palette={palette}>{texts.studentOptionsMySkin}</FieldLabel>
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
                  onStartShouldSetResponder={e => {
                    const nativeEvent = e?.nativeEvent ?? e;
                    const pointerEvent = nativeEvent as
                      | {button?: number; buttons?: number}
                      | undefined;
                    const button = pointerEvent?.button;
                    const buttons = pointerEvent?.buttons;
                    return (
                      button === 0 ||
                    buttons === 1 ||
                    (typeof buttons === 'number' && (buttons & 1) === 1)
                  );
                }}
                {...({
                  onMouseDown: (e: any) => {
                    if ((e?.nativeEvent?.button ?? e?.button ?? 0) !== 0) {
                      return;
                    }
                    handleSkinPaletteInteraction(e, 'grant');
                  },
                  onMouseMove: (e: any) => {
                    handleSkinPaletteInteraction(e, 'move');
                  },
                  onMouseUp: () => {
                    isSkinPaletteDraggingRef.current = false;
                  },
                  onPointerDown: (e: any) => {
                    if ((e?.nativeEvent?.button ?? e?.button ?? 0) !== 0) {
                      return;
                    }
                    handleSkinPaletteInteraction(e, 'grant');
                  },
                  onPointerMove: (e: any) => {
                    handleSkinPaletteInteraction(e, 'move');
                  },
                  onPointerUp: () => {
                    isSkinPaletteDraggingRef.current = false;
                  },
                  onPointerLeave: () => {
                    if (!isSkinPaletteDraggingRef.current) {
                      return;
                    }
                  },
                } as any)}
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
                    left: Math.max(0, Math.min(skinPaletteSize.width - 16, currentSkinPoint.x - 2)),
                    top: Math.max(
                      0,
                      Math.min(
                        skinPaletteSize.height - 16,
                        mapChromaToSurfaceY(
                          pickerPreview.c,
                          skinPaletteSize.height,
                          skinPlaneBounds,
                        ) - 2,
                      ),
                    ),
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: '#ffffff',
                    borderWidth: 1,
                    borderColor: '#000000',
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
                  label: texts.studentOptionsLightness,
                  rangeLabel: formatSliderRangeLabel(
                    skinLightnessBounds.lMin,
                    skinLightnessBounds.lMax,
                  ),
                  rangeTestID: 'skin-slider-l-range',
                  testID: 'skin-slider-l',
                  value: pickerPreview.l.toFixed(0),
                  ratio:
                    (pickerPreview.l - skinLightnessBounds.lMin) /
                    Math.max(1, skinLightnessBounds.lMax - skinLightnessBounds.lMin),
                },
                {
                  key: 'h' as const,
                  label: texts.studentOptionsHue,
                  rangeLabel: formatSliderRangeLabel(
                    skinPlaneBounds.hMin,
                    skinPlaneBounds.hMax,
                  ),
                  rangeTestID: 'skin-slider-h-range',
                  testID: 'skin-slider-h',
                  value: pickerPreview.h.toFixed(0),
                  ratio:
                    (pickerPreview.h - skinPlaneBounds.hMin) /
                    Math.max(1, skinPlaneBounds.hMax - skinPlaneBounds.hMin),
                },
                {
                  key: 'c' as const,
                  label: texts.studentOptionsChroma,
                  rangeLabel: formatSliderRangeLabel(
                    skinPlaneBounds.cMin,
                    skinPlaneBounds.cMax,
                  ),
                  rangeTestID: 'skin-slider-c-range',
                  testID: 'skin-slider-c',
                  value: pickerPreview.c.toFixed(0),
                  ratio:
                    (pickerPreview.c - skinPlaneBounds.cMin) /
                    Math.max(1, skinPlaneBounds.cMax - skinPlaneBounds.cMin),
                },
              ].map(control => (
                <View key={control.label} style={{marginBottom: 16}}>
                  <Text style={{fontWeight: '700', color: '#222222', marginBottom: 6}}>
                    {control.label}
                  </Text>
                  <Text
                    style={{fontSize: 12, color: '#666666', marginBottom: 6}}
                    testID={control.rangeTestID}>
                    {control.rangeLabel}
                  </Text>
                  <View
                    testID={control.testID}
                    {...sliderPanResponders[control.key].panHandlers}
                    onLayout={event => {
                      const width = event.nativeEvent.layout.width;
                      if (width > 0) {
                        logSliderEvent('layout', {key: control.key, width});
                        setSliderWidths(current =>
                          current[control.key] === width
                            ? current
                            : {...current, [control.key]: width},
                        );
                      }
                    }}
                    onResponderGrant={event =>
                      updatePickerSliderFromEvent(control.key, event, 'grant')
                    }
                    onResponderMove={event =>
                      updatePickerSliderFromEvent(control.key, event, 'move')
                    }
                    onStartShouldSetResponder={event =>
                      isLeftPointerPressed(event?.nativeEvent)
                    }
                    {...({
                      onMouseDown: (event: any) =>
                        updatePickerSliderFromEvent(control.key, event, 'grant'),
                      onMouseMove: (event: any) =>
                        updatePickerSliderFromEvent(control.key, event, 'move'),
                      onPointerDown: (event: any) =>
                        updatePickerSliderFromEvent(control.key, event, 'grant'),
                      onPointerMove: (event: any) =>
                        updatePickerSliderFromEvent(control.key, event, 'move'),
                    } as any)}
                    style={{
                      height: 18,
                      borderRadius: 999,
                      backgroundColor: '#ececec',
                      overflow: 'hidden',
                      position: 'relative',
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
              <Pressable
                onPress={() => setSkinFullRange(!isSkinFullRange)}
                style={{
                  alignItems: 'center',
                  borderTopWidth: 1,
                  borderTopColor: '#e5e5e5',
                  flexDirection: 'row',
                  gap: 8,
                  marginTop: 4,
                  paddingTop: 12,
                }}
                testID="skin-use-full-range-toggle">
                <View
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    borderWidth: 1,
                    borderColor: palette.border,
                    backgroundColor: isSkinFullRange ? palette.primary : '#ffffff',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  {isSkinFullRange ? (
                    <Text style={{color: palette.primaryText, fontSize: 12, fontWeight: '700'}}>
                      ✓
                    </Text>
                  ) : null}
                </View>
                <Text style={{color: palette.text, fontSize: 13}}>
                  {texts.studentOptionsUseFullSkinRange}
                </Text>
              </Pressable>
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
                L: {pickerPreview.l.toFixed(0)}
              </Text>
            </View>
          </View>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}>
          <FieldLabel palette={palette}>{texts.studentOptionsTraits}</FieldLabel>
          <ActionButton
            backgroundColor={palette.soft}
            isLoading={false}
            label={isSkinTraitsEditing ? texts.studentOptionsDone : '✎'}
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
                {draft.skinTraits || texts.studentOptionsNoTraits}
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
              placeholder={texts.studentOptionsTraitsPlaceholder}
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

      <Card palette={palette} title={texts.studentOptionsPreferencePoints}>
        <FieldLabel palette={palette}>{texts.studentOptionsCategory}</FieldLabel>
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
          onRadiusChange={(radius, idx) =>
            handlePreferencePointRadiusChange(selectedCategoryCode, radius, idx)
          }
          onRemovePoint={idx => removePreferencePoint(selectedCategoryCode, idx)}
          palette={palette}
          points={selectedCategoryEntry.points}
          texts={texts}
        />

      </Card>

      <Card palette={palette} title={texts.studentOptionsActions}>
        <View style={styles.optionRow}>
          <ActionButton
            backgroundColor={palette.primary}
            isLoading={isSubmitting}
            label={texts.studentOptionsSave}
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
            label={texts.studentOptionsReset}
            onPress={() => {
              setDraft(normalizedInitialDraft);
              setIsSkinFullRange(false);
              setPickerSelection({
                l: toNumberOrDefault(
                  normalizedInitialDraft.skinLValue,
                  DEFAULT_SKIN_SELECTION.l,
                ),
                c: toNumberOrDefault(
                  normalizedInitialDraft.skinCValue,
                  DEFAULT_SKIN_SELECTION.c,
                ),
                h: toNumberOrDefault(
                  normalizedInitialDraft.skinHValue,
                  DEFAULT_SKIN_SELECTION.h,
                ),
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
          <Card palette={palette} title={texts.studentOptionsSkinData}>

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
              <Text style={{fontSize: 12, color: palette.textMuted}}>{texts.studentOptionsNoPoints}</Text>
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

function normalizeSkinSelection(selection: SkinSelection, useFullRange: boolean): SkinSelection {
  const bounds = getSkinPlaneBounds(useFullRange);
  const lightnessBounds = getSkinLightnessBounds(useFullRange);
  return {
    l: clamp(selection.l, lightnessBounds.lMin, lightnessBounds.lMax),
    c: clamp(selection.c, bounds.cMin, bounds.cMax),
    h: clamp(selection.h, bounds.hMin, bounds.hMax),
  };
}

function normalizeDraftSkinValues(
  draft: DraftState,
  useFullRange: boolean,
): DraftState {
  const normalizedSelection = normalizeSkinSelection(
    {
      l: toNumberOrDefault(draft.skinLValue, DEFAULT_SKIN_SELECTION.l),
      c: toNumberOrDefault(draft.skinCValue, DEFAULT_SKIN_SELECTION.c),
      h: toNumberOrDefault(draft.skinHValue, DEFAULT_SKIN_SELECTION.h),
    },
    useFullRange,
  );

  return {
    ...draft,
    skinLValue: formatSkinValue(normalizedSelection.l),
    skinCValue: formatSkinValue(normalizedSelection.c),
    skinHValue: formatSkinValue(normalizedSelection.h),
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
  bounds: {hMin: number; hMax: number; cMin: number; cMax: number},
) {
  const xRatio = clamp((input.h - bounds.hMin) / Math.max(1, bounds.hMax - bounds.hMin), 0, 1);
  return {
    x: xRatio * size.width,
    y: mapChromaToSurfaceY(input.c, size.height, bounds),
  };
}

function mapChromaToSurfaceY(
  chroma: number,
  height: number,
  bounds: {cMin: number; cMax: number},
) {
  const ratio = clamp((chroma - bounds.cMin) / Math.max(1, bounds.cMax - bounds.cMin), 0, 1);
  return height - ratio * height;
}

function toNumberOrDefault(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatSkinValue(value: number) {
  return value.toFixed(4);
}

function formatSliderRangeLabel(min: number, max: number) {
  return `${Math.round(min)}-${Math.round(max)}`;
}

function logSliderEvent(_event: string, _payload: Record<string, unknown>) {}

function logFocusEvent(_event: string, _payload: Record<string, unknown>) {}
const middleZoomProbeThrottleState: Record<string, number> = {};
const zoomStateThrottleState: Record<string, number> = {};

function logMiddleZoomEvent(event: string, payload: Record<string, unknown>) {
  const now = Date.now();
  const last = middleZoomProbeThrottleState[event] ?? 0;
  if (now - last < 120) {
    return;
  }
  middleZoomProbeThrottleState[event] = now;
  console.log('[middle-zoom-probe]', event, payload);
}


function logWheelEvent(
  _event: string,
  _payload: {
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
) {}

function logThrottledZoomState(event: string, payload: Record<string, unknown>) {
  const now = Date.now();
  const last = zoomStateThrottleState[event] ?? 0;
  if (now - last < 200) {
    return;
  }
  zoomStateThrottleState[event] = now;
  console.log('[student-options-zoom]', event, payload);
}

function logZoomTransition(event: string, payload: Record<string, unknown>) {
  const now = Date.now();
  const last = zoomStateThrottleState[event] ?? 0;
  if (now - last < 120) {
    return;
  }
  zoomStateThrottleState[event] = now;
  console.log('[student-options-zoom-transition]', event, payload);
}

type PreferenceCategoryPickerProps = {
  palette: PaletteLike;
  points: HclPoint[];
  onAddPoint?: () => void;
  onOuterScrollLockChange?: (isLocked: boolean) => void;
  onHclChange?: (h: number, c: number, l: number, pointIndex: number) => void;
  onRadiusChange?: (radius: number, pointIndex: number) => void;
  onRemovePoint?: (pointIndex: number) => void;
  texts: SkinTexts;
};

function PreferenceCategoryPicker({
  palette,
  points,
  onAddPoint,
  onOuterScrollLockChange,
  onHclChange,
  onRadiusChange,
  onRemovePoint,
  texts,
}: PreferenceCategoryPickerProps) {
  const [isRangeHoldActive, setIsRangeHoldActive] = useState(false);
  const [isBoardFocused, setIsBoardFocused] = useState(false);
  const [isBoardHovered, setIsBoardHovered] = useState(false);
  const [isPanHoldActive, setIsPanHoldActive] = useState(false);
  const [isWheelZoomFlashActive, setIsWheelZoomFlashActive] = useState(false);
  const [isPrimaryDragActive, setIsPrimaryDragActive] = useState(false);
  const activeButtonRef = useRef<number | null>(null); // 0=left 1=middle 2=right
  const isRightHeldRef = useRef(false); // true while right button is physically held down
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(
    points.length > 0 ? 0 : null,
  );
  const [boardFrameSize, setBoardFrameSize] = useState({width: 1, height: 180});
  const [boardSize, setBoardSize] = useState({width: 1, height: 180});
  const [previewL, setPreviewL] = useState(points[0]?.l ?? 58);
  const [hoverSampleText, setHoverSampleText] = useState<string | null>(null);
  const [viewBounds, setViewBounds] = useState<ViewBounds>(DEFAULT_VIEW_BOUNDS);
  const boardRef = useRef<any>(null);
  const boardOrigin = useRef<{x: number; y: number} | null>(null);
  const boardPageOriginRef = useRef<{x: number; y: number} | null>(null);
  const boardLeftDragOriginRef = useRef<{x: number; y: number} | null>(null);
  const isBoardLeftDraggingRef = useRef(false);
  const lSliderWidth = useRef(1);
  const lSliderOrigin = useRef<number | null>(null);
  const rangeSliderWidth = useRef(1);
  const rangeSliderOrigin = useRef<number | null>(null);
  const wheelZoomFlashTimeoutRef = useRef<any>(null);
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
  const effectiveActiveTool: PickerTool = isRangeHoldActive ? 'range' : 'select';

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

  // Mouse rules:
  // left drag -> point select, right drag -> range, middle drag -> pan, wheel -> zoom.
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

    const getSelectedPointLocalCoords = (
      bounds: ViewBounds,
      width: number,
      height: number,
    ) => {
      const selectedIndex = selectedIndexRef.current;
      if (selectedIndex === null) {
        return null;
      }

      const point = pointsRef.current[selectedIndex];
      if (!point) {
        return null;
      }

      const hSpan = Math.max(1, bounds.hMax - bounds.hMin);
      const cSpan = Math.max(1, bounds.cMax - bounds.cMin);
      return {
        x: ((point.h - bounds.hMin) / hSpan) * width,
        y: ((bounds.cMax - point.c) / cSpan) * height,
      };
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
      const width = Math.max(1, rect.right - rect.left);
      const height = Math.max(1, rect.bottom - rect.top);
      triggerWheelZoomFlash();
      setViewBounds(prev => {
        const next = zoomViewBounds(prev, cx, cy, factor, width, height);
        logZoomTransition('wheel', {
          cursorX: Number(cx.toFixed(2)),
          cursorY: Number(cy.toFixed(2)),
          factor: Number(factor.toFixed(4)),
          nextRangeC: Number((next.cMax - next.cMin).toFixed(4)),
          nextRangeH: Number((next.hMax - next.hMin).toFixed(4)),
          prevRangeC: Number((prev.cMax - prev.cMin).toFixed(4)),
          prevRangeH: Number((prev.hMax - prev.hMin).toFixed(4)),
          rectHeight: Number(height.toFixed(2)),
          rectWidth: Number(width.toFixed(2)),
        });
        return next;
      });
    };

    let midDragStart:
      | {
          startClientX: number;
          startClientY: number;
          startBounds: ViewBounds;
        }
      | null = null;
    // Right-button drag: set range from selected point to cursor
    let rightDragActive = false;

    const localCoordsFromClient = (clientX: number, clientY: number, rect: {left: number; top: number; right: number; bottom: number}) => {
      const {hMin, hMax, cMin, cMax} = viewBoundsRef.current;
      const width = Math.max(1, rect.right - rect.left);
      const height = Math.max(1, rect.bottom - rect.top);
      const localX = clamp(clientX - rect.left, 0, Math.max(1, width));
      const localY = clamp(clientY - rect.top, 0, Math.max(1, height));
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
        const width = Math.max(1, rect.right - rect.left);
        const height = Math.max(1, rect.bottom - rect.top);
        midDragStart = {
          startClientX: e.clientX,
          startClientY: e.clientY,
          startBounds: viewBoundsRef.current,
        };
        logMiddleZoomEvent('start', {
          mode: 'pan',
          startClientX: Number(e.clientX.toFixed(2)),
          startClientY: Number(e.clientY.toFixed(2)),
          boardWidth: width,
          boardHeight: height,
        });
        setIsPanHoldActive(true);
      } else if (e.button === 2) {
        e.preventDefault();
        logFocusEvent('picker-right-click', {x: e.clientX, y: e.clientY});
        rightDragActive = true;
        isRightHeldRef.current = true;
        setIsRangeHoldActive(true);
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
              onRadiusChange?.(radius, ptIdx);
            }
          }
        }
      }
    };
    // pointermove/up stay on document so dragging outside the board still works
    const onPointerMove = (e: any) => {
      if (midDragStart) {
        const dragStart = midDragStart;
        const rect = getBoardDomRect();
        if (!rect) return;
        const deltaX = e.clientX - dragStart.startClientX;
        const deltaY = e.clientY - dragStart.startClientY;
        logMiddleZoomEvent('move', {
          mode: 'pan',
          deltaX: Number(deltaX.toFixed(2)),
          deltaY: Number(deltaY.toFixed(2)),
        });
        if (Math.abs(deltaX) < 0.001 && Math.abs(deltaY) < 0.001) {
          return;
        }
        logMiddleZoomEvent('pan', {
          deltaX: Number(deltaX.toFixed(2)),
          deltaY: Number(deltaY.toFixed(2)),
        });
        const width = Math.max(1, rect.right - rect.left);
        const height = Math.max(1, rect.bottom - rect.top);
        setViewBounds(
          prev => {
            const next = panViewBounds(
              dragStart.startBounds,
              deltaX,
              deltaY,
              width,
              height,
            );
            logZoomTransition('middle-drag-pan', {
              deltaX: Number(deltaX.toFixed(2)),
              deltaY: Number(deltaY.toFixed(2)),
              nextRangeC: Number((next.cMax - next.cMin).toFixed(4)),
              nextRangeH: Number((next.hMax - next.hMin).toFixed(4)),
              prevRangeC: Number((dragStart.startBounds.cMax - dragStart.startBounds.cMin).toFixed(4)),
              prevRangeH: Number((dragStart.startBounds.hMax - dragStart.startBounds.hMin).toFixed(4)),
              rectHeight: Number(height.toFixed(2)),
              rectWidth: Number(width.toFixed(2)),
              nextBounds: next,
            });
            return prev.hMin === next.hMin &&
              prev.hMax === next.hMax &&
              prev.cMin === next.cMin &&
              prev.cMax === next.cMax
              ? prev
              : next;
          },
        );
      } else if (rightDragActive) {
        const rect = getBoardDomRect();
        if (!rect) return;
        const idx = selectedIndexRef.current;
        if (idx === null) return;
        const {h, c} = localCoordsFromClient(e.clientX, e.clientY, rect);
        const ptIdx = selectedIndexRef.current;
        if (ptIdx === null) return;
        const pt = pointsRef.current[ptIdx];
        if (!pt) return;
        const dH = h - pt.h;
        const dC = c - pt.c;
        const dL = previewLRef.current - pt.l;
        const radius = Math.sqrt(dH * dH + dC * dC + dL * dL);
        if (radius <= 0) return;
        onRadiusChange?.(radius, ptIdx);
      }
    };
    const onPointerUp = (e: any) => {
      if (e.button === activeButtonRef.current) activeButtonRef.current = null;
      if (e.button === 1) {
        midDragStart = null;
        setIsPanHoldActive(false);
      }
      if (e.button === 2) {
        rightDragActive = false;
        isRightHeldRef.current = false;
        setIsRangeHoldActive(false);
      }
    };
    const onBoardContextMenu = (e: any) => {
      e.preventDefault();
    };
    const onBoardDragStart = (e: any) => {
      e.preventDefault();
    };
    const onBoardSelectStart = (e: any) => {
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
      if (!el?.addEventListener) {
        retryTimer = setTimeout(attachBoardListeners, 100);
        return;
      }
      registeredBoardEl = el;
      el.addEventListener('wheel', boardWheelCaptureLogger, {capture: true, passive: true});
      el.addEventListener('wheel', boardWheelBubbleLogger, {passive: true});
      el.addEventListener('pointerdown', onBoardPointerDown);
      el.addEventListener('contextmenu', onBoardContextMenu);
      el.addEventListener('dragstart', onBoardDragStart);
      el.addEventListener('selectstart', onBoardSelectStart);
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
        registeredBoardEl.removeEventListener('dragstart', onBoardDragStart);
        registeredBoardEl.removeEventListener('selectstart', onBoardSelectStart);
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

  const getBoardMetrics = () => {
    const rect =
      boardRef.current && typeof boardRef.current.getBoundingClientRect === 'function'
        ? boardRef.current.getBoundingClientRect()
        : null;
    const width =
      rect && typeof rect.width === 'number' && rect.width > 1
        ? rect.width
        : boardSizeRef.current.width;
    const height =
      rect && typeof rect.height === 'number' && rect.height > 1
        ? rect.height
        : boardSizeRef.current.height;

    return {
      rect,
      width: Math.max(1, width),
      height: Math.max(1, height),
    };
  };

  const triggerWheelZoomFlash = () => {
    setIsWheelZoomFlashActive(true);
    if (wheelZoomFlashTimeoutRef.current) {
      clearTimeout(wheelZoomFlashTimeoutRef.current);
    }
    wheelZoomFlashTimeoutRef.current = setTimeout(() => {
      setIsWheelZoomFlashActive(false);
      wheelZoomFlashTimeoutRef.current = null;
    }, 180);
  };

  const resolveBoardLocalPoint = (event: any) => {
    const nativeEvent = event?.nativeEvent ?? event ?? {};
    const metrics = getBoardMetrics();
    const rect =
      metrics.rect ??
      (event?.currentTarget &&
      typeof event.currentTarget.getBoundingClientRect === 'function'
        ? event.currentTarget.getBoundingClientRect()
        : null);

    const clientX =
      nativeEvent?.clientX ??
      event?.clientX ??
      (typeof nativeEvent?.pageX === 'number' && rect ? nativeEvent.pageX - rect.left : undefined);
    const clientY =
      nativeEvent?.clientY ??
      event?.clientY ??
      (typeof nativeEvent?.pageY === 'number' && rect ? nativeEvent.pageY - rect.top : undefined);

    const locationX =
      (rect && typeof clientX === 'number'
        ? clientX - rect.left
        : undefined) ??
      nativeEvent?.locationX ??
      nativeEvent?.offsetX ??
      (rect && typeof nativeEvent?.clientX === 'number'
        ? nativeEvent.clientX - rect.left
        : undefined);
    const locationY =
      (rect && typeof clientY === 'number'
        ? clientY - rect.top
        : undefined) ??
      nativeEvent?.locationY ??
      nativeEvent?.offsetY ??
      (rect && typeof nativeEvent?.clientY === 'number'
        ? nativeEvent.clientY - rect.top
        : undefined);
    const point = {
      x:
        typeof locationX === 'number'
          ? clamp(locationX, 0, metrics.width)
          : 0,
      y:
        typeof locationY === 'number'
          ? clamp(locationY, 0, metrics.height)
          : 0,
    };

    return point;
  };

  const applyBoardInteractionAtLocalPoint = (
    localX: number,
    localY: number,
    toolOverride?: PickerTool,
    source?: string,
  ) => {
    if (safeSelectedIndex === null) {
      return;
    }

    const metrics = getBoardMetrics();
    const {hMin, hMax, cMin, cMax} = viewBoundsRef.current;
    const h = clamp(
      hMin + (localX / metrics.width) * (hMax - hMin),
      POINT_H_MIN,
      POINT_H_MAX,
    );
    const c = clamp(
      cMax - (localY / metrics.height) * (cMax - cMin),
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
      onRadiusChange?.(radius, safeSelectedIndex);
    }
  };

  const handleBoardInteraction = (event: any, phase: 'grant' | 'move') => {
    if (safeSelectedIndex === null) {
      return;
    }
    const resolvedPoint = resolveBoardLocalPoint(event);
    const locationX = resolvedPoint.x;
    const locationY = resolvedPoint.y;
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
    if (phase === 'grant' && activeButtonRef.current === 0) {
      isBoardLeftDraggingRef.current = true;
    }

    if (phase === 'move' && activeButtonRef.current === 0 && !isBoardLeftDraggingRef.current) {
      return;
    }

    if (activeButtonRef.current !== 0 && activeButtonRef.current !== 2) {
      return;
    }

    const effectiveTool = activeButtonRef.current === 2 ? 'range' : 'select';
    const resolvedButton = resolvePointerButton(event.nativeEvent);
    logFocusEvent('board-interaction', {
      phase,
      button: event.nativeEvent?.button,
      buttonLabel: describePointerButton(resolvedButton),
      buttons: event.nativeEvent?.buttons,
      activeButtonRef: activeButtonRef.current,
      activeButtonLabel: describePointerButton(activeButtonRef.current),
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
    const locationX = resolveSliderLocalX(event, lSliderWidth.current) ?? 0;
    const pageX: number | undefined = event.nativeEvent?.pageX;

    if (phase === 'grant' && !isLeftPointerPressed(event?.nativeEvent)) {
      return;
    }

    if (phase === 'move' && !isLeftPointerMoveActive(event?.nativeEvent)) {
      return;
    }

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

  const handleRangeSliderInteraction = (event: any, phase: 'grant' | 'move') => {
    if (safeSelectedIndex === null) {
      return;
    }

    const locationX = resolveSliderLocalX(event, rangeSliderWidth.current) ?? 0;
    const pageX: number | undefined = event.nativeEvent?.pageX;

    if (phase === 'grant' && !isLeftPointerPressed(event?.nativeEvent)) {
      return;
    }

    if (phase === 'move' && !isLeftPointerMoveActive(event?.nativeEvent)) {
      return;
    }

    const applyRange = (radius: number) => {
      const nextRadius = clamp(radius, 0, RANGE_RADIUS_MAX);
      onRadiusChange?.(nextRadius, safeSelectedIndex);
    };

    if (phase === 'grant') {
      if (pageX != null) {
        rangeSliderOrigin.current = pageX - locationX;
      }
      if (rangeSliderWidth.current > 1) {
        applyRange(
          rangeSliderRatioToRadius(
            clamp(locationX / rangeSliderWidth.current, 0, 1),
          ),
        );
      }
      return;
    }

    const origin = rangeSliderOrigin.current;
    const localX = pageX != null && origin != null ? pageX - origin : locationX;
    const ratio = clamp(localX / Math.max(1, rangeSliderWidth.current), 0, 1);
    applyRange(rangeSliderRatioToRadius(ratio));
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
        width: Math.max(
          PREF_PICKER_RASTER_WIDTH,
          Math.round(
            PREF_PICKER_RASTER_HEIGHT *
              ((viewBounds.hMax - viewBounds.hMin) /
                Math.max(1, viewBounds.cMax - viewBounds.cMin)),
          ),
        ),
      }),
    [rasterL, viewBounds],
  );

  const lRatio = previewL / POINT_L_MAX;
  const cRatio = (displayPoint?.c ?? 0) / POINT_C_MAX;
  const hRatio = (displayPoint?.h ?? 0) / 360;
  const selectedPointRange =
    safeSelectedIndex !== null
      ? clamp(displayPoint?.radius ?? DEFAULT_POINT_RANGE, 0, RANGE_RADIUS_MAX)
      : 0;
  const rangeRatio = rangeRadiusToSliderRatio(selectedPointRange);
  const boardRenderMetrics = getBoardMetrics();
  const boardPlaneAspectRatio = FIXED_BOARD_ASPECT_RATIO;
  const boardDisplayWidth = Math.max(
    1,
    Math.min(boardFrameSize.width, boardFrameSize.height * boardPlaneAspectRatio),
  );
  const boardDisplayHeight = Math.max(
    1,
    Math.min(boardFrameSize.height, boardDisplayWidth / Math.max(1, boardPlaneAspectRatio)),
  );
  const isGripIndicatorActive = isPanHoldActive || activeButtonRef.current === 1;
  const isZoomIndicatorActive = isWheelZoomFlashActive;
  const boardCursor =
    isGripIndicatorActive
      ? 'grabbing'
      : isZoomIndicatorActive
      ? 'zoom-in'
      : isRangeHoldActive || isRightHeldRef.current || activeButtonRef.current === 2
      ? 'move'
      : isBoardLeftDraggingRef.current || activeButtonRef.current === 0
      ? 'pointer'
      : 'grab';

  useEffect(() => {
    logThrottledZoomState('layout-snapshot', {
      boardDisplayHeight: Number(boardDisplayHeight.toFixed(2)),
      boardDisplayWidth: Number(boardDisplayWidth.toFixed(2)),
      boardFrameHeight: Number(boardFrameSize.height.toFixed(2)),
      boardFrameWidth: Number(boardFrameSize.width.toFixed(2)),
      boardHeight: Number(boardSize.height.toFixed(2)),
      boardPlaneAspectRatio: Number(boardPlaneAspectRatio.toFixed(4)),
      boardWidth: Number(boardSize.width.toFixed(2)),
      pointsCount: points.length,
      selectedPointIndex: safeSelectedIndex,
      selectedPointRadius:
        safeSelectedIndex !== null
          ? Number(selectedPointRange.toFixed(2))
          : null,
      boardCursor,
      viewBounds: {
        cMax: Number(viewBounds.cMax.toFixed(4)),
        cMin: Number(viewBounds.cMin.toFixed(4)),
        hMax: Number(viewBounds.hMax.toFixed(4)),
        hMin: Number(viewBounds.hMin.toFixed(4)),
      },
      viewRange: {
        c: Number((viewBounds.cMax - viewBounds.cMin).toFixed(4)),
        h: Number((viewBounds.hMax - viewBounds.hMin).toFixed(4)),
      },
      widthCompressionRatio:
        boardFrameSize.width > 0
          ? Number((boardDisplayWidth / boardFrameSize.width).toFixed(4))
          : null,
      heightCompressionRatio:
        boardFrameSize.height > 0
          ? Number((boardDisplayHeight / boardFrameSize.height).toFixed(4))
          : null,
      zoomActive: isZoomIndicatorActive,
    });
  }, [
    boardDisplayHeight,
    boardDisplayWidth,
    boardCursor,
    boardFrameSize.height,
    boardFrameSize.width,
    boardPlaneAspectRatio,
    boardSize.height,
    boardSize.width,
    isZoomIndicatorActive,
    points.length,
    safeSelectedIndex,
    selectedPointRange,
    viewBounds.cMax,
    viewBounds.cMin,
    viewBounds.hMax,
    viewBounds.hMin,
  ]);

  useEffect(() => {
    if (
      boardFrameSize.width > 1 &&
      boardFrameSize.height > 1 &&
      (boardDisplayWidth < boardFrameSize.width || boardDisplayHeight < boardFrameSize.height)
    ) {
      logThrottledZoomState('display-compression-detected', {
        boardDisplayHeight: Number(boardDisplayHeight.toFixed(2)),
        boardDisplayWidth: Number(boardDisplayWidth.toFixed(2)),
        boardFrameHeight: Number(boardFrameSize.height.toFixed(2)),
        boardFrameWidth: Number(boardFrameSize.width.toFixed(2)),
        boardPlaneAspectRatio: Number(boardPlaneAspectRatio.toFixed(4)),
      });
    }
  }, [
    boardDisplayHeight,
    boardDisplayWidth,
    boardFrameSize.height,
    boardFrameSize.width,
    boardPlaneAspectRatio,
  ]);
  const handleBoardFocus = () => {
    logFocusEvent('board-focus', {});
    setIsBoardFocused(true);
  };

  const handleBoardBlur = () => {
    logFocusEvent('board-blur', {});
    setIsBoardFocused(false);
    setIsBoardHovered(false);
    setIsPanHoldActive(false);
    setIsPrimaryDragActive(false);
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

    if (resolvedButton === 0) {
      const point = resolveBoardLocalPoint(event);
      const pageX: number | undefined = nativeEvent?.pageX ?? nativeEvent?.clientX ?? event?.pageX ?? event?.clientX;
      const pageY: number | undefined = nativeEvent?.pageY ?? nativeEvent?.clientY ?? event?.pageY ?? event?.clientY;
      isBoardLeftDraggingRef.current = true;
      setIsPrimaryDragActive(true);
      if (typeof pageX === 'number' && typeof pageY === 'number') {
        boardLeftDragOriginRef.current = {x: pageX - point.x, y: pageY - point.y};
      }
      applyBoardInteractionAtLocalPoint(point.x, point.y, 'select', 'left-down');
      return;
    }

    if (resolvedButton === 2) {
      isRightHeldRef.current = true;
      setIsRangeHoldActive(true);
      event?.preventDefault?.();

      const point = resolveBoardLocalPoint(event);
      applyBoardInteractionAtLocalPoint(point.x, point.y, 'range', 'right-down');
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
    }
    if (resolvedButton === 1 || activeButtonRef.current === 1) {
      setIsPanHoldActive(false);
    }
    if (resolvedButton === 0 || activeButtonRef.current === 0) {
      isBoardLeftDraggingRef.current = false;
      boardLeftDragOriginRef.current = null;
      setIsPrimaryDragActive(false);
    }
    activeButtonRef.current = null;
  };

  const handleBoardMouseMove = (event: any) => {
    updateHoverSample(event);

    const nativeEvent = event?.nativeEvent ?? {};
    const resolvedButton = resolvePointerButton(nativeEvent);
    logFocusEvent('board-mouse-move', {
      button: nativeEvent?.button,
      buttons: nativeEvent?.buttons,
      targetName: nativeEvent?.target?.nodeName ?? typeof nativeEvent?.target,
      activeButton: activeButtonRef.current,
      leftDragging: isBoardLeftDraggingRef.current,
      rightDragging: isRightHeldRef.current,
    });
    if (resolvedButton !== null) {
      activeButtonRef.current = resolvedButton;
    }

    const isRightHeld =
      resolvedButton === 2 ||
      activeButtonRef.current === 2 ||
      isRightHeldRef.current;
    if (
      (resolvedButton === 0 || activeButtonRef.current === 0) &&
      isBoardLeftDraggingRef.current
    ) {
      const metrics = getBoardMetrics();
      const nativePageX: number | undefined = nativeEvent?.pageX;
      const nativePageY: number | undefined = nativeEvent?.pageY;
      const origin = boardLeftDragOriginRef.current;
      const fallbackPoint = resolveBoardLocalPoint(event);
      const point =
        typeof nativePageX === 'number' &&
        typeof nativePageY === 'number' &&
        origin !== null
          ? {
              x: clamp(nativePageX - origin.x, 0, metrics.width),
              y: clamp(nativePageY - origin.y, 0, metrics.height),
            }
          : fallbackPoint;
      applyBoardInteractionAtLocalPoint(point.x, point.y, 'select', 'left-drag');
      return;
    }

    if (!isRightHeld) {
      return;
    }

    if (!isRightHeldRef.current) {
      isRightHeldRef.current = true;
      setIsRangeHoldActive(true);
    }

    const point = resolveBoardLocalPoint(event);
    applyBoardInteractionAtLocalPoint(point.x, point.y, 'range', 'right-drag');
  };

  useEffect(() => {
    const win = (globalThis as any).window;
    if (!win?.addEventListener) {
      return;
    }

    const stopBoardPrimaryDrag = () => {
      isBoardLeftDraggingRef.current = false;
      boardLeftDragOriginRef.current = null;
      setIsPrimaryDragActive(false);
    };

    win.addEventListener('mouseup', stopBoardPrimaryDrag);
    win.addEventListener('pointerup', stopBoardPrimaryDrag);
    win.addEventListener('pointercancel', stopBoardPrimaryDrag);
    win.addEventListener('blur', stopBoardPrimaryDrag);

    return () => {
      win.removeEventListener('mouseup', stopBoardPrimaryDrag);
      win.removeEventListener('pointerup', stopBoardPrimaryDrag);
      win.removeEventListener('pointercancel', stopBoardPrimaryDrag);
      win.removeEventListener('blur', stopBoardPrimaryDrag);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (wheelZoomFlashTimeoutRef.current) {
        clearTimeout(wheelZoomFlashTimeoutRef.current);
        wheelZoomFlashTimeoutRef.current = null;
      }
    };
  }, []);


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
        triggerWheelZoomFlash();

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

        setViewBounds(prev => {
          const next = zoomViewBounds(
            prev,
            cx,
            cy,
            factor,
            boardSizeRef.current.width,
            boardSizeRef.current.height,
          );
          logZoomTransition('windows-wheel', {
            cursorX: Number(cx.toFixed(2)),
            cursorY: Number(cy.toFixed(2)),
            factor: Number(factor.toFixed(4)),
            nextRangeC: Number((next.cMax - next.cMin).toFixed(4)),
            nextRangeH: Number((next.hMax - next.hMin).toFixed(4)),
            prevRangeC: Number((prev.cMax - prev.cMin).toFixed(4)),
            prevRangeH: Number((prev.hMax - prev.hMin).toFixed(4)),
            rectHeight: Number(boardSizeRef.current.height.toFixed(2)),
            rectWidth: Number(boardSizeRef.current.width.toFixed(2)),
          });
          return next;
        });
      },
    );

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    const isInteractionLockActive =
      isPrimaryDragActive ||
      isRangeHoldActive ||
      isPanHoldActive;
    onOuterScrollLockChange?.(isInteractionLockActive);
    return () => {
      onOuterScrollLockChange?.(false);
    };
  }, [isPrimaryDragActive, isRangeHoldActive, isPanHoldActive, onOuterScrollLockChange]);

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
      <View
        style={{
          flexDirection: 'row',
          gap: 12,
          alignItems: 'flex-start',
          alignSelf: 'stretch',
          width: '100%',
          minWidth: 0,
        }}>
        <View
          onLayout={e => {
            const {width, height} = e.nativeEvent.layout;
            if (width > 0 && height > 0) {
              setBoardFrameSize(current =>
                current.width === width && current.height === height
                  ? current
                  : {width, height},
              );
            }
          }}
          style={{
            flex: 1,
            minWidth: 320,
            height: 180,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          <View
            ref={boardRef}
            focusable={true}
            tabIndex={0}
            onLayout={e => {
              const {width, height} = e.nativeEvent.layout;
              if (width > 0 && height > 0) {
                setBoardSize(current =>
                  current.width === width && current.height === height
                    ? current
                    : {width, height},
                );
              }
            }}
            onFocus={handleBoardFocus}
            onBlur={handleBoardBlur}
            {...({onMouseEnter: handleBoardPointerEnter, onMouseLeave: handleBoardPointerLeave} as any)}
            {...({onMouseDown: handleBoardMouseDown, onMouseUp: handleBoardMouseUp} as any)}
            {...({onMouseMove: handleBoardMouseMove} as any)}
            {...({onPointerEnter: handleBoardPointerEnter, onPointerLeave: handleBoardPointerLeave} as any)}
            {...({onPointerDown: handleBoardMouseDown, onPointerUp: handleBoardMouseUp} as any)}
            {...({onPointerMove: handleBoardMouseMove} as any)}
            style={{
              width: boardDisplayWidth,
              height: boardDisplayHeight,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: isBoardFocused ? palette.primary : palette.border,
              overflow: 'hidden',
              position: 'relative',
              cursor: boardCursor,
              userSelect: 'none',
              WebkitUserSelect: 'none',
            }}
            testID="preference-picker-board">
          <Image
            key={`pref-picker-l-${rasterL}`}
            source={{uri: imageUri}}
            {...({
              draggable: false,
              onDragStart: (event: any) => event?.preventDefault?.(),
            } as any)}
            style={{
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              userSelect: 'none',
              WebkitUserDrag: 'none',
              WebkitUserSelect: 'none',
            }}
          />
          {/* Range sphere cross-sections */}
          {points.map((pt, idx) => {
            const r = clamp(pt.radius ?? DEFAULT_POINT_RANGE, 0, RANGE_RADIUS_MAX);
            if (!pt || r <= 0) return null;

            const dL = Math.abs(previewL - pt.l);
            if (dL >= r) return null;

            const rSlice = Math.sqrt(r * r - dL * dL);
            const opacity = 1 - dL / r;
            const hRange = viewBounds.hMax - viewBounds.hMin;
            const cRange = viewBounds.cMax - viewBounds.cMin;
            const radiusH = (rSlice / hRange) * boardRenderMetrics.width;
            const radiusC = (rSlice / cRange) * boardRenderMetrics.height;
            const xPct = ((pt.h - viewBounds.hMin) / hRange) * 100;
            const yPct = ((viewBounds.cMax - pt.c) / cRange) * 100;

            return (
              <React.Fragment key={`range-${idx}`}>
                {/* black shadow ring */}
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: `${xPct}%`,
                    top: `${yPct}%`,
                    marginLeft: -(radiusH + 2),
                    marginTop: -(radiusC + 2),
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
                    left: `${xPct}%`,
                    top: `${yPct}%`,
                    marginLeft: -radiusH,
                    marginTop: -radiusC,
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
            const xPct =
              ((pt.h - viewBounds.hMin) / Math.max(1, viewBounds.hMax - viewBounds.hMin)) * 100;
            const yPct =
              ((viewBounds.cMax - pt.c) / Math.max(1, viewBounds.cMax - viewBounds.cMin)) * 100;
            const dL = Math.abs(previewL - pt.l);
            const DEFAULT_MARKER_FADE = 20;
            const r = pt.radius;
            const markerOpacity =
              r !== undefined
                ? (() => {
                    const cutoff = Math.min(r, DEFAULT_MARKER_FADE);
                    return dL >= cutoff ? 0 : Math.max(0, 1 - dL / cutoff);
                  })()
                : Math.max(0, 1 - dL / DEFAULT_MARKER_FADE);
            return (
              <View
                key={i}
                style={{
                  position: 'absolute',
                  left: `${xPct}%`,
                  top: `${yPct}%`,
                  marginLeft: -3,
                  marginTop: -3,
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: isSelected ? palette.primary : '#000000',
                  opacity: markerOpacity,
                }}
              />
            );
          })}
          </View>
        </View>
        <View style={{width: 220, gap: 10, flexShrink: 0}}>
          <View style={{flexDirection: 'row', gap: 6, justifyContent: 'flex-end'}}>
            {PICKER_TOOL_IDS.map(toolId => (
              <View
                key={toolId}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: effectiveActiveTool === toolId ? palette.primary : palette.border,
                  backgroundColor: effectiveActiveTool === toolId ? palette.primary : palette.muted,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <PickerSidebarIcon
                  active={effectiveActiveTool === toolId}
                  palette={palette}
                  type={toolId}
                />
              </View>
            ))}
            <View
              testID="preference-picker-grip-indicator"
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                borderWidth: 1,
                borderColor: isGripIndicatorActive ? palette.primary : palette.border,
                backgroundColor: isGripIndicatorActive ? palette.primary : palette.muted,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <PickerSidebarIcon
                active={isGripIndicatorActive}
                palette={palette}
                type="grip"
              />
            </View>
            <View
              testID="preference-picker-ctrl-indicator"
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                borderWidth: 1,
                borderColor: isZoomIndicatorActive ? palette.primary : palette.border,
                backgroundColor: isZoomIndicatorActive ? palette.primary : palette.muted,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <PickerSidebarIcon
                active={isZoomIndicatorActive}
                palette={palette}
                type="zoom"
              />
            </View>
          </View>

          <View style={{gap: 6}}>
            {/* Sliders: L (interactive), H / C (read-only) */}
            <View>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3}}>
                <Text style={{fontSize: 12, fontWeight: '600', color: palette.text}}>{texts.studentOptionsLightness}</Text>
                <Text style={{fontSize: 12, color: palette.textMuted}}>{Math.round(previewL)}</Text>
              </View>
              <View
                onLayout={e => { lSliderWidth.current = e.nativeEvent.layout.width || 1; }}
                onResponderGrant={e => handleLSliderInteraction(e, 'grant')}
                onResponderMove={e => handleLSliderInteraction(e, 'move')}
                onStartShouldSetResponder={e => isLeftPointerPressed(e?.nativeEvent)}
                {...({
                  onMouseDown: (e: any) => handleLSliderInteraction(e, 'grant'),
                  onMouseMove: (e: any) => handleLSliderInteraction(e, 'move'),
                  onPointerDown: (e: any) => handleLSliderInteraction(e, 'grant'),
                  onPointerMove: (e: any) => handleLSliderInteraction(e, 'move'),
                } as any)}
                style={{
                  height: 14,
                  borderRadius: 999,
                  position: 'relative',
                }}>
                <View
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    right: 0,
                    bottom: 0,
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
                </View>
                <View style={{position: 'absolute', left: 0, top: 0, width: '100%', height: 14}} />
                <View
                  style={{
                    position: 'absolute',
                    left: `${clamp(lRatio * 100, 0, 100)}%`,
                    width: 14,
                    height: 14,
                    borderRadius: 7,
                    backgroundColor: '#ffffff',
                    borderWidth: 1,
                    borderColor: '#aaaaaa',
                    transform: [{translateX: -7}],
                  }}
                />
              </View>
            </View>

            <View>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3}}>
                <Text style={{fontSize: 12, fontWeight: '600', color: palette.text}}>{texts.studentOptionsRangeRadius}</Text>
                <Text style={{fontSize: 12, color: palette.textMuted}}>
                  {selectedPointRange.toFixed(1)}
                </Text>
              </View>
              <View
                onLayout={e => {
                  rangeSliderWidth.current = e.nativeEvent.layout.width || 1;
                }}
                onResponderGrant={e => handleRangeSliderInteraction(e, 'grant')}
                onResponderMove={e => handleRangeSliderInteraction(e, 'move')}
                onStartShouldSetResponder={e => isLeftPointerPressed(e?.nativeEvent)}
                {...({
                  onMouseDown: (e: any) => handleRangeSliderInteraction(e, 'grant'),
                  onMouseMove: (e: any) => handleRangeSliderInteraction(e, 'move'),
                  onPointerDown: (e: any) => handleRangeSliderInteraction(e, 'grant'),
                  onPointerMove: (e: any) => handleRangeSliderInteraction(e, 'move'),
                } as any)}
                style={{
                  height: 14,
                  borderRadius: 999,
                  position: 'relative',
                }}>
                <View
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    right: 0,
                    bottom: 0,
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
                      width: `${clamp(rangeRatio * 100, 0, 100)}%`,
                      backgroundColor: '#c0c0c0',
                    }}
                  />
                </View>
                <View style={{position: 'absolute', left: 0, top: 0, width: '100%', height: 14}} />
                <View
                  style={{
                    position: 'absolute',
                    left: `${clamp(rangeRatio * 100, 0, 100)}%`,
                    width: 14,
                    height: 14,
                    borderRadius: 7,
                    backgroundColor: '#ffffff',
                    borderWidth: 1,
                    borderColor: '#aaaaaa',
                    transform: [{translateX: -7}],
                  }}
                />
              </View>
            </View>

            {([
              {label: texts.studentOptionsHue, ratio: hRatio, value: Math.round(displayPoint?.h ?? 0)},
              {label: texts.studentOptionsChroma, ratio: cRatio, value: Math.round(displayPoint?.c ?? 0)},
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
                      position: 'relative',
                    }}>
                    <View
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        right: 0,
                        bottom: 0,
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
                    </View>
                    <View style={{position: 'absolute', left: 0, top: 0, width: '100%', height: 14}} />
                    <View
                      style={{
                        position: 'absolute',
                        left: `${clamp(ratio * 100, 0, 100)}%`,
                        width: 14,
                        height: 14,
                        borderRadius: 7,
                        backgroundColor: disabled ? '#eeeeee' : '#ffffff',
                        borderWidth: 1,
                        borderColor: disabled ? '#cccccc' : '#aaaaaa',
                        transform: [{translateX: -7}],
                      }}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      <View style={{marginTop: 10, width: '100%', alignSelf: 'stretch', minWidth: 0}}>
        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6}}>
          <Text style={{fontSize: 12, fontWeight: '600', color: palette.text}}>Points</Text>
          {onAddPoint && (
            <Pressable
              onPress={() => {
                logFocusEvent('add-point-press', {});
                onAddPoint!();
              }}
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                borderWidth: 1,
                borderColor: palette.border,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: palette.muted,
              }}>
              <Text style={{fontSize: 18, color: palette.text, lineHeight: 22}}>＋</Text>
            </Pressable>
          )}
        </View>
        <ScrollView
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          onScroll={event => {
            logWheelEvent('point-list-scroll', {
              currentTargetName: 'point-list-scrollview',
              deltaY: event.nativeEvent?.contentOffset?.x ?? 0,
              focused: isBoardFocusedRef.current,
              hover: isBoardHoveredRef.current,
            });
          }}
          scrollEventThrottle={16}
          style={{width: '100%', alignSelf: 'stretch', minWidth: 0}}
          contentContainerStyle={{
            flexDirection: 'row',
            alignItems: 'stretch',
            gap: 6,
            paddingBottom: 4,
          }}>
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
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  minWidth: 68,
                  paddingVertical: 5,
                  paddingHorizontal: 8,
                  borderRadius: 999,
                  borderWidth: isSelected ? 2 : 1,
                  borderColor: isSelected ? palette.primary : palette.border,
                  backgroundColor: isSelected ? palette.primary : palette.muted,
                }}>
                <View
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 999,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isSelected ? 'rgba(255,255,255,0.22)' : '#ffffff',
                    borderWidth: 1,
                    borderColor: isSelected ? 'rgba(255,255,255,0.35)' : palette.border,
                    flexShrink: 0,
                  }}>
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: '700',
                      lineHeight: 10,
                      color: isSelected ? palette.primaryText : palette.text,
                    }}>
                    {i + 1}
                  </Text>
                </View>
                <View
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    borderWidth: 1,
                    borderColor: isSelected ? palette.primaryText : palette.border,
                    backgroundColor: hclToHexColor(pt.h, pt.c, pt.l),
                    flexShrink: 0,
                  }}
                />
                {onRemovePoint && (
                  <Pressable
                    onPress={() =>
                      Alert.alert(
                        texts.studentOptionsDeleteTitle,
                        texts.studentOptionsDeleteMessage.replace('{n}', String(i + 1)),
                        [
                          {text: texts.cancel, style: 'cancel'},
                          {
                            text: texts.studentOptionsDeleteConfirm,
                            style: 'destructive',
                            onPress: () => onRemovePoint(i),
                          },
                        ],
                      )
                    }
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 999,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: isSelected
                        ? 'rgba(255,255,255,0.35)'
                        : palette.border,
                      backgroundColor: isSelected
                        ? 'rgba(0,0,0,0.16)'
                        : '#ffffff',
                      flexShrink: 0,
                    }}>
                    <Text
                      style={{
                        fontSize: 11,
                        lineHeight: 11,
                        fontWeight: '700',
                        color: isSelected ? palette.primaryText : palette.text,
                        textAlign: 'center',
                        includeFontPadding: false as any,
                        textAlignVertical: 'center' as any,
                        marginTop: -0.5,
                      }}>
                      ×
                    </Text>
                  </Pressable>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}
