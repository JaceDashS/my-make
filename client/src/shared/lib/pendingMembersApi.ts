import {
  FALLBACK_API_URL_STRATEGY,
  requestLocalJson,
} from './httpClient';

const DEFAULT_REQUEST_TIMEOUT_MS = 30000;

function logPendingMembersApiEvent(
  event: string,
  payload: Record<string, unknown>,
) {
  console.log(`[members] ${event}`, payload);
}

export type PendingMemberRecord = {
  createdAt: string;
  displayName: string;
  email?: string;
  phone?: string;
  loginId: string;
  roleCode: string;
};

export type AcademyMemberRecord = PendingMemberRecord & {
  statusCode: 'ACTIVE' | 'HOLD' | 'INACTIVE';
};

export type PendingMembersResponse = {
  status: string;
  message: string;
  error?: string;
  members?: PendingMemberRecord[];
};

export type AcademyMembersResponse = {
  status: string;
  message: string;
  error?: string;
  members?: AcademyMemberRecord[];
};

export type ApprovePendingMemberResponse = {
  status: string;
  message: string;
  error?: string;
  academyCode?: string;
  displayName?: string;
  loginId?: string;
  roleCode?: string;
};

export type UpdateAcademyMemberStatusResponse = {
  status: string;
  message: string;
  error?: string;
  currentStatus?: string;
  displayName?: string;
  loginId?: string;
  nextStatus?: string;
  roleCode?: string;
};

async function postJson<
  TResponse extends {error?: string; message: string; status: string},
>(
  path: string,
  payload: Record<string, string>,
): Promise<TResponse> {
  return requestLocalJson<TResponse>({
    body: payload,
    method: 'POST',
    onError: p => logPendingMembersApiEvent('api:request:error', p),
    onStart: p => logPendingMembersApiEvent('api:request:start', p),
    onSuccess: p => logPendingMembersApiEvent('api:request:success', p),
    path,
    timeoutMs: DEFAULT_REQUEST_TIMEOUT_MS,
    urlStrategy: FALLBACK_API_URL_STRATEGY,
  });
}

export function searchPendingMembers(payload: {
  academyCode: string;
  actorRoleCode: string;
  field: 'displayName' | 'email' | 'phone';
  query: string;
}) {
  return postJson<PendingMembersResponse>('/api/members/pending/search', payload);
}

export function approvePendingMember(payload: {
  academyCode: string;
  actorRoleCode: string;
  loginId: string;
}) {
  return postJson<ApprovePendingMemberResponse>(
    '/api/members/pending/approve',
    payload,
  );
}

export function searchAcademyMembers(payload: {
  academyCode: string;
  actorRoleCode: string;
  field: 'displayName' | 'email' | 'phone';
  query: string;
  statusFilter: 'ALL' | 'ACTIVE' | 'HOLD' | 'INACTIVE';
}) {
  return postJson<AcademyMembersResponse>('/api/members/academy/search', payload);
}

export function updateAcademyMemberStatus(payload: {
  academyCode: string;
  actorRoleCode: string;
  loginId: string;
  currentStatus: 'ACTIVE' | 'HOLD' | 'INACTIVE';
  nextStatus: 'ACTIVE' | 'HOLD' | 'INACTIVE';
}) {
  return postJson<UpdateAcademyMemberStatusResponse>(
    '/api/members/academy/status',
    payload,
  );
}
