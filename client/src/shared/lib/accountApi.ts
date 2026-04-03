import { RUNTIME_CONFIG } from '../../config/runtime/runtime-config';
import {
  ACCOUNT_API_URL_STRATEGY,
  requestLocalJson,
} from './httpClient';

const DEFAULT_REQUEST_TIMEOUT_MS = 10000;
const LONG_REQUEST_TIMEOUT_MS = 60000;

export type AccountApiResult = {
  status: string;
  message: string;
  error?: string;
  accountCode?: string;
  academyCode?: string;
  academyName?: string;
  displayName?: string;
  details?: Array<{key?: string; label?: string; value?: string}>;
  email?: string;
  loginId?: string;
  note?: string;
  roleCode?: string;
  phone?: string;
  expiresAt?: string;
  licenseCode?: string;
};

export type StudentReservationSlotApiResult = {
  startTime?: string;
  startsAtUtc?: string;
  status: 'available' | 'taken' | 'booked';
  reservationId?: string;
};

export type StudentReservationAvailabilityApiResult = {
  error?: string;
  status: string;
  message: string;
  date?: string;
  timezone?: string;
  slots?: StudentReservationSlotApiResult[];
};

export type StudentReservationRecordApiResult = {
  id: string;
  date: string;
  time: string;
  startsAtUtc?: string;
  presetId?: string;
  preset?: {
    id: string;
    name: string;
    note?: string;
    items?: Partial<
      Record<
        | 'base_foundation'
        | 'blush'
        | 'lip_color'
        | 'eyeshadow'
        | 'contour'
        | 'highlighter'
        | 'etc',
        string[]
      >
    >;
  };
  status: 'pending' | 'confirmed' | 'canceled';
  teacherName?: string;
};

export type StudentReservationListApiResult = {
  error?: string;
  status: string;
  message: string;
  reservations?: StudentReservationRecordApiResult[];
};

export type TeacherReservationRecordApiResult = {
  id: string;
  date: string;
  time: string;
  startsAtUtc?: string;
  presetId?: string;
  status: 'pending' | 'confirmed' | 'canceled';
  studentName?: string;
  studentLoginId?: string;
  skinLValue?: string;
  skinCValue?: string;
  skinHValue?: string;
  skinTraits?: string;
  preferenceRanges?: string;
  passTotalCount?: string;
  passRemainingCount?: string;
};

export type TeacherReservationListApiResult = {
  error?: string;
  status: string;
  message: string;
  reservations?: TeacherReservationRecordApiResult[];
};

export type StudentReservationMutationApiResult = {
  error?: string;
  status: string;
  message: string;
  presetId?: string;
  reservationId?: string;
};

export type PresetInventoryItemApiResult = {
  sku: string;
  itemName: string;
  imageUrl?: string;
  category:
    | 'base_foundation'
    | 'blush'
    | 'lip_color'
    | 'eyeshadow'
    | 'contour'
    | 'highlighter'
    | 'etc';
  lValue: number;
  cValue: number;
  hValue: number;
  cost: number;
  price: number;
};

export type PresetInventorySearchApiResult = {
  error?: string;
  status: string;
  message: string;
  items?: PresetInventoryItemApiResult[];
};

export type AcademyInventoryItemApiResult = {
  id: string;
  itemCode: string;
  sku: string;
  barcode: string;
  itemName: string;
  categoryCode:
    | 'base_foundation'
    | 'blush'
    | 'lip_color'
    | 'eyeshadow'
    | 'contour'
    | 'highlighter'
    | 'etc';
  cost: number;
  price: number;
  lValue: number;
  cValue: number;
  hValue: number;
  imageUrl: string;
  stockCount: number;
  reorderLevel: number;
  supplier: string;
  location: string;
  note: string;
  statusCode: 'ACTIVE' | 'INACTIVE';
};

export type AcademyInventoryListApiResult = {
  error?: string;
  status: string;
  message: string;
  items?: AcademyInventoryItemApiResult[];
};

