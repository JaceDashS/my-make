import React from 'react';
import {StyleSheet, View, type ViewStyle} from 'react-native';

type PaletteLike = {
  border: string;
  card?: string;
  muted: string;
};

type Props = {
  children: React.ReactNode;
  palette: PaletteLike;
  style?: ViewStyle;
};

export function SearchFooter({children, palette, style}: Props) {
  return (
    <View
      style={[
        styles.surface,
        style,
        {
          backgroundColor: palette.card ?? palette.muted,
          borderTopColor: palette.border,
        },
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 10,
  },
});
