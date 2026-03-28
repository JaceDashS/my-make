import React from 'react';
import {Pressable, ScrollView, Text, TextInput, View} from 'react-native';

import {ActionButton} from '../../../../../shared/components/ActionButton';
import {
  windowsPressableFocusProps,
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
  email,
  isAuthenticated,
  isSubmitting,
  licenseCode,
  loginId,
  onAcademyNameChange,
  onConfirmPasswordChange,
  onDisplayNameChange,
  onEmailChange,
  onLicenseCodeChange,
  onLogin,
  onLoginIdChange,
  onLogout,
  onPasswordChange,
  onPhoneChange,
  onRegister,
  onRegisterTypeChange,
  onRequestedRoleCodeChange,
  palette,
  password,
  phone,
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
  email: string;
  isAuthenticated: boolean;
  isSubmitting: boolean;
  licenseCode: string;
  loginId: string;
  onAcademyNameChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onDisplayNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onLicenseCodeChange: (value: string) => void;
  onLogin: () => void;
  onLoginIdChange: (value: string) => void;
  onLogout: () => void;
  onPasswordChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onRegister: () => void;
  onRegisterTypeChange: (value: 'user' | 'root') => void;
  onRequestedRoleCodeChange: (value: 'STUDENT' | 'TEACHER' | 'ADMIN') => void;
  palette: MobileShellPalette;
  password: string;
  phone: string;
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
    email: string;
    guestHint: string;
    licenseCode: string;
    locked: string;
    login: string;
    loginId: string;
    noAccount: string;
    password: string;
    phone: string;
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
    registerCta?: string;
    registerHint?: string;
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
  };
}) {
  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);

    if (digits.length <= 3) {
      return digits;
    }

    if (digits.length <= 7) {
      return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    }

    if (digits.length <= 10) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    }

    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  };

  const canSubmitMemberRegister =
    !!loginId &&
    !!displayName &&
    !!phone &&
    !!password &&
    !!confirmPassword &&
    password === confirmPassword;
  const canSubmitRootRegister =
    !!licenseCode &&
    !!academyName &&
    !!loginId &&
    !!displayName &&
    !!phone &&
    !!password &&
    !!confirmPassword &&
    password === confirmPassword;

  const handleRegisterSubmit = () => {
    if (registerType === 'user' && canSubmitMemberRegister) {
      onRegister();
      return;
    }

    if (registerType === 'root' && canSubmitRootRegister) {
      onRegister();
    }
  };

  const requiredLabel = (label: string) => `${label} *`;
  const loginMutedPalette = isAuthenticated
    ? {...palette, text: palette.textMuted, textMuted: palette.textMuted}
    : palette;
  const profileActivePalette = isAuthenticated
    ? {...palette, text: '#111111', textMuted: '#111111'}
    : palette;
  const loginSectionProps = {
    pointerEvents: !isAuthenticated ? ('auto' as const) : ('none' as const),
    style: {
      opacity: !isAuthenticated ? 1 : 0,
      maxHeight: !isAuthenticated ? undefined : 0,
      overflow: 'hidden' as const,
    },
  };
  const profileSectionProps = {
    pointerEvents: isAuthenticated ? ('auto' as const) : ('none' as const),
    style: {
      opacity: isAuthenticated ? 1 : 0,
      maxHeight: isAuthenticated ? undefined : 0,
      overflow: 'hidden' as const,
    },
  };

  const renderLoginCard = () => (
    <Card palette={loginMutedPalette} title={texts.login}>
      <BodyText palette={loginMutedPalette}>{texts.guestHint}</BodyText>
      <FieldLabel palette={loginMutedPalette}>{texts.loginId}</FieldLabel>
      <TextInput
        {...windowsTextInputFocusProps}
        autoCapitalize="none"
        onChangeText={onLoginIdChange}
        onSubmitEditing={onLogin}
        placeholder="root-admin"
        placeholderTextColor={palette.textMuted}
        returnKeyType="done"
        style={[
          styles.input,
          {
            backgroundColor: palette.muted,
            borderColor: palette.border,
            color: loginMutedPalette.text,
          },
        ]}
        value={loginId}
      />
      <FieldLabel palette={loginMutedPalette}>{texts.password}</FieldLabel>
      <TextInput
        {...windowsTextInputFocusProps}
        onChangeText={onPasswordChange}
        onSubmitEditing={onLogin}
        placeholder="••••••••"
        placeholderTextColor={palette.textMuted}
        returnKeyType="done"
        secureTextEntry
        style={[
          styles.input,
          {
            backgroundColor: palette.muted,
            borderColor: palette.border,
            color: loginMutedPalette.text,
          },
        ]}
        value={password}
      />
      {authNotice ? (
        <Card palette={loginMutedPalette} title={texts.loginNotice}>
          <BodyText palette={loginMutedPalette}>{authNotice}</BodyText>
        </Card>
      ) : null}
      {authError ? (
        <Text style={styles.errorText}>{authError}</Text>
      ) : null}
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
  );

  const editableFields = {
    academyName: {label: texts.academyName, value: academyName, onChange: onAcademyNameChange},
    displayName: {label: texts.displayName, value: displayName, onChange: onDisplayNameChange},
    email: {label: texts.email, value: email, onChange: onEmailChange},
    phone: {label: texts.phone, value: phone, onChange: onPhoneChange},
    loginId: {label: texts.profileId, value: loginId, onChange: onLoginIdChange},
    licenseCode: {label: texts.licenseCode, value: licenseCode, onChange: onLicenseCodeChange},
  } as const;
  type EditableFieldKey = keyof typeof editableFields;
  const [editingField, setEditingField] = React.useState<EditableFieldKey | null>(null);
  const [draftValue, setDraftValue] = React.useState('');

  const startEditingField = (field: EditableFieldKey) => {
    setEditingField(field);
    setDraftValue(editableFields[field].value);
  };

  const cancelEditingField = () => {
    setEditingField(null);
    setDraftValue('');
  };

  const commitEditingField = () => {
    if (!editingField) {
      return;
    }

    const nextValue =
      editingField === 'phone' ? formatPhoneNumber(draftValue) : draftValue.trim();
    editableFields[editingField].onChange(nextValue);
    cancelEditingField();
  };

  const renderProfileField = ({
    editable = false,
    fieldKey,
    label,
    value,
  }: {
    editable?: boolean;
    fieldKey?: EditableFieldKey;
    label: string;
    value: string;
  }) => {
    const isEditing = editable && fieldKey != null && editingField === fieldKey;

    return (
      <View>
        <View style={styles.profileFieldHeader}>
          <View style={styles.profileFieldRow}>
            <FieldLabel
              palette={profileActivePalette}
              style={styles.profileFieldLabel}>
              {label}
            </FieldLabel>
            {!isEditing ? (
              <BodyStrong palette={profileActivePalette} style={styles.profileFieldValue}>
                {value || '-'}
              </BodyStrong>
            ) : null}
          </View>
          {editable && fieldKey != null ? (
            <Pressable
              {...windowsPressableFocusProps}
              onPress={() => startEditingField(fieldKey)}
              style={[
                styles.profileIconButton,
                {
                  backgroundColor: palette.muted,
                  borderColor: palette.border,
                },
              ]}>
              <Text
                style={[
                  styles.profileIconButtonText,
                  {color: profileActivePalette.text},
                ]}>
                ✎
              </Text>
            </Pressable>
          ) : null}
        </View>
        {isEditing ? (
          <View style={styles.profileFieldEditor}>
            <TextInput
              {...windowsTextInputFocusProps}
              autoCapitalize={fieldKey === 'email' || fieldKey === 'loginId' ? 'none' : 'sentences'}
              keyboardType={fieldKey === 'email' ? 'email-address' : fieldKey === 'phone' ? 'phone-pad' : 'default'}
              onChangeText={setDraftValue}
              onSubmitEditing={commitEditingField}
              placeholder={label}
              placeholderTextColor={palette.textMuted}
              returnKeyType="done"
              style={[
                styles.input,
                styles.profileFieldInput,
                {
                  backgroundColor: palette.muted,
                  borderColor: palette.border,
                  color: profileActivePalette.text,
                },
              ]}
              value={draftValue}
            />
            <View style={styles.profileFieldActions}>
              <Pressable
                {...windowsPressableFocusProps}
                onPress={commitEditingField}
                style={[
                  styles.profileActionButton,
                  {
                    backgroundColor: palette.primary,
                    borderColor: palette.primary,
                  },
                ]}>
                <Text
                  style={[
                    styles.profileActionButtonText,
                    {color: palette.primaryText},
                  ]}>
                  Save
                </Text>
              </Pressable>
              <Pressable
                {...windowsPressableFocusProps}
                onPress={cancelEditingField}
                style={[
                  styles.profileActionButton,
                  {
                    backgroundColor: palette.muted,
                    borderColor: palette.border,
                  },
                ]}>
                <Text
                  style={[
                    styles.profileActionButtonText,
                    {color: profileActivePalette.text},
                  ]}>
                  Cancel
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
    );
  };

  const renderProfileCards = () => (
    <>
      {/* `profile` は独立セクションではない。login 画面内の補助コンテナとしてのみ表示する。 */}
      <Card palette={profileActivePalette} title={texts.profile}>
        <BodyText palette={profileActivePalette}>{texts.profileBody}</BodyText>
        {renderProfileField({
          editable: true,
          fieldKey: 'academyName',
          label: texts.profileAcademy,
          value: academyName,
        })}
        {renderProfileField({label: texts.academyCode, value: academyCode})}
        {renderProfileField({
          editable: true,
          fieldKey: 'loginId',
          label: texts.profileId,
          value: loginId,
        })}
        {renderProfileField({
          editable: true,
          fieldKey: 'displayName',
          label: texts.displayName,
          value: displayName,
        })}
        {renderProfileField({
          editable: true,
          fieldKey: 'email',
          label: texts.email,
          value: email,
        })}
        {renderProfileField({
          editable: true,
          fieldKey: 'phone',
          label: texts.phone,
          value: phone,
        })}
        {renderProfileField({
          editable: true,
          fieldKey: 'licenseCode',
          label: texts.licenseCode,
          value: licenseCode,
        })}
        {renderProfileField({label: texts.profileRole, value: roleCode})}
      </Card>
      <Card palette={profileActivePalette} title={texts.protectedControls}>
        <BodyText palette={profileActivePalette}>{texts.protectedUnlocked}</BodyText>
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
    </>
  );

  if (currentSection === 'register' && !isAuthenticated) {
    return (
      <ScrollView
        key={`register-${registerType}`}
        contentContainerStyle={styles.stack}>
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
              <FieldLabel palette={palette}>{requiredLabel(texts.loginId)}</FieldLabel>
              <TextInput
                {...windowsTextInputFocusProps}
                autoCapitalize="none"
                onChangeText={onLoginIdChange}
                onSubmitEditing={handleRegisterSubmit}
                placeholder="new-member"
                placeholderTextColor={palette.textMuted}
                returnKeyType="done"
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
              <FieldLabel palette={palette}>{requiredLabel(texts.displayName)}</FieldLabel>
              <TextInput
                {...windowsTextInputFocusProps}
                onChangeText={onDisplayNameChange}
                onSubmitEditing={handleRegisterSubmit}
                placeholder="New Member"
                placeholderTextColor={palette.textMuted}
                returnKeyType="done"
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
              <FieldLabel palette={palette}>{texts.email}</FieldLabel>
              <TextInput
                {...windowsTextInputFocusProps}
                autoCapitalize="none"
                keyboardType="email-address"
                onChangeText={onEmailChange}
                onSubmitEditing={handleRegisterSubmit}
                placeholder="name@example.com"
                placeholderTextColor={palette.textMuted}
                returnKeyType="done"
                style={[
                  styles.input,
                  {
                    backgroundColor: palette.muted,
                    borderColor: palette.border,
                    color: palette.text,
                  },
                ]}
                value={email}
              />
              <FieldLabel palette={palette}>{requiredLabel(texts.phone)}</FieldLabel>
              <TextInput
                {...windowsTextInputFocusProps}
                keyboardType="phone-pad"
                onChangeText={value => onPhoneChange(formatPhoneNumber(value))}
                onSubmitEditing={handleRegisterSubmit}
                placeholder="010-0000-0000"
                placeholderTextColor={palette.textMuted}
                returnKeyType="done"
                style={[
                  styles.input,
                  {
                    backgroundColor: palette.muted,
                    borderColor: palette.border,
                    color: palette.text,
                  },
                ]}
                value={phone}
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
              <FieldLabel palette={palette}>{requiredLabel(texts.password)}</FieldLabel>
              <TextInput
                {...windowsTextInputFocusProps}
                onChangeText={onPasswordChange}
                onSubmitEditing={handleRegisterSubmit}
                placeholder="••••••••"
                placeholderTextColor={palette.textMuted}
                returnKeyType="done"
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
              <FieldLabel palette={palette}>{requiredLabel(texts.confirmPassword)}</FieldLabel>
              <TextInput
                {...windowsTextInputFocusProps}
                onChangeText={onConfirmPasswordChange}
                onSubmitEditing={handleRegisterSubmit}
                placeholder="••••••••"
                placeholderTextColor={palette.textMuted}
                returnKeyType="done"
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
              {registerError ? (
                <Text style={styles.errorText}>{registerError}</Text>
              ) : null}
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
          </>
        ) : (
          <>
            <Card palette={palette} title={texts.registerRoot}>
              <BodyText palette={palette}>{texts.registerRootBody}</BodyText>
              <FieldLabel palette={palette}>{requiredLabel(texts.licenseCode)}</FieldLabel>
              <TextInput
                {...windowsTextInputFocusProps}
                autoCapitalize="characters"
                onChangeText={onLicenseCodeChange}
                onSubmitEditing={handleRegisterSubmit}
                placeholder="LICENSE-CODE"
                placeholderTextColor={palette.textMuted}
                returnKeyType="done"
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
              <FieldLabel palette={palette}>{requiredLabel(texts.academyName)}</FieldLabel>
              <TextInput
                {...windowsTextInputFocusProps}
                onChangeText={onAcademyNameChange}
                onSubmitEditing={handleRegisterSubmit}
                placeholder="My Academy"
                placeholderTextColor={palette.textMuted}
                returnKeyType="done"
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
              <FieldLabel palette={palette}>{requiredLabel(texts.rootLoginId)}</FieldLabel>
              <TextInput
                {...windowsTextInputFocusProps}
                autoCapitalize="none"
                onChangeText={onLoginIdChange}
                onSubmitEditing={handleRegisterSubmit}
                placeholder="root-admin"
                placeholderTextColor={palette.textMuted}
                returnKeyType="done"
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
              <FieldLabel palette={palette}>{requiredLabel(texts.displayName)}</FieldLabel>
              <TextInput
                {...windowsTextInputFocusProps}
                onChangeText={onDisplayNameChange}
                onSubmitEditing={handleRegisterSubmit}
                placeholder="Root Admin"
                placeholderTextColor={palette.textMuted}
                returnKeyType="done"
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
              <FieldLabel palette={palette}>{texts.email}</FieldLabel>
              <TextInput
                {...windowsTextInputFocusProps}
                autoCapitalize="none"
                keyboardType="email-address"
                onChangeText={onEmailChange}
                onSubmitEditing={handleRegisterSubmit}
                placeholder="root@example.com"
                placeholderTextColor={palette.textMuted}
                returnKeyType="done"
                style={[
                  styles.input,
                  {
                    backgroundColor: palette.muted,
                    borderColor: palette.border,
                    color: palette.text,
                  },
                ]}
                value={email}
              />
              <FieldLabel palette={palette}>{requiredLabel(texts.phone)}</FieldLabel>
              <TextInput
                {...windowsTextInputFocusProps}
                keyboardType="phone-pad"
                onChangeText={value => onPhoneChange(formatPhoneNumber(value))}
                onSubmitEditing={handleRegisterSubmit}
                placeholder="010-0000-0000"
                placeholderTextColor={palette.textMuted}
                returnKeyType="done"
                style={[
                  styles.input,
                  {
                    backgroundColor: palette.muted,
                    borderColor: palette.border,
                    color: palette.text,
                  },
                ]}
                value={phone}
              />
              <FieldLabel palette={palette}>{requiredLabel(texts.password)}</FieldLabel>
              <TextInput
                {...windowsTextInputFocusProps}
                onChangeText={onPasswordChange}
                onSubmitEditing={handleRegisterSubmit}
                placeholder="••••••••"
                placeholderTextColor={palette.textMuted}
                returnKeyType="done"
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
              <FieldLabel palette={palette}>{requiredLabel(texts.confirmPassword)}</FieldLabel>
              <TextInput
                {...windowsTextInputFocusProps}
                onChangeText={onConfirmPasswordChange}
                onSubmitEditing={handleRegisterSubmit}
                placeholder="••••••••"
                placeholderTextColor={palette.textMuted}
                returnKeyType="done"
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
              {registerError ? (
                <Text style={styles.errorText}>{registerError}</Text>
              ) : null}
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
            {texts.registerHint ? (
              <Card palette={palette} title={texts.registerCta ?? ''}>
                <BodyText palette={palette}>{texts.registerHint ?? ''}</BodyText>
              </Card>
            ) : null}
          </>
        )}
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.stack}>
      <View {...loginSectionProps}>{renderLoginCard()}</View>
      <View {...profileSectionProps}>{renderProfileCards()}</View>
    </ScrollView>
  );
}
