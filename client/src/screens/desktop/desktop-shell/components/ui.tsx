import React from 'react';
import {Pressable, Text} from 'react-native';

import {windowsPressableFocusProps} from '../../../../shared/ui/windowsFocusProps';
import {createShellUi} from '../../../shared/shell-ui-factory';
import {desktopShellStyles as styles} from '../config/styles';
import type {DesktopShellPalette} from '../model/types';

// デスクトップ UI も components/ui.tsx を起点にたどれるようにそろえる。
const baseUi = createShellUi<DesktopShellPalette>(styles);

export const {Card, OptionChip, BodyText, BodyStrong, FieldLabel} = baseUi;

export function SidebarSubItem({
  active,
  label,
  onPress,
  palette,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
  palette: DesktopShellPalette;
}) {
  return (
    <Pressable
      {...windowsPressableFocusProps}
      onPress={onPress}
      style={styles.sidebarSubItem}>
      <Text
        style={[
          styles.sidebarSubItemLabel,
          active
            ? styles.sidebarSubItemLabelActive
            : styles.sidebarSubItemLabelInactive,
          {
            color: palette.sidebarText,
            fontWeight: active ? ('bold' as const) : ('400' as const),
          },
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}
