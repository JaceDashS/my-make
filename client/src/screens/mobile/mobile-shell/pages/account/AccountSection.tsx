import React, {useEffect, useRef, useState} from 'react';
import {Animated, ScrollView, Text, TextInput, View} from 'react-native';

import {ActionButton} from '../../../../../shared/components/ActionButton';
import {windowsTextInputFocusProps} from '../../../../../shared/ui/windowsFocusProps';
import {BodyStrong, BodyText, Card, FieldLabel, OptionChip} from '../../components/ui';
import {mobileShellStyles as styles} from '../../config/styles';
import type {MobileShellPalette} from '../../model/types';
import type {AccountSection as AccountSectionType} from '../../../../shared/shell-model';

type ProfileDetail = {key: string; label: string; value: string};
type EditableField =
  | 'password'
  | 'email'
  | 'phone'
  | 'note'
  | 'authPolicy'
  | 'statusCode';
type PlaceholderTarget =
  | 'preset'
  | 'availableSchedule'
  | 'reservationView'
  | 'studentOptions'
  | 'reservation'
  | null;

type AccountTexts = {
  academyCode: string;
  academyName: string;
  cancel: string;
  back: string;
  confirmPassword: string;
  createAccount: string;
  displayName: string;
  edit: string;
  email: string;
  guestHint: string;
  licenseCode: string;
  login: string;
  loginId: string;
  loginNotice: string;
  memberRegisterBody: string;
  memberRole: string;
  memberRoleAdmin: string;
  memberRoleStudent: string;
  memberRoleTeacher: string;
  note: string;
  password: string;
  passwordMismatch: string;
  presetPlaceholderBody: string;
  presetPlaceholderTitle: string;
  phone: string;
  profile: string;
  profileBody: string;
  protectedControls: string;
  protectedUnlocked: string;
  register: string;
  registerBody: string;
  registerCta?: string;
  registerHint?: string;
  registerRoot: string;
  registerRootBody: string;
  registerType: string;
  registerTypeRoot: string;
  registerTypeUser: string;
  reservation: string;
  reservationPlaceholderBody: string;
  reservationPlaceholderTitle: string;
  reservationView: string;
  reservationViewPlaceholderBody: string;
  reservationViewPlaceholderTitle: string;
  rootLoginId: string;
  save: string;
  signIn: string;
  signOut: string;
  status: string;
  studentOptions: string;
  studentOptionsPlaceholderBody: string;
  studentOptionsPlaceholderTitle: string;
  statusActive: string;
  statusHold: string;
  statusInactive: string;
  availableSchedulePlaceholderBody: string;
  availableSchedulePlaceholderTitle: string;
};

type Props = {
  accountCode: string;
  academyCode: string;
  academyName: string;
  authError: string | null;
  authNotice: string | null;
  authPolicy: string;
  canEditAuthPolicy: boolean;
  canEditStatus: boolean;
  confirmPassword: string;
  currentSection: AccountSectionType;
  displayName: string;
  email: string;
  isAuthenticated: boolean;
  isSubmitting: boolean;
  licenseCode: string;
  loginId: string;
  note: string;
  onAcademyNameChange: (value: string) => void;
  onAuthPolicyChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onDisplayNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onLicenseCodeChange: (value: string) => void;
  onLogin: () => void;
  onLoginIdChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onLogout: () => void;
  onPasswordChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onProfilePasswordChange: (value: string) => void;
  onRegister: () => void;
  onRegisterTypeChange: (value: 'user' | 'root') => void;
  onRequestedRoleCodeChange: (value: 'STUDENT' | 'TEACHER' | 'ADMIN') => void;
  onSaveProfile: (overrides?: {
    authPolicy?: string;
    email?: string;
    note?: string;
    password?: string;
    phone?: string;
    statusCode?: string;
  }) => Promise<void> | void;
  onStatusCodeChange: (value: string) => void;
  palette: MobileShellPalette;
  password: string;
  phone: string;
  profileDetails: ProfileDetail[];
  profilePassword: string;
  registerError: string | null;
  registerSuccess: string | null;
  registerType: 'user' | 'root';
  requestedRoleCode: 'STUDENT' | 'TEACHER' | 'ADMIN';
  statusCode: string;
  texts: AccountTexts;
};

