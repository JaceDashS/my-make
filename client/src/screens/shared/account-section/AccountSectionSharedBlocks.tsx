import React from 'react';
import {Animated, Text, TextInput, View} from 'react-native';

import {ActionButton} from '../../../shared/components/ActionButton';
import {windowsTextInputFocusProps} from '../../../shared/ui/windowsFocusProps';
import {
  formatAccountPhoneNumber,
  getPlaceholderCopy,
  type PlaceholderTarget,
} from '../account-section-model';

type UiComponents = {
  BodyText: React.ComponentType<any>;
  Card: React.ComponentType<any>;
  FieldLabel: React.ComponentType<any>;
  OptionChip: React.ComponentType<any>;
};

type SharedBlockProps = {
  palette: any;
  styles: any;
  texts: any;
  ui: UiComponents;
};

type LoginCardProps = SharedBlockProps & {
  authError: string | null;
  isSubmitting: boolean;
  loginId: string;
  loginMutedPalette: any;
  onLogin: () => void;
  onLoginIdChange: (value: string) => void;
  onOpenRegister: () => void;
  onPasswordChange: (value: string) => void;
  password: string;
};

type PlaceholderSectionProps = SharedBlockProps & {
  placeholderTarget: PlaceholderTarget;
  profileActivePalette: any;
  slideAnimation: Animated.Value;
};

type RegisterSectionProps = SharedBlockProps & {
  academyName: string;
  confirmPassword: string;
  displayName: string;
  email: string;
  handleRegisterSubmit: () => void;
  isSubmitting: boolean;
  licenseCode: string;
  loginId: string;
  onAcademyNameChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onDisplayNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onLicenseCodeChange: (value: string) => void;
  onLoginIdChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onRegister: () => void;
  onRegisterTypeChange: (value: 'user' | 'root') => void;
  onRequestedRoleCodeChange: (value: 'STUDENT' | 'TEACHER' | 'ADMIN') => void;
  password: string;
  phone: string;
  registerError: string | null;
  registerSuccess: string | null;
  registerType: 'user' | 'root';
  requestedRoleCode: 'STUDENT' | 'TEACHER' | 'ADMIN';
};

export function AccountLoginCard({
  authError,
  isSubmitting,
  loginId,
  loginMutedPalette,
  onLogin,
  onLoginIdChange,
  onOpenRegister,
  onPasswordChange,
  palette,
  password,
  styles,
  texts,
  ui,
}: LoginCardProps) {
  const {Card, FieldLabel} = ui;

  return (
    <Card palette={loginMutedPalette} title={texts.login}>
      <FieldLabel palette={loginMutedPalette}>{texts.loginId}</FieldLabel>
      <TextInput
        {...windowsTextInputFocusProps}
        autoCapitalize="none"
        autoComplete="username"
        onChangeText={onLoginIdChange}
        onSubmitEditing={onLogin}
        placeholder={texts.loginIdPlaceholder}
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
        autoComplete="current-password"
        onChangeText={onPasswordChange}
        onSubmitEditing={onLogin}
        placeholder={texts.passwordPlaceholder}
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
        <ActionButton
          backgroundColor={palette.soft}
          isLoading={false}
          label={texts.register}
          onPress={onOpenRegister}
          style={styles.actionButton}
          textColor={palette.text}
          titleStyle={styles.actionText}
        />
      </View>
    </Card>
  );
}

export function AccountPlaceholderSection({
  palette,
  placeholderTarget,
  profileActivePalette,
  slideAnimation,
  styles,
  texts,
  ui,
}: PlaceholderSectionProps) {
  const {BodyText, Card} = ui;
  const {body, title} = getPlaceholderCopy(placeholderTarget, texts);

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
}

