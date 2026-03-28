import React from 'react';
import {Pressable, StyleProp, Text, TextStyle, View} from 'react-native';

import {windowsPressableFocusProps} from '../../shared/ui/windowsFocusProps';

type CommonShellPalette = {
  border: string;
  card: string;
  muted: string;
  primary: string;
  primaryText: string;
  text: string;
  textMuted: string;
};

type CommonShellStyles = {
  bodyStrong: object;
  bodyText: object;
  card: object;
  cardTitle: object;
  fieldLabel: object;
  optionChip: object;
  optionChipText: object;
};

export function createShellUi<Palette extends CommonShellPalette>(styles: CommonShellStyles) {
  function Card({
    children,
    palette,
    title,
  }: React.PropsWithChildren<{
    palette: Palette;
    title: string;
  }>) {
    return (
      <View style={[styles.card, {backgroundColor: palette.card, borderColor: palette.border}]}>
        <Text style={[styles.cardTitle, {color: palette.text}]}>{title}</Text>
        {children}
      </View>
    );
  }

  function OptionChip({
    active,
    label,
    onPress,
    palette,
  }: {
    active: boolean;
    label: string;
    onPress: () => void;
    palette: Palette;
  }) {
    const [isHovered, setIsHovered] = React.useState(false);

    return (
      <Pressable
        {...windowsPressableFocusProps}
        onHoverIn={() => setIsHovered(true)}
        onHoverOut={() => setIsHovered(false)}
        onPress={onPress}
        style={({pressed}) => [
          styles.optionChip,
          {
            backgroundColor: active
              ? palette.primary
              : isHovered
                ? palette.card
                : palette.muted,
            borderColor: active
              ? palette.primary
              : isHovered
                ? palette.textMuted
                : palette.border,
            opacity: pressed ? 0.9 : 1,
          },
        ]}>
        <Text
          style={[
            styles.optionChipText,
            {color: active ? palette.primaryText : palette.text},
          ]}>
          {label}
        </Text>
      </Pressable>
    );
  }

  function BodyText({
    children,
    palette,
    style,
  }: React.PropsWithChildren<{
    palette: Palette;
    style?: StyleProp<TextStyle>;
  }>) {
    return <Text style={[styles.bodyText, {color: palette.textMuted}, style]}>{children}</Text>;
  }

  function BodyStrong({
    children,
    palette,
    style,
  }: React.PropsWithChildren<{
    palette: Palette;
    style?: StyleProp<TextStyle>;
  }>) {
    return <Text style={[styles.bodyStrong, {color: palette.text}, style]}>{children}</Text>;
  }

  function FieldLabel({
    children,
    palette,
    style,
  }: React.PropsWithChildren<{
    palette: Palette;
    style?: StyleProp<TextStyle>;
  }>) {
    return <Text style={[styles.fieldLabel, {color: palette.text}, style]}>{children}</Text>;
  }

  return {
    BodyStrong,
    BodyText,
    Card,
    FieldLabel,
    OptionChip,
  };
}
