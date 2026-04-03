import React from 'react';

import { createShellUi } from '../lib/web-shell-ui-factory';
import { desktopShellStyles as styles } from '../../src/screens/desktop/desktop-shell/config/styles';
import type { DesktopShellPalette } from '../../src/screens/desktop/desktop-shell/model/types';

const baseUi = createShellUi<DesktopShellPalette>(styles as any);

export const { Card, OptionChip, BodyText, BodyStrong, FieldLabel } = baseUi;

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
    <button
      onClick={onPress}
      style={{
        ...(styles.sidebarSubItem as React.CSSProperties),
        border: 'none',
        background: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
        display: 'block',
      }}
    >
      <span
        style={{
          ...(styles.sidebarSubItemLabel as React.CSSProperties),
          ...(active
            ? (styles.sidebarSubItemLabelActive as React.CSSProperties)
            : (styles.sidebarSubItemLabelInactive as React.CSSProperties)),
          color: palette.sidebarText,
          fontWeight: active ? 'bold' : '400',
        }}
      >
        {label}
      </span>
    </button>
  );
}
