/**
 * rn-compat/index.tsx
 * Thin DOM shims for every React Native primitive used in the desktop shell.
 * Aliased as "react-native" by webpack.electron.js.
 */
import React from 'react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function convertRNStyle(s: Record<string, any>): React.CSSProperties {
  const css: Record<string, any> = {};
  for (const key of Object.keys(s)) {
    const val = s[key];
    switch (key) {
      case 'paddingHorizontal': css.paddingLeft = val; css.paddingRight = val; break;
      case 'paddingVertical':   css.paddingTop = val; css.paddingBottom = val; break;
      case 'marginHorizontal':  css.marginLeft = val; css.marginRight = val; break;
      case 'marginVertical':    css.marginTop = val; css.marginBottom = val; break;
      case 'borderWidth':
        css.borderWidth = val;
        if (!s.borderStyle) css.borderStyle = 'solid';
        break;
      case 'borderTopWidth':    css.borderTopWidth = val; if (!s.borderStyle) css.borderTopStyle = 'solid'; break;
      case 'borderBottomWidth': css.borderBottomWidth = val; if (!s.borderStyle) css.borderBottomStyle = 'solid'; break;
      case 'borderLeftWidth':   css.borderLeftWidth = val; if (!s.borderStyle) css.borderLeftStyle = 'solid'; break;
      case 'borderRightWidth':  css.borderRightWidth = val; if (!s.borderStyle) css.borderRightStyle = 'solid'; break;
      case 'lineHeight': css.lineHeight = typeof val === 'number' ? `${val}px` : val; break;
      case 'letterSpacing': css.letterSpacing = typeof val === 'number' ? `${val}px` : val; break;
      case 'textAlignVertical': css.verticalAlign = val === 'top' ? 'top' : val === 'bottom' ? 'bottom' : 'middle'; break;
      case 'includeFontPadding': break; // Android-only, skip
      case 'elevation': css.boxShadow = val ? `0 ${val}px ${val * 2}px rgba(0,0,0,0.15)` : undefined; break;
      case 'transform': {
        if (Array.isArray(val)) {
          const parts = val.map((item: any) => {
            if (!item || typeof item !== 'object') return '';
            const entries = Object.entries(item);
            if (!entries.length) return '';
            const [prop, rawVal] = entries[0];
            const v = isAnimatedValue(rawVal) ? (rawVal as any)._value : rawVal;
            switch (prop) {
              case 'scale': return `scale(${v})`;
              case 'scaleX': return `scaleX(${v})`;
              case 'scaleY': return `scaleY(${v})`;
              case 'translateX': return typeof v === 'number' ? `translateX(${v}px)` : `translateX(${v})`;
              case 'translateY': return typeof v === 'number' ? `translateY(${v}px)` : `translateY(${v})`;
              case 'rotate': return `rotate(${v})`;
              case 'rotateX': return `rotateX(${v})`;
              case 'rotateY': return `rotateY(${v})`;
              case 'rotateZ': return `rotateZ(${v})`;
              case 'skewX': return `skewX(${v})`;
              case 'skewY': return `skewY(${v})`;
              default: return '';
            }
          }).filter(Boolean);
          if (parts.length) css.transform = parts.join(' ');
        } else {
          css.transform = val;
        }
        break;
      }
      default: css[key] = val;
    }
  }
  return css as React.CSSProperties;
}

// Detect AnimatedValue instances (duck-type check)
function isAnimatedValue(v: any): boolean {
  return v != null && typeof v === 'object' && '_value' in v && '_listeners' in v;
}

// Resolve AnimatedValue instances in a style object to their current numeric _value
function resolveAnimated(style: any): any {
  if (!style) return style;
  if (Array.isArray(style)) return style.map(resolveAnimated);
  if (typeof style !== 'object') return style;
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(style)) {
    if (isAnimatedValue(v)) {
      out[k] = (v as any)._value;
    } else {
      out[k] = v;
    }
  }
  return out;
}

