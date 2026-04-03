import React from 'react';
import {ScrollView} from 'react-native';

import type {ProfileDetail} from '../account-section-model';
import type {AccountSection as AccountSectionType, LanguageMode} from '../shell-model';
import {StudentSkinSection} from '../../../domains/student-options/StudentSkinSection';
import {TeacherAvailableScheduleSection} from '../../../domains/teacher-schedule/TeacherAvailableScheduleSection';
import {TeacherPresetSection} from '../../../domains/teacher-preset/TeacherPresetSection';
import {TeacherReservationApprovalSection} from '../../../domains/teacher-reservation/TeacherReservationApprovalSection';
import {StudentReservationSection} from '../../../domains/student-reservation/StudentReservationSection';
import {
  AccountSection as LegacyAccountSection,
  type AccountSectionPalette,
  type AccountTexts,
} from './AccountSection';

const TEACHER_AVAILABLE_SCHEDULE_PROFILE_KEYS = ['availableSchedule'] as const;
const STUDENT_OPTIONS_PROFILE_KEYS = [
  'preferenceRanges',
  'skinCValue',
  'skinHValue',
  'skinLValue',
  'skinTraits',
] as const;

type UiComponents = {
  BodyStrong: React.ComponentType<any>;
  BodyText: React.ComponentType<any>;
  Card: React.ComponentType<any>;
  FieldLabel: React.ComponentType<any>;
  OptionChip: React.ComponentType<any>;
};

