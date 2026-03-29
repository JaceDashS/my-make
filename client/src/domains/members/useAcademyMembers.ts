import {useEffect, useMemo, useRef, useState} from 'react';

import {
  searchAcademyMembers,
  updateAcademyMemberStatus,
  type AcademyMemberRecord,
} from '../../shared/lib/pendingMembersApi';
import type {LanguageMode} from '../../screens/shared/shell-model';
import {
  buildAcademyMemberSlots,
  filterSlotsByStatus,
  TABLE_PAGE_SIZE,
} from './academyMembersModel';
import type {
  AcademyMemberChartViewState,
  AcademyMemberStatus,
  AcademyMemberStatusFilter,
  AcademyMemberSearchViewState,
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
  const [isSearching, setIsSearching] = useState(false);
  const [statusFilter, setStatusFilter] =
    useState<AcademyMemberStatusFilter>('ALL');
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const membersRef = useRef<AcademyMemberRecord[] | null>(null);
  const [searchView, setSearchView] = useState<AcademyMemberSearchViewState>({
    errorMessage: '',
    noticeMessage: uiNotice,
  });
  const [chartView, setChartView] = useState<AcademyMemberChartViewState>({
    memberCount: 0,
    slots: buildAcademyMemberSlots([]),
  });
  const [currentPage, setCurrentPage] = useState(1);

  const canManageMembers =
    isAuthenticated && (roleCode === 'ROOT' || roleCode === 'ADMIN');

  useEffect(() => {
    setSearchView(current => ({
      ...current,
      noticeMessage: current.errorMessage ? current.noticeMessage : uiNotice,
    }));
  }, [uiNotice]);

  const visibleSlots = useMemo(
    () => filterSlotsByStatus(chartView.slots, statusFilter),
    [chartView.slots, statusFilter],
  );

  const tableRowCount = visibleSlots.length;
  const totalPages = Math.max(
    1,
    Math.ceil(Math.max(1, tableRowCount) / TABLE_PAGE_SIZE),
  );
  const paginatedSlots = visibleSlots.slice(
    (currentPage - 1) * TABLE_PAGE_SIZE,
    currentPage * TABLE_PAGE_SIZE,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [chartView.memberCount, statusFilter, visibleSlots.length]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const summaryText = useMemo(() => {
    if (visibleSlots.length === 0) {
      return language === 'ja'
        ? '現在表示できる所属メンバーはありません。'
        : chartView.memberCount === 0
        ? 'No academy members are currently loaded.'
        : 'No academy members match the current filter.';
    }

    return language === 'ja'
      ? `確認対象の所属メンバーが ${visibleSlots.length} 件あります。`
      : `${visibleSlots.length} academy member${
          visibleSlots.length === 1 ? '' : 's'
        } ready to manage.`;
  }, [chartView.memberCount, language, visibleSlots.length]);

  const applyChartState = (nextRows: AcademyMemberRecord[]) => {
    setChartView({
      memberCount: nextRows.length,
      slots: buildAcademyMemberSlots(nextRows),
    });
  };

  const runSearchValidation = () => {
    if (!canManageMembers || !academyCode) {
      membersRef.current = null;
      setSearchView({
        errorMessage:
          language === 'ja'
            ? '所属メンバーを検索するには、root または admin アカウントでサインインしてください。'
            : 'Sign in as a root or admin account to search academy members.',
        noticeMessage: '',
      });
      applyChartState([]);
      return 'invalid-role';
    }

    const validationMessage = validatePendingSearchQuery(field, query, language);
    if (validationMessage) {
      membersRef.current = null;
      setSearchView({
        errorMessage: validationMessage,
        noticeMessage: '',
      });
      applyChartState([]);
      return 'invalid-query';
    }

    setSearchView(current => ({
      ...current,
      errorMessage: '',
      noticeMessage: '',
    }));
    return null;
  };

  const runAccessValidation = () => {
    if (!canManageMembers || !academyCode) {
      membersRef.current = null;
      setSearchView({
        errorMessage:
          language === 'ja'
            ? '所属メンバーを検索するには、root または admin アカウントでサインインしてください。'
            : 'Sign in as a root or admin account to search academy members.',
        noticeMessage: '',
      });
      applyChartState([]);
      return 'invalid-role';
    }

    setSearchView(current => ({
      ...current,
      errorMessage: '',
      noticeMessage: '',
    }));
    return null;
  };

  const handleSearch = async (overrideStatusFilter?: AcademyMemberStatusFilter) => {
    const validationError = runSearchValidation();
    if (validationError) {
      return;
    }

    setIsSearching(true);
    setSearchView(current => ({
      ...current,
      errorMessage: '',
      noticeMessage: '',
    }));

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
        setSearchView(current => ({
          ...current,
          errorMessage:
            result.error ??
            result.message ??
            (language === 'ja' ? '検索に失敗しました。' : 'Search failed.'),
        }));
        return;
      }

      const nextRows = result.members ?? [];
      membersRef.current = nextRows;
      applyChartState(nextRows);
      setSearchView(current => ({
        ...current,
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
      }));
    } catch (error) {
      membersRef.current = null;
      setSearchView(current => ({
        ...current,
        errorMessage:
          error instanceof Error
            ? error.message
            : language === 'ja'
            ? '検索に失敗しました。'
            : String(error),
      }));
    } finally {
      setIsSearching(false);
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
    const accessError = runAccessValidation();
    if (accessError) {
      return;
    }

    setIsSearching(true);
    setSearchView(current => ({
      ...current,
      errorMessage: '',
      noticeMessage: '',
    }));

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
        setSearchView(current => ({
          ...current,
          errorMessage:
            result.error ??
            result.message ??
            (language === 'ja'
              ? '全メンバーの読み込みに失敗しました。'
              : 'Loading all members failed.'),
        }));
        return;
      }

      const nextRows = result.members ?? [];
      membersRef.current = nextRows;
      applyChartState(nextRows);
      setSearchView(current => ({
        ...current,
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
      }));
    } catch (error) {
      membersRef.current = null;
      setSearchView(current => ({
        ...current,
        errorMessage:
          error instanceof Error
            ? error.message
            : language === 'ja'
            ? '全メンバーの読み込みに失敗しました。'
            : String(error),
      }));
    } finally {
      setIsSearching(false);
      onCleanupNativeState('academy-members:load-all');
    }
  };

  const handleStatusUpdate = async (
    loginId: string,
    currentStatus: AcademyMemberStatus,
    nextStatus: AcademyMemberStatus,
  ) => {
    if (!canManageMembers || !academyCode) {
      setSearchView(current => ({
        ...current,
        errorMessage:
          language === 'ja'
            ? '所属メンバーを管理するには、root または admin アカウントでサインインしてください。'
            : 'Sign in as a root or admin account to manage academy members.',
      }));
      return;
    }

    setUpdatingKey(`${loginId}:${nextStatus}`);
    setSearchView(current => ({
      ...current,
      errorMessage: '',
      noticeMessage: '',
    }));

    try {
      const result = await updateAcademyMemberStatus({
        academyCode,
        actorRoleCode: roleCode,
        currentStatus,
        loginId,
        nextStatus,
      });

      if (result.status !== 'ok') {
        setSearchView(current => ({
          ...current,
          errorMessage:
            result.error ??
            result.message ??
            (language === 'ja' ? '状態変更に失敗しました。' : 'Update failed.'),
        }));
        return;
      }

      setSearchView(current => ({
        ...current,
        noticeMessage:
          language === 'ja'
            ? `${result.loginId ?? loginId} の状態を ${nextStatus} に変更しました。`
            : `${result.loginId ?? loginId} is now ${nextStatus}.`,
      }));
      if (query.trim()) {
        await handleSearch(statusFilter);
      } else {
        await handleLoadAllMembers();
      }
    } catch (error) {
      setSearchView(current => ({
        ...current,
        errorMessage: error instanceof Error ? error.message : String(error),
      }));
    } finally {
      setUpdatingKey(null);
      onCleanupNativeState('academy-members:update');
    }
  };

  return {
    currentPage,
    errorMessage: searchView.errorMessage,
    handleSearch,
    handleLoadAllMembers,
    handleStatusFilterChange,
    handleStatusUpdate,
    isSearching,
    paginatedSlots,
    setCurrentPage,
    statusFilter,
    statusMessage: searchView.errorMessage || searchView.noticeMessage || summaryText,
    totalPages,
    updatingKey,
  };
}