export type AcademyInventoryMutationApiResult = {
  error?: string;
  status: string;
  message: string;
  itemCode?: string;
};

function logAccountApiEvent(
  event: string,
  payload: Record<string, unknown>,
) {
  console.log(`[accounts] ${event}`, payload);
}

async function requestJson<
  T extends {error?: string; message: string; status: string} = AccountApiResult,
>(
  method: 'GET' | 'POST',
  path: string,
  payload: Record<string, string | undefined> | null,
  timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
) {
  return requestLocalJson<T>({
    body: payload,
    method,
    onError: nextPayload => logAccountApiEvent('api:request:error', nextPayload),
    onStart: nextPayload => logAccountApiEvent('api:request:start', nextPayload),
    onSuccess: nextPayload =>
      logAccountApiEvent('api:request:success', nextPayload),
    path,
    timeoutMs,
    urlStrategy: ACCOUNT_API_URL_STRATEGY,
    withCredentials: true,
  });
}

export function loginAccount(payload: { loginId: string; password: string }) {
  return requestJson('POST', RUNTIME_CONFIG.CLIENT_ACCOUNT_LOGIN_PATH, payload);
}

export function fetchAccountProfile() {
  return requestJson('GET', RUNTIME_CONFIG.CLIENT_ACCOUNT_PROFILE_PATH, null);
}

export function updateAccountProfile(payload: {
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
}) {
  return requestJson(
    'POST',
    RUNTIME_CONFIG.CLIENT_ACCOUNT_PROFILE_UPDATE_PATH,
    payload,
  );
}

export function logoutAccount() {
  return requestJson('POST', RUNTIME_CONFIG.CLIENT_ACCOUNT_LOGOUT_PATH, {});
}

export function fetchStudentReservationAvailability(payload: {
  date: string;
  studentLoginId?: string;
  timezone?: string;
}) {
  return requestJson<StudentReservationAvailabilityApiResult>(
    'POST',
    RUNTIME_CONFIG.CLIENT_STUDENT_RESERVATION_AVAILABILITY_PATH,
    payload,
  );
}

export function fetchStudentReservationList(payload?: {studentLoginId?: string}) {
  const studentLoginId = payload?.studentLoginId?.trim();
  return requestJson<StudentReservationListApiResult>(
    'GET',
    studentLoginId
      ? `${RUNTIME_CONFIG.CLIENT_STUDENT_RESERVATION_LIST_PATH}?studentLoginId=${encodeURIComponent(
          studentLoginId,
        )}`
      : RUNTIME_CONFIG.CLIENT_STUDENT_RESERVATION_LIST_PATH,
    null,
  );
}

export function createStudentReservation(payload: {
  presetId?: string;
  startsAtUtc?: string;
  studentLoginId?: string;
  timezone?: string;
}) {
  return requestJson<StudentReservationMutationApiResult>(
    'POST',
    RUNTIME_CONFIG.CLIENT_STUDENT_RESERVATION_CREATE_PATH,
    payload,
  );
}

export function cancelStudentReservation(payload: {
  reservationId: string;
  studentLoginId?: string;
}) {
  return requestJson<StudentReservationMutationApiResult>(
    'POST',
    RUNTIME_CONFIG.CLIENT_STUDENT_RESERVATION_CANCEL_PATH,
    payload,
  );
}

export function fetchTeacherReservationList(payload?: {teacherLoginId?: string}) {
  const teacherLoginId = payload?.teacherLoginId?.trim();
  return requestJson<TeacherReservationListApiResult>(
    'GET',
    teacherLoginId
      ? `${RUNTIME_CONFIG.CLIENT_TEACHER_RESERVATION_LIST_PATH}?teacherLoginId=${encodeURIComponent(
          teacherLoginId,
        )}`
      : RUNTIME_CONFIG.CLIENT_TEACHER_RESERVATION_LIST_PATH,
    null,
  );
}