function flattenStyle(style: any): React.CSSProperties {
  if (!style) return {};
  if (Array.isArray(style)) {
    return style.reduce(
      (acc: React.CSSProperties, s: any) => ({ ...acc, ...flattenStyle(s) }),
      {},
    );
  }
  return convertRNStyle(resolveAnimated(style) as Record<string, any>);
}

function mapDOMProps(rest: Record<string, any>) {
  const {
    testID,
    scrollEventThrottle,
    showsVerticalScrollIndicator,
    showsHorizontalScrollIndicator,
    keyboardShouldPersistTaps,
    ...domProps
  } = rest;

  if (typeof testID === 'string') {
    domProps['data-testid'] = testID;
  }

  return domProps;
}

function useOnLayout(
  ref: React.RefObject<HTMLDivElement | null>,
  onLayout?: ((event: {nativeEvent: {layout: {x: number; y: number; width: number; height: number}}}) => void) | undefined,
) {
  const onLayoutRef = React.useRef(onLayout);
  const lastLayoutRef = React.useRef<{
    height: number;
    width: number;
    x: number;
    y: number;
  } | null>(null);

  onLayoutRef.current = onLayout;

  React.useEffect(() => {
    if (!onLayout || !ref.current) return;
    const el = ref.current;
    const emitLayout = (layout: {x: number; y: number; width: number; height: number}) => {
      const previous = lastLayoutRef.current;
      if (
        previous &&
        previous.x === layout.x &&
        previous.y === layout.y &&
        previous.width === layout.width &&
        previous.height === layout.height
      ) {
        return;
      }
      lastLayoutRef.current = layout;
      onLayoutRef.current?.({nativeEvent: {layout}});
    };

    const rect = el.getBoundingClientRect();
    emitLayout({x: rect.left, y: rect.top, width: rect.width, height: rect.height});
    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (!entry) return;
      const r = entry.contentRect;
      emitLayout({x: 0, y: 0, width: r.width, height: r.height});
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [onLayout, ref]);
}

// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------

export function View({
  style,
  children,
  onLayout,
  pointerEvents,
  onStartShouldSetResponder,
  onMoveShouldSetResponder,
  onResponderGrant,
  onResponderMove,
  onResponderRelease,
  onResponderTerminate,
  ...rest
}: any) {
  const ref = React.useRef<HTMLDivElement>(null);
  // RN View defaults to flex + column — match that in DOM
  const css: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    ...flattenStyle(style),
  };

  useOnLayout(ref, onLayout);

  // Responder → pointer events
  const hasResponder = onResponderGrant || onResponderMove || onResponderRelease;
  const responderActiveRef = React.useRef(false);

  const makeRNEvent = (e: PointerEvent | MouseEvent) => ({
    nativeEvent: e,
    touches: [{ pageX: (e as any).pageX ?? (e as MouseEvent).clientX, pageY: (e as any).pageY ?? (e as MouseEvent).clientY }],
    changedTouches: [],
    pageX: (e as MouseEvent).clientX,
    pageY: (e as MouseEvent).clientY,
    preventDefault: () => e.preventDefault(),
    stopPropagation: () => e.stopPropagation(),
  });

  React.useEffect(() => {
    if (!hasResponder || !ref.current) return;
    const el = ref.current;

    const onPointerDown = (e: PointerEvent) => {
      const grant = !onStartShouldSetResponder || onStartShouldSetResponder(makeRNEvent(e));
      if (grant && onResponderGrant) {
        responderActiveRef.current = true;
        try { el.setPointerCapture(e.pointerId); } catch {}
        onResponderGrant(makeRNEvent(e));
      }
    };
    const onPointerMove = (e: PointerEvent) => {
      if (responderActiveRef.current && onResponderMove) onResponderMove(makeRNEvent(e));
    };
    const onPointerUp = (e: PointerEvent) => {
      if (responderActiveRef.current && onResponderRelease) onResponderRelease(makeRNEvent(e));
      responderActiveRef.current = false;
      try { el.releasePointerCapture(e.pointerId); } catch {}
    };
    const onPointerCancel = (e: PointerEvent) => {
      responderActiveRef.current = false;
      if (onResponderTerminate) onResponderTerminate(makeRNEvent(e));
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerCancel);
    return () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerCancel);
    };
  }, [hasResponder, onStartShouldSetResponder, onResponderGrant, onResponderMove, onResponderRelease, onResponderTerminate]);

  const needsRef = onLayout || hasResponder;

  const domProps = mapDOMProps(rest);

  return (
    <div ref={needsRef ? ref : undefined} style={css} {...domProps}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

export function Text({ style, children, numberOfLines, ...rest }: any) {
  const css: React.CSSProperties = {
    display: 'block',
    ...(numberOfLines === 1
      ? { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
      : {}),
    ...flattenStyle(style),
  };
  const domProps = mapDOMProps(rest);
  return (
    <div style={css} {...domProps}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ScrollView
// ---------------------------------------------------------------------------

export const ScrollView = React.forwardRef(function ScrollView({
  style,
  contentContainerStyle,
  children,
  scrollEnabled = true,
  showsVerticalScrollIndicator,
  showsHorizontalScrollIndicator,
  horizontal,
  onLayout,
  ...rest
}: any, forwardedRef: any) {
  const shouldHideHorizontalScrollbar = horizontal && showsHorizontalScrollIndicator === false;
  const shouldHideVerticalScrollbar = !horizontal && showsVerticalScrollIndicator === false;
  const outerRef = React.useRef<HTMLDivElement>(null);
  const outer: React.CSSProperties = {
    display: 'flex',
    flexDirection: horizontal ? 'row' : 'column',
    overflowX: horizontal ? (scrollEnabled ? 'auto' : 'hidden') : 'hidden',
    overflowY: horizontal ? 'hidden' : (scrollEnabled ? 'auto' : 'hidden'),
    scrollbarWidth:
      shouldHideHorizontalScrollbar || shouldHideVerticalScrollbar ? 'none' : undefined,
    msOverflowStyle:
      shouldHideHorizontalScrollbar || shouldHideVerticalScrollbar ? 'none' : undefined,
    ...flattenStyle(style),
  };
  const inner: React.CSSProperties = {
    display: 'flex',
    flexDirection: horizontal ? 'row' : 'column',
    flexGrow: 1,
    ...flattenStyle(contentContainerStyle),
  };

  useOnLayout(outerRef, onLayout);

  React.useImperativeHandle(forwardedRef, () => ({
    getNode: () => outerRef.current,
    scrollTo: ({x = 0, y = 0, animated = true}: any = {}) => {
      outerRef.current?.scrollTo({left: x, top: y, behavior: animated ? 'smooth' : 'auto'});
    },
    scrollToEnd: ({animated = true}: any = {}) => {
      const node = outerRef.current;
      if (!node) return;
      node.scrollTo({
        left: horizontal ? node.scrollWidth : 0,
        top: horizontal ? 0 : node.scrollHeight,
        behavior: animated ? 'smooth' : 'auto',
      });
    },
  }), [horizontal]);

  const domProps = mapDOMProps(rest);
  return (
    <div
      ref={outerRef}
      data-hide-scrollbar={
        shouldHideHorizontalScrollbar || shouldHideVerticalScrollbar ? 'true' : undefined
      }
      style={outer}
      {...domProps}>
      <div style={inner}>
        {children}
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// SafeAreaView / SafeAreaProvider (react-native-safe-area-context shims)
// ---------------------------------------------------------------------------

export function SafeAreaView({ style, children, ...rest }: any) {
  const domProps = mapDOMProps(rest);
  return (
    <div style={flattenStyle(style)} {...domProps}>
      {children}
    </div>
  );
}

export function SafeAreaProvider({ children }: any) {
  return <>{children}</>;
}

// ---------------------------------------------------------------------------
// Pressable
// ---------------------------------------------------------------------------

const BUTTON_RESET: React.CSSProperties = {
  border: 'none',
  backgroundColor: 'transparent',
  backgroundImage: 'none',
  padding: 0,
  cursor: 'pointer',
  textAlign: 'left',
  font: 'inherit',
};

export function Pressable({
  style,
  onPress,
  onPressIn,
  onPressOut,
  onHoverIn,
  onHoverOut,
  disabled,
  children,
  pointerEvents,
  ...rest
}: any) {
  const resolvedStyle =
    typeof style === 'function' ? style({ pressed: false }) : style;
  const css: React.CSSProperties = {
    ...BUTTON_RESET,
    ...flattenStyle(resolvedStyle),
    outline: 'none',
    boxShadow: 'none',
  };
  const domProps = mapDOMProps(rest);

  const handleClick = disabled
    ? undefined
    : (e: React.MouseEvent<HTMLDivElement>) => {
        onPress?.(e);
        e.currentTarget.blur();
      };

  const handleKeyDown = disabled
    ? undefined
    : (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onPressIn?.(e);
        }
      };

  const handleKeyUp = disabled
    ? undefined
    : (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onPressOut?.(e);
          onPress?.(e);
        }
      };

  return (
    <div
      aria-disabled={disabled || undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onMouseDown={
        disabled
          ? undefined
          : (e: React.MouseEvent<HTMLDivElement>) => {
              e.preventDefault();
              onPressIn?.(e);
            }
      }
      onMouseUp={disabled ? undefined : onPressOut}
      onMouseEnter={disabled ? undefined : onHoverIn}
      onMouseLeave={disabled ? undefined : onHoverOut}
      role="button"
      style={css}
      tabIndex={disabled ? -1 : 0}
      {...domProps}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TouchableOpacity / TouchableHighlight / TouchableWithoutFeedback
// ---------------------------------------------------------------------------

export const TouchableOpacity = Pressable;
export const TouchableHighlight = Pressable;
export const TouchableWithoutFeedback = ({ children, onPress, ...rest }: any) => (
  <div onClick={onPress} style={{ cursor: onPress ? 'pointer' : undefined }} {...mapDOMProps(rest)}>{children}</div>
);

// ---------------------------------------------------------------------------
// TextInput
// ---------------------------------------------------------------------------

export function TextInput({
  style,
  value,
  placeholder,
  secureTextEntry,
  multiline,
  editable,
  onChangeText,
  onEndEditing,
  onSubmitEditing,
  // RN-only props — filtered out
  placeholderTextColor,
  returnKeyType,
  autoCapitalize,
  autoCorrect,
  autoComplete,
  keyboardType,
  textContentType,
  selectionColor,
  underlineColorAndroid,
  caretHidden,
  contextMenuHidden,
  ...rest
}: any) {
  const css = {
    ...flattenStyle(style),
    outline: 'none',
    boxShadow: 'none',
  };
  const domProps = mapDOMProps(rest);
  if (secureTextEntry) {
    domProps.autoComplete = 'off';
    domProps.spellCheck = false;
    domProps['data-lpignore'] = 'true';
    domProps['data-1p-ignore'] = 'true';
  } else if (typeof autoComplete === 'string' && autoComplete.length > 0) {
    domProps.autoComplete = autoComplete;
  }
  const onChange = onChangeText
    ? (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        onChangeText(e.target.value)
    : undefined;

  const handleBlur = onEndEditing
    ? (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        onEndEditing({ nativeEvent: { text: e.target.value } });
      }
    : undefined;

  const handleKeyDown = onSubmitEditing
    ? (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (e.key === 'Enter') {
          onSubmitEditing({ nativeEvent: { text: (e.target as HTMLInputElement).value } });
        }
      }
    : undefined;

  if (multiline) {
    return (
      <textarea
        value={value}
        placeholder={placeholder}
        readOnly={editable === false}
        onChange={onChange as any}
        onBlur={handleBlur as any}
        onKeyDown={handleKeyDown as any}
        style={css as any}
        {...domProps}
      />
    );
  }
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      readOnly={editable === false}
      onChange={onChange as any}
      onBlur={handleBlur as any}
      onKeyDown={handleKeyDown as any}
      style={
        secureTextEntry
          ? ({
              ...css,
              WebkitTextSecurity: 'disc',
            } as any)
          : css
      }
      {...domProps}
    />
  );
}

// ---------------------------------------------------------------------------
// Image
// ---------------------------------------------------------------------------

export function Image({ source, style, ...rest }: any) {
  const src =
    typeof source === 'string'
      ? source
      : source?.uri ?? '';
  return <img src={src} style={flattenStyle(style)} alt="" {...mapDOMProps(rest)} />;
}

// ---------------------------------------------------------------------------
// ActivityIndicator
// ---------------------------------------------------------------------------

const SPINNER_STYLE_ID = 'rn-compat-spinner';
if (typeof document !== 'undefined' && !document.getElementById(SPINNER_STYLE_ID)) {
  const s = document.createElement('style');
  s.id = SPINNER_STYLE_ID;
  s.textContent = `@keyframes rn-spin { to { transform: rotate(360deg); } }`;
  document.head.appendChild(s);
}

const GLOBAL_FOCUS_RESET_STYLE_ID = 'rn-compat-global-focus-reset';
if (typeof document !== 'undefined' && !document.getElementById(GLOBAL_FOCUS_RESET_STYLE_ID)) {
  const s = document.createElement('style');
  s.id = GLOBAL_FOCUS_RESET_STYLE_ID;
  s.textContent = `
    *:focus,
    *:focus-visible {
      outline: none !important;
      box-shadow: none !important;
    }
  `;
  document.head.appendChild(s);
}

const GLOBAL_SCROLLBAR_RESET_STYLE_ID = 'rn-compat-global-scrollbar-reset';
if (typeof document !== 'undefined' && !document.getElementById(GLOBAL_SCROLLBAR_RESET_STYLE_ID)) {
  const s = document.createElement('style');
  s.id = GLOBAL_SCROLLBAR_RESET_STYLE_ID;
  s.textContent = `
    [data-hide-scrollbar="true"]::-webkit-scrollbar {
      display: none;
      width: 0;
      height: 0;
    }
  `;
  document.head.appendChild(s);
}

export function ActivityIndicator({ color = '#888', size = 'small' }: any) {
  const dim = size === 'large' ? 32 : 18;
  return (
    <div
      style={{
        width: dim,
        height: dim,
        borderRadius: '50%',
        border: `2px solid transparent`,
        borderTopColor: color,
        animation: 'rn-spin 0.7s linear infinite',
        display: 'inline-block',
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// StyleSheet
// ---------------------------------------------------------------------------

export const StyleSheet = {
  create: <T extends Record<string, any>>(s: T): T => {
    const result: any = {};
    for (const key of Object.keys(s)) {
      result[key] = convertRNStyle(s[key]);
    }
    return result as T;
  },
  absoluteFillObject: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  flatten: flattenStyle,
};

// ---------------------------------------------------------------------------
// Alert
// ---------------------------------------------------------------------------

export const Alert = {
  alert: (title: string, message?: string, buttons?: Array<{text: string; style?: string; onPress?: () => void}>) => {
    if (!buttons || buttons.length === 0) {
      window.alert(message ? `${title}\n${message}` : title);
      return;
    }
    // Find destructive/confirm button (non-cancel) and cancel button
    const confirmBtn = buttons.find(b => b.style !== 'cancel');
    const cancelBtn = buttons.find(b => b.style === 'cancel');
    const msg = message ? `${title}\n${message}` : title;
    const confirmed = window.confirm(msg);
    if (confirmed && confirmBtn?.onPress) {
      confirmBtn.onPress();
    } else if (!confirmed && cancelBtn?.onPress) {
      cancelBtn.onPress();
    }
  },
};

// ---------------------------------------------------------------------------
// Platform
// ---------------------------------------------------------------------------

export const Platform = {
  OS: 'web' as const,
  select: (spec: any) => spec.web ?? spec.default,
};

// ---------------------------------------------------------------------------
// Keyboard
// ---------------------------------------------------------------------------

export const Keyboard = {
  dismiss: () => {},
};

// ---------------------------------------------------------------------------
// Animated
// ---------------------------------------------------------------------------

const AnimatedViewWithRef = React.forwardRef(({ style, children, pointerEvents, ...rest }: any, ref: any) => {
  const [, forceUpdate] = React.useReducer((n: number, _: void) => n + 1, 0);

  // Subscribe to any AnimatedValue instances in the style tree so we re-render when they change
  React.useEffect(() => {
    const listeners: Array<{ val: any; id: string }> = [];

    function collect(s: any) {
      if (!s) return;
      if (Array.isArray(s)) { s.forEach(collect); return; }
      if (typeof s !== 'object') return;
      for (const v of Object.values(s)) {
        if (isAnimatedValue(v)) {
          const id = (v as any).addListener(() => forceUpdate());
          listeners.push({ val: v, id });
        } else if (Array.isArray(v)) {
          // handles transform: [{scale: animVal}, ...]
          v.forEach((item: any) => {
            if (item && typeof item === 'object') {
              for (const sv of Object.values(item)) {
                if (isAnimatedValue(sv)) {
                  const id = (sv as any).addListener(() => forceUpdate());
                  listeners.push({ val: sv, id });
                }
              }
            }
          });
        }
      }
    }

    collect(style);
    return () => listeners.forEach(({ val, id }) => val.removeListener(id));
  }, [style]);

  return (
    <div ref={ref} style={flattenStyle(style)} {...rest}>
      {children}
    </div>
  );
});
AnimatedViewWithRef.displayName = 'Animated.View';

export const Animated = {
  Value: class AnimatedValue {
    _value: number;
    _listeners: Array<{ id: string; cb: (v: { value: number }) => void }> = [];
    constructor(v: number) {
      this._value = v;
    }
    setValue(v: number) {
      this._value = v;
      this._listeners.forEach(l => l.cb({ value: v }));
    }
    addListener(cb: (v: { value: number }) => void) {
      const id = String(Math.random());
      this._listeners.push({ id, cb });
      return id;
    }
    removeListener(id: string) {
      this._listeners = this._listeners.filter((l: any) => l.id !== id);
    }
    interpolate({
      inputRange,
      outputRange,
    }: {
      inputRange: number[];
      outputRange: (number | string)[];
    }) {
      // Simplified: return first output value.
      // CSS transitions handle actual visual animation.
      const ratio =
        (this._value - inputRange[0]) /
        (inputRange[inputRange.length - 1] - inputRange[0]);
      const clamped = Math.max(0, Math.min(1, ratio));
      if (
        typeof outputRange[0] === 'number' &&
        typeof outputRange[outputRange.length - 1] === 'number'
      ) {
        return (
          (outputRange[0] as number) +
          clamped *
            ((outputRange[outputRange.length - 1] as number) -
              (outputRange[0] as number))
        );
      }
      return outputRange[0];
    }
  },

  View: AnimatedViewWithRef,

  Text: ({ style, children }: any) => (
    <span style={flattenStyle(resolveAnimated(style))}>{children}</span>
  ),

  timing: (value: any, config: any) => ({
    start: (cb?: () => void) => {
      value.setValue(config.toValue);
      cb?.();
    },
  }),

  parallel: (animations: any[]) => ({
    start: (cb?: () => void) => {
      animations.forEach(a => a.start());
      cb?.();
    },
  }),

  sequence: (animations: any[]) => ({
    start: (cb?: () => void) => {
      animations.forEach(a => a.start());
      cb?.();
    },
  }),
};

// ---------------------------------------------------------------------------
// Easing
// ---------------------------------------------------------------------------

export const Easing = {
  out: (f: any) => f,
  ease: (t: number) => t,
  linear: (t: number) => t,
  quad: (t: number) => t * t,
  bezier: () => (t: number) => t,
};

// ---------------------------------------------------------------------------
// FlatList
// ---------------------------------------------------------------------------

export function FlatList({ data, renderItem, keyExtractor, style, ...rest }: any) {
  return (
    <div style={flattenStyle(style)} {...rest}>
      {(data ?? []).map((item: any, index: number) => {
        const key = keyExtractor ? keyExtractor(item, index) : String(index);
        return (
          <React.Fragment key={key}>
            {renderItem({ item, index })}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// useWindowDimensions
// ---------------------------------------------------------------------------

export function useWindowDimensions() {
  return {
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
    height: typeof window !== 'undefined' ? window.innerHeight : 720,
  };
}

// ---------------------------------------------------------------------------
// PixelRatio
// ---------------------------------------------------------------------------

export const PixelRatio = {
  get: () => (typeof window !== 'undefined' ? window.devicePixelRatio ?? 1 : 1),
  getFontScale: () => 1,
  getPixelSizeForLayoutSize: (size: number) => size * ((typeof window !== 'undefined' ? window.devicePixelRatio : 1) ?? 1),
  roundToNearestPixel: (size: number) => {
    const ratio = (typeof window !== 'undefined' ? window.devicePixelRatio : 1) ?? 1;
    return Math.round(size * ratio) / ratio;
  },
};

// ---------------------------------------------------------------------------
// Linking
// ---------------------------------------------------------------------------

export const Linking = {
  openURL: (url: string) => { window.open(url, '_blank'); return Promise.resolve(); },
  canOpenURL: (_url: string) => Promise.resolve(true),
};

// ---------------------------------------------------------------------------
// Windows-specific focus props shims (no-op in DOM)
// ---------------------------------------------------------------------------

export const windowsPressableFocusProps = {};
export const windowsTextInputFocusProps = {};

// ---------------------------------------------------------------------------
// Clipboard (legacy RN API – shimmed via separate alias in webpack)
// ---------------------------------------------------------------------------

export const Clipboard = {
  setString: (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => undefined);
    }
  },
  getString: async () => '',
};

// ---------------------------------------------------------------------------
// PanResponder (no-op — DOM uses pointer events directly)
// ---------------------------------------------------------------------------

export const PanResponder = {
  create: (_config: any) => ({
    panHandlers: {},
  }),
};

// ---------------------------------------------------------------------------
// NativeModules (no-op stubs)
// ---------------------------------------------------------------------------

export const NativeModules = {};

// ---------------------------------------------------------------------------
// DeviceEventEmitter (no-op stub)
// ---------------------------------------------------------------------------

export const DeviceEventEmitter = {
  addListener: (_event: string, _handler: any) => ({ remove: () => {} }),
  removeAllListeners: (_event: string) => {},
  emit: (_event: string, ..._args: any[]) => {},
};

// ---------------------------------------------------------------------------
// LayoutChangeEvent type (re-exported for consumers that reference it)
// ---------------------------------------------------------------------------

export type LayoutChangeEvent = {
  nativeEvent: {
    layout: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
};

// ---------------------------------------------------------------------------
// Default export so `import RN from 'react-native'` also works
// ---------------------------------------------------------------------------

const ReactNative = {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  SafeAreaProvider,
  Pressable,
  TouchableOpacity,
  TouchableHighlight,
  TouchableWithoutFeedback,
  TextInput,
  Image,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Platform,
  Keyboard,
  Animated,
  Easing,
  FlatList,
  useWindowDimensions,
  PixelRatio,
  Linking,
  Clipboard,
  PanResponder,
  NativeModules,
  DeviceEventEmitter,
};

export default ReactNative;
