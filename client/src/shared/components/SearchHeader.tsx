import React from 'react';
import {Platform, StyleSheet, View, type ViewStyle} from 'react-native';

type PaletteLike = {
  border: string;
  card?: string;
  muted: string;
};

type Props = {
  children: React.ReactNode;
  edgeInset?: number;
  palette: PaletteLike;
  style?: ViewStyle;
};

function getDefaultEdgeInset() {
  return Platform.OS === 'web' ? 18 : 16;
}

export function SearchHeader({children, edgeInset = getDefaultEdgeInset(), palette, style}: Props) {
  return (
    <View
      style={[
        styles.bleedWrap,
        {
          marginHorizontal: -edgeInset,
          marginTop: -edgeInset,
        },
      ]}>
      <View
        style={[
          styles.surface,
          style,
          {
            backgroundColor: palette.card ?? palette.muted,
            borderBottomColor: palette.border,
          },
        ]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bleedWrap: {
    left: 0,
    right: 0,
  },
  surface: {
    borderBottomWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
  },
});
