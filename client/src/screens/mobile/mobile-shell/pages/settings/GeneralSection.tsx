import React from 'react';
import {ScrollView, View} from 'react-native';

import type {LanguageMode, ThemeMode} from '../../../../shared/shell-model';
import {Card, OptionChip} from '../../components/ui';
import {mobileShellStyles as styles} from '../../config/styles';
import type {MobileShellPalette} from '../../model/types';

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
  palette: MobileShellPalette;
  theme: ThemeMode;
}) {
  return (
    <ScrollView contentContainerStyle={styles.stack}>
      <Card palette={palette} title={labels.language}>
        <View style={styles.optionRow}>
          <OptionChip
            active={language === 'ja'}
            label="日本語"
            onPress={() => onLanguageChange('ja')}
            palette={palette}
          />
          <OptionChip
            active={language === 'en'}
            label="English"
            onPress={() => onLanguageChange('en')}
            palette={palette}
          />
        </View>
      </Card>
      <Card palette={palette} title={labels.theme}>
        <View style={styles.optionRow}>
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
        </View>
      </Card>
    </ScrollView>
  );
}
