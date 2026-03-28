import React, { useEffect, useMemo, useRef, useState } from 'react';
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

import { ActionButton } from '../../shared/components/ActionButton';
import { sendClientRuntimeLog } from '../../shared/lib/clientLogs';
import {
  approvePendingMember,
  searchPendingMembers,
  type PendingMemberRecord,
} from '../../shared/lib/pendingMembersApi';
import type { LanguageMode } from '../../screens/shared/shell-model';

type ShellPaletteLike = {
  border: string;
  card: string;
  muted: string;
  primary: string;
  primaryText: string;
  text: string;
  textMuted: string;
};

type SearchField = 'displayName' | 'email' | 'phone';
type PendingMemberSlot = {
  academyCode: string;
  academyName: string;
  createdAtLabel: string;
  displayName: string;
  email: string;
  hasMember: boolean;
  loginId: string;
  mode: 'empty' | 'pending' | 'profile';
  phone: string;
  roleCode: string;
};
type ProfileSlotSource = {
  academyCode: string;
  academyName: string;
  displayName: string;
  loginId: string;
  phone?: string;
  roleCode: string;
};
type SearchViewState = {
  errorMessage: string;
  noticeMessage: string;
  stepStatus: string;
};
type ChartViewState = {
  memberCount: number;
  slots: PendingMemberSlot[];
};

const FIELD_ORDER: SearchField[] = ['phone', 'displayName', 'email'];

const FIELD_LABELS = {
  ja: {
    displayName: '名前',
    email: 'メール',
    phone: '電話番号',
  },
  en: {
    displayName: 'Name',
    email: 'Email',
    phone: 'Phone',
  },
} as const satisfies Record<LanguageMode, Record<SearchField, string>>;
const CHART_ROW_SLOTS = 12;
const TABLE_PAGE_SIZE = 5;
const MEMBERS_LABELS = {
  ja: {
    action: '操作',
    approve: '承認',
    approving: '承認中...',
    email: 'メール',
    member: 'メンバー',
    name: '名前',
    next: '次へ',
    notice:
      '電話番号、氏名、メールアドレスで承認待ちメンバーを検索できます。塾に未所属の申請者のみ表示されます。',
    page: 'ページ',
    pending: '承認待ち',
    phone: '電話番号',
    prev: '前へ',
    profile: 'プロフィール',
    role: '権限',
    search: '検索',
    title: '承認待ち',
    waiting: '対象外',
  },
  en: {
    action: 'Action',
    approve: 'Approve',
    approving: 'Approving...',
    email: 'Email',
    member: 'Member',
    name: 'Name',
    next: 'Next',
    notice:
      'Search pending members by phone, name, or email. Only applicants without academy affiliation appear here.',
    page: 'Page',
    pending: 'Pending',
    phone: 'Phone',
    prev: 'Prev',
    profile: 'Profile',
    role: 'Role',
    search: 'Search',
    title: 'Pending Approval',
    waiting: 'Waiting',
  },
} as const satisfies Record<
  LanguageMode,
  {
    action: string;
    approve: string;
    approving: string;
    email: string;
    member: string;
    name: string;
    next: string;
    notice: string;
    page: string;
    pending: string;
    phone: string;
    prev: string;
    profile: string;
    role: string;
    search: string;
    title: string;
    waiting: string;
  }
>;

