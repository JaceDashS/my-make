import React, {useRef} from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import {windowsPressableFocusProps} from '../ui/windowsFocusProps';
import {LoadingIndicator} from './LoadingIndicator';

type ActionButtonProps = {
  backgroundColor: string;
  disabled?: boolean;
  hint?: string;
  testID?: string;
  isLoading?: boolean;
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  textColor: string;
  titleStyle?: StyleProp<TextStyle>;
  hintStyle?: StyleProp<TextStyle>;
};

export function ActionButton({
  backgroundColor,
  disabled = false,
  hint,
  testID,
  isLoading = false,
  label,
  onPress,
  style,
  textColor,
  titleStyle,
  hintStyle,
}: ActionButtonProps) {
  const hoverValue = useRef(new Animated.Value(0)).current;
  const pressValue = useRef(new Animated.Value(0)).current;

  const animateTo = (value: Animated.Value, toValue: number, duration: number) => {
    Animated.timing(value, {
      duration,
      easing: Easing.out(Easing.quad),
      toValue,
      useNativeDriver: true,
    }).start();
  };

  const isDisabled = disabled || isLoading;
  const scale = pressValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.988],
  });

  return (
    <Pressable
      {...windowsPressableFocusProps}
      disabled={isDisabled}
      onHoverIn={() => animateTo(hoverValue, 1, 140)}
      onHoverOut={() => animateTo(hoverValue, 0, 180)}
      onPress={onPress}
      onPressIn={() => animateTo(pressValue, 1, 80)}
      onPressOut={() => animateTo(pressValue, 0, 140)}
      style={styles.pressable}
      testID={testID}>
      <Animated.View
        style={[
          styles.surface,
          style,
          {
            backgroundColor,
            opacity: isDisabled ? 0.76 : 1,
            transform: [{scale}],
          },
        ]}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.hoverGlow,
            {
              opacity: hoverValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.1],
              }),
            },
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.hoverRing,
            {
              borderColor: textColor,
              opacity: hoverValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.18],
              }),
            },
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.hoverAccent,
            {
              backgroundColor: textColor,
              opacity: hoverValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.14],
              }),
              transform: [
                {
                  scaleX: hoverValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.72, 1],
                  }),
                },
              ],
            },
          ]}
        />
        <View style={styles.header}>
          <Text
            numberOfLines={1}
            style={[styles.title, titleStyle, {color: textColor}]}>
            {label}
          </Text>
          <LoadingIndicator color={textColor} isVisible={isLoading} size="small" />
        </View>
        {hint ? (
          <Text style={[styles.hint, hintStyle, {color: textColor}]}>{hint}</Text>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    alignSelf: 'stretch',
    margin: 6,
  },
  surface: {
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    zIndex: 1,
  },
  title: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '800',
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    opacity: 0.9,
    zIndex: 1,
  },
  hoverGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
  },
  hoverRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    borderWidth: 1,
  },
  hoverAccent: {
    borderRadius: 999,
    height: 3,
    left: 18,
    position: 'absolute',
    right: 18,
    top: 0,
  },
});
