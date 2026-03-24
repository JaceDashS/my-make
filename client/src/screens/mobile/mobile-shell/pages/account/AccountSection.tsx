import React from 'react';
import {ScrollView, Text, TextInput, View} from 'react-native';

import {ActionButton} from '../../../../../shared/components/ActionButton';
import {
  windowsTextInputFocusProps,
} from '../../../../../shared/ui/windowsFocusProps';
import {BodyStrong, BodyText, Card, FieldLabel, OptionChip} from '../../components/ui';
import {mobileShellStyles as styles} from '../../config/styles';
import type {MobileShellPalette} from '../../model/types';
import type {AccountSection as AccountSectionType} from '../../../../shared/shell-model';

export function AccountSection({
  academyCode,
  academyName,
  authError,
  authNotice,
  confirmPassword,
  currentSection,
  displayName,
  isAuthenticated,
  isSubmitting,
  licenseCode,
  loginId,
  onAcademyNameChange,
  onConfirmPasswordChange,
  onDisplayNameChange,
  onLicenseCodeChange,
  onLogin,
  onLoginIdChange,
  onLogout,
  onPasswordChange,
  onRegister,
  onRegisterTypeChange,
  onRequestedRoleCodeChange,
  palette,
  password,
  requestedRoleCode,
  registerError,
  registerSuccess,
  registerType,
  roleCode,
  texts,
}: {
  academyCode: string;
  academyName: string;
  authError: string | null;
  authNotice: string | null;
  confirmPassword: string;
  currentSection: AccountSectionType;
  displayName: string;
  isAuthenticated: boolean;
  isSubmitting: boolean;
  licenseCode: string;
  loginId: string;
  onAcademyNameChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onDisplayNameChange: (value: string) => void;
  onLicenseCodeChange: (value: string) => void;
  onLogin: () => void;
  onLoginIdChange: (value: string) => void;
  onLogout: () => void;
  onPasswordChange: (value: string) => void;
  onRegister: () => void;
  onRegisterTypeChange: (value: 'user' | 'root') => void;
  onRequestedRoleCodeChange: (value: 'STUDENT' | 'TEACHER' | 'ADMIN') => void;
  palette: MobileShellPalette;
  password: string;
  requestedRoleCode: 'STUDENT' | 'TEACHER' | 'ADMIN';
  registerError: string | null;
  registerSuccess: string | null;
  registerType: 'user' | 'root';
  roleCode: string;
  texts: {
    academyCode: string;
    academyName: string;
    loginNotice: string;
    confirmPassword: string;
    createAccount: string;
    displayName: string;
    guestHint: string;
    licenseCode: string;
    locked: string;
    login: string;
    loginId: string;
    noAccount: string;
    password: string;
    profile: string;
    profileAcademy: string;
    profileBody: string;
    profileId: string;
    profileRole: string;
    memberRegisterBody: string;
    memberRegisterSuccess: string;
    memberRole: string;
    memberRoleAdmin: string;
    memberRoleStudent: string;
    memberRoleTeacher: string;
    protectedControls: string;
    protectedLocked: string;
    protectedSignin: string;
    protectedUnlocked: string;
    register: string;
    registerBody: string;
    registerCta: string;
    registerHint: string;
    registerRoot: string;
    registerRootBody: string;
    registerSuccess: string;
    registerType: string;
    registerTypeRoot: string;
    registerTypeUser: string;
    rootLoginId: string;
    signIn: string;
    signOut: string;
    unlocked: string;
    userRegisterPending: string;
  };
}) {
  if (currentSection === 'register' && !isAuthenticated) {
    return (
      <ScrollView contentContainerStyle={styles.stack}>
        <Card palette={palette} title={texts.register}>
          <BodyText palette={palette}>{texts.registerBody}</BodyText>
          <FieldLabel palette={palette}>{texts.registerType}</FieldLabel>
          <View style={styles.optionRow}>
            <OptionChip
              active={registerType === 'user'}
              label={texts.registerTypeUser}
              onPress={() => onRegisterTypeChange('user')}
              palette={palette}
            />
            <OptionChip
              active={registerType === 'root'}
              label={texts.registerTypeRoot}
              onPress={() => onRegisterTypeChange('root')}
              palette={palette}
            />
          </View>
        </Card>

        {registerType === 'user' ? (
          <>
            <Card palette={palette} title={texts.registerTypeUser}>
              <BodyText palette={palette}>{texts.memberRegisterBody}</BodyText>
              <FieldLabel palette={palette}>{texts.loginId}</FieldLabel>
              <TextInput
                {...windowsTextInputFocusProps}
                autoCapitalize="none"
                onChangeText={onLoginIdChange}
                placeholder="new-member"
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
              <FieldLabel palette={palette}>{texts.displayName}</FieldLabel>
              <TextInput
                {...windowsTextInputFocusProps}
                onChangeText={onDisplayNameChange}
                placeholder="New Member"
                placeholderTextColor={palette.textMuted}
                style={[
                  styles.input,
                  {
                    backgroundColor: palette.muted,
                    borderColor: palette.border,
                    color: palette.text,
                  },
                ]}
                value={displayName}
              />
              <FieldLabel palette={palette}>{texts.memberRole}</FieldLabel>
              <View style={styles.optionRow}>
                <OptionChip
                  active={requestedRoleCode === 'STUDENT'}
                  label={texts.memberRoleStudent}
                  onPress={() => onRequestedRoleCodeChange('STUDENT')}
                  palette={palette}
                />
                <OptionChip
                  active={requestedRoleCode === 'TEACHER'}
                  label={texts.memberRoleTeacher}
                  onPress={() => onRequestedRoleCodeChange('TEACHER')}
                  palette={palette}
                />
                <OptionChip
                  active={requestedRoleCode === 'ADMIN'}
                  label={texts.memberRoleAdmin}
                  onPress={() => onRequestedRoleCodeChange('ADMIN')}
                  palette={palette}
                />
              </View>
              <FieldLabel palette={palette}>{texts.password}</FieldLabel>
              <TextInput
                {...windowsTextInputFocusProps}
                onChangeText={onPasswordChange}
                placeholder="••••••••"
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
              <FieldLabel palette={palette}>{texts.confirmPassword}</FieldLabel>
              <TextInput
                {...windowsTextInputFocusProps}
                onChangeText={onConfirmPasswordChange}
                placeholder="••••••••"
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
                value={confirmPassword}
              />
              {registerError ? <Text style={styles.errorText}>{registerError}</Text> : null}
              {registerSuccess ? (
                <Text style={[styles.bodyText, {color: palette.text}]}>
                  {registerSuccess}
                </Text>
              ) : null}
              <View style={styles.optionRow}>
                <ActionButton
                  backgroundColor={palette.primary}
                  isLoading={isSubmitting}
                  label={texts.createAccount}
                  onPress={onRegister}
                  style={styles.actionButton}
                  textColor={palette.primaryText}
                  titleStyle={styles.actionText}
                />
              </View>
            </Card>
            <Card palette={palette} title={texts.registerCta}>
              <BodyText palette={palette}>{texts.userRegisterPending}</BodyText>
            </Card>
          </>
        ) : (
          <>
            <Card palette={palette} title={texts.registerRoot}>
              <BodyText palette={palette}>{texts.registerRootBody}</BodyText>
              <FieldLabel palette={palette}>{texts.licenseCode}</FieldLabel>
              <TextInput
                {...windowsTextInputFocusProps}
                autoCapitalize="characters"
                onChangeText={onLicenseCodeChange}
                placeholder="LICENSE-CODE"
                placeholderTextColor={palette.textMuted}
                style={[
                  styles.input,
                  {
                    backgroundColor: palette.muted,
                    borderColor: palette.border,
                    color: palette.text,
                  },
                ]}
                value={licenseCode}
              />
              <FieldLabel palette={palette}>{texts.academyName}</FieldLabel>
              <TextInput
                {...windowsTextInputFocusProps}
                onChangeText={onAcademyNameChange}
                placeholder="My Academy"
                placeholderTextColor={palette.textMuted}
                style={[
                  styles.input,
                  {
                    backgroundColor: palette.muted,
                    borderColor: palette.border,
                    color: palette.text,
                  },
                ]}
                value={academyName}
              />
              <FieldLabel palette={palette}>{texts.rootLoginId}</FieldLabel>
              <TextInput
                {...windowsTextInputFocusProps}
                autoCapitalize="none"
                onChangeText={onLoginIdChange}
                placeholder="root-admin"
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
              <FieldLabel palette={palette}>{texts.displayName}</FieldLabel>
              <TextInput
                {...windowsTextInputFocusProps}
                onChangeText={onDisplayNameChange}
                placeholder="Root Admin"
                placeholderTextColor={palette.textMuted}
                style={[
                  styles.input,
                  {
                    backgroundColor: palette.muted,
                    borderColor: palette.border,
                    color: palette.text,
                  },
                ]}
                value={displayName}
              />
              <FieldLabel palette={palette}>{texts.password}</FieldLabel>
              <TextInput
                {...windowsTextInputFocusProps}
                onChangeText={onPasswordChange}
                placeholder="••••••••"
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
              <FieldLabel palette={palette}>{texts.confirmPassword}</FieldLabel>
              <TextInput
                {...windowsTextInputFocusProps}
                onChangeText={onConfirmPasswordChange}
                placeholder="••••••••"
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
                value={confirmPassword}
              />
              {registerError ? <Text style={styles.errorText}>{registerError}</Text> : null}
              {registerSuccess ? (
                <Text style={[styles.bodyText, {color: palette.text}]}>
                  {registerSuccess}
                </Text>
              ) : null}
              <View style={styles.optionRow}>
                <ActionButton
                  backgroundColor={palette.primary}
                  isLoading={isSubmitting}
                  label={texts.createAccount}
                  onPress={onRegister}
                  style={styles.actionButton}
                  textColor={palette.primaryText}
                  titleStyle={styles.actionText}
                />
              </View>
            </Card>
            <Card palette={palette} title={texts.registerCta}>
              <BodyText palette={palette}>{texts.registerHint}</BodyText>
            </Card>
          </>
        )}
      </ScrollView>
    );
  }

  if (currentSection === 'profile' && isAuthenticated) {
    return (
      <ScrollView contentContainerStyle={styles.stack}>
        <Card palette={palette} title={texts.profile}>
          <BodyText palette={palette}>{texts.profileBody}</BodyText>
          <FieldLabel palette={palette}>{texts.profileAcademy}</FieldLabel>
          <BodyStrong palette={palette}>{academyName}</BodyStrong>
          <FieldLabel palette={palette}>{texts.academyCode}</FieldLabel>
          <BodyStrong palette={palette}>{academyCode}</BodyStrong>
          <FieldLabel palette={palette}>{texts.profileId}</FieldLabel>
          <BodyStrong palette={palette}>{loginId}</BodyStrong>
          <FieldLabel palette={palette}>{texts.displayName}</FieldLabel>
          <BodyStrong palette={palette}>{displayName}</BodyStrong>
          <FieldLabel palette={palette}>{texts.profileRole}</FieldLabel>
          <BodyStrong palette={palette}>{roleCode}</BodyStrong>
        </Card>
        <Card palette={palette} title={texts.protectedControls}>
          <BodyText palette={palette}>{texts.protectedUnlocked}</BodyText>
          <View style={styles.optionRow}>
            <ActionButton
              backgroundColor={palette.soft}
              isLoading={isSubmitting}
              label={texts.signOut}
              onPress={onLogout}
              style={styles.actionButton}
              textColor={palette.text}
              titleStyle={styles.actionText}
            />
          </View>
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.stack}>
      <Card palette={palette} title={texts.login}>
        <BodyText palette={palette}>{texts.guestHint}</BodyText>
        <FieldLabel palette={palette}>{texts.loginId}</FieldLabel>
        <TextInput
          {...windowsTextInputFocusProps}
          autoCapitalize="none"
          onChangeText={onLoginIdChange}
          placeholder="root-admin"
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
          placeholder="••••••••"
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
        {authNotice ? (
          <Card palette={palette} title={texts.loginNotice}>
            <BodyText palette={palette}>{authNotice}</BodyText>
          </Card>
        ) : null}
        {authError ? <Text style={styles.errorText}>{authError}</Text> : null}
        <View style={styles.optionRow}>
          <ActionButton
            backgroundColor={palette.primary}
            isLoading={isSubmitting}
            label={texts.signIn}
            onPress={onLogin}
            style={styles.actionButton}
            textColor={palette.primaryText}
            titleStyle={styles.actionText}
          />
        </View>
      </Card>
      <Card palette={palette} title={texts.protectedSignin}>
        <BodyText palette={palette}>
          {isAuthenticated ? texts.unlocked : texts.locked}
        </BodyText>
        <BodyText palette={palette}>
          {academyCode ? `${texts.academyCode}: ${academyCode}` : texts.noAccount}
        </BodyText>
      </Card>
    </ScrollView>
  );
}