function formatPhoneQuery(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);

  if (!digits) {
    return '';
  }

  if (digits.startsWith('02')) {
    if (digits.length <= 2) {
      return digits;
    }
    if (digits.length <= 5) {
      return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    }
    if (digits.length <= 9) {
      return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
    }
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  if (digits.length <= 3) {
    return digits;
  }
  if (digits.length <= 7) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }
  if (digits.length <= 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function formatCreatedAt(value: string) {
  logPendingApprovalEvent('formatCreatedAt:start', {
    value,
  });
  if (!value) {
    logPendingApprovalEvent('formatCreatedAt:empty', {
      value,
    });
    return '-';
  }

  const date = new Date(value);
  logPendingApprovalEvent('formatCreatedAt:date-created', {
    iso: value,
    time: date.getTime(),
  });
  if (Number.isNaN(date.getTime())) {
    logPendingApprovalEvent('formatCreatedAt:invalid-date', {
      value,
    });
    return value;
  }

  logPendingApprovalEvent('formatCreatedAt:before-manual-format', {
    iso: value,
  });
  const pad2 = (numberValue: number) => String(numberValue).padStart(2, '0');
  const formatted = `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(
    date.getUTCDate(),
  )} ${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}:${pad2(
    date.getUTCSeconds(),
  )} UTC`;
  logPendingApprovalEvent('formatCreatedAt:after-manual-format', {
    formatted,
    iso: value,
  });
  return formatted;
}

function buildEmptySlots(): PendingMemberSlot[] {
  logPendingApprovalEvent('buildEmptySlots:start', {
    slotCount: CHART_ROW_SLOTS,
  });
  return Array.from({ length: CHART_ROW_SLOTS }, () => ({
    academyCode: '',
    academyName: '',
    createdAtLabel: '',
    displayName: '',
    email: '',
    hasMember: false,
    loginId: '',
    mode: 'empty' as const,
    phone: '',
    roleCode: '',
  }));
}

function buildSlots(members: PendingMemberRecord[]): PendingMemberSlot[] {
  logPendingApprovalEvent('buildSlots:start', {
    memberCount: members.length,
    members,
  });
  const slots = buildEmptySlots();
  members.slice(0, CHART_ROW_SLOTS).forEach((member, index) => {
    logPendingApprovalEvent('buildSlots:item:start', {
      index,
      member,
    });
    const createdAtLabel = formatCreatedAt(member.createdAt);
    logPendingApprovalEvent('buildSlots:item:formatted', {
      createdAtLabel,
      index,
      rawCreatedAt: member.createdAt,
    });
    slots[index] = {
      academyCode: '',
      academyName: '',
      createdAtLabel,
      displayName: member.displayName ?? '',
      email: member.email ?? '',
      hasMember: true,
      loginId: member.loginId ?? '',
      mode: 'pending',
      phone: member.phone ?? '',
      roleCode: member.roleCode ?? '',
    };
    logPendingApprovalEvent('buildSlots:item:done', {
      index,
      slot: slots[index],
    });
  });
  logPendingApprovalEvent('buildSlots:complete', {
    memberCount: members.length,
    modes: slots.map(slot => slot.mode).join(','),
  });
  return slots;
}

function buildProfileSlots(
  members: PendingMemberRecord[],
  profile: ProfileSlotSource,
): PendingMemberSlot[] {
  logPendingApprovalEvent('buildProfileSlots:start', {
    memberCount: members.length,
    profile,
  });
  logPendingApprovalEvent('buildProfileSlots:before-buildSlots', {
    memberCount: members.length,
  });
  const slots = buildSlots(members);
  logPendingApprovalEvent('buildProfileSlots:after-buildSlots', {
    firstSlot: slots[0],
    modes: slots.map(slot => slot.mode).join(','),
  });
  logPendingApprovalEvent('buildProfileSlots:before-profile-slot-write', {
    profile,
  });
  slots[0] = {
    academyCode: profile.academyCode,
    academyName: profile.academyName,
    createdAtLabel: '',
    displayName: profile.displayName,
    email: '',
    hasMember: true,
    loginId: profile.loginId,
    mode: 'profile',
    phone: profile.phone ?? '',
    roleCode: profile.roleCode,
  };
  logPendingApprovalEvent('buildProfileSlots:after-profile-slot-write', {
    firstSlot: slots[0],
    modes: slots.map(slot => slot.mode).join(','),
  });
  return slots;
}

function logPendingApprovalEvent(
  event: string,
  payload: Record<string, unknown> = {},
) {
  const channel = `client/${Platform.OS}/members`;
  console.log(`[${channel}] ${event}`, payload);
  void sendClientRuntimeLog({
    channel,
    event,
    payload,
  }).catch(error => {
    console.log(`[${channel}] log:failed`, {
      error: error instanceof Error ? error.message : String(error),
      sourceEvent: event,
    });
  });
}

export function PendingApprovalSection({
  academyCode,
  academyName,
  compact = false,
  displayName,
  isAuthenticated,
  language,
  loginId,
  palette,
  roleCode,
}: {
  academyCode: string;
  academyName: string;
  compact?: boolean;
  displayName: string;
  isAuthenticated: boolean;
  language: LanguageMode;
  loginId: string;
  palette: ShellPaletteLike;
  roleCode: string;
}) {
  const [field, setField] = useState<SearchField>('phone');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [approvingLoginId, setApprovingLoginId] = useState<string | null>(null);
  const [isProfileApplied, setIsProfileApplied] = useState(false);
  const queryInputRef = useRef<TextInput | null>(null);
  const rootScrollRef = useRef<ScrollView | null>(null);
  const pendingResultRef = useRef<PendingMemberRecord[] | null>(null);
  const ui = MEMBERS_LABELS[language];
  const fieldLabels = FIELD_LABELS[language];
  const [searchView, setSearchView] = useState<SearchViewState>({
    errorMessage: '',
    noticeMessage: ui.notice,
    stepStatus: '',
  });
  const [chartView, setChartView] = useState<ChartViewState>(() => {
    const initialChartView: ChartViewState = {
      memberCount: 0,
      slots: buildSlots([]),
    };
    return initialChartView;
  });
  const [currentPage, setCurrentPage] = useState(1);

  const canManageMembers =
    isAuthenticated && (roleCode === 'ROOT' || roleCode === 'ADMIN');
  const isMobileLayout = Platform.OS !== 'windows';
  const { errorMessage, noticeMessage, stepStatus } = searchView;
  const { memberCount, slots } = chartView;
  const profileSlotSource: ProfileSlotSource = {
    academyCode,
    academyName,
    displayName,
    loginId,
    phone: '',
    roleCode,
  };

  useEffect(() => {
    setSearchView(current => ({
      ...current,
      noticeMessage: current.errorMessage ? current.noticeMessage : ui.notice,
    }));
  }, [ui.notice]);

  useEffect(() => {
    logPendingApprovalEvent('chartView:committed', {
      memberCount: chartView.memberCount,
      modes: chartView.slots.map(slot => slot.mode).join(','),
    });
  }, [chartView]);

  const visibleSlots = useMemo(
    () => slots.filter(slot => slot.hasMember),
    [slots],
  );

  const tableRowCount = visibleSlots.length;
  const totalPages = Math.max(1, Math.ceil(Math.max(1, tableRowCount) / TABLE_PAGE_SIZE));
  const paginatedSlots = visibleSlots.slice(
    (currentPage - 1) * TABLE_PAGE_SIZE,
    currentPage * TABLE_PAGE_SIZE,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [memberCount, visibleSlots.length, isProfileApplied]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const cleanupNativeState = (reason: string) => {
    logPendingApprovalEvent('native:cleanup:start', {
      isDropdownOpen,
      platform: Platform.OS,
      reason,
    });

    setIsDropdownOpen(false);
    queryInputRef.current?.blur();
    Keyboard.dismiss();
    rootScrollRef.current?.scrollTo?.({ animated: false, x: 0, y: 0 });

    logPendingApprovalEvent('native:cleanup:done', {
      reason,
    });
  };

  const summaryText = useMemo(() => {
    if (memberCount === 0) {
      return language === 'ja'
        ? '現在表示できる承認待ちメンバーはありません。'
        : 'No pending members are currently loaded.';
    }

    return language === 'ja'
      ? `確認対象の承認待ちメンバーが ${memberCount} 件あります。`
      : `${memberCount} pending member${
          memberCount === 1 ? '' : 's'
        } ready for review.`;
  }, [language, memberCount]);

  const handleQueryChange = (nextValue: string) => {
    if (field === 'phone') {
      setQuery(formatPhoneQuery(nextValue));
      return;
    }
    setQuery(nextValue);
  };

  const handleDropdownKeyDown = (event: any, mobile = false) => {
    const key = event?.nativeEvent?.key;
    if (key !== 'Enter') {
      return;
    }

    logPendingApprovalEvent('dropdown:enter-search', {
      mobile,
      field,
      query: query.trim(),
    });
    handleSearch();
  };

  const renderDropdown = (mobile = false) => (
    <View
      style={[styles.dropdownWrap, mobile ? styles.dropdownWrapMobile : null]}
    >
      <Pressable
        onPress={() => {
          setIsDropdownOpen(open => {
            const next = !open;
            logPendingApprovalEvent('dropdown:toggle', {
              mobile,
              next,
            });
            return next;
          });
        }}
        {...(Platform.OS === 'windows'
          ? ({
              focusable: true,
              onKeyDown: (event: any) => handleDropdownKeyDown(event, mobile),
            } as any)
          : ({} as any))}
        style={[
          styles.dropdownButton,
          compact ? styles.dropdownButtonCompact : null,
          {
            backgroundColor: palette.muted,
            borderColor: palette.border,
          },
        ]}
      >
        <Text style={[styles.dropdownText, { color: palette.text }]}>
          {fieldLabels[field]}
        </Text>
        <Text style={[styles.dropdownArrow, { color: palette.textMuted }]}>
          {isDropdownOpen ? '▲' : '▼'}
        </Text>
      </Pressable>

      <View
        pointerEvents={isDropdownOpen ? 'auto' : 'none'}
        style={[
          styles.dropdownMenu,
          mobile ? styles.dropdownMenuMobile : null,
          {
            backgroundColor: palette.card,
            borderColor: palette.border,
          },
          compact ? styles.dropdownMenuCompact : null,
          { display: isDropdownOpen ? 'flex' : 'none' },
        ]}
      >
        {FIELD_ORDER.map(option => (
          <Pressable
            key={option}
            onPress={() => {
              logPendingApprovalEvent('dropdown:select', {
                mobile,
                option,
              });
              setField(option);
              setQuery(currentQuery =>
                option === 'phone' ? formatPhoneQuery(currentQuery) : currentQuery,
              );
              setIsDropdownOpen(false);
            }}
            style={[
              styles.dropdownItem,
              option === field ? { backgroundColor: palette.muted } : null,
            ]}
          >
            <Text style={[styles.dropdownItemText, { color: palette.text }]}>
              {fieldLabels[option]}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

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
        stepStatus: 'Validation failed.',
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
        stepStatus: 'Validation failed. ',
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
      stepStatus: 'Validation passed. Ready to request search results.',
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
      stepStatus: 'Request started.',
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
          stepStatus: 'Request failed.',
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
        stepStatus:
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
        stepStatus: 'Request failed.',
      }));
      return null;
    } finally {
      logPendingApprovalEvent('search:request:finally', {
        pendingCount: pendingResultRef.current?.length ?? 0,
      });
      setIsSearching(false);
    }
  };

  const applySearchRows = (
    nextRows: PendingMemberRecord[] | null = pendingResultRef.current,
  ) => {
    const resolvedRows = nextRows ?? [];
    logPendingApprovalEvent('search:apply:start', {
      nextRowsProvided: nextRows !== null,
      resolvedCount: resolvedRows.length,
    });
    cleanupNativeState('search:apply');
    applyChartState(resolvedRows);
    logPendingApprovalEvent('search:apply:state-committed', {
      committedCount: resolvedRows.length,
    });
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
    cleanupNativeState('profile:apply');
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
    cleanupNativeState('search:apply-direct');
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

  const resetSearchSteps = () => {
    logPendingApprovalEvent('search:reset');
    cleanupNativeState('search:reset');
    pendingResultRef.current = null;
    setIsProfileApplied(false);
    setSearchView({
      errorMessage: '',
      noticeMessage: ui.notice,
      stepStatus: 'Search steps reset.',
    });
    setChartView({
      memberCount: 0,
      slots: buildSlots([]),
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

    cleanupNativeState('approve:start');
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

  const statusMessage = errorMessage || noticeMessage || summaryText;

  const renderTableCell = (
    value: string,
    options: {
      align?: 'left' | 'center' | 'right';
      emphasize?: boolean;
      secondary?: string;
      widthStyle: object;
    },
  ) => (
    <View
      style={[
        styles.tableCell,
        options.widthStyle,
        {
          borderRightColor: palette.border,
        },
      ]}
    >
      <Text
        numberOfLines={1}
        style={[
          styles.tableCellValue,
          {
            color: options.emphasize ? palette.text : palette.textMuted,
            textAlign: options.align ?? 'left',
          },
        ]}
      >
        {value || '-'}
      </Text>
      {options.secondary ? (
        <Text
          numberOfLines={1}
          style={[
            styles.tableCellSecondary,
            {
              color: palette.textMuted,
              textAlign: options.align ?? 'left',
            },
          ]}
        >
          {options.secondary}
        </Text>
      ) : null}
    </View>
  );

  const renderTableRow = (slot: PendingMemberSlot, index: number) => {
    const isRowDisabled = !slot.hasMember || slot.mode === 'profile';
    const actionLabel =
      slot.hasMember && approvingLoginId === slot.loginId
        ? ui.approving
        : slot.mode === 'profile'
        ? ui.profile
        : slot.hasMember
        ? ui.approve
        : ui.waiting;

    return (
      <View
        key={`pending-slot-${index}`}
        style={[
          styles.tableRow,
          {
            backgroundColor:
              slot.mode === 'profile'
                ? palette.card
                : slot.hasMember
                ? palette.muted
                : palette.card,
            borderBottomColor: palette.border,
            borderTopColor: palette.border,
          },
        ]}
      >
        {renderTableCell(slot.displayName, {
          emphasize: slot.mode === 'profile',
          widthStyle: styles.colIndex,
        })}
        {renderTableCell(slot.email, {
          widthStyle: styles.colEmail,
        })}
        {renderTableCell(slot.phone, {
          widthStyle: styles.colPhone,
        })}
        {renderTableCell(slot.roleCode, {
          align: 'center',
          emphasize: true,
          widthStyle: styles.colRole,
        })}
        <View style={[styles.tableCell, styles.colAction]}>
          <Pressable
            disabled={isRowDisabled}
            onPress={() => {
              if (slot.hasMember && slot.mode !== 'profile') {
                handleApprove(slot.loginId);
              }
            }}
            style={[
              styles.tableActionButton,
              {
                backgroundColor:
                  slot.hasMember && approvingLoginId === slot.loginId
                    ? palette.muted
                    : slot.hasMember && slot.mode !== 'profile'
                    ? palette.primary
                    : palette.card,
                borderColor:
                  slot.hasMember && slot.mode !== 'profile'
                    ? palette.primary
                    : palette.border,
                opacity: slot.hasMember && slot.mode !== 'profile' ? 1 : 0.55,
              },
            ]}
          >
            <Text
              style={[
                styles.tableActionButtonText,
                {
                  color:
                    slot.hasMember && slot.mode !== 'profile'
                      ? palette.primaryText
                      : palette.textMuted,
                },
              ]}
            >
              {actionLabel}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const renderMobileFieldRow = (
    label: string,
    value: string,
    options: {
      emphasize?: boolean;
    } = {},
  ) => (
    <View style={styles.mobileFieldRow} key={`${label}-${value}`}>
      <Text style={[styles.mobileFieldLabel, { color: palette.textMuted }]}>
        {label}
      </Text>
      <Text
        style={[
          styles.mobileFieldValue,
          {
            color: options.emphasize ? palette.text : palette.textMuted,
          },
        ]}
      >
        {value || '-'}
      </Text>
    </View>
  );

  const renderMobileRow = (slot: PendingMemberSlot, index: number) => {
    const isRowDisabled = !slot.hasMember || slot.mode === 'profile';
    const actionLabel =
      slot.hasMember && approvingLoginId === slot.loginId
        ? ui.approving
        : slot.mode === 'profile'
        ? ui.profile
        : slot.hasMember
        ? ui.approve
        : ui.waiting;

    return (
      <View
        key={`pending-mobile-slot-${index}`}
        style={[
          styles.mobileRowCard,
          {
            backgroundColor:
              slot.mode === 'profile'
                ? palette.card
                : slot.hasMember
                ? palette.muted
                : palette.card,
            borderColor: palette.border,
          },
        ]}
      >
        <View style={styles.mobileRowCardHeader}>
          <Text style={[styles.mobileRowTitle, { color: palette.text }]}>
            {ui.member} {(currentPage - 1) * TABLE_PAGE_SIZE + index + 1}
          </Text>
          <Text
            style={[
              styles.mobileRowType,
              { color: slot.mode === 'profile' ? palette.text : palette.textMuted },
            ]}
          >
            {slot.mode === 'profile' ? ui.profile : ui.pending}
          </Text>
        </View>
        {renderMobileFieldRow(ui.name, slot.displayName, { emphasize: true })}
        {renderMobileFieldRow(ui.email, slot.email)}
        {renderMobileFieldRow(ui.phone, slot.phone)}
        {renderMobileFieldRow(ui.role, slot.roleCode, { emphasize: true })}
        <Pressable
          disabled={isRowDisabled}
          onPress={() => {
            if (slot.hasMember && slot.mode !== 'profile') {
              handleApprove(slot.loginId);
            }
          }}
          style={[
            styles.mobileActionButton,
            {
              backgroundColor:
                slot.hasMember && approvingLoginId === slot.loginId
                  ? palette.muted
                  : slot.hasMember && slot.mode !== 'profile'
                  ? palette.primary
                  : palette.card,
              borderColor:
                slot.hasMember && slot.mode !== 'profile'
                  ? palette.primary
                  : palette.border,
              opacity: slot.hasMember && slot.mode !== 'profile' ? 1 : 0.55,
            },
          ]}
        >
          <Text
            style={[
              styles.mobileActionButtonText,
              {
                color:
                  slot.hasMember && slot.mode !== 'profile'
                    ? palette.primaryText
                    : palette.textMuted,
              },
            ]}
          >
            {actionLabel}
          </Text>
        </Pressable>
      </View>
    );
  };

  return (
    <ScrollView
      ref={rootScrollRef}
      contentContainerStyle={styles.stack}
      keyboardShouldPersistTaps="handled"
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: palette.card,
            borderColor: palette.border,
          },
        ]}
      >
        <Text style={[styles.cardTitle, { color: palette.text }]}>
          {ui.title}
        </Text>
        <Text style={[styles.cardBody, { color: palette.textMuted }]}>
          {ui.notice}
        </Text>

        <View style={styles.searchCard}>
          <View
            style={[
              styles.searchRow,
              isMobileLayout ? styles.searchRowMobile : null,
            ]}
          >
            {!isMobileLayout ? renderDropdown() : null}

            <TextInput
              ref={queryInputRef}
              onChangeText={handleQueryChange}
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
              onSubmitEditing={handleSearch}
              value={query}
            />

            {!isMobileLayout ? (
              <View style={styles.searchButtonWrap}>
                <ActionButton
                  backgroundColor={palette.primary}
                  hint=""
                  isLoading={isSearching}
                  label={ui.search}
                  onPress={handleSearch}
                  style={[
                    styles.searchButton,
                    compact ? styles.searchButtonCompact : null,
                  ]}
                  textColor={palette.primaryText}
                />
              </View>
            ) : null}
          </View>

          {isMobileLayout ? (
            <View
              style={[styles.searchActionRow, styles.searchActionRowMobile]}
            >
              {renderDropdown(true)}

              <View
                style={[styles.searchButtonWrap, styles.searchButtonWrapMobile]}
              >
                <ActionButton
                  backgroundColor={palette.primary}
                  hint=""
                  isLoading={isSearching}
                  label={ui.search}
                  onPress={handleSearch}
                  style={[
                    styles.searchButton,
                    compact ? styles.searchButtonCompact : null,
                  ]}
                  textColor={palette.primaryText}
                />
              </View>
            </View>
          ) : null}

        </View>

        <Text
          style={[
            styles.metaText,
            errorMessage ? styles.errorText : { color: palette.textMuted },
          ]}
        >
          {statusMessage}
        </Text>
        <View style={styles.tableWrap}>
          {isMobileLayout ? (
            <View style={styles.mobileTableList}>
              {paginatedSlots.map((slot, pageIndex) =>
                renderMobileRow(slot, pageIndex),
              )}
            </View>
          ) : (
            <View
              style={[
                styles.table,
                {
                  borderColor: palette.border,
                },
              ]}
            >
              <View
                style={[
                  styles.tableHeaderRow,
                  {
                    backgroundColor: palette.muted,
                    borderBottomColor: palette.border,
                  },
                ]}
              >
                <View style={[styles.tableHeaderCell, styles.colIndex]}>
                  <Text
                    numberOfLines={1}
                    style={[styles.tableHeaderText, { color: palette.textMuted }]}
                  >
                      {ui.name}
                  </Text>
                </View>
                <View style={[styles.tableHeaderCell, styles.colEmail]}>
                  <Text
                    numberOfLines={1}
                    style={[styles.tableHeaderText, { color: palette.textMuted }]}
                  >
                      {ui.email}
                  </Text>
                </View>
                <View style={[styles.tableHeaderCell, styles.colPhone]}>
                  <Text
                    numberOfLines={1}
                    style={[styles.tableHeaderText, { color: palette.textMuted }]}
                  >
                      {ui.phone}
                  </Text>
                </View>
                <View style={[styles.tableHeaderCell, styles.colRole]}>
                  <Text
                    numberOfLines={1}
                    style={[styles.tableHeaderText, { color: palette.textMuted }]}
                  >
                      {ui.role}
                  </Text>
                </View>
                <View style={[styles.tableHeaderCell, styles.colAction]}>
                  <Text
                    numberOfLines={1}
                    style={[styles.tableHeaderText, { color: palette.textMuted }]}
                  >
                      {ui.action}
                  </Text>
                </View>
              </View>
              <View style={styles.tableBody}>
                {paginatedSlots.map((slot, pageIndex) =>
                  renderTableRow(
                    slot,
                    (currentPage - 1) * TABLE_PAGE_SIZE + pageIndex,
                  ),
                )}
              </View>
            </View>
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
            ]}
          >
            <Text style={[styles.paginationButtonText, { color: palette.text }]}>
              {ui.prev}
            </Text>
          </Pressable>
          <Text style={[styles.paginationText, { color: palette.textMuted }]}>
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
            ]}
          >
            <Text style={[styles.paginationButtonText, { color: palette.text }]}>
              {ui.next}
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 16,
    paddingBottom: 12,
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  cardBody: {
    fontSize: 14,
    lineHeight: 22,
  },
  searchCard: {
    marginTop: 16,
  },
  searchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  searchRowMobile: {
    alignItems: 'stretch',
    flexDirection: 'column',
  },
  searchActionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  searchActionRowMobile: {
    alignItems: 'stretch',
    zIndex: 5,
  },
  dropdownWrap: {
    minWidth: 122,
    position: 'relative',
    zIndex: 6,
  },
  dropdownWrapMobile: {
    flex: 1,
    minWidth: 0,
  },
  dropdownButton: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    height: 48,
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  dropdownButtonCompact: {
    borderRadius: 12,
    height: 32,
    paddingHorizontal: 10,
  },
  dropdownText: {
    fontSize: 14,
    fontWeight: '700',
  },
  dropdownArrow: {
    fontSize: 12,
    fontWeight: '800',
  },
  dropdownMenu: {
    borderRadius: 16,
    borderWidth: 1,
    left: 0,
    marginTop: 6,
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
    top: 48,
    zIndex: 7,
    elevation: 7,
  },
  dropdownMenuCompact: {
    marginTop: 4,
    top: 32,
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
  },
  searchInputCompact: {
    height: 32,
  },
  searchButtonWrap: {
    width: 124,
  },
  searchButtonWrapMobile: {
    flex: 1,
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
    marginTop: 12,
  },
  stepRow: {
    flexDirection: 'row',
    marginHorizontal: -6,
    marginTop: 12,
  },
  stepButtonWrap: {
    flex: 1,
  },
  stepButton: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  stepStatusText: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  errorText: {
    color: '#bc4749',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 12,
  },
  tableWrap: {
    alignSelf: 'stretch',
    marginTop: 14,
    width: '100%',
  },
  mobileTableList: {
    gap: 12,
  },
  mobileRowCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  mobileRowCardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  mobileRowTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  mobileRowType: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  mobileFieldRow: {
    gap: 4,
    marginTop: 8,
  },
  mobileFieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  mobileFieldValue: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  mobileActionButton: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: 14,
    minHeight: 40,
    paddingHorizontal: 12,
  },
  mobileActionButtonText: {
    fontSize: 12,
    fontWeight: '800',
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
  table: {
    alignSelf: 'stretch',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    width: '100%',
  },
  tableHeaderRow: {
    borderBottomWidth: 1,
    flexDirection: 'row',
  },
  tableHeaderCell: {
    justifyContent: 'center',
    minWidth: 0,
    minHeight: 44,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  tableBody: {
    gap: 0,
  },
  tableRow: {
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 56,
  },
  tableCell: {
    borderRightWidth: 1,
    justifyContent: 'center',
    minWidth: 0,
    minHeight: 56,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  tableCellValue: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  tableCellSecondary: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  tableActionButton: {
    alignItems: 'center',
    alignSelf: 'stretch',
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    minWidth: 50,
    minHeight: 32,
    paddingHorizontal: 4,
  },
  tableActionButtonText: {
    fontSize: 11,
    fontWeight: '800',
  },
  colIndex: {
    flex: 1.9,
  },
  colEmail: {
    flex: 2.3,
  },
  colPhone: {
    flex: 1.5,
  },
  colRole: {
    flex: 0.9,
  },
  colAction: {
    borderRightWidth: 0,
    flex: 0.82,
    minWidth: 64,
  },
});