type Props = {
  academyCode: string;
  language: LanguageMode;
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
  onStudentOptionsDirtyChange?: (isDirty: boolean) => void;
  showStudentSkinPreview?: boolean;
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
    preferenceRanges?: string;
    skinCValue?: string;
    skinHValue?: string;
    skinLValue?: string;
    skinTraits?: string;
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

export type {AccountTexts, AccountSectionPalette};

function getStudentOptionsProfileSignature(profileDetails: ProfileDetail[]) {
  return STUDENT_OPTIONS_PROFILE_KEYS.map(
    key => `${key}:${profileDetails.find(detail => detail.key === key)?.value ?? ''}`,
  ).join('|');
}

function getTeacherAvailableScheduleProfileSignature(profileDetails: ProfileDetail[]) {
  return TEACHER_AVAILABLE_SCHEDULE_PROFILE_KEYS.map(
    key => `${key}:${profileDetails.find(detail => detail.key === key)?.value ?? ''}`,
  ).join('|');
}

export function AccountFeatureSectionRouter(props: Props) {
  if (
    props.currentSection === 'available-schedule' &&
    props.isAuthenticated
  ) {
    return (
      <ScrollView
        contentContainerStyle={[
          props.styles.stack,
          {
            alignSelf: 'stretch',
            backgroundColor: props.palette.card,
            minWidth: 0,
            width: '100%',
          },
        ]}
        style={{
          alignSelf: 'stretch',
          backgroundColor: props.palette.card,
          flex: 1,
          minWidth: 0,
          width: '100%',
        }}
        scrollEventThrottle={16}>
        <TeacherAvailableScheduleSection
          key={getTeacherAvailableScheduleProfileSignature(props.profileDetails)}
          isSubmitting={props.isSubmitting}
          language={props.language}
          onSaveProfile={props.onSaveProfile}
          palette={props.palette}
          profileDetails={props.profileDetails}
          styles={props.styles}
          texts={{
            availableScheduleGuide: props.texts.availableScheduleGuide,
            availableScheduleTimezone: props.texts.availableScheduleTimezone,
            availableScheduleWeeklyGrid: props.texts.availableScheduleWeeklyGrid,
            availableScheduleSlotsSelected: props.texts.availableScheduleSlotsSelected,
            availableScheduleBusinessHours: props.texts.availableScheduleBusinessHours,
            availableScheduleClearAll: props.texts.availableScheduleClearAll,
            availableScheduleTimeColumn: props.texts.availableScheduleTimeColumn,
            availableScheduleClearDay: props.texts.availableScheduleClearDay,
            availableScheduleExceptions: props.texts.availableScheduleExceptions,
            availableScheduleExceptionGuide: props.texts.availableScheduleExceptionGuide,
            availableScheduleAddException: props.texts.availableScheduleAddException,
            availableScheduleExceptionPeriodBlock:
              props.texts.availableScheduleExceptionPeriodBlock,
            availableScheduleExceptionTimeBlock:
              props.texts.availableScheduleExceptionTimeBlock,
            availableScheduleExceptionStartDate:
              props.texts.availableScheduleExceptionStartDate,
            availableScheduleExceptionEndDate:
              props.texts.availableScheduleExceptionEndDate,
            availableScheduleExceptionDate:
              props.texts.availableScheduleExceptionDate,
            availableScheduleAddSlot: props.texts.availableScheduleAddSlot,
            availableScheduleSlotTo: props.texts.availableScheduleSlotTo,
            availableScheduleSave: props.texts.availableScheduleSave,
          }}
          title={props.texts.availableSchedule}
          ui={props.ui}
        />
      </ScrollView>
    );
  }

  if (props.currentSection === 'reservation' && props.isAuthenticated) {
    return (
      <ScrollView
        contentContainerStyle={[
          props.styles.stack,
          {
            alignSelf: 'stretch',
            backgroundColor: props.palette.card,
            minWidth: 0,
            width: '100%',
          },
        ]}
        style={{
          alignSelf: 'stretch',
          backgroundColor: props.palette.card,
          flex: 1,
          minWidth: 0,
          width: '100%',
        }}
        scrollEventThrottle={16}>
        <StudentReservationSection
          language={props.language}
          palette={props.palette}
          styles={props.styles}
          teacherName={
            props.profileDetails.find(d => d.key === 'primaryTeacherName')?.value ?? '-'
          }
          texts={{
            cancel: props.texts.cancel,
            reservationTimezone: props.texts.reservationTimezone,
            reservationTeacher: props.texts.reservationTeacher,
            reservationSelectDate: props.texts.reservationSelectDate,
            reservationTimeSlots: props.texts.reservationTimeSlots,
            reservationConfirm: props.texts.reservationConfirm,
            reservationDate: props.texts.reservationDate,
            reservationTime: props.texts.reservationTime,
            reservationBookLesson: props.texts.reservationBookLesson,
            reservationBooked: props.texts.reservationBooked,
            reservationBookedBody: props.texts.reservationBookedBody,
            reservationMyList: props.texts.reservationMyList,
            reservationNone: props.texts.reservationNone,
            reservationSlotTaken: props.texts.reservationSlotTaken,
            reservationSlotBooked: props.texts.reservationSlotBooked,
            reservationStatusConfirmed: props.texts.reservationStatusConfirmed,
            reservationStatusPending: props.texts.reservationStatusPending,
            reservationStatusCanceled: props.texts.reservationStatusCanceled,
            reservationDetails: props.texts.reservationDetails,
            reservationHideDetails: props.texts.reservationHideDetails,
            reservationPreset: props.texts.reservationPreset,
            reservationNote: props.texts.reservationNote,
            reservationCosmetics: props.texts.reservationCosmetics,
            reservationNoCosmetics: props.texts.reservationNoCosmetics,
            presetCategoryBaseFoundation: props.texts.presetCategoryBaseFoundation,
            presetCategoryBlush: props.texts.presetCategoryBlush,
            presetCategoryLipColor: props.texts.presetCategoryLipColor,
            presetCategoryEyeshadow: props.texts.presetCategoryEyeshadow,
            presetCategoryContour: props.texts.presetCategoryContour,
            presetCategoryHighlighter: props.texts.presetCategoryHighlighter,
            presetCategoryEtc: props.texts.presetCategoryEtc,
          }}
          title={props.texts.reservation}
          ui={props.ui}
        />
      </ScrollView>
    );
  }

  if (props.currentSection === 'reservation-view' && props.isAuthenticated) {
    return (
      <ScrollView
        contentContainerStyle={[
          props.styles.stack,
          {
            alignSelf: 'stretch',
            backgroundColor: props.palette.card,
            minWidth: 0,
            width: '100%',
          },
        ]}
        style={{
          alignSelf: 'stretch',
          backgroundColor: props.palette.card,
          flex: 1,
          minWidth: 0,
          width: '100%',
        }}
        scrollEventThrottle={16}>
        <TeacherReservationApprovalSection
          palette={props.palette}
          presetValue={props.profileDetails.find(d => d.key === 'preset')?.value ?? '-'}
          styles={props.styles}
          texts={{
            cancel: props.texts.cancel,
            reservationStatusConfirmed: props.texts.reservationStatusConfirmed,
            reservationStatusPending: props.texts.reservationStatusPending,
            reservationStatusCanceled: props.texts.reservationStatusCanceled,
            reservationTimezone: props.texts.reservationTimezone,
            reservationViewApprove: props.texts.reservationViewApprove,
            reservationViewEmpty: props.texts.reservationViewEmpty,
            reservationViewPending: props.texts.reservationViewPending,
            reservationViewCanceled: props.texts.reservationViewCanceled,
            reservationViewReject: props.texts.reservationViewReject,
            reservationViewStudent: props.texts.reservationViewStudent,
            reservationViewUpcoming: props.texts.reservationViewUpcoming,
            reservationPreset: props.texts.reservationPreset,
            reservationNote: props.texts.reservationNote,
            reservationViewMismatchGuide: props.texts.reservationViewMismatchGuide,
            reservationViewNoPreference: props.texts.reservationViewNoPreference,
            reservationViewPresetItems: props.texts.reservationViewPresetItems,
            reservationViewSkin: props.texts.reservationViewSkin,
          }}
          title={props.texts.reservationView}
          ui={props.ui}
        />
      </ScrollView>
    );
  }

  if (props.currentSection === 'student-options' && props.isAuthenticated) {
    return (
      <ScrollView
        contentContainerStyle={[
          props.styles.stack,
          {
            alignSelf: 'stretch',
            backgroundColor: props.palette.card,
            minWidth: 0,
            width: '100%',
          },
        ]}
        style={{
          alignSelf: 'stretch',
          backgroundColor: props.palette.card,
          flex: 1,
          minWidth: 0,
          width: '100%',
        }}
        scrollEventThrottle={16}>
        <StudentSkinSection
          key={getStudentOptionsProfileSignature(props.profileDetails)}
          isSubmitting={props.isSubmitting}
          onDirtyChange={props.onStudentOptionsDirtyChange}
          onSaveProfile={props.onSaveProfile}
          palette={props.palette}
          profileDetails={props.profileDetails}
          showDevPreview={props.showStudentSkinPreview ?? false}
          styles={props.styles}
          texts={{
            cancel: props.texts.cancel,
            studentOptionsSkinData: props.texts.studentOptionsSkinData,
            studentOptionsMySkin: props.texts.studentOptionsMySkin,
            studentOptionsTraits: props.texts.studentOptionsTraits,
            studentOptionsPreferencePoints: props.texts.studentOptionsPreferencePoints,
            studentOptionsCategory: props.texts.studentOptionsCategory,
            studentOptionsActions: props.texts.studentOptionsActions,
            studentOptionsLightness: props.texts.studentOptionsLightness,
            studentOptionsHue: props.texts.studentOptionsHue,
            studentOptionsChroma: props.texts.studentOptionsChroma,
            studentOptionsRangeRadius: props.texts.studentOptionsRangeRadius,
            studentOptionsSave: props.texts.studentOptionsSave,
            studentOptionsReset: props.texts.studentOptionsReset,
            studentOptionsDone: props.texts.studentOptionsDone,
            studentOptionsToolSelect: props.texts.studentOptionsToolSelect,
            studentOptionsToolRange: props.texts.studentOptionsToolRange,
            studentOptionsZoom: props.texts.studentOptionsZoom,
            studentOptionsTraitsPlaceholder: props.texts.studentOptionsTraitsPlaceholder,
            studentOptionsNoTraits: props.texts.studentOptionsNoTraits,
            studentOptionsNoPoints: props.texts.studentOptionsNoPoints,
            studentOptionsPoints: props.texts.studentOptionsPoints,
            studentOptionsDeleteTitle: props.texts.studentOptionsDeleteTitle,
            studentOptionsDeleteMessage: props.texts.studentOptionsDeleteMessage,
            studentOptionsDeleteConfirm: props.texts.studentOptionsDeleteConfirm,
            studentOptionsUseFullSkinRange: props.texts.studentOptionsUseFullSkinRange,
          }}
          title={props.texts.studentOptions}
          ui={props.ui}
        />
      </ScrollView>
    );
  }

  if (props.currentSection === 'preset' && props.isAuthenticated) {
    return (
      <TeacherPresetSection
        onSaveProfile={props.onSaveProfile}
        palette={props.palette}
        presetValue={props.profileDetails.find(d => d.key === 'preset')?.value ?? '-'}
        styles={props.styles}
        texts={{
          cancel: props.texts.cancel,
          presetTitle: props.texts.presetTitle,
          presetNew: props.texts.presetNew,
          presetName: props.texts.presetName,
          presetSave: props.texts.presetSave,
          presetDelete: props.texts.presetDelete,
          presetDeleteConfirm: props.texts.presetDeleteConfirm,
          presetShowDetails: props.texts.presetShowDetails,
          presetHideDetails: props.texts.presetHideDetails,
          presetSummary: props.texts.presetSummary,
          presetNoItems: props.texts.presetNoItems,
          presetCategoryAll: props.texts.presetCategoryAll,
          presetSearch: props.texts.presetSearch,
          presetSearchPlaceholder: props.texts.presetSearchPlaceholder,
          presetManualItemNamePlaceholder: props.texts.presetManualItemNamePlaceholder,
          presetManualAdd: props.texts.presetManualAdd,
          presetManualCategoryRequired: props.texts.presetManualCategoryRequired,
          presetItemName: props.texts.presetItemName,
          presetSku: props.texts.presetSku,
          presetLch: props.texts.presetLch,
          presetCategoryBaseFoundation: props.texts.presetCategoryBaseFoundation,
          presetCategoryBlush: props.texts.presetCategoryBlush,
          presetCategoryLipColor: props.texts.presetCategoryLipColor,
          presetCategoryEyeshadow: props.texts.presetCategoryEyeshadow,
          presetCategoryContour: props.texts.presetCategoryContour,
          presetCategoryHighlighter: props.texts.presetCategoryHighlighter,
          presetCategoryEtc: props.texts.presetCategoryEtc,
        }}
        title={props.texts.presetPlaceholderTitle}
        ui={props.ui}
      />
    );
  }

  return <LegacyAccountSection {...(props as any)} />;
}
