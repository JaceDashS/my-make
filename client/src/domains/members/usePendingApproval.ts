import { useEffect, useMemo, useRef, useState } from 'react';

import {
  approvePendingMember,
  searchPendingMembers,
  type PendingMemberRecord,
} from '../../shared/lib/pendingMembersApi';
import type { LanguageMode } from '../../screens/shared/shell-model';
import { buildProfileSlots, buildSlots, TABLE_PAGE_SIZE } from './pendingApprovalModel';
import type {
  ChartViewState,
  ProfileSlotSource,
  SearchField,
  SearchViewState,
} from './pendingApprovalTypes';
import { logPendingApprovalEvent } from './pendingApprovalLogging';

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
  const [isSearching, setIsSearching] = useState(false);
  const [approvingLoginId, setApprovingLoginId] = useState<string | null>(null);
  const [isProfileApplied, setIsProfileApplied] = useState(false);
  const pendingResultRef = useRef<PendingMemberRecord[] | null>(null);
  const [searchView, setSearchView] = useState<SearchViewState>({
    errorMessage: '',
    noticeMessage: uiNotice,
  });
  const [chartView, setChartView] = useState<ChartViewState>(() => ({
    memberCount: 0,
    slots: buildSlots([]),
  }));
  const [currentPage, setCurrentPage] = useState(1);

  const canManageMembers =
    isAuthenticated && (roleCode === 'ROOT' || roleCode === 'ADMIN');

  useEffect(() => {
    setSearchView(current => ({
      ...current,
      noticeMessage: current.errorMessage ? current.noticeMessage : uiNotice,
    }));
  }, [uiNotice]);

  useEffect(() => {
    logPendingApprovalEvent('chartView:committed', {
      memberCount: chartView.memberCount,
      modes: chartView.slots.map(slot => slot.mode).join(','),
    });
  }, [chartView]);

  const visibleSlots = useMemo(
    () => chartView.slots.filter(slot => slot.hasMember),
    [chartView.slots],
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
  }, [chartView.memberCount, visibleSlots.length, isProfileApplied]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const summaryText = useMemo(() => {
    if (chartView.memberCount === 0) {
      return language === 'ja'
        ? '現在表示できる承認待ちメンバーはありません。'
        : 'No pending members are currently loaded.';
    }

    return language === 'ja'
      ? `確認対象の承認待ちメンバーが ${chartView.memberCount} 件あります。`
      : `${chartView.memberCount} pending member${
          chartView.memberCount === 1 ? '' : 's'
        } ready for review.`;
  }, [chartView.memberCount, language]);

  const applyChartState = (nextRows: PendingMemberRecord[]) => {
    setChartView({
      memberCount: nextRows.length + (isProfileApplied ? 1 : 0),
      slots: isProfileApplied
        ? buildProfileSlots(nextRows, profileSlotSource)
        : buildSlots(nextRows),
    });
  };

  const runSearchValidation = () => {
    logPendingApprovalEvent('search:validate:start', {
      academyCode,
      canManageMembers,
      field,
      hasQuery: Boolean(query.trim()),
      roleCode,
    });

    if (!canManageMembers || !academyCode) {
      logPendingApprovalEvent('search:validate:invalid-role', {
        academyCode,
        canManageMembers,
        roleCode,
      });
      pendingResultRef.current = null;
      setSearchView({
        errorMessage:
          language === 'ja'
            ? '承認待ちメンバーを検索するには、root または admin アカウントでサインインしてください。'
            : 'Sign in as a root or admin account to search pending members.',
        noticeMessage: '',
      });
      setChartView({
        memberCount: 0,
        slots: buildSlots([]),
      });
      return 'invalid-role';
    }

    if (!query.trim()) {
      logPendingApprovalEvent('search:validate:missing-query', {
        field,
      });
      pendingResultRef.current = null;
      setSearchView({
        errorMessage:
          language === 'ja'
            ? '検索キーワードを入力してください。'
            : 'Enter a search value first.',
        noticeMessage: '',
      });
      setChartView({
        memberCount: 0,
        slots: buildSlots([]),
      });
      return 'missing-query';
    }

    logPendingApprovalEvent('search:validate:passed', {
      field,
      query: query.trim(),
    });
    setSearchView(current => ({
      ...current,
      errorMessage: '',
      noticeMessage: '',
    }));
    return null;
  };

  const runSearchRequest = async () => {
    logPendingApprovalEvent('search:request:start', {
      academyCode,
      field,
      query: query.trim(),
      roleCode,
    });
    setIsSearching(true);
    setSearchView(current => ({
      ...current,
      errorMessage: '',
      noticeMessage: '',
    }));

    try {
      const result = await searchPendingMembers({
        academyCode,
        actorRoleCode: roleCode,
        field,
        query: query.trim(),
      });

      if (result.status !== 'ok') {
        logPendingApprovalEvent('search:request:failed-status', {
          error:
            result.error ??
            result.message ??
            (language === 'ja' ? '検索に失敗しました。' : 'Search failed.'),
          status: result.status,
        });
        pendingResultRef.current = null;
        setSearchView(current => ({
          ...current,
          errorMessage:
            result.error ??
            result.message ??
            (language === 'ja' ? '検索に失敗しました。' : 'Search failed.'),
        }));
        return null;
      }

      const nextRows = result.members ?? [];
      logPendingApprovalEvent('search:request:ok', {
        resultCount: nextRows.length,
      });
      pendingResultRef.current = nextRows;
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
      return nextRows;
    } catch (error) {
      logPendingApprovalEvent('search:request:exception', {
        error: error instanceof Error ? error.message : String(error),
      });
      pendingResultRef.current = null;
      setSearchView(current => ({
        ...current,
        errorMessage:
          error instanceof Error
            ? error.message
            : language === 'ja'
            ? '検索に失敗しました。'
            : String(error),
      }));
      return null;
    } finally {
      logPendingApprovalEvent('search:request:finally', {
        pendingCount: pendingResultRef.current?.length ?? 0,
      });
      setIsSearching(false);
    }
  };

  const applyMyProfile = (
    profile: ProfileSlotSource | null = profileSlotSource,
  ) => {
    const resolvedProfile = profile ?? profileSlotSource;
    const nextRows = pendingResultRef.current ?? [];
    logPendingApprovalEvent('profile:apply:start', {
      profileProvided: profile !== null,
      resolvedProfile,
      visibleCount: nextRows.length + 1,
    });
    onCleanupNativeState('profile:apply');
    setIsProfileApplied(true);
    logPendingApprovalEvent('profile:apply:before-build-profile-slots', {
      nextRows,
      resolvedProfile,
    });
    const nextSlots = buildProfileSlots(nextRows, resolvedProfile);
    logPendingApprovalEvent('profile:apply:after-build-profile-slots', {
      firstSlot: nextSlots[0],
      modes: nextSlots.map(slot => slot.mode).join(','),
    });
    logPendingApprovalEvent('profile:apply:before-setChartView', {
      memberCount: nextRows.length + 1,
    });
    setChartView({
      memberCount: nextRows.length + 1,
      slots: nextSlots,
    });
    logPendingApprovalEvent('profile:apply:state-committed', {
      academyCode: resolvedProfile.academyCode,
      roleCode: resolvedProfile.roleCode,
      visibleCount: nextRows.length + 1,
    });
  };

  const applySearchRowsDirect = (
    nextRows: PendingMemberRecord[] | null = pendingResultRef.current,
  ) => {
    const resolvedRows = nextRows ?? [];
    logPendingApprovalEvent('search:apply-direct:start', {
      nextRowsProvided: nextRows !== null,
      resolvedCount: resolvedRows.length,
      resolvedRows,
      resolvedRowsSummary: resolvedRows.map(member => ({
        createdAt: member.createdAt,
        displayName: member.displayName,
        email: member.email,
        loginId: member.loginId,
        phone: member.phone,
        roleCode: member.roleCode,
      })),
    });
    onCleanupNativeState('search:apply-direct');
    const nextSlots = isProfileApplied
      ? (() => {
          logPendingApprovalEvent(
            'search:apply-direct:before-build-profile-slots',
            {
              isProfileApplied,
              profileSlotSource,
              resolvedRows,
            },
          );
          const slots = buildProfileSlots(resolvedRows, profileSlotSource);
          logPendingApprovalEvent(
            'search:apply-direct:after-build-profile-slots',
            {
              firstSlot: slots[0],
              modes: slots.map(slot => slot.mode).join(','),
            },
          );
          return slots;
        })()
      : (() => {
          logPendingApprovalEvent('search:apply-direct:before-build-slots', {
            isProfileApplied,
            resolvedRows,
          });
          const slots = buildSlots(resolvedRows);
          logPendingApprovalEvent('search:apply-direct:after-build-slots', {
            firstSlot: slots[0],
            modes: slots.map(slot => slot.mode).join(','),
          });
          return slots;
        })();
    logPendingApprovalEvent('search:apply-direct:before-setChartView', {
      memberCount: resolvedRows.length + (isProfileApplied ? 1 : 0),
      modes: nextSlots.map(slot => slot.mode).join(','),
    });
    setChartView({
      memberCount: resolvedRows.length + (isProfileApplied ? 1 : 0),
      slots: nextSlots,
    });
    logPendingApprovalEvent('search:apply-direct:state-committed', {
      committedCount: resolvedRows.length,
      isProfileApplied,
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
    applySearchRowsDirect(result);
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
      setSearchView(current => ({
        ...current,
        errorMessage:
          language === 'ja'
            ? '承認待ちメンバーを承認するには、root または admin アカウントでサインインしてください。'
            : 'Sign in as a root or admin account to approve pending members.',
      }));
      return;
    }

    onCleanupNativeState('approve:start');
    setApprovingLoginId(loginIdToApprove);
    setSearchView(current => ({
      ...current,
      errorMessage: '',
      noticeMessage: '',
    }));

    try {
      const result = await approvePendingMember({
        academyCode,
        actorRoleCode: roleCode,
        loginId: loginIdToApprove,
      });

      if (result.status !== 'ok') {
        logPendingApprovalEvent('approve:failed-status', {
          error:
            result.error ??
            result.message ??
            (language === 'ja' ? '承認に失敗しました。' : 'Approval failed.'),
          loginId: loginIdToApprove,
          status: result.status,
        });
        setSearchView(current => ({
          ...current,
          errorMessage:
            result.error ??
            result.message ??
            (language === 'ja' ? '承認に失敗しました。' : 'Approval failed.'),
        }));
        return;
      }

      const currentRows = pendingResultRef.current ?? [];
      const nextRows = currentRows.filter(
        member => member.loginId !== loginIdToApprove,
      );
      logPendingApprovalEvent('approve:success', {
        loginId: loginIdToApprove,
        nextCount: nextRows.length,
      });
      pendingResultRef.current = nextRows;
      applyChartState(nextRows);
      setSearchView(current => ({
        ...current,
        noticeMessage:
          language === 'ja'
            ? `${result.displayName || loginIdToApprove} を塾 ${academyCode} に所属登録しました。`
            : `${
                result.displayName || loginIdToApprove
              } was approved and is now assigned to ${academyCode}.`,
      }));
    } catch (error) {
      logPendingApprovalEvent('approve:exception', {
        error: error instanceof Error ? error.message : String(error),
        loginId: loginIdToApprove,
      });
      setSearchView(current => ({
        ...current,
        errorMessage: error instanceof Error ? error.message : String(error),
      }));
    } finally {
      logPendingApprovalEvent('approve:finally', {
        approvingLoginId,
        loginId: loginIdToApprove,
      });
      setApprovingLoginId(null);
    }
  };

  return {
    approvingLoginId,
    canManageMembers,
    currentPage,
    errorMessage: searchView.errorMessage,
    handleApprove,
    handleSearch,
    isProfileApplied,
    isSearching,
    memberCount: chartView.memberCount,
    noticeMessage: searchView.noticeMessage,
    paginatedSlots,
    setCurrentPage,
    statusMessage: searchView.errorMessage || searchView.noticeMessage || summaryText,
    totalPages,
    visibleSlots,
    applyMyProfile,
  };
}
