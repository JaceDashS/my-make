import React from 'react';
import {Pressable, ScrollView, Text, TextInput, View} from 'react-native';

import {
  windowsPressableFocusProps,
  windowsTextInputFocusProps,
} from '../../../../../shared/ui/windowsFocusProps';
import {BodyStrong, BodyText, Card, FieldLabel} from '../../components/ui';
import {desktopShellStyles as styles} from '../../config/styles';
import type {DesktopShellPalette} from '../../model/types';

export function LoginSection({
  authError,
  isAuthenticated,
  loginId,
  onLogin,
  onLoginIdChange,
  onLogout,
  onPasswordChange,
  palette,
  password,
  texts,
}: {
  authError: string | null;
  isAuthenticated: boolean;
  loginId: string;
  onLogin: () => void;
  onLoginIdChange: (value: string) => void;
  onLogout: () => void;
  onPasswordChange: (value: string) => void;
  palette: DesktopShellPalette;
  password: string;
  texts: {
    locked: string;
    loginId: string;
    mockBody: string;
    mockTitle: string;
    password: string;
    protectedControls: string;
    protectedLocked: string;
    protectedSignin: string;
    protectedUnlocked: string;
    signIn: string;
    signOut: string;
    unlocked: string;
  };
}) {
  return (
    <ScrollView contentContainerStyle={styles.stack}>
      <Card palette={palette} title={texts.mockTitle}>
        <BodyText palette={palette}>{texts.mockBody}</BodyText>
        <BodyStrong palette={palette}>ID: admin</BodyStrong>
        <BodyStrong palette={palette}>Password: 1111</BodyStrong>
      </Card>
      <Card palette={palette} title={texts.protectedSignin}>
        <BodyText palette={palette}>
          {isAuthenticated ? texts.unlocked : texts.locked}
        </BodyText>
        <FieldLabel palette={palette}>{texts.loginId}</FieldLabel>
        <TextInput
          {...windowsTextInputFocusProps}
          autoCapitalize="none"
          onChangeText={onLoginIdChange}
          placeholder="admin"
          placeholderTextColor={palette.textMuted}
          style={[
            styles.input,
            {
              backgroundColor: palette.muted,
              borderColor: palette.border,
              color: palette.text,
            },
          ]}
          value={loginId}
        />
        <FieldLabel palette={palette}>{texts.password}</FieldLabel>
        <TextInput
          {...windowsTextInputFocusProps}
          onChangeText={onPasswordChange}
          placeholder="1111"
          placeholderTextColor={palette.textMuted}
          secureTextEntry
          style={[
            styles.input,
            {
              backgroundColor: palette.muted,
              borderColor: palette.border,
              color: palette.text,
            },
          ]}
          value={password}
        />
        {authError ? <Text style={styles.errorText}>{authError}</Text> : null}
        <View style={styles.optionRow}>
          <Pressable
            {...windowsPressableFocusProps}
            onPress={onLogin}
            style={[styles.actionButton, {backgroundColor: palette.primary}]}>
            <Text style={[styles.actionText, {color: palette.primaryText}]}>
              {texts.signIn}
            </Text>
          </Pressable>
          <Pressable
            {...windowsPressableFocusProps}
            onPress={onLogout}
            style={[styles.actionButton, {backgroundColor: palette.soft}]}>
            <Text style={[styles.actionText, {color: palette.text}]}>
              {texts.signOut}
            </Text>
          </Pressable>
        </View>
      </Card>
      <Card palette={palette} title={texts.protectedControls}>
        <BodyText palette={palette}>
          {isAuthenticated ? texts.protectedUnlocked : texts.protectedLocked}
        </BodyText>
      </Card>
    </ScrollView>
  );
}
