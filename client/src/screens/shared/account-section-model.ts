import type {AccountSection} from './shell-model';

export type ProfileDetail = {key: string; label: string; value: string};

export type EditableField =
  | 'password'
  | 'email'
  | 'phone'
  | 'note'
  | 'authPolicy'
  | 'statusCode';

export type PlaceholderTarget =
  | 'preset'
  | 'availableSchedule'
  | 'reservationView'
  | 'studentOptions'
  | 'reservation'
  | null;

type EditorSource = {
  authPolicy: string;
  email: string;
  note: string;
  phone: string;
  statusCode: string;
};

type PlaceholderTexts = {
  availableSchedulePlaceholderBody: string;
  availableSchedulePlaceholderTitle: string;
  presetPlaceholderBody: string;
  presetPlaceholderTitle: string;
  reservationPlaceholderBody: string;
  reservationPlaceholderTitle: string;
  reservationViewPlaceholderBody: string;
  reservationViewPlaceholderTitle: string;
  studentOptionsPlaceholderBody: string;
  studentOptionsPlaceholderTitle: string;
};

export function resolvePlaceholderTarget(
  currentSection: AccountSection,
): PlaceholderTarget {
  switch (currentSection) {
    case 'preset':
      return 'preset';
    case 'available-schedule':
      return 'availableSchedule';
    case 'reservation-view':
      return 'reservationView';
    case 'student-options':
      return 'studentOptions';
    case 'reservation':
      return 'reservation';
    default:
      return null;
  }
}

export function formatAccountPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length <= 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export function isEditableProfileDetail(
  key: string,
  options: {
    canEditAuthPolicy: boolean;
    canEditStatus: boolean;
  },
) {
  return (
    key === 'password' ||
    key === 'email' ||
    key === 'phone' ||
    key === 'note' ||
    (key === 'authPolicy' && options.canEditAuthPolicy) ||
    (key === 'statusCode' && options.canEditStatus)
  );
}

export function asEditableProfileField(
  key: string,
  options: {
    canEditAuthPolicy: boolean;
    canEditStatus: boolean;
  },
): EditableField | null {
  if (!isEditableProfileDetail(key, options)) {
    return null;
  }

  switch (key) {
    case 'password':
    case 'email':
    case 'phone':
    case 'note':
    case 'authPolicy':
    case 'statusCode':
      return key;
    default:
      return null;
  }
}

export function getStandardProfileDetails(profileDetails: ProfileDetail[]) {
  return profileDetails.filter(
    detail =>
      detail.key !== 'preset' &&
      detail.key !== 'availableSchedule' &&
      detail.key !== 'skinLValue' &&
      detail.key !== 'skinCValue' &&
      detail.key !== 'skinHValue' &&
      detail.key !== 'skinTraits' &&
      detail.key !== 'preferenceRanges',
  );
}

export function getEditorInitialDrafts(
  field: EditableField,
  source: EditorSource,
) {
  switch (field) {
    case 'password':
      return {
        draftAuthPolicy: '',
        draftEmail: '',
        draftNote: '',
        draftPassword: '',
        draftPasswordConfirm: '',
        draftPhone: '',
        draftStatusCode: '',
      };
    case 'email':
      return {
        draftAuthPolicy: '',
        draftEmail: source.email,
        draftNote: '',
        draftPassword: '',
        draftPasswordConfirm: '',
        draftPhone: '',
        draftStatusCode: '',
      };
    case 'phone':
      return {
        draftAuthPolicy: '',
        draftEmail: '',
        draftNote: '',
        draftPassword: '',
        draftPasswordConfirm: '',
        draftPhone: source.phone,
        draftStatusCode: '',
      };
    case 'note':
      return {
        draftAuthPolicy: '',
        draftEmail: '',
        draftNote: source.note,
        draftPassword: '',
        draftPasswordConfirm: '',
        draftPhone: '',
        draftStatusCode: '',
      };
    case 'authPolicy':
      return {
        draftAuthPolicy: source.authPolicy,
        draftEmail: '',
        draftNote: '',
        draftPassword: '',
        draftPasswordConfirm: '',
        draftPhone: '',
        draftStatusCode: '',
      };
    case 'statusCode':
      return {
        draftAuthPolicy: '',
        draftEmail: '',
        draftNote: '',
        draftPassword: '',
        draftPasswordConfirm: '',
        draftPhone: '',
        draftStatusCode: source.statusCode,
      };
  }
}

export function getPlaceholderCopy(
  placeholderTarget: PlaceholderTarget,
  texts: PlaceholderTexts,
) {
  switch (placeholderTarget) {
    case 'preset':
      return {
        body: texts.presetPlaceholderBody,
        title: texts.presetPlaceholderTitle,
      };
    case 'availableSchedule':
      return {
        body: texts.availableSchedulePlaceholderBody,
        title: texts.availableSchedulePlaceholderTitle,
      };
    case 'reservationView':
      return {
        body: texts.reservationViewPlaceholderBody,
        title: texts.reservationViewPlaceholderTitle,
      };
    case 'reservation':
      return {
        body: texts.reservationPlaceholderBody,
        title: texts.reservationPlaceholderTitle,
      };
    default:
      return {
        body: texts.studentOptionsPlaceholderBody,
        title: texts.studentOptionsPlaceholderTitle,
      };
  }
}
