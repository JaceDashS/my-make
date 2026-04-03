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
    headerRight,
    palette,
    title,
  }: React.PropsWithChildren<{
    headerRight?: React.ReactNode;
    palette: Palette;
    title: string;
  }>) {
    return (
      <View
        style={[
          styles.card,
          {
            alignSelf: 'stretch',
            backgroundColor: palette.card,
            borderColor: palette.border,
            minWidth: 0,
            width: '100%',
          },
        ]}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}>
          <Text style={[styles.cardTitle, {color: palette.text, flexShrink: 1}]}>{title}</Text>
          {headerRight ? <View style={{flexShrink: 0}}>{headerRight}</View> : null}
        </View>
        {children}
      </View>
    );
  }

  function OptionChip({
    active,
    label,
    onPress,
    palette,
    testID,
  }: {
    active: boolean;
    label: string;
    onPress: () => void;
    palette: Palette;
    testID?: string;
  }) {
    const [isHovered, setIsHovered] = React.useState(false);

    return (
      <Pressable
        {...windowsPressableFocusProps}
        onHoverIn={() => setIsHovered(true)}
        onHoverOut={() => setIsHovered(false)}
        onPress={onPress}
        testID={testID}
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
