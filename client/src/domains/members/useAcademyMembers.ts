import {useEffect, useMemo, useReducer, useRef, useState} from 'react';

import {
  searchAcademyMembers,
  updateAcademyMemberStatus,
  type AcademyMemberRecord,
} from '../../shared/lib/pendingMembersApi';
import type {LanguageMode} from '../../screens/shared/shell-model';
import {filterSlotsByStatus} from './academyMembersModel';
import {
  academyMembersReducer,
  createAcademyMembersState,
} from './academyMembersReducer';
import {
  getAcademyMemberSummaryText,
  getAcademyMemberTotalPages,
  paginateAcademyMemberSlots,
} from './academyMembersView';
import type {
  AcademyMemberStatus,
  AcademyMemberStatusFilter,
  SearchField,
} from './academyMembersTypes';
import {
  normalizePendingSearchQuery,
  validatePendingSearchQuery,
} from './pendingApprovalSearchValidation';

type UseAcademyMembersParams = {
  academyCode: string;
  field: SearchField;
  isAuthenticated: boolean;
  language: LanguageMode;
  query: string;
  roleCode: string;
  uiNotice: string;
  onCleanupNativeState: (reason: string) => void;
};

export function useAcademyMembers({
  academyCode,
  field,
  isAuthenticated,
  language,
  query,
  roleCode,
  uiNotice,
  onCleanupNativeState,
}: UseAcademyMembersParams) {
  const [state, dispatch] = useReducer(
    academyMembersReducer,
    uiNotice,
    createAcademyMembersState,
  );
  const [statusFilter, setStatusFilter] =
    useState<AcademyMemberStatusFilter>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const membersRef = useRef<AcademyMemberRecord[] | null>(null);

  const canManageMembers =
    isAuthenticated && (roleCode === 'ROOT' || roleCode === 'ADMIN');

  useEffect(() => {
    dispatch({type: 'sync_notice', noticeMessage: uiNotice});
  }, [uiNotice]);

  const visibleSlots = useMemo(
    () => filterSlotsByStatus(state.chartView.slots, statusFilter),
    [state.chartView.slots, statusFilter],
  );

  const totalPages = getAcademyMemberTotalPages(visibleSlots.length);
  const paginatedSlots = paginateAcademyMemberSlots(visibleSlots, currentPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [state.chartView.memberCount, statusFilter, visibleSlots.length]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const summaryText = useMemo(
    () =>
      getAcademyMemberSummaryText(
        state.chartView.memberCount,
        visibleSlots.length,
        language,
      ),
    [state.chartView.memberCount, language, visibleSlots.length],
  );

  const runSearchValidation = () => {
    if (!canManageMembers || !academyCode) {
      membersRef.current = null;
      dispatch({
        type: 'reset_results',
        errorMessage:
          language === 'ja'
            ? '所属メンバーを検索するには、root または admin アカウントでサインインしてください。'
            : 'Sign in as a root or admin account to search academy members.',
      });
      return 'invalid-role';
    }

    const validationMessage = validatePendingSearchQuery(field, query, language);
    if (validationMessage) {
      membersRef.current = null;
      dispatch({type: 'reset_results', errorMessage: validationMessage});
      return 'invalid-query';
    }

    dispatch({type: 'clear_feedback'});
    return null;
  };

  const runAccessValidation = () => {
    if (!canManageMembers || !academyCode) {
      membersRef.current = null;
      dispatch({
        type: 'reset_results',
        errorMessage:
          language === 'ja'
            ? '所属メンバーを検索するには、root または admin アカウントでサインインしてください。'
            : 'Sign in as a root or admin account to search academy members.',
      });
      return 'invalid-role';
    }

    dispatch({type: 'clear_feedback'});
    return null;
  };

  const handleSearch = async (overrideStatusFilter?: AcademyMemberStatusFilter) => {
    if (runSearchValidation()) {
      return;
    }

    dispatch({type: 'search_started'});

    try {
      const normalizedQuery = normalizePendingSearchQuery(field, query);
      const result = await searchAcademyMembers({
        academyCode,
        actorRoleCode: roleCode,
        field,
        query: normalizedQuery,
        statusFilter: overrideStatusFilter ?? statusFilter,
      });

      if (result.status !== 'ok') {
        membersRef.current = null;
        dispatch({
          type: 'search_failed',
          errorMessage:
            result.error ??
            result.message ??
            (language === 'ja' ? '検索に失敗しました。' : 'Search failed.'),
        });
        return;
      }

      const nextRows = result.members ?? [];
      membersRef.current = nextRows;
      dispatch({
        type: 'search_succeeded',
        rows: nextRows,
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
      });
    } catch (error) {
      membersRef.current = null;
      dispatch({
        type: 'search_failed',
        errorMessage:
          error instanceof Error
            ? error.message
            : language === 'ja'
            ? '検索に失敗しました。'
            : String(error),
      });
    } finally {
      dispatch({type: 'search_finished'});
      onCleanupNativeState('academy-members:search');
    }
  };

  const handleStatusFilterChange = async (
    nextStatusFilter: AcademyMemberStatusFilter,
  ) => {
    setStatusFilter(nextStatusFilter);

    if (query.trim()) {
      await handleSearch(nextStatusFilter);
    }
  };

  const handleLoadAllMembers = async () => {
    if (runAccessValidation()) {
      return;
    }

    dispatch({type: 'search_started'});

    try {
      const result = await searchAcademyMembers({
        academyCode,
        actorRoleCode: roleCode,
        field,
        query: '',
        statusFilter,
      });

      if (result.status !== 'ok') {
        membersRef.current = null;
        dispatch({
          type: 'search_failed',
          errorMessage:
            result.error ??
            result.message ??
            (language === 'ja'
              ? '全メンバーの読み込みに失敗しました。'
              : 'Loading all members failed.'),
        });
        return;
      }

      const nextRows = result.members ?? [];
      membersRef.current = nextRows;
      dispatch({
        type: 'search_succeeded',
        rows: nextRows,
        noticeMessage:
          nextRows.length > 0
            ? language === 'ja'
              ? `所属メンバーを ${nextRows.length} 件読み込みました。`
              : `Loaded ${nextRows.length} academy member${
                  nextRows.length === 1 ? '' : 's'
                }.`
            : language === 'ja'
            ? '所属メンバーは見つかりませんでした。'
            : 'No academy members were found.',
      });
    } catch (error) {
      membersRef.current = null;
      dispatch({
        type: 'search_failed',
        errorMessage:
          error instanceof Error
            ? error.message
            : language === 'ja'
            ? '全メンバーの読み込みに失敗しました。'
            : String(error),
      });
    } finally {
      dispatch({type: 'search_finished'});
      onCleanupNativeState('academy-members:load-all');
    }
  };

  const handleStatusUpdate = async (
    loginId: string,
    currentStatus: AcademyMemberStatus,
    nextStatus: AcademyMemberStatus,
  ) => {
    if (!canManageMembers || !academyCode) {
      dispatch({
        type: 'status_update_failed',
        errorMessage:
          language === 'ja'
            ? '所属メンバーを管理するには、root または admin アカウントでサインインしてください。'
            : 'Sign in as a root or admin account to manage academy members.',
      });
      return false;
    }

    dispatch({
      type: 'status_update_started',
      updatingKey: `${loginId}:${nextStatus}`,
    });

    try {
      const result = await updateAcademyMemberStatus({
        academyCode,
        actorRoleCode: roleCode,
        currentStatus,
        loginId,
        nextStatus,
      });

      if (result.status !== 'ok') {
        dispatch({
          type: 'status_update_failed',
          errorMessage:
            result.error ??
            result.message ??
            (language === 'ja' ? '状態変更に失敗しました。' : 'Update failed.'),
        });
        return false;
      }

      dispatch({
        type: 'status_update_succeeded',
        noticeMessage:
          language === 'ja'
            ? `${result.loginId ?? loginId} の状態を ${nextStatus} に変更しました。`
            : `${result.loginId ?? loginId} is now ${nextStatus}.`,
      });

      if (query.trim()) {
        await handleSearch(statusFilter);
      } else {
        await handleLoadAllMembers();
      }
      return true;
    } catch (error) {
      dispatch({
        type: 'status_update_failed',
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      return false;
    } finally {
      dispatch({type: 'status_update_finished'});
      onCleanupNativeState('academy-members:update');
    }
  };

  return {
    currentPage,
    errorMessage: state.errorMessage,
    handleSearch,
    handleLoadAllMembers,
    handleStatusFilterChange,
    handleStatusUpdate,
    isSearching: state.isSearching,
    paginatedSlots,
    setCurrentPage,
    statusFilter,
    statusMessage:
      state.errorMessage || state.noticeMessage || summaryText,
    totalPages,
    updatingKey: state.updatingKey,
  };
}