export function AccountRegisterSection({
  academyName,
  confirmPassword,
  displayName,
  email,
  handleRegisterSubmit,
  isSubmitting,
  licenseCode,
  loginId,
  onAcademyNameChange,
  onConfirmPasswordChange,
  onDisplayNameChange,
  onEmailChange,
  onLicenseCodeChange,
  onLoginIdChange,
  onPasswordChange,
  onPhoneChange,
  onRegister,
  onRegisterTypeChange,
  onRequestedRoleCodeChange,
  palette,
  password,
  phone,
  registerError,
  registerSuccess,
  registerType,
  requestedRoleCode,
  styles,
  texts,
  ui,
}: RegisterSectionProps) {
  const {BodyText, Card, FieldLabel, OptionChip} = ui;
  const requiredLabel = (label: string) => `${label} *`;

  return (
    <>
      <Card palette={palette} title={texts.register}>
        <FieldLabel palette={palette}>{texts.registerType}</FieldLabel>
        <View style={styles.optionRow}>
          <OptionChip active={registerType === 'user'} label={texts.registerTypeUser} onPress={() => onRegisterTypeChange('user')} palette={palette} />
          <OptionChip active={registerType === 'root'} label={texts.registerTypeRoot} onPress={() => onRegisterTypeChange('root')} palette={palette} />
        </View>
      </Card>

      {registerType === 'user' ? (
        <Card palette={palette} title={texts.registerTypeUser}>
          <FieldLabel palette={palette}>{requiredLabel(texts.loginId)}</FieldLabel>
          <TextInput {...windowsTextInputFocusProps} autoCapitalize="none" autoComplete="username" onChangeText={onLoginIdChange} onSubmitEditing={handleRegisterSubmit} placeholder="new-member" placeholderTextColor={palette.textMuted} returnKeyType="done" style={[styles.input, {backgroundColor: palette.muted, borderColor: palette.border, color: palette.text}]} value={loginId} />
          <FieldLabel palette={palette}>{requiredLabel(texts.displayName)}</FieldLabel>
          <TextInput {...windowsTextInputFocusProps} onChangeText={onDisplayNameChange} onSubmitEditing={handleRegisterSubmit} placeholder="New Member" placeholderTextColor={palette.textMuted} returnKeyType="done" style={[styles.input, {backgroundColor: palette.muted, borderColor: palette.border, color: palette.text}]} value={displayName} />
          <FieldLabel palette={palette}>{texts.email}</FieldLabel>
          <TextInput {...windowsTextInputFocusProps} autoCapitalize="none" keyboardType="email-address" onChangeText={onEmailChange} onSubmitEditing={handleRegisterSubmit} placeholder="name@example.com" placeholderTextColor={palette.textMuted} returnKeyType="done" style={[styles.input, {backgroundColor: palette.muted, borderColor: palette.border, color: palette.text}]} value={email} />
          <FieldLabel palette={palette}>{requiredLabel(texts.phone)}</FieldLabel>
          <TextInput {...windowsTextInputFocusProps} keyboardType="phone-pad" onChangeText={value => onPhoneChange(formatAccountPhoneNumber(value))} onSubmitEditing={handleRegisterSubmit} placeholder="010-0000-0000" placeholderTextColor={palette.textMuted} returnKeyType="done" style={[styles.input, {backgroundColor: palette.muted, borderColor: palette.border, color: palette.text}]} value={phone} />
          <FieldLabel palette={palette}>{texts.memberRole}</FieldLabel>
          <View style={styles.optionRow}>
            <OptionChip active={requestedRoleCode === 'STUDENT'} label={texts.memberRoleStudent} onPress={() => onRequestedRoleCodeChange('STUDENT')} palette={palette} />
            <OptionChip active={requestedRoleCode === 'TEACHER'} label={texts.memberRoleTeacher} onPress={() => onRequestedRoleCodeChange('TEACHER')} palette={palette} />
            <OptionChip active={requestedRoleCode === 'ADMIN'} label={texts.memberRoleAdmin} onPress={() => onRequestedRoleCodeChange('ADMIN')} palette={palette} />
          </View>
          <FieldLabel palette={palette}>{requiredLabel(texts.password)}</FieldLabel>
          <TextInput {...windowsTextInputFocusProps} autoComplete="new-password" onChangeText={onPasswordChange} onSubmitEditing={handleRegisterSubmit} placeholder="••••••••" placeholderTextColor={palette.textMuted} returnKeyType="done" secureTextEntry style={[styles.input, {backgroundColor: palette.muted, borderColor: palette.border, color: palette.text}]} value={password} />
          <FieldLabel palette={palette}>{requiredLabel(texts.confirmPassword)}</FieldLabel>
          <TextInput {...windowsTextInputFocusProps} autoComplete="new-password" onChangeText={onConfirmPasswordChange} onSubmitEditing={handleRegisterSubmit} placeholder="••••••••" placeholderTextColor={palette.textMuted} returnKeyType="done" secureTextEntry style={[styles.input, {backgroundColor: palette.muted, borderColor: palette.border, color: palette.text}]} value={confirmPassword} />
          {registerError ? <Text style={styles.errorText}>{registerError}</Text> : null}
          {registerSuccess ? <Text style={[styles.bodyText, {color: palette.text}]}>{registerSuccess}</Text> : null}
          <View style={styles.optionRow}>
            <ActionButton backgroundColor={palette.primary} isLoading={isSubmitting} label={texts.createAccount} onPress={onRegister} style={styles.actionButton} textColor={palette.primaryText} titleStyle={styles.actionText} />
          </View>
        </Card>
      ) : (
        <>
          <Card palette={palette} title={texts.registerRoot}>
            <FieldLabel palette={palette}>{requiredLabel(texts.licenseCode)}</FieldLabel>
            <TextInput {...windowsTextInputFocusProps} autoCapitalize="characters" onChangeText={onLicenseCodeChange} onSubmitEditing={handleRegisterSubmit} placeholder="LICENSE-CODE" placeholderTextColor={palette.textMuted} returnKeyType="done" style={[styles.input, {backgroundColor: palette.muted, borderColor: palette.border, color: palette.text}]} value={licenseCode} />
            <FieldLabel palette={palette}>{requiredLabel(texts.academyName)}</FieldLabel>
            <TextInput {...windowsTextInputFocusProps} onChangeText={onAcademyNameChange} onSubmitEditing={handleRegisterSubmit} placeholder="My Academy" placeholderTextColor={palette.textMuted} returnKeyType="done" style={[styles.input, {backgroundColor: palette.muted, borderColor: palette.border, color: palette.text}]} value={academyName} />
            <FieldLabel palette={palette}>{requiredLabel(texts.rootLoginId)}</FieldLabel>
            <TextInput {...windowsTextInputFocusProps} autoCapitalize="none" autoComplete="username" onChangeText={onLoginIdChange} onSubmitEditing={handleRegisterSubmit} placeholder="root-admin" placeholderTextColor={palette.textMuted} returnKeyType="done" style={[styles.input, {backgroundColor: palette.muted, borderColor: palette.border, color: palette.text}]} value={loginId} />
            <FieldLabel palette={palette}>{requiredLabel(texts.displayName)}</FieldLabel>
            <TextInput {...windowsTextInputFocusProps} onChangeText={onDisplayNameChange} onSubmitEditing={handleRegisterSubmit} placeholder="Root Admin" placeholderTextColor={palette.textMuted} returnKeyType="done" style={[styles.input, {backgroundColor: palette.muted, borderColor: palette.border, color: palette.text}]} value={displayName} />
            <FieldLabel palette={palette}>{texts.email}</FieldLabel>
            <TextInput {...windowsTextInputFocusProps} autoCapitalize="none" keyboardType="email-address" onChangeText={onEmailChange} onSubmitEditing={handleRegisterSubmit} placeholder="root@example.com" placeholderTextColor={palette.textMuted} returnKeyType="done" style={[styles.input, {backgroundColor: palette.muted, borderColor: palette.border, color: palette.text}]} value={email} />
            <FieldLabel palette={palette}>{requiredLabel(texts.phone)}</FieldLabel>
            <TextInput {...windowsTextInputFocusProps} keyboardType="phone-pad" onChangeText={value => onPhoneChange(formatAccountPhoneNumber(value))} onSubmitEditing={handleRegisterSubmit} placeholder="010-0000-0000" placeholderTextColor={palette.textMuted} returnKeyType="done" style={[styles.input, {backgroundColor: palette.muted, borderColor: palette.border, color: palette.text}]} value={phone} />
            <FieldLabel palette={palette}>{requiredLabel(texts.password)}</FieldLabel>
            <TextInput {...windowsTextInputFocusProps} autoComplete="new-password" onChangeText={onPasswordChange} onSubmitEditing={handleRegisterSubmit} placeholder="••••••••" placeholderTextColor={palette.textMuted} returnKeyType="done" secureTextEntry style={[styles.input, {backgroundColor: palette.muted, borderColor: palette.border, color: palette.text}]} value={password} />
            <FieldLabel palette={palette}>{requiredLabel(texts.confirmPassword)}</FieldLabel>
            <TextInput {...windowsTextInputFocusProps} autoComplete="new-password" onChangeText={onConfirmPasswordChange} onSubmitEditing={handleRegisterSubmit} placeholder="••••••••" placeholderTextColor={palette.textMuted} returnKeyType="done" secureTextEntry style={[styles.input, {backgroundColor: palette.muted, borderColor: palette.border, color: palette.text}]} value={confirmPassword} />
            {registerError ? <Text style={styles.errorText}>{registerError}</Text> : null}
            {registerSuccess ? <Text style={[styles.bodyText, {color: palette.text}]}>{registerSuccess}</Text> : null}
            <View style={styles.optionRow}>
              <ActionButton backgroundColor={palette.primary} isLoading={isSubmitting} label={texts.createAccount} onPress={onRegister} style={styles.actionButton} textColor={palette.primaryText} titleStyle={styles.actionText} />
            </View>
          </Card>
        </>
      )}
    </>
  );
}