export function searchPresetInventory(payload: {
  category?: string;
  query?: string;
}) {
  return requestJson<PresetInventorySearchApiResult>(
    'POST',
    RUNTIME_CONFIG.CLIENT_INVENTORY_SEARCH_PATH,
    payload,
  );
}

export function fetchAcademyInventoryList() {
  return requestJson<AcademyInventoryListApiResult>(
    'GET',
    RUNTIME_CONFIG.CLIENT_INVENTORY_LIST_PATH,
    null,
  );
}

export function createAcademyInventoryItem(payload: {
  sku: string;
  barcode: string;
  itemName: string;
  categoryCode: string;
  cost: string;
  price: string;
  lValue: string;
  cValue: string;
  hValue: string;
  imageUrl: string;
  stockCount: string;
  reorderLevel: string;
  supplier: string;
  location: string;
  note: string;
  statusCode: string;
}) {
  return requestJson<AcademyInventoryMutationApiResult>(
    'POST',
    RUNTIME_CONFIG.CLIENT_INVENTORY_CREATE_PATH,
    payload,
  );
}

export function updateAcademyInventoryItem(payload: {
  itemCode: string;
  sku: string;
  barcode: string;
  itemName: string;
  categoryCode: string;
  cost: string;
  price: string;
  lValue: string;
  cValue: string;
  hValue: string;
  imageUrl: string;
  stockCount: string;
  reorderLevel: string;
  supplier: string;
  location: string;
  note: string;
  statusCode: string;
}) {
  return requestJson<AcademyInventoryMutationApiResult>(
    'POST',
    RUNTIME_CONFIG.CLIENT_INVENTORY_UPDATE_PATH,
    payload,
  );
}

export function deleteAcademyInventoryItem(payload: {itemCode: string}) {
  return requestJson<AcademyInventoryMutationApiResult>(
    'POST',
    RUNTIME_CONFIG.CLIENT_INVENTORY_DELETE_PATH,
    payload,
  );
}

export function sellAcademyInventoryItem(payload: {itemCode: string}) {
  return requestJson<AcademyInventoryMutationApiResult>(
    'POST',
    RUNTIME_CONFIG.CLIENT_INVENTORY_SELL_PATH,
    payload,
  );
}

export function approveTeacherReservation(payload: {
  reservationId: string;
  presetId?: string;
  teacherLoginId?: string;
}) {
  return requestJson<StudentReservationMutationApiResult>(
    'POST',
    RUNTIME_CONFIG.CLIENT_TEACHER_RESERVATION_APPROVE_PATH,
    payload,
  );
}

export function cancelTeacherReservation(payload: {
  reservationId: string;
  teacherLoginId?: string;
}) {
  return requestJson<StudentReservationMutationApiResult>(
    'POST',
    RUNTIME_CONFIG.CLIENT_TEACHER_RESERVATION_CANCEL_PATH,
    payload,
  );
}

export function registerMemberAccount(payload: {
  academyCode?: string;
  displayName: string;
  email: string;
  loginId: string;
  phone: string;
  password: string;
  requestedRoleCode: string;
}) {
  return requestJson(
    'POST',
    RUNTIME_CONFIG.CLIENT_ACCOUNT_MEMBER_REGISTER_PATH,
    payload,
    LONG_REQUEST_TIMEOUT_MS,
  );
}

export function registerRootAccount(payload: {
  academyName: string;
  email: string;
  licenseCode: string;
  phone: string;
  password: string;
  rootDisplayName: string;
  rootLoginId: string;
}) {
  return requestJson(
    'POST',
    RUNTIME_CONFIG.CLIENT_ACCOUNT_ROOT_REGISTER_PATH,
    payload,
    LONG_REQUEST_TIMEOUT_MS,
  );
}

export function renewLicense(payload: { licenseCode: string }) {
  return requestJson(
    'POST',
    RUNTIME_CONFIG.CLIENT_LICENSE_RENEW_PATH,
    payload,
    LONG_REQUEST_TIMEOUT_MS,
  );
}
