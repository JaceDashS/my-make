import React, {useEffect, useRef, useState} from 'react';
import {Animated, ScrollView, Text, TextInput, View} from 'react-native';

import {ActionButton} from '../../../shared/components/ActionButton';
import {windowsTextInputFocusProps} from '../../../shared/ui/windowsFocusProps';
import {
  asEditableProfileField,
  formatAccountPhoneNumber,
  getEditorInitialDrafts,
  getStandardProfileDetails,
  isEditableProfileDetail,
  resolvePlaceholderTarget,
  type EditableField,
  type ProfileDetail,
} from '../account-section-model';
import {
  AccountLoginCard,
  AccountPlaceholderSection,
  AccountRegisterSection,
} from './AccountSectionSharedBlocks';
import type {AccountSection as AccountSectionType} from '../shell-model';

type UiComponents = {
  BodyStrong: React.ComponentType<any>;
  BodyText: React.ComponentType<any>;
  Card: React.ComponentType<any>;
  FieldLabel: React.ComponentType<any>;
  OptionChip: React.ComponentType<any>;
};

export type AccountSectionPalette = {
  border: string;
  card: string;
  muted: string;
  primary: string;
  primaryText: string;
  soft: string;
  text: string;
  textMuted: string;
  [key: string]: string;
};

export type AccountTexts = {
  academyCode: string;
  academyName: string;
  availableSchedule: string;
  cancel: string;
  back: string;
  confirmPassword: string;
  createAccount: string;
  displayName: string;
  edit: string;
  email: string;
  guestHint: string;
  licenseCode: string;
  locked?: string;
  login: string;
  loginId: string;
  loginIdPlaceholder: string;
  loginNotice: string;
  memberRegisterBody: string;
  memberRegisterSuccess?: string;
  memberRole: string;
  memberRoleAdmin: string;
  memberRoleStudent: string;
  memberRoleTeacher: string;
  note: string;
  password: string;
  passwordPlaceholder: string;
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
  reservationTeacher: string;
  reservationSelectDate: string;
  reservationTimeSlots: string;
  reservationConfirm: string;
  reservationDate: string;
  reservationTime: string;
  reservationBookLesson: string;
  reservationBooked: string;
  reservationBookedBody: string;
  reservationMyList: string;
  reservationNone: string;
  reservationSlotTaken: string;
  reservationSlotBooked: string;
  reservationStatusConfirmed: string;
  reservationStatusPending: string;
  reservationStatusCanceled: string;
  reservationDetails: string;
  reservationHideDetails: string;
  reservationPreset: string;
  reservationNote: string;
  reservationCosmetics: string;
  reservationNoCosmetics: string;
  reservationViewApprove: string;
  reservationViewEmpty: string;
  reservationViewPending: string;
  reservationViewCanceled: string;
  reservationViewReject: string;
  reservationViewStudent: string;
  reservationViewUpcoming: string;
  reservationViewMismatchGuide: string;
  reservationViewNoPreference: string;
  reservationViewPass: string;
  reservationViewPreferenceRanges: string;
  reservationViewPresetItems: string;
  reservationViewSkin: string;
  reservationViewTrait: string;
  rootLoginId: string;
  save: string;
  signIn: string;
  signOut: string;
  status: string;
  studentOptions: string;
  studentOptionsPlaceholderBody: string;
  studentOptionsPlaceholderTitle: string;
  studentOptionsSkinData: string;
  studentOptionsMySkin: string;
  studentOptionsTraits: string;
  studentOptionsPreferencePoints: string;
  studentOptionsCategory: string;
  studentOptionsActions: string;
  studentOptionsLightness: string;
  studentOptionsHue: string;
  studentOptionsChroma: string;
  studentOptionsRangeRadius: string;
  studentOptionsSave: string;
  studentOptionsReset: string;
  studentOptionsDone: string;
  studentOptionsToolSelect: string;
  studentOptionsToolRange: string;
  studentOptionsZoom: string;
  studentOptionsTraitsPlaceholder: string;
  studentOptionsNoTraits: string;
  studentOptionsNoPoints: string;
  studentOptionsPoints: string;
  studentOptionsDeleteTitle: string;
  studentOptionsDeleteMessage: string;
  studentOptionsDeleteConfirm: string;
  studentOptionsUseFullSkinRange: string;
  statusActive: string;
  statusHold: string;
  statusInactive: string;
  availableSchedulePlaceholderBody: string;
  availableSchedulePlaceholderTitle: string;
  availableScheduleGuide: string;
  availableScheduleTimezone: string;
  availableScheduleWeeklyGrid: string;
  availableScheduleSlotsSelected: string;
  availableScheduleBusinessHours: string;
  availableScheduleClearAll: string;
  availableScheduleTimeColumn: string;
  availableScheduleClearDay: string;
  availableScheduleExceptions: string;
  availableScheduleExceptionGuide: string;
  availableScheduleAddException: string;
  availableScheduleExceptionClosed: string;
  availableScheduleExceptionCustomSlots: string;
  availableScheduleAddSlot: string;
  availableScheduleSlotTo: string;
  availableScheduleSave: string;
  availableScheduleExceptionPeriodBlock?: string;
  availableScheduleExceptionTimeBlock?: string;
  availableScheduleExceptionAllDay?: string;
  availableScheduleExceptionSpecificTime?: string;
  availableScheduleExceptionStartDate?: string;
  availableScheduleExceptionEndDate?: string;
  availableScheduleExceptionDate?: string;
  reservationTimezone: string;
  presetTitle: string;
  presetNew: string;
  presetName: string;
  presetSave: string;
  presetDelete: string;
  presetDeleteConfirm: string;
  presetShowDetails: string;
  presetHideDetails: string;
  presetSummary: string;
  presetNoItems: string;
  presetCategoryAll: string;
  presetSearch: string;
  presetSearchPlaceholder: string;
  presetManualItemNamePlaceholder: string;
  presetManualAdd: string;
  presetManualCategoryRequired: string;
  presetItemName: string;
  presetSku: string;
  presetLch: string;
  presetCategoryBaseFoundation: string;
  presetCategoryBlush: string;
  presetCategoryLipColor: string;
  presetCategoryEyeshadow: string;
  presetCategoryContour: string;
  presetCategoryHighlighter: string;
  presetCategoryEtc: string;
};

