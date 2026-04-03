import React, {useMemo, useRef, useState} from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {ActionButton} from '../../shared/components/ActionButton';
import {SearchHeader} from '../../shared/components/SearchHeader';
import type {LanguageMode} from '../../screens/shared/shell-model';
import type {ProfileDetail} from '../../screens/shared/account-section-model';
import {SHELL_LABELS} from '../../screens/shared/shell-labels';
import {TeacherPresetSection} from '../teacher-preset/TeacherPresetSection';
import {TeacherAvailableScheduleSection} from '../teacher-schedule/TeacherAvailableScheduleSection';
import {TeacherReservationApprovalSection} from '../teacher-reservation/TeacherReservationApprovalSection';
import {StudentSkinSection} from '../student-options/StudentSkinSection';
import {StudentReservationSection} from '../student-reservation/StudentReservationSection';
import {
  fetchAcademyMemberProfile,
  updateAcademyMemberProfile,
} from '../../shared/lib/pendingMembersApi';
import {AcademyMembersDesktopTable} from './AcademyMembersDesktopTable';
import {canEditAcademyMemberProfile} from './academyMembersActionModel';
import {
  ACADEMY_MEMBER_FIELD_LABELS,
  ACADEMY_MEMBER_FIELD_ORDER,
  ACADEMY_MEMBERS_LABELS,
} from './academyMembersLabels';
import {AcademyMembersMobileList} from './AcademyMembersMobileList';
import {TABLE_PAGE_SIZE} from './academyMembersModel';
import type {
  AcademyMemberStatus,
  AcademyMemberSlot,
  SearchField,
  ShellPaletteLike,
} from './academyMembersTypes';
import {formatPhoneQuery} from './pendingApprovalModel';
import {useAcademyMembers} from './useAcademyMembers';

const CONTENT_EDGE_INSET = Platform.OS === 'web' ? 18 : 16;
const HEADER_HEIGHT = 100;
const TEACHER_PRESET_FRAME_MIN_HEIGHT = Platform.OS === 'web' ? 1180 : 1040;

type EditorDraft = {
  displayName: string;
  email: string;
  note: string;
  passIncrement: string;
  password: string;
  phone: string;
  preferenceRanges: string;
  preset: string;
  skinCValue: string;
  skinHValue: string;
  skinLValue: string;
  skinTraits: string;
};

type EditorSection =
  | 'profile'
  | 'reservation'
  | 'student-options'
  | 'preset'
  | 'available-schedule'
  | 'reservation-view';

function readDetail(details: ProfileDetail[], key: string) {
  return details.find(detail => detail.key === key)?.value ?? '';
}

function normalizeDetailValue(value: string) {
  return value === '-' ? '' : value;
}

