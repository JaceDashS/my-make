import React from 'react';

import type { LanguageMode, ThemeMode } from '../../../src/screens/shared/shell-model';
import { Card, OptionChip } from '../../components/ui';
import { desktopShellStyles as styles } from '../../../src/screens/desktop/desktop-shell/config/styles';
import type { DesktopShellPalette } from '../../../src/screens/desktop/desktop-shell/model/types';

export function GeneralSection({
  labels,
  language,
  onLanguageChange,
  onThemeChange,
  palette,
  theme,
}: {
  labels: {
    dark: string;
    language: string;
    light: string;
    theme: string;
  };
  language: LanguageMode;
  onLanguageChange: (language: LanguageMode) => void;
  onThemeChange: (theme: ThemeMode) => void;
  palette: DesktopShellPalette;
  theme: ThemeMode;
}) {
  return (
    <div style={{ overflowY: 'auto', flex: 1 }}>
      <div style={styles.stack as React.CSSProperties}>
        <Card palette={palette} title={labels.language}>
          <div style={styles.optionRow as React.CSSProperties}>
            <OptionChip
              active={language === 'en'}
              label="English"
              onPress={() => onLanguageChange('en')}
              palette={palette}
            />
            <OptionChip
              active={language === 'ja'}
              label="日本語"
              onPress={() => onLanguageChange('ja')}
              palette={palette}
            />
          </div>
        </Card>
        <Card palette={palette} title={labels.theme}>
          <div style={styles.optionRow as React.CSSProperties}>
            <OptionChip
              active={theme === 'light'}
              label={labels.light}
              onPress={() => onThemeChange('light')}
              palette={palette}
            />
            <OptionChip
              active={theme === 'dark'}
              label={labels.dark}
              onPress={() => onThemeChange('dark')}
              palette={palette}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
