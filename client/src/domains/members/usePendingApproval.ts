import { useEffect, useMemo, useReducer, useState } from 'react';

import {
  approvePendingMember,
  searchPendingMembers,
} from '../../shared/lib/pendingMembersApi';
import type { LanguageMode } from '../../screens/shared/shell-model';
import {
  normalizePendingSearchQuery,
  validatePendingSearchQuery,
} from './pendingApprovalSearchValidation';
import type {
  ProfileSlotSource,
  SearchField,
} from './pendingApprovalTypes';
import { logPendingApprovalEvent } from './pendingApprovalLogging';
import {
  createPendingApprovalState,
  pendingApprovalReducer,
} from './pendingApprovalReducer';
import {
  buildPendingApprovalPresentation,
  getPendingApprovalSummaryText,
  getPendingApprovalTotalPages,
  paginatePendingApprovalSlots,
} from './pendingApprovalView';

type UsePendingApprovalParams = {
  academyCode: string;
  field: SearchField;
  isAuthenticated: boolean;
  language: LanguageMode;
  profileSlotSource: ProfileSlotSource;
  query: string;
  roleCode: string;
  uiNotice: string;
  onCleanupNativeState: (reason: string) => void;
};

export function usePendingApproval({
  academyCode,
  field,
  isAuthenticated,
  language,
  profileSlotSource,
  query,
  roleCode,
  uiNotice,
  onCleanupNativeState,
}: UsePendingApprovalParams) {
  const [state, dispatch] = useReducer(
    pendingApprovalReducer,
    uiNotice,
    createPendingApprovalState,
  );
  const [currentPage, setCurrentPage] = useState(1);

  const canManageMembers =
    isAuthenticated && (roleCode === 'ROOT' || roleCode === 'ADMIN');

  const presentation = useMemo(
    () =>
      buildPendingApprovalPresentation(
        state.rows,
        state.isProfileApplied,
        profileSlotSource,
      ),
    [state.isProfileApplied, state.rows, profileSlotSource],
  );

  const totalPages = useMemo(
    () => getPendingApprovalTotalPages(presentation.visibleSlots.length),
    [presentation.visibleSlots.length],
  );
  const paginatedSlots = useMemo(
    () => paginatePendingApprovalSlots(presentation.visibleSlots, currentPage),
    [currentPage, presentation.visibleSlots],
  );
  const summaryText = useMemo(
    () => getPendingApprovalSummaryText(presentation.memberCount, language),
    [language, presentation.memberCount],
  );

  useEffect(() => {
    dispatch({
      type: 'sync_notice',
      noticeMessage: uiNotice,
    });
  }, [uiNotice]);

  useEffect(() => {
    logPendingApprovalEvent('chartView:committed', {
      memberCount: presentation.memberCount,
      modes: presentation.slots.map(slot => slot.mode).join(','),
    });
  }, [presentation]);

  useEffect(() => {
    setCurrentPage(1);
  }, [presentation.memberCount, presentation.visibleSlots.length, state.isProfileApplied]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const resetResults = (nextErrorMessage: string) => {
    dispatch({
      type: 'reset_results',
      errorMessage: nextErrorMessage,
    });
  };

  const runSearchValidation = () => {
    const normalizedQuery = normalizePendingSearchQuery(field, query);

    logPendingApprovalEvent('search:validate:start', {
      academyCode,
      canManageMembers,
      field,
      hasQuery: Boolean(normalizedQuery),
      roleCode,
    });

    if (!canManageMembers || !academyCode) {
      logPendingApprovalEvent('search:validate:invalid-role', {
        academyCode,
        canManageMembers,
        roleCode,
      });
      resetResults(
        language === 'ja'
          ? '承認待ちメンバーを検索するには、root または admin アカウントでサインインしてください。'
          : 'Sign in as a root or admin account to search pending members.',
      );
      return 'invalid-role';
    }

    const validationMessage = validatePendingSearchQuery(
      field,
      query,
      language,
    );
    if (validationMessage) {
      logPendingApprovalEvent('search:validate:invalid-query', {
        field,
        normalizedQuery,
        validationMessage,
      });
      resetResults(validationMessage);
      return 'invalid-query';
    }

    logPendingApprovalEvent('search:validate:passed', {
      field,
      query: normalizedQuery,
    });
    dispatch({ type: 'clear_feedback' });
    return null;
  };

  const runSearchRequest = async () => {
    const normalizedQuery = normalizePendingSearchQuery(field, query);

    logPendingApprovalEvent('search:request:start', {
      academyCode,
      field,
      query: normalizedQuery,
      roleCode,
    });
    dispatch({ type: 'search_started' });

    try {
      const result = await searchPendingMembers({
        academyCode,
        actorRoleCode: roleCode,
        field,
        query: normalizedQuery,
      });

      if (result.status !== 'ok') {
        const nextErrorMessage =
          result.error ??
          result.message ??
          (language === 'ja' ? '検索に失敗しました。' : 'Search failed.');
        logPendingApprovalEvent('search:request:failed-status', {
          error: nextErrorMessage,
          status: result.status,
        });
        dispatch({
          type: 'search_failed',
          errorMessage: nextErrorMessage,
        });
        return null;
      }

      const nextRows = result.members ?? [];
      logPendingApprovalEvent('search:request:ok', {
        resultCount: nextRows.length,
      });
      dispatch({
        type: 'search_succeeded',
        noticeMessage:
          nextRows.length > 0
          ? language === 'ja'
            ? `検索結果が ${nextRows.length} 件見つかりました。`
            : `Request finished. ${nextRows.length} result slot${
                nextRows.length === 1 ? '' : 's'
              } ready to apply.`
          : language === 'ja'
          ? '一致する検索結果はありませんでした。'
          : 'Request finished with no matching results.',
        rows: nextRows,
      });
      return nextRows;
    } catch (error) {
      const nextErrorMessage =
        error instanceof Error
          ? error.message
          : language === 'ja'
          ? '検索に失敗しました。'
          : String(error);
      logPendingApprovalEvent('search:request:exception', {
        error: nextErrorMessage,
      });
      dispatch({
        type: 'search_failed',
        errorMessage: nextErrorMessage,
      });
      return null;
    } finally {
      logPendingApprovalEvent('search:request:finally', {
        pendingCount: state.rows.length,
      });
      dispatch({ type: 'search_finished' });
    }
  };

  const applyMyProfile = (
    profile: ProfileSlotSource | null = profileSlotSource,
  ) => {
    const resolvedProfile = profile ?? profileSlotSource;
    logPendingApprovalEvent('profile:apply:start', {
      profileProvided: profile !== null,
      resolvedProfile,
      visibleCount: state.rows.length,
    });
    onCleanupNativeState('profile:apply');
    dispatch({ type: 'profile_applied' });
    logPendingApprovalEvent('profile:apply:state-committed', {
      academyCode: resolvedProfile.academyCode,
      roleCode: resolvedProfile.roleCode,
      visibleCount: state.rows.length,
    });
  };

  const handleSearch = async () => {
    logPendingApprovalEvent('search:handle:start', {
      academyCode,
      field,
      query,
      roleCode,
    });
    const validationError = runSearchValidation();
    if (validationError) {
      logPendingApprovalEvent('search:handle:validation-blocked', {
        validationError,
      });
      return;
    }

    const result = await runSearchRequest();
    if (!result) {
      logPendingApprovalEvent('search:handle:request-empty');
      return;
    }

    logPendingApprovalEvent('search:handle:apply-dispatch', {
      resultCount: result.length,
    });
    onCleanupNativeState('search:apply-direct');
  };

  const handleApprove = async (loginIdToApprove: string) => {
    logPendingApprovalEvent('approve:start', {
      academyCode,
      loginId: loginIdToApprove,
      roleCode,
    });

    if (!canManageMembers || !academyCode) {
      logPendingApprovalEvent('approve:blocked', {
        academyCode,
        canManageMembers,
        loginId: loginIdToApprove,
        roleCode,
      });
      dispatch({
        type: 'approve_failed',
        errorMessage:
          language === 'ja'
          ? '承認待ちメンバーを承認するには、root または admin アカウントでサインインしてください。'
          : 'Sign in as a root or admin account to approve pending members.',
      });
      return;
    }

    onCleanupNativeState('approve:start');
    dispatch({ type: 'approve_started', loginId: loginIdToApprove });

    try {
      const result = await approvePendingMember({
        academyCode,
        actorRoleCode: roleCode,
        loginId: loginIdToApprove,
      });

      if (result.status !== 'ok') {
        const nextErrorMessage =
          result.error ??
          result.message ??
          (language === 'ja' ? '承認に失敗しました。' : 'Approval failed.');
        logPendingApprovalEvent('approve:failed-status', {
          error: nextErrorMessage,
          loginId: loginIdToApprove,
          status: result.status,
        });
        dispatch({
          type: 'approve_failed',
          errorMessage: nextErrorMessage,
        });
        return;
      }

      logPendingApprovalEvent('approve:success', {
        loginId: loginIdToApprove,
        nextCount: state.rows.filter(member => member.loginId !== loginIdToApprove).length,
      });
      dispatch({
        type: 'approve_succeeded',
        loginId: loginIdToApprove,
        noticeMessage:
          language === 'ja'
          ? `${result.displayName || loginIdToApprove} を塾 ${academyCode} に所属登録しました。`
          : `${
              result.displayName || loginIdToApprove
            } was approved and is now assigned to ${academyCode}.`,
      });
    } catch (error) {
      const nextErrorMessage =
        error instanceof Error ? error.message : String(error);
      logPendingApprovalEvent('approve:exception', {
        error: nextErrorMessage,
        loginId: loginIdToApprove,
      });
      dispatch({
        type: 'approve_failed',
        errorMessage: nextErrorMessage,
      });
    } finally {
      logPendingApprovalEvent('approve:finally', {
        approvingLoginId: state.approvingLoginId,
        loginId: loginIdToApprove,
      });
      dispatch({ type: 'approve_finished' });
    }
  };

  return {
    approvingLoginId: state.approvingLoginId,
    canManageMembers,
    currentPage,
    errorMessage: state.errorMessage,
    handleApprove,
    handleSearch,
    isProfileApplied: state.isProfileApplied,
    isSearching: state.isSearching,
    memberCount: presentation.memberCount,
    noticeMessage: state.noticeMessage,
    paginatedSlots,
    setCurrentPage,
    statusMessage: state.errorMessage || state.noticeMessage || summaryText,
    totalPages,
    visibleSlots: presentation.visibleSlots,
    applyMyProfile,
  };
}