function toCount(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildEditorDraft(details: ProfileDetail[], fallback: AcademyMemberSlot): EditorDraft {
  return {
    displayName: normalizeDetailValue(readDetail(details, 'displayName')) || fallback.displayName,
    email: normalizeDetailValue(readDetail(details, 'email')) || fallback.email,
    note: normalizeDetailValue(readDetail(details, 'note')),
    passIncrement: '',
    password: '',
    phone: normalizeDetailValue(readDetail(details, 'phone')) || fallback.phone,
    preferenceRanges: normalizeDetailValue(readDetail(details, 'preferenceRanges')),
    preset: normalizeDetailValue(readDetail(details, 'preset')),
    skinCValue: normalizeDetailValue(readDetail(details, 'skinCValue')),
    skinHValue: normalizeDetailValue(readDetail(details, 'skinHValue')),
    skinLValue: normalizeDetailValue(readDetail(details, 'skinLValue')),
    skinTraits: normalizeDetailValue(readDetail(details, 'skinTraits')),
  };
}

function normalizeProfileDetailsResponse(
  details: Array<{key?: string; label?: string; value?: string}> | unknown,
): ProfileDetail[] {
  if (!Array.isArray(details)) {
    return [];
  }

  return details.map(detail => ({
    key: detail?.key ?? '',
    label: detail?.label ?? '',
    value: detail?.value ?? '',
  }));
}

function FeatureBodyText({
  children,
  palette,
  style,
}: {
  children: React.ReactNode;
  palette: ShellPaletteLike;
  style?: any;
}) {
  return <Text style={[{color: palette.textMuted, fontSize: 13, lineHeight: 20}, style]}>{children}</Text>;
}

function FeatureBodyStrong({
  children,
  palette,
  style,
}: {
  children: React.ReactNode;
  palette: ShellPaletteLike;
  style?: any;
}) {
  return <Text style={[{color: palette.text, fontSize: 14, fontWeight: '800'}, style]}>{children}</Text>;
}

function FeatureFieldLabel({
  children,
  palette,
  style,
}: {
  children: React.ReactNode;
  palette: ShellPaletteLike;
  style?: any;
}) {
  return (
    <Text
      style={[
        {
          color: palette.textMuted,
          fontSize: 11,
          fontWeight: '800',
          letterSpacing: 0.3,
          textTransform: 'uppercase',
        },
        style,
      ]}>
      {children}
    </Text>
  );
}

function FeatureCard({
  children,
  palette,
  title,
}: {
  children: React.ReactNode;
  palette: ShellPaletteLike;
  title?: string;
}) {
  return (
    <View
      style={{
        backgroundColor: palette.card,
        borderColor: palette.border,
        borderRadius: 16,
        borderWidth: 1,
        gap: 10,
        padding: 14,
      }}>
      {title ? <FeatureBodyStrong palette={palette}>{title}</FeatureBodyStrong> : null}
      {children}
    </View>
  );
}

function FeatureOptionChip({
  active,
  label,
  onPress,
  palette,
}: {
  active?: boolean;
  label: string;
  onPress: () => void;
  palette: ShellPaletteLike;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        alignItems: 'center',
        backgroundColor: active ? palette.primary : palette.card,
        borderColor: active ? palette.primary : palette.border,
        borderRadius: 999,
        borderWidth: 1,
        justifyContent: 'center',
        minHeight: 34,
        paddingHorizontal: 14,
      }}>
      <Text
        style={{
          color: active ? palette.primaryText : palette.text,
          fontSize: 12,
          fontWeight: '800',
        }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function AcademyMembersSection({
  academyCode,
  compact = false,
  isAuthenticated,
  language,
  palette,
  roleCode,
}: {
  academyCode: string;
  compact?: boolean;
  isAuthenticated: boolean;
  language: LanguageMode;
  palette: ShellPaletteLike;
  roleCode: string;
}) {
  const [field, setField] = useState<SearchField>('phone');
  const [editingDraft, setEditingDraft] = useState<EditorDraft | null>(null);
  const [editingMember, setEditingMember] = useState<AcademyMemberSlot | null>(null);
  const [editingProfileDetails, setEditingProfileDetails] = useState<ProfileDetail[]>([]);
  const [editorSection, setEditorSection] = useState<EditorSection>('profile');
  const [editorFeedback, setEditorFeedback] = useState('');
  const [isPassPopupOpen, setIsPassPopupOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isEditorLoading, setIsEditorLoading] = useState(false);
  const [isEditorSaving, setIsEditorSaving] = useState(false);
  const [query, setQuery] = useState('');
  const queryInputRef = useRef<TextInput | null>(null);
  const rootScrollRef = useRef<ScrollView | null>(null);
  const ui = ACADEMY_MEMBERS_LABELS[language];
  const shellTexts = SHELL_LABELS[language];
  const fieldLabels = ACADEMY_MEMBER_FIELD_LABELS[language];
  const isMobileLayout = Platform.OS === 'ios' || Platform.OS === 'android';

  const cleanupNativeState = (reason: string) => {
    void reason;
    setIsDropdownOpen(false);
    queryInputRef.current?.blur();
    Keyboard.dismiss();
    rootScrollRef.current?.scrollTo?.({animated: false, x: 0, y: 0});
  };

  const {
    currentPage,
    errorMessage,
    handleLoadAllMembers,
    handleSearch,
    isSearching,
    paginatedSlots,
    setCurrentPage,
    statusMessage,
    totalPages,
  } = useAcademyMembers({
    academyCode,
    field,
    isAuthenticated,
    language,
    onCleanupNativeState: cleanupNativeState,
    query,
    roleCode,
    uiNotice: ui.notice,
  });

  const searchHeaderInset = compact ? 16 : CONTENT_EDGE_INSET;
  const passTotalValue = useMemo(
    () => normalizeDetailValue(readDetail(editingProfileDetails, 'passTotalCount')),
    [editingProfileDetails],
  );
  const passRemainingValue = useMemo(
    () => normalizeDetailValue(readDetail(editingProfileDetails, 'passRemainingCount')),
    [editingProfileDetails],
  );
  const pendingPassIncrement = useMemo(
    () => toCount(editingDraft?.passIncrement ?? ''),
    [editingDraft?.passIncrement],
  );
  const nextPassTotalValue = useMemo(
    () => toCount(passTotalValue) + pendingPassIncrement,
    [passTotalValue, pendingPassIncrement],
  );
  const nextPassRemainingValue = useMemo(
    () => toCount(passRemainingValue) + pendingPassIncrement,
    [passRemainingValue, pendingPassIncrement],
  );
  const hasPendingPassPreview = pendingPassIncrement > 0;
  const featurePalette = useMemo(
    () => ({
      ...palette,
      card: palette.card,
      soft: palette.card,
    }),
    [palette],
  );
  const featureUi = useMemo(
    () => ({
      BodyStrong: (props: any) => <FeatureBodyStrong {...props} palette={palette} />,
      BodyText: (props: any) => <FeatureBodyText {...props} palette={palette} />,
      Card: (props: any) => <FeatureCard {...props} palette={palette} />,
      FieldLabel: (props: any) => <FeatureFieldLabel {...props} palette={palette} />,
      OptionChip: (props: any) => <FeatureOptionChip {...props} palette={palette} />,
    }),
    [palette],
  );
  const featureSectionStyles = useMemo(
    () => ({
      actionButton: styles.teacherFeatureActionButton,
      actionText: styles.teacherFeatureActionText,
      input: [
        styles.teacherFeatureInput,
        {
          backgroundColor: palette.card,
          borderColor: palette.border,
          color: palette.text,
        },
      ],
      optionRow: styles.teacherFeatureOptionRow,
    }),
    [palette],
  );

  const handleQueryChange = (nextValue: string) => {
    if (field === 'phone') {
      setQuery(formatPhoneQuery(nextValue));
      return;
    }
    setQuery(nextValue);
  };

  const closeEditor = () => {
    setEditingDraft(null);
    setEditingMember(null);
    setEditingProfileDetails([]);
    setEditorSection('profile');
    setEditorFeedback('');
    setIsPassPopupOpen(false);
  };

  const handleEditorStatusChange = (nextStatus: AcademyMemberStatus) => {
    if (!editingMember || editingMember.statusCode === nextStatus) {
      return;
    }

    setEditingMember(current =>
      current ? {...current, statusCode: nextStatus} : current,
    );
    setEditingProfileDetails(current =>
      current.map(detail =>
        detail.key === 'statusCode' ? {...detail, value: nextStatus} : detail,
      ),
    );
    setEditorFeedback(
      language === 'ja'
        ? `状態を ${nextStatus} に設定しました。保存すると反映されます。`
        : `Status set to ${nextStatus}. Save to apply it.`,
    );
  };

  const handleSaveTeacherFeatureProfile = async (overrides?: {
    availableSchedule?: string;
    preset?: string;
  }) => {
    if (!editingMember) {
      return;
    }

    setIsEditorSaving(true);
    setEditorFeedback('');

    try {
      console.log('[academy-members] teacher-feature-save:start', {
        academyCode,
        hasAvailableSchedule: overrides?.availableSchedule !== undefined,
        hasPreset: overrides?.preset !== undefined,
        loginId: editingMember.loginId,
        scheduleLength: overrides?.availableSchedule?.length ?? 0,
      });
      const result = await updateAcademyMemberProfile({
        academyCode,
        availableSchedule: overrides?.availableSchedule,
        loginId: editingMember.loginId,
        preset: overrides?.preset,
      });
      const details = normalizeProfileDetailsResponse(result.details);
      console.log('[academy-members] teacher-feature-save:result', {
        detailKeys: details.map(detail => detail.key ?? ''),
        detailsType: Array.isArray(result.details) ? 'array' : typeof result.details,
        hasAvailableScheduleDetail: details.some(detail => detail.key === 'availableSchedule'),
        loginId: editingMember.loginId,
        message: result.message,
        status: result.status,
      });

      if (result.status !== 'ok') {
        setEditorFeedback(
          result.error ??
            result.message ??
            (language === 'ja'
              ? 'メンバープロフィールを保存できませんでした。'
              : 'We could not save the member profile right now.'),
        );
        return;
      }

      setEditingProfileDetails(details);
      setEditingDraft(buildEditorDraft(details, editingMember));
      console.log('[academy-members] teacher-feature-save:applied', {
        availableScheduleLength: readDetail(details, 'availableSchedule').length,
        loginId: editingMember.loginId,
      });
      setEditorFeedback(ui.editorSaveSuccess);
    } catch (error) {
      console.log('[academy-members] teacher-feature-save:error', {
        error: error instanceof Error ? error.message : String(error),
        loginId: editingMember.loginId,
      });
      setEditorFeedback(
        error instanceof Error
          ? error.message
          : language === 'ja'
          ? 'メンバープロフィールを保存できませんでした。'
          : String(error),
      );
    } finally {
      setIsEditorSaving(false);
    }
  };

  const handleSaveStudentFeatureProfile = async (overrides?: {
    preferenceRanges?: string;
    skinCValue?: string;
    skinHValue?: string;
    skinLValue?: string;
    skinTraits?: string;
  }) => {
    if (!editingMember) {
      return;
    }

    setIsEditorSaving(true);
    setEditorFeedback('');

    try {
      console.log('[academy-members] student-feature-save:start', {
        academyCode,
        hasPreferenceRanges: overrides?.preferenceRanges !== undefined,
        hasSkinTraits: overrides?.skinTraits !== undefined,
        loginId: editingMember.loginId,
      });
      const result = await updateAcademyMemberProfile({
        academyCode,
        loginId: editingMember.loginId,
        preferenceRanges: overrides?.preferenceRanges,
        skinCValue: overrides?.skinCValue,
        skinHValue: overrides?.skinHValue,
        skinLValue: overrides?.skinLValue,
        skinTraits: overrides?.skinTraits,
      });
      const details = normalizeProfileDetailsResponse(result.details);
      console.log('[academy-members] student-feature-save:result', {
        detailKeys: details.map(detail => detail.key),
        detailsType: Array.isArray(result.details) ? 'array' : typeof result.details,
        loginId: editingMember.loginId,
        status: result.status,
      });

      if (result.status !== 'ok') {
        setEditorFeedback(
          result.error ??
            result.message ??
            (language === 'ja'
              ? 'メンバープロフィールを保存できませんでした。'
              : 'We could not save the member profile right now.'),
        );
        return;
      }

      setEditingProfileDetails(details);
      setEditingDraft(buildEditorDraft(details, editingMember));
      setEditorFeedback(ui.editorSaveSuccess);
    } catch (error) {
      console.log('[academy-members] student-feature-save:error', {
        error: error instanceof Error ? error.message : String(error),
        loginId: editingMember.loginId,
      });
      setEditorFeedback(
        error instanceof Error
          ? error.message
          : language === 'ja'
          ? 'メンバープロフィールを保存できませんでした。'
          : String(error),
      );
    } finally {
      setIsEditorSaving(false);
    }
  };

  const handleEditProfile = async (slot: AcademyMemberSlot) => {
    if (!canEditAcademyMemberProfile(roleCode, slot.roleCode)) {
      return;
    }

    setIsEditorLoading(true);
    setEditorFeedback('');
    setEditorSection('profile');
    setIsPassPopupOpen(false);
    setEditingMember(slot);

    try {
      const result = await fetchAcademyMemberProfile({
        academyCode,
        loginId: slot.loginId,
      });
      if (result.status !== 'ok') {
        setEditingDraft(null);
        setEditingProfileDetails([]);
        setEditorFeedback(
          result.error ??
            result.message ??
            (language === 'ja'
              ? 'メンバープロフィールを読み込めませんでした。'
              : 'We could not load the member profile right now.'),
        );
        return;
      }

      const details = normalizeProfileDetailsResponse(result.details);
      setEditingProfileDetails(details);
      setEditingDraft(buildEditorDraft(details, slot));
      setEditorFeedback('');
    } catch (error) {
      setEditingDraft(null);
      setEditingProfileDetails([]);
      setEditorFeedback(
        error instanceof Error
          ? error.message
          : language === 'ja'
          ? 'メンバープロフィールを読み込めませんでした。'
          : String(error),
      );
    } finally {
      setIsEditorLoading(false);
    }
  };

  const saveEditor = async () => {
    if (!editingMember || !editingDraft) {
      return;
    }

    setIsEditorSaving(true);
    setEditorFeedback('');

    try {
      const result = await updateAcademyMemberProfile({
        academyCode,
        statusCode: editingMember.statusCode,
        loginId: editingMember.loginId,
        displayName: editingDraft.displayName,
        email: editingDraft.email,
        note: editingDraft.note,
        passIncrement:
          editingMember.roleCode === 'STUDENT' ? editingDraft.passIncrement.trim() : undefined,
        password: editingDraft.password.trim() || undefined,
        phone: editingDraft.phone,
        preferenceRanges:
          editingMember.roleCode === 'STUDENT' ? editingDraft.preferenceRanges : undefined,
        preset: editingMember.roleCode === 'TEACHER' ? editingDraft.preset : undefined,
        skinCValue: editingMember.roleCode === 'STUDENT' ? editingDraft.skinCValue : undefined,
        skinHValue: editingMember.roleCode === 'STUDENT' ? editingDraft.skinHValue : undefined,
        skinLValue: editingMember.roleCode === 'STUDENT' ? editingDraft.skinLValue : undefined,
        skinTraits: editingMember.roleCode === 'STUDENT' ? editingDraft.skinTraits : undefined,
      });

      if (result.status !== 'ok') {
        setEditorFeedback(
          result.error ??
            result.message ??
            (language === 'ja'
              ? 'メンバープロフィールを保存できませんでした。'
              : 'We could not save the member profile right now.'),
        );
        return;
      }

      const details = normalizeProfileDetailsResponse(result.details);
      setEditingProfileDetails(details);
      setEditingDraft(buildEditorDraft(details, editingMember));
      setEditorFeedback(ui.editorSaveSuccess);
    } catch (error) {
      setEditorFeedback(
        error instanceof Error
          ? error.message
          : language === 'ja'
          ? 'メンバープロフィールを保存できませんでした。'
          : String(error),
      );
    } finally {
      setIsEditorSaving(false);
    }
  };

  const renderInlineEditor = (slot: AcademyMemberSlot) => {
    if (!editingMember || editingMember.loginId !== slot.loginId) {
      return null;
    }

    const teacherEditorSections: Array<{id: EditorSection; label: string}> = [
      {id: 'profile', label: ui.editorTitle},
      {id: 'preset', label: shellTexts.presetPlaceholderTitle},
      {id: 'available-schedule', label: shellTexts.availableSchedule},
      {id: 'reservation-view', label: shellTexts.reservationView},
    ];
    const studentEditorSections: Array<{id: EditorSection; label: string}> = [
      {id: 'profile', label: ui.editorTitle},
      {id: 'student-options', label: shellTexts.studentOptions},
      {id: 'reservation', label: shellTexts.reservation},
    ];

    return (
      <View
        style={[
          styles.editorCard,
          {
            backgroundColor: palette.muted,
            borderColor: palette.border,
          },
        ]}>
        <View style={styles.editorHeader}>
          <View style={styles.editorHeaderCopy}>
            <View style={styles.editorSectionRow}>
              {(editingMember.roleCode === 'TEACHER'
                ? teacherEditorSections
                : editingMember.roleCode === 'STUDENT'
                ? studentEditorSections
                : [{id: 'profile' as const, label: ui.editorTitle}]
              ).map(section => {
                const isActive = editorSection === section.id;
                return (
                  <Pressable
                    key={section.id}
                    onPress={() => setEditorSection(section.id)}
                    style={[
                      styles.editorSectionButton,
                      {
                        backgroundColor: isActive ? palette.primary : palette.card,
                        borderColor: isActive ? palette.primary : palette.border,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.editorSectionButtonText,
                        {color: isActive ? palette.primaryText : palette.text},
                      ]}>
                      {section.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={[styles.editorNotice, {color: palette.textMuted}]}>
              {ui.editorDraftNotice}
            </Text>
          </View>
          <Pressable
            onPress={closeEditor}
            style={[
              styles.editorCloseButton,
              {
                backgroundColor: palette.card,
                borderColor: palette.border,
              },
            ]}>
            <Text style={[styles.editorCloseButtonText, {color: palette.text}]}>
              {ui.closeEditor}
            </Text>
          </Pressable>
        </View>

        <View style={styles.editorMetaRow}>
          <Text style={[styles.editorMetaText, {color: palette.textMuted}]}>
            {ui.loginId}: {editingMember.loginId}
          </Text>
          <Text style={[styles.editorMetaText, {color: palette.textMuted}]}>
            {ui.role}: {editingMember.roleCode}
          </Text>
          <Text style={[styles.editorMetaText, {color: palette.textMuted}]}>
            {ui.status}: {editingMember.statusCode}
          </Text>
        </View>

        {isEditorLoading || !editingDraft ? (
          <Text style={[styles.editorNotice, {color: palette.textMuted}]}>
            {ui.editorLoading}
          </Text>
        ) : (
          <>
            {editorSection === 'profile' ? (
              <>
                <View style={styles.statusOptionRow}>
                  {(['ACTIVE', 'HOLD', 'INACTIVE'] as const).map(code => {
                    const isActive = editingMember.statusCode === code;
                    return (
                      <Pressable
                        key={code}
                        onPress={() => void handleEditorStatusChange(code)}
                        style={[
                          styles.statusOptionChip,
                          {
                            backgroundColor: isActive ? palette.primary : palette.card,
                            borderColor: isActive ? palette.primary : palette.border,
                            opacity: isEditorSaving ? 0.6 : 1,
                          },
                        ]}>
                        <Text
                          style={[
                            styles.statusOptionText,
                            {color: isActive ? palette.primaryText : palette.text},
                          ]}>
                          {code}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <TextInput
                  onChangeText={value =>
                    setEditingDraft(current =>
                      current ? {...current, displayName: value} : current,
                    )
                  }
                  placeholder={shellTexts.displayName}
                  placeholderTextColor={palette.textMuted}
                  style={[
                    styles.editorInput,
                    {
                      backgroundColor: palette.card,
                      borderColor: palette.border,
                      color: palette.text,
                    },
                  ]}
                  value={editingDraft.displayName}
                />
                <TextInput
                  autoCapitalize="none"
                  keyboardType="email-address"
                  onChangeText={value =>
                    setEditingDraft(current => (current ? {...current, email: value} : current))
                  }
                  placeholder={shellTexts.email}
                  placeholderTextColor={palette.textMuted}
                  style={[
                    styles.editorInput,
                    {
                      backgroundColor: palette.card,
                      borderColor: palette.border,
                      color: palette.text,
                    },
                  ]}
                  value={editingDraft.email}
                />
                <TextInput
                  keyboardType="phone-pad"
                  onChangeText={value =>
                    setEditingDraft(current =>
                      current ? {...current, phone: formatPhoneQuery(value)} : current,
                    )
                  }
                  placeholder={shellTexts.phone}
                  placeholderTextColor={palette.textMuted}
                  style={[
                    styles.editorInput,
                    {
                      backgroundColor: palette.card,
                      borderColor: palette.border,
                      color: palette.text,
                    },
                  ]}
                  value={editingDraft.phone}
                />
                <TextInput
                  autoCapitalize="none"
                  onChangeText={value =>
                    setEditingDraft(current =>
                      current ? {...current, password: value} : current,
                    )
                  }
                  placeholder={shellTexts.profilePasswordPlaceholder}
                  placeholderTextColor={palette.textMuted}
                  secureTextEntry={true}
                  style={[
                    styles.editorInput,
                    {
                      backgroundColor: palette.card,
                      borderColor: palette.border,
                      color: palette.text,
                    },
                  ]}
                  value={editingDraft.password}
                />
                <TextInput
                  multiline={true}
                  onChangeText={value =>
                    setEditingDraft(current => (current ? {...current, note: value} : current))
                  }
                  placeholder={shellTexts.note}
                  placeholderTextColor={palette.textMuted}
                  style={[
                    styles.editorTextArea,
                    {
                      backgroundColor: palette.card,
                      borderColor: palette.border,
                      color: palette.text,
                    },
                  ]}
                  value={editingDraft.note}
                />

                {editingMember.roleCode === 'STUDENT' ? (
                  <>
                    <View
                      style={[
                        styles.passSummaryCard,
                        {
                          backgroundColor: palette.card,
                          borderColor: palette.border,
                        },
                      ]}>
                      <View style={styles.passSummaryValueBlock}>
                        <Text style={[styles.passSummaryText, {color: palette.text}]}>
                          {ui.passTotal}: {passTotalValue || '0'}
                        </Text>
                        {hasPendingPassPreview ? (
                          <Text style={[styles.passSummaryPreviewText, styles.passSummaryPositiveText]}>
                            {'->'} {nextPassTotalValue} (+{pendingPassIncrement})
                          </Text>
                        ) : null}
                      </View>
                      <View style={styles.passRemainingWrap}>
                        <View style={styles.passSummaryValueBlock}>
                          <Text style={[styles.passSummaryText, {color: palette.textMuted}]}>
                            {ui.passRemaining}: {passRemainingValue || '0'}
                          </Text>
                          {hasPendingPassPreview ? (
                            <Text
                              style={[styles.passSummaryPreviewText, styles.passSummaryPositiveText]}>
                              {'->'} {nextPassRemainingValue} (+{pendingPassIncrement})
                            </Text>
                          ) : null}
                        </View>
                        <Pressable
                          onPress={() => setIsPassPopupOpen(true)}
                          style={[
                            styles.passAddButton,
                            {
                              backgroundColor: palette.primary,
                              borderColor: palette.primary,
                            },
                          ]}>
                          <Text style={[styles.passAddButtonText, {color: palette.primaryText}]}>
                            {ui.passIncrement}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                    {isPassPopupOpen ? (
                      <View
                        style={[
                          styles.passPopupCard,
                          {
                            backgroundColor: palette.card,
                            borderColor: palette.border,
                          },
                        ]}>
                        <Text style={[styles.passPopupTitle, {color: palette.text}]}>
                          {ui.passIncrement}
                        </Text>
                        <TextInput
                          keyboardType="number-pad"
                          onChangeText={value =>
                            setEditingDraft(current =>
                              current
                                ? {...current, passIncrement: value.replace(/\D/g, '')}
                                : current,
                            )
                          }
                          placeholder={ui.passIncrement}
                          placeholderTextColor={palette.textMuted}
                          style={[
                            styles.editorInput,
                            {
                              backgroundColor: palette.muted,
                              borderColor: palette.border,
                              color: palette.text,
                            },
                          ]}
                          value={editingDraft.passIncrement}
                        />
                        <View style={styles.passPopupActions}>
                          <ActionButton
                            backgroundColor={palette.muted}
                            hint=""
                            label={shellTexts.cancel}
                            onPress={() => {
                              setIsPassPopupOpen(false);
                              setEditingDraft(current =>
                                current ? {...current, passIncrement: ''} : current,
                              );
                            }}
                            style={styles.passPopupActionButton}
                            textColor={palette.text}
                          />
                          <ActionButton
                            backgroundColor={palette.primary}
                            hint=""
                            label={shellTexts.studentOptionsDone}
                            onPress={() => {
                              setIsPassPopupOpen(false);
                            }}
                            style={styles.passPopupActionButton}
                            textColor={palette.primaryText}
                          />
                        </View>
                      </View>
                    ) : null}
                  </>
                ) : null}
              </>
            ) : null}
            {editingMember.roleCode === 'STUDENT' && editorSection === 'student-options' ? (
              <View
                style={[
                  styles.teacherFeatureStack,
                  {
                    borderTopColor: palette.border,
                  },
                ]}>
                <View style={styles.teacherFeatureSection}>
                  <StudentSkinSection
                    isSubmitting={isEditorSaving}
                    onSaveProfile={handleSaveStudentFeatureProfile}
                    palette={featurePalette}
                    profileDetails={editingProfileDetails}
                    showDevPreview={false}
                    styles={featureSectionStyles}
                    texts={{
                      cancel: shellTexts.cancel,
                      studentOptionsSkinData: shellTexts.studentOptionsSkinData,
                      studentOptionsMySkin: shellTexts.studentOptionsMySkin,
                      studentOptionsTraits: shellTexts.studentOptionsTraits,
                      studentOptionsPreferencePoints: shellTexts.studentOptionsPreferencePoints,
                      studentOptionsCategory: shellTexts.studentOptionsCategory,
                      studentOptionsActions: shellTexts.studentOptionsActions,
                      studentOptionsLightness: shellTexts.studentOptionsLightness,
                      studentOptionsHue: shellTexts.studentOptionsHue,
                      studentOptionsChroma: shellTexts.studentOptionsChroma,
                      studentOptionsRangeRadius: shellTexts.studentOptionsRangeRadius,
                      studentOptionsSave: shellTexts.studentOptionsSave,
                      studentOptionsReset: shellTexts.studentOptionsReset,
                      studentOptionsDone: shellTexts.studentOptionsDone,
                      studentOptionsToolSelect: shellTexts.studentOptionsToolSelect,
                      studentOptionsToolRange: shellTexts.studentOptionsToolRange,
                      studentOptionsZoom: shellTexts.studentOptionsZoom,
                      studentOptionsTraitsPlaceholder: shellTexts.studentOptionsTraitsPlaceholder,
                      studentOptionsNoTraits: shellTexts.studentOptionsNoTraits,
                      studentOptionsNoPoints: shellTexts.studentOptionsNoPoints,
                      studentOptionsPoints: shellTexts.studentOptionsPoints,
                      studentOptionsDeleteTitle: shellTexts.studentOptionsDeleteTitle,
                      studentOptionsDeleteMessage: shellTexts.studentOptionsDeleteMessage,
                      studentOptionsDeleteConfirm: shellTexts.studentOptionsDeleteConfirm,
                      studentOptionsUseFullSkinRange:
                        shellTexts.studentOptionsUseFullSkinRange,
                    }}
                    title={shellTexts.studentOptions}
                    ui={featureUi}
                  />
                </View>
              </View>
            ) : null}
            {editingMember.roleCode === 'STUDENT' && editorSection === 'reservation' ? (
              <View
                style={[
                  styles.teacherFeatureStack,
                  {
                    borderTopColor: palette.border,
                  },
                ]}>
                <View style={styles.teacherFeatureSection}>
                  <StudentReservationSection
                    language={language}
                    palette={featurePalette}
                    studentLoginId={editingMember.loginId}
                    styles={featureSectionStyles}
                    teacherName={
                      editingProfileDetails.find(d => d.key === 'primaryTeacherName')?.value ??
                      '-'
                    }
                    texts={{
                      cancel: shellTexts.cancel,
                      reservationTimezone: shellTexts.reservationTimezone,
                      reservationTeacher: shellTexts.reservationTeacher,
                      reservationSelectDate: shellTexts.reservationSelectDate,
                      reservationTimeSlots: shellTexts.reservationTimeSlots,
                      reservationConfirm: shellTexts.reservationConfirm,
                      reservationDate: shellTexts.reservationDate,
                      reservationTime: shellTexts.reservationTime,
                      reservationBookLesson: shellTexts.reservationBookLesson,
                      reservationBooked: shellTexts.reservationBooked,
                      reservationBookedBody: shellTexts.reservationBookedBody,
                      reservationMyList: shellTexts.reservationMyList,
                      reservationNone: shellTexts.reservationNone,
                      reservationSlotTaken: shellTexts.reservationSlotTaken,
                      reservationSlotBooked: shellTexts.reservationSlotBooked,
                      reservationStatusConfirmed: shellTexts.reservationStatusConfirmed,
                      reservationStatusPending: shellTexts.reservationStatusPending,
                      reservationStatusCanceled: shellTexts.reservationStatusCanceled,
                      reservationDetails: shellTexts.reservationDetails,
                      reservationHideDetails: shellTexts.reservationHideDetails,
                      reservationPreset: shellTexts.reservationPreset,
                      reservationNote: shellTexts.reservationNote,
                      reservationCosmetics: shellTexts.reservationCosmetics,
                      reservationNoCosmetics: shellTexts.reservationNoCosmetics,
                      presetCategoryBaseFoundation: shellTexts.presetCategoryBaseFoundation,
                      presetCategoryBlush: shellTexts.presetCategoryBlush,
                      presetCategoryLipColor: shellTexts.presetCategoryLipColor,
                      presetCategoryEyeshadow: shellTexts.presetCategoryEyeshadow,
                      presetCategoryContour: shellTexts.presetCategoryContour,
                      presetCategoryHighlighter: shellTexts.presetCategoryHighlighter,
                      presetCategoryEtc: shellTexts.presetCategoryEtc,
                    }}
                    title={shellTexts.reservation}
                    ui={featureUi}
                  />
                </View>
              </View>
            ) : null}
            {editingMember.roleCode === 'TEACHER' && editorSection === 'preset' ? (
              <View
                style={[
                  styles.teacherFeatureStack,
                  {
                    borderTopColor: palette.border,
                  },
                ]}>
                <View style={[styles.teacherFeatureSection, styles.teacherPresetFrame]}>
                  <TeacherPresetSection
                    onSaveProfile={handleSaveTeacherFeatureProfile}
                    palette={featurePalette}
                    presetValue={readDetail(editingProfileDetails, 'preset') || '-'}
                    styles={featureSectionStyles}
                    texts={{
                      cancel: shellTexts.cancel,
                      presetTitle: shellTexts.presetTitle,
                      presetNew: shellTexts.presetNew,
                      presetName: shellTexts.presetName,
                      presetSave: shellTexts.presetSave,
                      presetDelete: shellTexts.presetDelete,
                      presetDeleteConfirm: shellTexts.presetDeleteConfirm,
                      presetShowDetails: shellTexts.presetShowDetails,
                      presetHideDetails: shellTexts.presetHideDetails,
                      presetSummary: shellTexts.presetSummary,
                      presetNoItems: shellTexts.presetNoItems,
                      presetCategoryAll: shellTexts.presetCategoryAll,
                      presetSearch: shellTexts.presetSearch,
                      presetSearchPlaceholder: shellTexts.presetSearchPlaceholder,
                      presetManualItemNamePlaceholder: shellTexts.presetManualItemNamePlaceholder,
                      presetManualAdd: shellTexts.presetManualAdd,
                      presetManualCategoryRequired: shellTexts.presetManualCategoryRequired,
                      presetItemName: shellTexts.presetItemName,
                      presetSku: shellTexts.presetSku,
                      presetLch: shellTexts.presetLch,
                      presetCategoryBaseFoundation: shellTexts.presetCategoryBaseFoundation,
                      presetCategoryBlush: shellTexts.presetCategoryBlush,
                      presetCategoryLipColor: shellTexts.presetCategoryLipColor,
                      presetCategoryEyeshadow: shellTexts.presetCategoryEyeshadow,
                      presetCategoryContour: shellTexts.presetCategoryContour,
                      presetCategoryHighlighter: shellTexts.presetCategoryHighlighter,
                      presetCategoryEtc: shellTexts.presetCategoryEtc,
                    }}
                    title={shellTexts.presetPlaceholderTitle}
                    ui={featureUi}
                  />
                </View>
              </View>
            ) : null}
            {editingMember.roleCode === 'TEACHER' &&
            editorSection === 'available-schedule' ? (
              <View
                style={[
                  styles.teacherFeatureStack,
                  {
                    borderTopColor: palette.border,
                  },
                ]}>
                <View style={styles.teacherFeatureSection}>
                  <TeacherAvailableScheduleSection
                    isSubmitting={isEditorSaving}
                    language={language}
                    onSaveProfile={handleSaveTeacherFeatureProfile}
                    palette={featurePalette}
                    profileDetails={editingProfileDetails}
                    styles={featureSectionStyles}
                    texts={{
                      availableScheduleGuide: shellTexts.availableScheduleGuide,
                      availableScheduleTimezone: shellTexts.availableScheduleTimezone,
                      availableScheduleWeeklyGrid: shellTexts.availableScheduleWeeklyGrid,
                      availableScheduleSlotsSelected: shellTexts.availableScheduleSlotsSelected,
                      availableScheduleBusinessHours: shellTexts.availableScheduleBusinessHours,
                      availableScheduleClearAll: shellTexts.availableScheduleClearAll,
                      availableScheduleTimeColumn: shellTexts.availableScheduleTimeColumn,
                      availableScheduleClearDay: shellTexts.availableScheduleClearDay,
                      availableScheduleExceptions: shellTexts.availableScheduleExceptions,
                      availableScheduleExceptionGuide: shellTexts.availableScheduleExceptionGuide,
                      availableScheduleAddException: shellTexts.availableScheduleAddException,
                      availableScheduleAddSlot: shellTexts.availableScheduleAddSlot,
                      availableScheduleSlotTo: shellTexts.availableScheduleSlotTo,
                      availableScheduleSave: shellTexts.availableScheduleSave,
                      availableScheduleExceptionPeriodBlock:
                        shellTexts.availableScheduleExceptionPeriodBlock,
                      availableScheduleExceptionTimeBlock:
                        shellTexts.availableScheduleExceptionTimeBlock,
                      availableScheduleExceptionStartDate:
                        shellTexts.availableScheduleExceptionStartDate,
                      availableScheduleExceptionEndDate:
                        shellTexts.availableScheduleExceptionEndDate,
                      availableScheduleExceptionDate:
                        shellTexts.availableScheduleExceptionDate,
                    }}
                    title={shellTexts.availableSchedule}
                    ui={featureUi}
                  />
                </View>
              </View>
            ) : null}
            {editingMember.roleCode === 'TEACHER' &&
            editorSection === 'reservation-view' ? (
              <View
                style={[
                  styles.teacherFeatureStack,
                  {
                    borderTopColor: palette.border,
                  },
                ]}>
                <View style={styles.teacherFeatureSection}>
                  <TeacherReservationApprovalSection
                    palette={featurePalette}
                    presetValue={readDetail(editingProfileDetails, 'preset') || '-'}
                    styles={featureSectionStyles}
                    teacherLoginId={editingMember.loginId}
                    texts={{
                      cancel: shellTexts.cancel,
                      reservationNote: shellTexts.reservationNote,
                      reservationPreset: shellTexts.reservationPreset,
                      reservationStatusConfirmed: shellTexts.reservationStatusConfirmed,
                      reservationStatusPending: shellTexts.reservationStatusPending,
                      reservationStatusCanceled: shellTexts.reservationStatusCanceled,
                      reservationTimezone: shellTexts.reservationTimezone,
                      reservationViewApprove: shellTexts.reservationViewApprove,
                      reservationViewEmpty: shellTexts.reservationViewEmpty,
                      reservationViewMismatchGuide: shellTexts.reservationViewMismatchGuide,
                      reservationViewNoPreference: shellTexts.reservationViewNoPreference,
                      reservationViewPresetItems: shellTexts.reservationViewPresetItems,
                      reservationViewPending: shellTexts.reservationViewPending,
                      reservationViewCanceled: shellTexts.reservationViewCanceled,
                      reservationViewReject: shellTexts.reservationViewReject,
                      reservationViewSkin: shellTexts.reservationViewSkin,
                      reservationViewStudent: shellTexts.reservationViewStudent,
                      reservationViewUpcoming: shellTexts.reservationViewUpcoming,
                    }}
                    title={shellTexts.reservationView}
                    ui={featureUi}
                  />
                </View>
              </View>
            ) : null}

            {editorFeedback ? (
              <Text
                style={[
                  styles.editorFeedback,
                  {
                    color:
                      editorFeedback === ui.editorSaveSuccess
                        ? palette.primary
                        : '#bc4749',
                  },
                ]}>
                {editorFeedback}
              </Text>
            ) : null}

            <View style={styles.editorActionRow}>
              <ActionButton
                backgroundColor={palette.muted}
                hint=""
                label={ui.closeEditor}
                onPress={closeEditor}
                style={styles.editorActionButton}
                textColor={palette.text}
              />
              {((editingMember.roleCode === 'TEACHER' || editingMember.roleCode === 'STUDENT')
                ? editorSection === 'profile'
                : true) ? (
                <ActionButton
                  backgroundColor={palette.primary}
                  hint=""
                  isLoading={isEditorSaving}
                  label={ui.editorSave}
                  onPress={saveEditor}
                  style={styles.editorActionButton}
                  textColor={palette.primaryText}
                />
              ) : null}
            </View>
          </>
        )}
      </View>
    );
  };

  const renderDropdown = (mobile = false) => (
    <View style={[styles.dropdownWrap, mobile ? styles.dropdownWrapMobile : null]}>
      <Pressable
        onPress={() => setIsDropdownOpen(open => !open)}
        style={[
          styles.dropdownButton,
          compact ? styles.dropdownButtonCompact : null,
          {
            backgroundColor: palette.muted,
            borderColor: palette.border,
          },
        ]}>
        <View style={styles.dropdownButtonContent}>
          <Text numberOfLines={1} style={[styles.dropdownText, {color: palette.text}]}>
            {fieldLabels[field]}
          </Text>
          <Text style={[styles.dropdownArrow, {color: palette.textMuted}]}>
            {isDropdownOpen ? '▲' : '▼'}
          </Text>
        </View>
      </Pressable>
      <View
        pointerEvents={isDropdownOpen ? 'auto' : 'none'}
        style={[
          styles.dropdownMenu,
          mobile ? styles.dropdownMenuMobile : null,
          {
            backgroundColor: palette.card,
            borderColor: palette.border,
            display: isDropdownOpen ? 'flex' : 'none',
          },
        ]}>
        {ACADEMY_MEMBER_FIELD_ORDER.map(option => (
          <Pressable
            key={option}
            onPress={() => {
              setField(option);
              setQuery(currentQuery =>
                option === 'phone' ? formatPhoneQuery(currentQuery) : currentQuery,
              );
              setIsDropdownOpen(false);
            }}
            style={[
              styles.dropdownItem,
              option === field ? {backgroundColor: palette.muted} : null,
            ]}>
            <Text style={[styles.dropdownItemText, {color: palette.text}]}>
              {fieldLabels[option]}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.sectionRoot}>
      <View style={styles.topOverlayWrap}>
        <SearchHeader
          edgeInset={searchHeaderInset}
          palette={palette}
          style={styles.searchHeaderSurface}>
          <View style={styles.searchHeaderBody}>
            <View style={styles.headerCopy}>
              <Text style={[styles.cardTitle, {color: palette.text}]}>{ui.title}</Text>
              {ui.notice ? (
                <Text style={[styles.cardBody, {color: palette.textMuted}]}>
                  {ui.notice}
                </Text>
              ) : null}
            </View>

            <View style={styles.searchRow}>
              {renderDropdown(isMobileLayout)}
              <TextInput
                ref={queryInputRef}
                onChangeText={handleQueryChange}
                onSubmitEditing={() => handleSearch()}
                placeholder={`${ui.search} ${fieldLabels[field]}`}
                placeholderTextColor={palette.textMuted}
                style={[
                  styles.searchInput,
                  compact ? styles.searchInputCompact : null,
                  {
                    backgroundColor: palette.card,
                    borderColor: palette.border,
                    color: palette.text,
                  },
                ]}
                value={query}
              />
              <View
                style={[
                  styles.searchButtonWrap,
                  isMobileLayout ? styles.searchButtonWrapMobile : null,
                ]}>
                <ActionButton
                  backgroundColor={palette.primary}
                  hint=""
                  isLoading={isSearching}
                  label={ui.search}
                  onPress={() => handleSearch()}
                  style={[styles.searchButton, compact ? styles.searchButtonCompact : null]}
                  textColor={palette.primaryText}
                />
              </View>
              {!isMobileLayout ? (
                <View style={styles.searchButtonWrap}>
                  <ActionButton
                    backgroundColor={palette.muted}
                    hint=""
                    isLoading={isSearching}
                    label={ui.allMembers}
                    onPress={handleLoadAllMembers}
                    style={[styles.searchButton, compact ? styles.searchButtonCompact : null]}
                    textColor={palette.text}
                  />
                </View>
              ) : null}
            </View>

            {isMobileLayout ? (
              <View style={styles.secondaryActionRow}>
                <View style={[styles.searchButtonWrap, styles.searchButtonWrapMobile]}>
                  <ActionButton
                    backgroundColor={palette.muted}
                    hint=""
                    isLoading={isSearching}
                    label={ui.allMembers}
                    onPress={handleLoadAllMembers}
                    style={[styles.searchButton, compact ? styles.searchButtonCompact : null]}
                    textColor={palette.text}
                  />
                </View>
              </View>
            ) : null}
          </View>
        </SearchHeader>
      </View>

      <ScrollView
        ref={rootScrollRef}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        style={[
          styles.scrollRoot,
          {
            backgroundColor: palette.card,
          },
        ]}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: palette.card,
              borderColor: palette.border,
            },
          ]}>
          <Text
            style={[
              styles.metaText,
              errorMessage ? styles.errorText : {color: palette.textMuted},
            ]}>
            {statusMessage}
          </Text>

          <View style={styles.tableWrap}>
            {isMobileLayout ? (
              <AcademyMembersMobileList
                actorRoleCode={roleCode}
                currentPage={currentPage}
                onEditProfile={handleEditProfile}
                pageSize={TABLE_PAGE_SIZE}
                palette={palette}
                renderInlineEditor={renderInlineEditor}
                slots={paginatedSlots}
                ui={ui}
              />
            ) : (
              <AcademyMembersDesktopTable
                actorRoleCode={roleCode}
                onEditProfile={handleEditProfile}
                palette={palette}
                renderInlineEditor={renderInlineEditor}
                slots={paginatedSlots}
                ui={ui}
              />
            )}
          </View>

          <View style={styles.paginationRow}>
            <Pressable
              disabled={currentPage === 1}
              onPress={() => setCurrentPage(page => Math.max(1, page - 1))}
              style={[
                styles.paginationButton,
                {
                  backgroundColor: currentPage === 1 ? palette.card : palette.muted,
                  borderColor: palette.border,
                  opacity: currentPage === 1 ? 0.55 : 1,
                },
              ]}>
              <Text style={[styles.paginationButtonText, {color: palette.text}]}>
                {ui.prev}
              </Text>
            </Pressable>
            <Text style={[styles.paginationText, {color: palette.textMuted}]}>
              {ui.page} {currentPage} / {totalPages}
            </Text>
            <Pressable
              disabled={currentPage === totalPages}
              onPress={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
              style={[
                styles.paginationButton,
                {
                  backgroundColor:
                    currentPage === totalPages ? palette.card : palette.muted,
                  borderColor: palette.border,
                  opacity: currentPage === totalPages ? 0.55 : 1,
                },
              ]}>
              <Text style={[styles.paginationButtonText, {color: palette.text}]}>
                {ui.next}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionRoot: {
    alignSelf: 'stretch',
    flex: 1,
    minHeight: 0,
    position: 'relative',
  },
  topOverlayWrap: {
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 10,
  },
  scrollRoot: {
    bottom: 0,
    left: 0,
    minHeight: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  scrollContent: {
    gap: 16,
    paddingBottom: 12,
    paddingTop: HEADER_HEIGHT + 8,
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
  },
  headerCopy: {
    gap: 6,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  cardBody: {
    fontSize: 14,
    lineHeight: 22,
  },
  searchHeaderSurface: {
    borderRadius: 18,
  },
  searchHeaderBody: {
    gap: 12,
  },
  searchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  secondaryActionRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
  dropdownWrap: {
    minWidth: 122,
    position: 'relative',
    zIndex: 6,
  },
  dropdownWrapMobile: {
    flexShrink: 0,
    minWidth: 112,
  },
  dropdownButton: {
    borderRadius: 16,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 0,
  },
  dropdownButtonCompact: {
    borderRadius: 12,
    height: 32,
    paddingHorizontal: 10,
  },
  dropdownButtonContent: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 10,
    height: '100%',
    justifyContent: 'space-between',
    width: '100%',
  },
  dropdownText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
    paddingRight: 8,
  },
  dropdownArrow: {
    flexShrink: 0,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 12,
  },
  dropdownMenu: {
    borderRadius: 16,
    borderWidth: 1,
    elevation: 7,
    left: 0,
    marginTop: 6,
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
    top: 48,
    zIndex: 7,
  },
  dropdownMenuMobile: {
    left: 0,
    right: 0,
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: '700',
  },
  searchInput: {
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    fontSize: 15,
    height: 48,
    paddingHorizontal: 14,
    paddingVertical: 0,
    textAlignVertical: 'center',
  },
  searchInputCompact: {
    height: 32,
  },
  searchButtonWrap: {
    width: 124,
  },
  searchButtonWrapMobile: {
    width: 124,
  },
  searchButton: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  searchButtonCompact: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  metaText: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
  },
  errorText: {
    color: '#bc4749',
    fontSize: 13,
    fontWeight: '700',
  },
  tableWrap: {
    alignSelf: 'stretch',
    marginTop: 8,
    width: '100%',
  },
  editorCard: {
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    marginTop: 14,
    padding: 16,
  },
  editorHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  editorHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  editorSectionButton: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: 14,
  },
  editorSectionButtonText: {
    fontSize: 12,
    fontWeight: '800',
  },
  editorSectionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  editorTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  editorNotice: {
    fontSize: 13,
    lineHeight: 20,
  },
  editorCloseButton: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: 12,
  },
  editorCloseButtonText: {
    fontSize: 12,
    fontWeight: '800',
  },
  editorMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  editorMetaText: {
    fontSize: 12,
    fontWeight: '700',
  },
  editorInput: {
    borderRadius: 14,
    borderWidth: 1,
    fontSize: 14,
    height: 46,
    paddingHorizontal: 14,
  },
  skinInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statusOptionChip: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 34,
    minWidth: 88,
    paddingHorizontal: 14,
  },
  statusOptionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusOptionText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  skinValueInput: {
    flex: 1,
  },
  editorTextArea: {
    borderRadius: 14,
    borderWidth: 1,
    fontSize: 14,
    minHeight: 88,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlignVertical: 'top',
  },
  editorJsonArea: {
    borderRadius: 14,
    borderWidth: 1,
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
    fontSize: 13,
    minHeight: 168,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlignVertical: 'top',
  },
  passSummaryCard: {
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  passAddButton: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 30,
    paddingHorizontal: 12,
  },
  passAddButtonText: {
    fontSize: 11,
    fontWeight: '800',
  },
  passPopupActionButton: {
    borderRadius: 12,
    minWidth: 112,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  passPopupActions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
  },
  passPopupCard: {
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  passPopupTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  passSummaryPositiveText: {
    color: '#2f9e44',
  },
  passSummaryPreviewText: {
    fontSize: 12,
    fontWeight: '800',
  },
  passSummaryValueBlock: {
    gap: 4,
  },
  passRemainingWrap: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  passSummaryText: {
    fontSize: 13,
    fontWeight: '700',
  },
  editorFeedback: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20,
  },
  editorActionRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  editorActionButton: {
    borderRadius: 14,
    minWidth: 128,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  teacherFeatureActionButton: {
    borderRadius: 12,
    minWidth: 132,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  teacherFeatureActionText: {
    fontSize: 12,
    fontWeight: '800',
  },
  teacherFeatureInput: {
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 14,
    minHeight: 42,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  teacherFeatureOptionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  teacherFeatureStack: {
    borderTopWidth: 1,
    gap: 22,
    marginTop: 18,
    paddingTop: 18,
  },
  teacherFeatureSection: {
    marginTop: 6,
    paddingTop: 6,
  },
  teacherPresetFrame: {
    minHeight: TEACHER_PRESET_FRAME_MIN_HEIGHT,
  },
  paginationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  paginationButton: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 34,
    minWidth: 84,
    paddingHorizontal: 12,
  },
  paginationButtonText: {
    fontSize: 12,
    fontWeight: '800',
  },
  paginationText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
