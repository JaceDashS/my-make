import React, {useEffect, useRef} from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';

type LoadingIndicatorProps = {
  color: string;
  isVisible?: boolean;
  size?: 'small' | 'large';
  style?: ViewStyle;
};

export function LoadingIndicator({
  color,
  isVisible = true,
  size = 'small',
  style,
}: LoadingIndicatorProps) {
  const progress = useRef(new Animated.Value(isVisible ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      duration: 240,
      easing: Easing.out(Easing.quad),
      toValue: isVisible ? 1 : 0,
      useNativeDriver: true,
    }).start();
  }, [isVisible, progress]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrap,
        style,
        {
          opacity: progress,
          transform: [
            {
              scale: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0.7, 1],
              }),
            },
          ],
        },
      ]}>
      <View style={styles.inner}>
        <ActivityIndicator color={color} size={size} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minWidth: 18,
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
