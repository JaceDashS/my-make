import type { PendingMemberRecord } from '../../shared/lib/pendingMembersApi';

export type PendingApprovalState = {
  approvingLoginId: string | null;
  errorMessage: string;
  isProfileApplied: boolean;
  isSearching: boolean;
  noticeMessage: string;
  rows: PendingMemberRecord[];
};

export type PendingApprovalAction =
  | { type: 'sync_notice'; noticeMessage: string }
  | { type: 'clear_feedback' }
  | { type: 'reset_results'; errorMessage: string }
  | { type: 'search_started' }
  | { type: 'search_succeeded'; noticeMessage: string; rows: PendingMemberRecord[] }
  | { type: 'search_failed'; errorMessage: string }
  | { type: 'search_finished' }
  | { type: 'profile_applied' }
  | { type: 'approve_started'; loginId: string }
  | { type: 'approve_succeeded'; loginId: string; noticeMessage: string }
  | { type: 'approve_failed'; errorMessage: string }
  | { type: 'approve_finished' };

export function createPendingApprovalState(uiNotice: string): PendingApprovalState {
  return {
    approvingLoginId: null,
    errorMessage: '',
    isProfileApplied: false,
    isSearching: false,
    noticeMessage: uiNotice,
    rows: [],
  };
}

export function pendingApprovalReducer(
  state: PendingApprovalState,
  action: PendingApprovalAction,
): PendingApprovalState {
  switch (action.type) {
    case 'sync_notice':
      if (state.errorMessage) {
        return state;
      }
      return {
        ...state,
        noticeMessage: action.noticeMessage,
      };
    case 'clear_feedback':
      return {
        ...state,
        errorMessage: '',
        noticeMessage: '',
      };
    case 'reset_results':
      return {
        ...state,
        errorMessage: action.errorMessage,
        noticeMessage: '',
        rows: [],
      };
    case 'search_started':
      return {
        ...state,
        errorMessage: '',
        isSearching: true,
        noticeMessage: '',
      };
    case 'search_succeeded':
      return {
        ...state,
        errorMessage: '',
        noticeMessage: action.noticeMessage,
        rows: action.rows,
      };
    case 'search_failed':
      return {
        ...state,
        errorMessage: action.errorMessage,
        rows: [],
      };
    case 'search_finished':
      return {
        ...state,
        isSearching: false,
      };
    case 'profile_applied':
      return {
        ...state,
        isProfileApplied: true,
      };
    case 'approve_started':
      return {
        ...state,
        approvingLoginId: action.loginId,
        errorMessage: '',
        noticeMessage: '',
      };
    case 'approve_succeeded':
      return {
        ...state,
        noticeMessage: action.noticeMessage,
        rows: state.rows.filter(member => member.loginId !== action.loginId),
      };
    case 'approve_failed':
      return {
        ...state,
        errorMessage: action.errorMessage,
      };
    case 'approve_finished':
      return {
        ...state,
        approvingLoginId: null,
      };
    default:
      return state;
  }
}