type Props = {
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
  onOpenRegister: () => void;
  onLogout: () => void;
  onPasswordChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onProfilePasswordChange: (value: string) => void;
  onRegister: () => void;
  onRegisterTypeChange: (value: 'user' | 'root') => void;
  onRequestedRoleCodeChange: (value: 'STUDENT' | 'TEACHER' | 'ADMIN') => void;
  onSaveProfile: (overrides?: {
    availableSchedule?: string;
    authPolicy?: string;
    email?: string;
    note?: string;
    password?: string;
    phone?: string;
    preset?: string;
    statusCode?: string;
  }) => Promise<void> | void;
  onStatusCodeChange: (value: string) => void;
  palette: AccountSectionPalette;
  password: string;
  phone: string;
  profileDetails: ProfileDetail[];
  registerError: string | null;
  registerSuccess: string | null;
  registerType: 'user' | 'root';
  requestedRoleCode: 'STUDENT' | 'TEACHER' | 'ADMIN';
  statusCode: string;
  styles: any;
  texts: AccountTexts;
  ui: UiComponents;
};

export function AccountSection({
  academyName,
  authError,
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
  onOpenRegister,
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
  styles,
  texts,
  ui: {BodyStrong, BodyText, Card, FieldLabel, OptionChip},
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
  const placeholderTarget = resolvePlaceholderTarget(currentSection);
  const slideAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slideAnimation, {
      duration: 220,
      toValue: placeholderTarget ? 1 : 0,
      useNativeDriver: true,
    }).start();
  }, [placeholderTarget, slideAnimation]);

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
    setActiveEditor(field);
    setEditorError(null);
    const drafts = getEditorInitialDrafts(field, {
      authPolicy,
      email,
      note,
      phone,
      statusCode,
    });
    setDraftAuthPolicy(drafts.draftAuthPolicy);
    setDraftEmail(drafts.draftEmail);
    setDraftNote(drafts.draftNote);
    setDraftPassword(drafts.draftPassword);
    setDraftPasswordConfirm(drafts.draftPasswordConfirm);
    setDraftPhone(drafts.draftPhone);
    setDraftStatusCode(drafts.draftStatusCode);
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
        overrides = {password: draftPassword};
        break;
      case 'email':
        overrides = {email: draftEmail};
        break;
      case 'phone':
        {
          const nextPhone = formatAccountPhoneNumber(draftPhone);
          overrides = {phone: nextPhone};
        }
        break;
      case 'note':
        overrides = {note: draftNote};
        break;
      case 'authPolicy':
        overrides = {authPolicy: draftAuthPolicy};
        break;
      case 'statusCode':
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

  const standardProfileDetails = getStandardProfileDetails(profileDetails);

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
            autoComplete="new-password"
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
            autoComplete="new-password"
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
      field === 'email'
        ? draftEmail
        : field === 'phone'
        ? draftPhone
        : field === 'note'
        ? draftNote
        : draftAuthPolicy;
    const onChangeText =
      field === 'email'
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
          placeholder=""
          placeholderTextColor={palette.textMuted}
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

  const renderProfileField = (detail: ProfileDetail) => {
    const editableField = asEditableProfileField(detail.key, {
      canEditAuthPolicy,
      canEditStatus,
    });

    return (
      <View key={`${detail.key}:${detail.label}`} style={styles.profileFieldBlock}>
        <View style={styles.profileFieldHeader}>
          <View style={styles.profileFieldRow}>
            <FieldLabel palette={profileActivePalette} style={styles.profileFieldLabel}>
              {detail.label}
            </FieldLabel>
            <BodyStrong palette={profileActivePalette} style={styles.profileFieldValue}>
              {detail.value || '-'}
            </BodyStrong>
          </View>
          {editableField ? (
            <ActionButton
              backgroundColor={palette.soft}
              isLoading={false}
              label="✎"
              onPress={() => openEditor(editableField)}
              style={styles.profileIconButton}
              textColor={palette.text}
              titleStyle={styles.profileIconButtonText}
            />
          ) : null}
        </View>
        {editableField ? renderEditor(editableField) : null}
      </View>
    );
  };

  const renderProfileCards = () => (
    <>
      <Card palette={profileActivePalette} title={texts.profile}>
        <BodyText palette={profileActivePalette}>{texts.profileBody}</BodyText>
        {standardProfileDetails.map(renderProfileField)}
        {authError ? <Text style={styles.errorText}>{authError}</Text> : null}
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
      <ScrollView key={`register-${registerType}`} contentContainerStyle={styles.stack}>
        <AccountRegisterSection
          academyName={academyName}
          confirmPassword={confirmPassword}
          displayName={displayName}
          email={email}
          handleRegisterSubmit={handleRegisterSubmit}
          isSubmitting={isSubmitting}
          licenseCode={licenseCode}
          loginId={loginId}
          onAcademyNameChange={onAcademyNameChange}
          onConfirmPasswordChange={onConfirmPasswordChange}
          onDisplayNameChange={onDisplayNameChange}
          onEmailChange={onEmailChange}
          onLicenseCodeChange={onLicenseCodeChange}
          onLoginIdChange={onLoginIdChange}
          onPasswordChange={onPasswordChange}
          onPhoneChange={onPhoneChange}
          onRegister={onRegister}
          onRegisterTypeChange={onRegisterTypeChange}
          onRequestedRoleCodeChange={onRequestedRoleCodeChange}
          palette={palette}
          password={password}
          phone={phone}
          registerError={registerError}
          registerSuccess={registerSuccess}
          registerType={registerType}
          requestedRoleCode={requestedRoleCode}
          styles={styles}
          texts={texts}
          ui={{BodyText, Card, FieldLabel, OptionChip}}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.stack}>
      <View {...loginSectionProps}>
        <AccountLoginCard
          authError={authError}
          isSubmitting={isSubmitting}
          loginId={loginId}
          loginMutedPalette={loginMutedPalette}
          onLogin={onLogin}
          onLoginIdChange={onLoginIdChange}
          onOpenRegister={onOpenRegister}
          onPasswordChange={onPasswordChange}
          palette={palette}
          password={password}
          styles={styles}
          texts={texts}
          ui={{BodyText, Card, FieldLabel, OptionChip}}
        />
      </View>
      <View {...profileSectionProps}>
        {placeholderTarget ? (
          <AccountPlaceholderSection
            palette={palette}
            placeholderTarget={placeholderTarget}
            profileActivePalette={profileActivePalette}
            slideAnimation={slideAnimation}
            styles={styles}
            texts={texts}
            ui={{BodyText, Card, FieldLabel, OptionChip}}
          />
        ) : (
          renderProfileCards()
        )}
      </View>
    </ScrollView>
  );
}