export function AccountSection({
  academyName,
  authError,
  authNotice,
  authPolicy,
  canEditAuthPolicy,
  canEditStatus,
  confirmPassword,
  currentSection,
  displayName,
  email,
  isAuthenticated,
  isSubmitting,
  licenseCode,
  loginId,
  note,
  onAcademyNameChange,
  onAuthPolicyChange,
  onConfirmPasswordChange,
  onDisplayNameChange,
  onEmailChange,
  onLicenseCodeChange,
  onLogin,
  onLoginIdChange,
  onNoteChange,
  onLogout,
  onPasswordChange,
  onPhoneChange,
  onProfilePasswordChange,
  onRegister,
  onRegisterTypeChange,
  onRequestedRoleCodeChange,
  onSaveProfile,
  onStatusCodeChange,
  palette,
  password,
  phone,
  profileDetails,
  registerError,
  registerSuccess,
  registerType,
  requestedRoleCode,
  statusCode,
  texts,
}: Props) {
  const [activeEditor, setActiveEditor] = useState<EditableField | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [draftPassword, setDraftPassword] = useState('');
  const [draftPasswordConfirm, setDraftPasswordConfirm] = useState('');
  const [draftEmail, setDraftEmail] = useState('');
  const [draftPhone, setDraftPhone] = useState('');
  const [draftNote, setDraftNote] = useState('');
  const [draftAuthPolicy, setDraftAuthPolicy] = useState('');
  const [draftStatusCode, setDraftStatusCode] = useState('');
  const placeholderTarget: PlaceholderTarget =
    currentSection === 'preset'
      ? 'preset'
      : currentSection === 'available-schedule'
      ? 'availableSchedule'
      : currentSection === 'reservation-view'
      ? 'reservationView'
      : currentSection === 'student-options'
      ? 'studentOptions'
      : currentSection === 'reservation'
      ? 'reservation'
      : null;
  const slideAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slideAnimation, {
      duration: 220,
      toValue: placeholderTarget ? 1 : 0,
      useNativeDriver: true,
    }).start();
  }, [placeholderTarget, slideAnimation]);

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
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

  const openEditor = (field: EditableField) => {
    console.log('[mobile/profile] openEditor', {field});
    setActiveEditor(field);
    setEditorError(null);
    switch (field) {
      case 'password':
        setDraftPassword('');
        setDraftPasswordConfirm('');
        break;
      case 'email':
        setDraftEmail(email);
        break;
      case 'phone':
        setDraftPhone(phone);
        break;
      case 'note':
        setDraftNote(note);
        break;
      case 'authPolicy':
        setDraftAuthPolicy(authPolicy);
        break;
      case 'statusCode':
        setDraftStatusCode(statusCode);
        break;
    }
  };

  const closeEditor = () => {
    setActiveEditor(null);
    setEditorError(null);
    setDraftPassword('');
    setDraftPasswordConfirm('');
  };

  const commitEditor = async () => {
    let overrides:
      | {
          authPolicy?: string;
          email?: string;
          note?: string;
          password?: string;
          phone?: string;
          statusCode?: string;
        }
      | undefined;

    switch (activeEditor) {
      case 'password':
        if (!draftPassword || draftPassword !== draftPasswordConfirm) {
          setEditorError(texts.passwordMismatch);
          return;
        }
        onProfilePasswordChange(draftPassword);
        overrides = {password: draftPassword};
        break;
      case 'email':
        onEmailChange(draftEmail);
        overrides = {email: draftEmail};
        break;
      case 'phone':
        overrides = {phone: formatPhoneNumber(draftPhone)};
        onPhoneChange(overrides.phone);
        break;
      case 'note':
        onNoteChange(draftNote);
        overrides = {note: draftNote};
        break;
      case 'authPolicy':
        onAuthPolicyChange(draftAuthPolicy);
        overrides = {authPolicy: draftAuthPolicy};
        break;
      case 'statusCode':
        onStatusCodeChange(draftStatusCode);
        overrides = {statusCode: draftStatusCode};
        break;
      default:
        return;
    }

    await Promise.resolve(onSaveProfile(overrides));
    closeEditor();
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
      <TextInput {...windowsTextInputFocusProps} autoCapitalize="none" onChangeText={onLoginIdChange} onSubmitEditing={onLogin} placeholder="root-admin" placeholderTextColor={palette.textMuted} returnKeyType="done" style={[styles.input, {backgroundColor: palette.muted, borderColor: palette.border, color: loginMutedPalette.text}]} value={loginId} />
      <FieldLabel palette={loginMutedPalette}>{texts.password}</FieldLabel>
      <TextInput {...windowsTextInputFocusProps} onChangeText={onPasswordChange} onSubmitEditing={onLogin} placeholder="••••••••" placeholderTextColor={palette.textMuted} returnKeyType="done" secureTextEntry style={[styles.input, {backgroundColor: palette.muted, borderColor: palette.border, color: loginMutedPalette.text}]} value={password} />
      {authNotice ? (
        <Card palette={loginMutedPalette} title={texts.loginNotice}>
          <BodyText palette={loginMutedPalette}>{authNotice}</BodyText>
        </Card>
      ) : null}
      {authError ? <Text style={styles.errorText}>{authError}</Text> : null}
      <View style={styles.optionRow}>
        <ActionButton backgroundColor={palette.primary} isLoading={isSubmitting} label={texts.signIn} onPress={onLogin} style={styles.actionButton} textColor={palette.primaryText} titleStyle={styles.actionText} />
      </View>
    </Card>
  );

  const isEditableDetail = (key: string) =>
    key === 'password' ||
    key === 'email' ||
    key === 'phone' ||
    key === 'note' ||
    (key === 'authPolicy' && canEditAuthPolicy) ||
    (key === 'statusCode' && canEditStatus);

  const standardProfileDetails = profileDetails.filter(
    detail =>
      detail.key !== 'preset' &&
      detail.key !== 'availableSchedule' &&
      detail.key !== 'skinLValue' &&
      detail.key !== 'skinCValue' &&
      detail.key !== 'skinHValue' &&
      detail.key !== 'skinTraits' &&
      detail.key !== 'preferenceRanges',
  );

  const renderEditor = (field: EditableField) => {
    if (activeEditor !== field) {
      return null;
    }

    if (field === 'statusCode') {
      return (
        <View style={styles.profileFieldEditor}>
          <View style={styles.optionRow}>
            <OptionChip active={draftStatusCode === 'ACTIVE'} label={texts.statusActive} onPress={() => setDraftStatusCode('ACTIVE')} palette={profileActivePalette} />
            <OptionChip active={draftStatusCode === 'HOLD'} label={texts.statusHold} onPress={() => setDraftStatusCode('HOLD')} palette={profileActivePalette} />
            <OptionChip active={draftStatusCode === 'INACTIVE'} label={texts.statusInactive} onPress={() => setDraftStatusCode('INACTIVE')} palette={profileActivePalette} />
          </View>
          <View style={styles.profileFieldActions}>
            <ActionButton backgroundColor={palette.primary} isLoading={isSubmitting} label={texts.save} onPress={commitEditor} style={styles.profileActionButton} textColor={palette.primaryText} titleStyle={styles.profileActionButtonText} />
            <ActionButton backgroundColor={palette.soft} isLoading={false} label={texts.cancel} onPress={closeEditor} style={styles.profileActionButton} textColor={palette.text} titleStyle={styles.profileActionButtonText} />
          </View>
        </View>
      );
    }

    if (field === 'password') {
      return (
        <View style={styles.profileFieldEditor}>
          <TextInput
            {...windowsTextInputFocusProps}
            onChangeText={value => {
              setDraftPassword(value);
              setEditorError(null);
            }}
            placeholder="••••••••"
            placeholderTextColor={palette.textMuted}
            secureTextEntry
            style={[
              styles.input,
              styles.profileFieldInput,
              {
                backgroundColor: palette.muted,
                borderColor: palette.border,
                color: profileActivePalette.text,
                width: '100%',
              },
            ]}
            value={draftPassword}
          />
          <TextInput
            {...windowsTextInputFocusProps}
            onChangeText={value => {
              setDraftPasswordConfirm(value);
              setEditorError(null);
            }}
            placeholder="••••••••"
            placeholderTextColor={palette.textMuted}
            secureTextEntry
            style={[
              styles.input,
              styles.profileFieldInput,
              {
                backgroundColor: palette.muted,
                borderColor: palette.border,
                color: profileActivePalette.text,
                width: '100%',
              },
            ]}
            value={draftPasswordConfirm}
          />
          {editorError ? <Text style={styles.errorText}>{editorError}</Text> : null}
          <View style={styles.profileFieldActions}>
            <ActionButton backgroundColor={palette.primary} isLoading={isSubmitting} label={texts.save} onPress={commitEditor} style={styles.profileActionButton} textColor={palette.primaryText} titleStyle={styles.profileActionButtonText} />
            <ActionButton backgroundColor={palette.soft} isLoading={false} label={texts.cancel} onPress={closeEditor} style={styles.profileActionButton} textColor={palette.text} titleStyle={styles.profileActionButtonText} />
          </View>
        </View>
      );
    }

    const value =
      field === 'password'
        ? draftPassword
        : field === 'email'
        ? draftEmail
        : field === 'phone'
        ? draftPhone
        : field === 'note'
        ? draftNote
        : draftAuthPolicy;
    const onChangeText =
      field === 'password'
        ? setDraftPassword
        : field === 'email'
        ? setDraftEmail
        : field === 'phone'
        ? setDraftPhone
        : field === 'note'
        ? setDraftNote
        : setDraftAuthPolicy;

    return (
      <View style={styles.profileFieldEditor}>
        <TextInput
          {...windowsTextInputFocusProps}
          autoCapitalize={field === 'email' ? 'none' : 'sentences'}
          keyboardType={field === 'email' ? 'email-address' : field === 'phone' ? 'phone-pad' : 'default'}
          multiline={field === 'note' || field === 'authPolicy'}
          onChangeText={onChangeText}
          placeholder={field === 'password' ? '••••••••' : ''}
          placeholderTextColor={palette.textMuted}
          secureTextEntry={field === 'password'}
          style={[
            styles.input,
            styles.profileFieldInput,
            (field === 'note' || field === 'authPolicy') && styles.profileNoteInput,
            field !== 'note' && field !== 'authPolicy' && {width: '100%'},
            {
              backgroundColor: palette.muted,
              borderColor: palette.border,
              color: profileActivePalette.text,
            },
          ]}
          value={value}
        />
        <View style={styles.profileFieldActions}>
          <ActionButton backgroundColor={palette.primary} isLoading={isSubmitting} label={texts.save} onPress={commitEditor} style={styles.profileActionButton} textColor={palette.primaryText} titleStyle={styles.profileActionButtonText} />
          <ActionButton backgroundColor={palette.soft} isLoading={false} label={texts.cancel} onPress={closeEditor} style={styles.profileActionButton} textColor={palette.text} titleStyle={styles.profileActionButtonText} />
        </View>
      </View>
    );
  };

  const renderProfileField = (detail: ProfileDetail) => (
    <View key={`${detail.key}:${detail.label}`} style={styles.profileFieldBlock}>
      <View style={styles.profileFieldHeader}>
        <View style={styles.profileFieldRow}>
          <FieldLabel palette={profileActivePalette} style={styles.profileFieldLabel}>{detail.label}</FieldLabel>
          <BodyStrong palette={profileActivePalette} style={styles.profileFieldValue}>{detail.value || '-'}</BodyStrong>
        </View>
        {isEditableDetail(detail.key) ? (
          <ActionButton
            backgroundColor={palette.soft}
            isLoading={false}
            label="✎"
            onPress={() => openEditor(detail.key as EditableField)}
            style={styles.profileIconButton}
            textColor={palette.text}
            titleStyle={styles.profileIconButtonText}
          />
        ) : null}
      </View>
      {renderEditor(detail.key as EditableField)}
    </View>
  );

  const renderProfileCards = () => (
    <>
      <Card palette={profileActivePalette} title={texts.profile}>
        <BodyText palette={profileActivePalette}>{texts.profileBody}</BodyText>
        {standardProfileDetails.map(renderProfileField)}
        {authNotice ? <Text style={[styles.bodyText, {color: palette.text}]}>{authNotice}</Text> : null}
        {authError ? <Text style={styles.errorText}>{authError}</Text> : null}
      </Card>
      <Card palette={profileActivePalette} title={texts.protectedControls}>
        <BodyText palette={profileActivePalette}>{texts.protectedUnlocked}</BodyText>
        <View style={styles.optionRow}>
          <ActionButton backgroundColor={palette.soft} isLoading={isSubmitting} label={texts.signOut} onPress={onLogout} style={styles.actionButton} textColor={palette.text} titleStyle={styles.actionText} />
        </View>
      </Card>
    </>
  );

  const renderPlaceholderScreen = () => {
    const title =
      placeholderTarget === 'preset'
        ? texts.presetPlaceholderTitle
        : placeholderTarget === 'availableSchedule'
        ? texts.availableSchedulePlaceholderTitle
        : placeholderTarget === 'reservationView'
        ? texts.reservationViewPlaceholderTitle
        : placeholderTarget === 'reservation'
        ? texts.reservationPlaceholderTitle
        : texts.studentOptionsPlaceholderTitle;
    const body =
      placeholderTarget === 'preset'
        ? texts.presetPlaceholderBody
        : placeholderTarget === 'availableSchedule'
        ? texts.availableSchedulePlaceholderBody
        : placeholderTarget === 'reservationView'
        ? texts.reservationViewPlaceholderBody
        : placeholderTarget === 'reservation'
        ? texts.reservationPlaceholderBody
        : texts.studentOptionsPlaceholderBody;

    return (
      <Animated.View
        style={{
          transform: [
            {
              translateX: slideAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [80, 0],
              }),
            },
          ],
        }}>
        <Card palette={profileActivePalette} title={title}>
          <BodyText palette={profileActivePalette}>{body}</BodyText>
        </Card>
      </Animated.View>
    );
  };

  if (currentSection === 'register' && !isAuthenticated) {
    return (
      <ScrollView key={`register-${registerType}`} contentContainerStyle={styles.stack}>
        <Card palette={palette} title={texts.register}>
          <BodyText palette={palette}>{texts.registerBody}</BodyText>
          <FieldLabel palette={palette}>{texts.registerType}</FieldLabel>
          <View style={styles.optionRow}>
            <OptionChip active={registerType === 'user'} label={texts.registerTypeUser} onPress={() => onRegisterTypeChange('user')} palette={palette} />
            <OptionChip active={registerType === 'root'} label={texts.registerTypeRoot} onPress={() => onRegisterTypeChange('root')} palette={palette} />
          </View>
        </Card>

        {registerType === 'user' ? (
          <Card palette={palette} title={texts.registerTypeUser}>
            <BodyText palette={palette}>{texts.memberRegisterBody}</BodyText>
            <FieldLabel palette={palette}>{requiredLabel(texts.loginId)}</FieldLabel>
            <TextInput {...windowsTextInputFocusProps} autoCapitalize="none" onChangeText={onLoginIdChange} onSubmitEditing={handleRegisterSubmit} placeholder="new-member" placeholderTextColor={palette.textMuted} returnKeyType="done" style={[styles.input, {backgroundColor: palette.muted, borderColor: palette.border, color: palette.text}]} value={loginId} />
            <FieldLabel palette={palette}>{requiredLabel(texts.displayName)}</FieldLabel>
            <TextInput {...windowsTextInputFocusProps} onChangeText={onDisplayNameChange} onSubmitEditing={handleRegisterSubmit} placeholder="New Member" placeholderTextColor={palette.textMuted} returnKeyType="done" style={[styles.input, {backgroundColor: palette.muted, borderColor: palette.border, color: palette.text}]} value={displayName} />
            <FieldLabel palette={palette}>{texts.email}</FieldLabel>
            <TextInput {...windowsTextInputFocusProps} autoCapitalize="none" keyboardType="email-address" onChangeText={onEmailChange} onSubmitEditing={handleRegisterSubmit} placeholder="name@example.com" placeholderTextColor={palette.textMuted} returnKeyType="done" style={[styles.input, {backgroundColor: palette.muted, borderColor: palette.border, color: palette.text}]} value={email} />
            <FieldLabel palette={palette}>{requiredLabel(texts.phone)}</FieldLabel>
            <TextInput {...windowsTextInputFocusProps} keyboardType="phone-pad" onChangeText={value => onPhoneChange(formatPhoneNumber(value))} onSubmitEditing={handleRegisterSubmit} placeholder="010-0000-0000" placeholderTextColor={palette.textMuted} returnKeyType="done" style={[styles.input, {backgroundColor: palette.muted, borderColor: palette.border, color: palette.text}]} value={phone} />
            <FieldLabel palette={palette}>{texts.memberRole}</FieldLabel>
            <View style={styles.optionRow}>
              <OptionChip active={requestedRoleCode === 'STUDENT'} label={texts.memberRoleStudent} onPress={() => onRequestedRoleCodeChange('STUDENT')} palette={palette} />
              <OptionChip active={requestedRoleCode === 'TEACHER'} label={texts.memberRoleTeacher} onPress={() => onRequestedRoleCodeChange('TEACHER')} palette={palette} />
              <OptionChip active={requestedRoleCode === 'ADMIN'} label={texts.memberRoleAdmin} onPress={() => onRequestedRoleCodeChange('ADMIN')} palette={palette} />
            </View>
            <FieldLabel palette={palette}>{requiredLabel(texts.password)}</FieldLabel>
            <TextInput {...windowsTextInputFocusProps} onChangeText={onPasswordChange} onSubmitEditing={handleRegisterSubmit} placeholder="••••••••" placeholderTextColor={palette.textMuted} returnKeyType="done" secureTextEntry style={[styles.input, {backgroundColor: palette.muted, borderColor: palette.border, color: palette.text}]} value={password} />
            <FieldLabel palette={palette}>{requiredLabel(texts.confirmPassword)}</FieldLabel>
            <TextInput {...windowsTextInputFocusProps} onChangeText={onConfirmPasswordChange} onSubmitEditing={handleRegisterSubmit} placeholder="••••••••" placeholderTextColor={palette.textMuted} returnKeyType="done" secureTextEntry style={[styles.input, {backgroundColor: palette.muted, borderColor: palette.border, color: palette.text}]} value={confirmPassword} />
            {registerError ? <Text style={styles.errorText}>{registerError}</Text> : null}
            {registerSuccess ? <Text style={[styles.bodyText, {color: palette.text}]}>{registerSuccess}</Text> : null}
            <View style={styles.optionRow}>
              <ActionButton backgroundColor={palette.primary} isLoading={isSubmitting} label={texts.createAccount} onPress={onRegister} style={styles.actionButton} textColor={palette.primaryText} titleStyle={styles.actionText} />
            </View>
          </Card>
        ) : (
          <>
            <Card palette={palette} title={texts.registerRoot}>
              <BodyText palette={palette}>{texts.registerRootBody}</BodyText>
              <FieldLabel palette={palette}>{requiredLabel(texts.licenseCode)}</FieldLabel>
              <TextInput {...windowsTextInputFocusProps} autoCapitalize="characters" onChangeText={onLicenseCodeChange} onSubmitEditing={handleRegisterSubmit} placeholder="LICENSE-CODE" placeholderTextColor={palette.textMuted} returnKeyType="done" style={[styles.input, {backgroundColor: palette.muted, borderColor: palette.border, color: palette.text}]} value={licenseCode} />
              <FieldLabel palette={palette}>{requiredLabel(texts.academyName)}</FieldLabel>
              <TextInput {...windowsTextInputFocusProps} onChangeText={onAcademyNameChange} onSubmitEditing={handleRegisterSubmit} placeholder="My Academy" placeholderTextColor={palette.textMuted} returnKeyType="done" style={[styles.input, {backgroundColor: palette.muted, borderColor: palette.border, color: palette.text}]} value={academyName} />
              <FieldLabel palette={palette}>{requiredLabel(texts.rootLoginId)}</FieldLabel>
              <TextInput {...windowsTextInputFocusProps} autoCapitalize="none" onChangeText={onLoginIdChange} onSubmitEditing={handleRegisterSubmit} placeholder="root-admin" placeholderTextColor={palette.textMuted} returnKeyType="done" style={[styles.input, {backgroundColor: palette.muted, borderColor: palette.border, color: palette.text}]} value={loginId} />
              <FieldLabel palette={palette}>{requiredLabel(texts.displayName)}</FieldLabel>
              <TextInput {...windowsTextInputFocusProps} onChangeText={onDisplayNameChange} onSubmitEditing={handleRegisterSubmit} placeholder="Root Admin" placeholderTextColor={palette.textMuted} returnKeyType="done" style={[styles.input, {backgroundColor: palette.muted, borderColor: palette.border, color: palette.text}]} value={displayName} />
              <FieldLabel palette={palette}>{texts.email}</FieldLabel>
              <TextInput {...windowsTextInputFocusProps} autoCapitalize="none" keyboardType="email-address" onChangeText={onEmailChange} onSubmitEditing={handleRegisterSubmit} placeholder="root@example.com" placeholderTextColor={palette.textMuted} returnKeyType="done" style={[styles.input, {backgroundColor: palette.muted, borderColor: palette.border, color: palette.text}]} value={email} />
              <FieldLabel palette={palette}>{requiredLabel(texts.phone)}</FieldLabel>
              <TextInput {...windowsTextInputFocusProps} keyboardType="phone-pad" onChangeText={value => onPhoneChange(formatPhoneNumber(value))} onSubmitEditing={handleRegisterSubmit} placeholder="010-0000-0000" placeholderTextColor={palette.textMuted} returnKeyType="done" style={[styles.input, {backgroundColor: palette.muted, borderColor: palette.border, color: palette.text}]} value={phone} />
              <FieldLabel palette={palette}>{requiredLabel(texts.password)}</FieldLabel>
              <TextInput {...windowsTextInputFocusProps} onChangeText={onPasswordChange} onSubmitEditing={handleRegisterSubmit} placeholder="••••••••" placeholderTextColor={palette.textMuted} returnKeyType="done" secureTextEntry style={[styles.input, {backgroundColor: palette.muted, borderColor: palette.border, color: palette.text}]} value={password} />
              <FieldLabel palette={palette}>{requiredLabel(texts.confirmPassword)}</FieldLabel>
              <TextInput {...windowsTextInputFocusProps} onChangeText={onConfirmPasswordChange} onSubmitEditing={handleRegisterSubmit} placeholder="••••••••" placeholderTextColor={palette.textMuted} returnKeyType="done" secureTextEntry style={[styles.input, {backgroundColor: palette.muted, borderColor: palette.border, color: palette.text}]} value={confirmPassword} />
              {registerError ? <Text style={styles.errorText}>{registerError}</Text> : null}
              {registerSuccess ? <Text style={[styles.bodyText, {color: palette.text}]}>{registerSuccess}</Text> : null}
              <View style={styles.optionRow}>
                <ActionButton backgroundColor={palette.primary} isLoading={isSubmitting} label={texts.createAccount} onPress={onRegister} style={styles.actionButton} textColor={palette.primaryText} titleStyle={styles.actionText} />
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
      <View {...profileSectionProps}>
        {placeholderTarget ? renderPlaceholderScreen() : renderProfileCards()}
      </View>
    </ScrollView>
  );
}
