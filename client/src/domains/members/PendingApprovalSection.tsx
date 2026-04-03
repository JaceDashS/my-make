import React, { useRef, useState } from 'react';
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
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

import { ActionButton } from '../../shared/components/ActionButton';
import { SearchHeader } from '../../shared/components/SearchHeader';
import type { AcademyMemberRecord } from '../../shared/lib/pendingMembersApi';
import type { LanguageMode } from '../../screens/shared/shell-model';
import { FIELD_LABELS, FIELD_ORDER, MEMBERS_LABELS } from './pendingApprovalLabels';
import { PendingApprovalDesktopTable } from './PendingApprovalDesktopTable';
import { PendingApprovalMobileList } from './PendingApprovalMobileList';
import { TABLE_PAGE_SIZE, formatPhoneQuery } from './pendingApprovalModel';
import type {
  PendingMemberSlot,
  ProfileSlotSource,
  SearchField,
  ShellPaletteLike,
} from './pendingApprovalTypes';
import { logPendingApprovalEvent } from './pendingApprovalLogging';
import { usePendingApproval } from './usePendingApproval';

const CONTENT_EDGE_INSET = Platform.OS === 'web' ? 18 : 16;
const HEADER_HEIGHT = 100;

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
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [isTeacherDropdownOpen, setIsTeacherDropdownOpen] = useState(false);
  const [teacherErrorMessage, setTeacherErrorMessage] = useState('');
  const [teacherOptions, setTeacherOptions] = useState<AcademyMemberRecord[]>([]);
  const [selectedTeacherLoginId, setSelectedTeacherLoginId] = useState('');
  const [isLoadingTeacherOptions, setIsLoadingTeacherOptions] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [scrollOffsetY, setScrollOffsetY] = useState(0);
  const [teacherApprovalTarget, setTeacherApprovalTarget] =
    useState<PendingMemberSlot | null>(null);
  const queryInputRef = useRef<TextInput | null>(null);
  const rootScrollRef = useRef<ScrollView | null>(null);
  const ui = MEMBERS_LABELS[language];
  const fieldLabels = FIELD_LABELS[language];
  const isMobileLayout = Platform.OS === 'ios' || Platform.OS === 'android';
  const modalCardTop = Math.max(24, scrollOffsetY + viewportHeight / 2);
  const profileSlotSource: ProfileSlotSource = {
    academyCode,
    academyName,
    displayName,
    loginId,
    phone: '',
    roleCode,
  };

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

  const {
    approvingLoginId,
    currentPage,
    errorMessage,
    handleApprove,
    handleSearch,
    isSearching,
    loadActiveTeacherOptions,
    paginatedSlots,
    setCurrentPage,
    statusMessage,
    totalPages,
  } = usePendingApproval({
    academyCode,
    field,
    isAuthenticated,
    language,
    onCleanupNativeState: cleanupNativeState,
    profileSlotSource,
    query,
    roleCode,
    uiNotice: ui.notice,
  });

  const handleQueryChange = (nextValue: string) => {
    if (field === 'phone') {
      setQuery(formatPhoneQuery(nextValue));
      return;
    }
    setQuery(nextValue);
  };

  const closeTeacherModal = (reason: string) => {
    logPendingApprovalEvent('teacher-modal:close', {
      reason,
      selectedTeacherLoginId,
      targetLoginId: teacherApprovalTarget?.loginId ?? '',
    });
    setIsTeacherModalOpen(false);
    setIsTeacherDropdownOpen(false);
    setTeacherErrorMessage('');
    setTeacherApprovalTarget(null);
    setSelectedTeacherLoginId('');
  };

  const openTeacherModal = async (slot: PendingMemberSlot) => {
    logPendingApprovalEvent('teacher-modal:position-snapshot', {
      scrollOffsetY,
      targetLoginId: slot.loginId,
      viewportHeight,
    });
    logPendingApprovalEvent('teacher-modal:open', {
      roleCode: slot.roleCode,
      targetLoginId: slot.loginId,
      targetName: slot.displayName,
    });
    setTeacherApprovalTarget(slot);
    setTeacherErrorMessage('');
    setSelectedTeacherLoginId('');
    setTeacherOptions([]);
    setIsTeacherDropdownOpen(false);
    setIsTeacherModalOpen(true);
    setIsLoadingTeacherOptions(true);

    try {
      const activeTeachers = await loadActiveTeacherOptions();
      if (activeTeachers.length === 0) {
        logPendingApprovalEvent('teacher-modal:teachers-empty', {
          academyCode,
          targetLoginId: slot.loginId,
        });
        setTeacherErrorMessage(
          language === 'ja'
            ? 'この塾で選択できる有効な講師がいません。'
            : 'There are no active teachers available in this academy.',
        );
        return;
      }

      setTeacherOptions(activeTeachers);
      setSelectedTeacherLoginId(activeTeachers[0]?.loginId ?? '');
      logPendingApprovalEvent('teacher-modal:teachers-loaded', {
        count: activeTeachers.length,
        firstTeacherLoginId: activeTeachers[0]?.loginId ?? '',
        targetLoginId: slot.loginId,
      });
    } catch (error) {
      logPendingApprovalEvent('teacher-modal:teachers-load-failed', {
        error: error instanceof Error ? error.message : String(error),
        targetLoginId: slot.loginId,
      });
      setTeacherErrorMessage(
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setIsLoadingTeacherOptions(false);
    }
  };

  const handleApprovePress = async (slot: PendingMemberSlot) => {
    if (slot.roleCode === 'STUDENT') {
      await openTeacherModal(slot);
      return;
    }

    await handleApprove(slot.loginId);
  };

  const confirmTeacherApproval = async () => {
    if (!teacherApprovalTarget) {
      return;
    }
    if (!selectedTeacherLoginId) {
      setTeacherErrorMessage(ui.teacherRequired);
      return;
    }

    const result = await handleApprove(teacherApprovalTarget.loginId, {
      primaryTeacherLoginId: selectedTeacherLoginId,
    });
    if (result.ok) {
      closeTeacherModal('approve-success');
      return;
    }
    logPendingApprovalEvent('teacher-modal:approve-failed', {
      error: result.errorMessage ?? '',
      selectedTeacherLoginId,
      targetLoginId: teacherApprovalTarget.loginId,
    });
    setTeacherErrorMessage(
      result.errorMessage ??
        (language === 'ja' ? '承認に失敗しました。' : 'Approval failed.'),
    );
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

  const handleViewportLayout = (event: LayoutChangeEvent) => {
    const nextViewportHeight = event.nativeEvent.layout.height;
    setViewportHeight(nextViewportHeight);
    logPendingApprovalEvent('teacher-modal:viewport-layout', {
      nextViewportHeight,
    });
  };

const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextScrollOffsetY = event.nativeEvent.contentOffset.y;
    setScrollOffsetY(nextScrollOffsetY);
    if (isTeacherModalOpen) {
      logPendingApprovalEvent('teacher-modal:scroll', {
        modalCardTop: Math.max(24, nextScrollOffsetY + viewportHeight / 2),
        nextScrollOffsetY,
        viewportHeight,
      });
    }
  };

  const searchHeaderInset = compact ? 16 : CONTENT_EDGE_INSET;

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
        <View style={styles.dropdownButtonContent}>
          <Text
            numberOfLines={1}
            style={[styles.dropdownText, { color: palette.text }]}
          >
            {fieldLabels[field]}
          </Text>
          <Text style={[styles.dropdownArrow, { color: palette.textMuted }]}>
            {isDropdownOpen ? '▲' : '▼'}
          </Text>
        </View>
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

  return (
    <View style={styles.sectionRoot}>
      <View style={styles.topOverlayWrap}>
        <SearchHeader
          edgeInset={searchHeaderInset}
          palette={palette}
          style={styles.searchHeaderSurface}
        >
          <View style={styles.searchHeaderBody}>
            <View style={styles.headerCopy}>
              <Text style={[styles.cardTitle, { color: palette.text }]}>
                {ui.title}
              </Text>
              {ui.notice ? (
                <Text style={[styles.cardBody, { color: palette.textMuted }]}>
                  {ui.notice}
                </Text>
              ) : null}
            </View>

            <View style={styles.searchRow}>
              {renderDropdown(isMobileLayout)}

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

              <View
                style={[
                  styles.searchButtonWrap,
                  isMobileLayout ? styles.searchButtonWrapMobile : null,
                ]}
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
          </View>
        </SearchHeader>
      </View>

      <ScrollView
        ref={rootScrollRef}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        onLayout={handleViewportLayout}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={[
          styles.scrollRoot,
          {
            backgroundColor: palette.card,
          },
        ]}
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
            <PendingApprovalMobileList
              approvingLoginId={approvingLoginId}
              currentPage={currentPage}
              onApprove={handleApprovePress}
              pageSize={TABLE_PAGE_SIZE}
              palette={palette}
              slots={paginatedSlots}
              ui={ui}
            />
          ) : (
            <PendingApprovalDesktopTable
              approvingLoginId={approvingLoginId}
              onApprove={handleApprovePress}
              palette={palette}
              slots={paginatedSlots}
              ui={ui}
            />
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
      {isTeacherModalOpen ? (
        <View style={styles.modalLayer} pointerEvents="box-none">
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => closeTeacherModal('backdrop-press')}
          />
          <View
            pointerEvents="box-none"
            style={[
              styles.modalCardWrap,
              {
                top: modalCardTop,
              },
            ]}
          >
            <Pressable
              onPress={() => {
                logPendingApprovalEvent('teacher-modal:card-press', {
                  dropdownOpen: isTeacherDropdownOpen,
                  targetLoginId: teacherApprovalTarget?.loginId ?? '',
                });
              }}
              style={[
                styles.modalCard,
                {
                  backgroundColor: palette.card,
                  borderColor: palette.border,
                },
              ]}
            >
            <Text style={[styles.modalTitle, { color: palette.text }]}>
              {ui.studentTeacherTitle}
            </Text>
            <Text style={[styles.modalBody, { color: palette.textMuted }]}>
              {teacherApprovalTarget
                ? `${teacherApprovalTarget.displayName} · ${ui.studentTeacherHelp}`
                : ui.studentTeacherHelp}
            </Text>

            <Text style={[styles.modalFieldLabel, { color: palette.textMuted }]}>
              {ui.teacherField}
            </Text>

            <View style={styles.modalDropdownWrap}>
              <Pressable
                disabled={isLoadingTeacherOptions || teacherOptions.length === 0}
                onPress={() =>
                  setIsTeacherDropdownOpen(open => {
                    const next = !open;
                    logPendingApprovalEvent('teacher-modal:dropdown-toggle', {
                      next,
                      optionCount: teacherOptions.length,
                      selectedTeacherLoginId,
                      targetLoginId: teacherApprovalTarget?.loginId ?? '',
                    });
                    return next;
                  })
                }
                style={[
                  styles.dropdownButton,
                  styles.modalDropdownButton,
                  {
                    backgroundColor: palette.muted,
                    borderColor: palette.border,
                    opacity:
                      isLoadingTeacherOptions || teacherOptions.length === 0
                        ? 0.6
                        : 1,
                  },
                ]}
              >
                <Text style={[styles.dropdownText, { color: palette.text }]}>
                  {isLoadingTeacherOptions
                    ? ui.loadingTeachers
                    : teacherOptions.find(
                        option => option.loginId === selectedTeacherLoginId,
                      )?.displayName ?? ui.selectTeacher}
                </Text>
                <Text style={[styles.dropdownArrow, { color: palette.textMuted }]}>
                  {isTeacherDropdownOpen ? '▲' : '▼'}
                </Text>
              </Pressable>

              <View
                pointerEvents={isTeacherDropdownOpen ? 'auto' : 'none'}
                style={[
                  styles.dropdownMenu,
                  styles.modalDropdownMenu,
                  {
                    backgroundColor: palette.card,
                    borderColor: palette.border,
                    display: isTeacherDropdownOpen ? 'flex' : 'none',
                  },
                ]}
              >
                {teacherOptions.map(option => (
                  <Pressable
                    key={option.loginId}
                    onPress={() => {
                      logPendingApprovalEvent('teacher-modal:dropdown-select', {
                        nextTeacherLoginId: option.loginId,
                        targetLoginId: teacherApprovalTarget?.loginId ?? '',
                      });
                      setSelectedTeacherLoginId(option.loginId);
                      setTeacherErrorMessage('');
                      setIsTeacherDropdownOpen(false);
                    }}
                    style={[
                      styles.dropdownItem,
                      option.loginId === selectedTeacherLoginId
                        ? { backgroundColor: palette.muted }
                        : null,
                    ]}
                  >
                    <Text style={[styles.dropdownItemText, { color: palette.text }]}>
                      {option.displayName}
                    </Text>
                    <Text
                      style={[
                        styles.modalDropdownSubtext,
                        { color: palette.textMuted },
                      ]}
                    >
                      {option.loginId}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {teacherErrorMessage ? (
              <Text style={[styles.modalErrorText, { color: '#bc4749' }]}>
                {teacherErrorMessage}
              </Text>
            ) : null}

            <View style={styles.modalActions}>
              <ActionButton
                backgroundColor={palette.muted}
                hint=""
                label={ui.cancel}
                onPress={() => closeTeacherModal('cancel-button')}
                style={styles.modalActionButton}
                textColor={palette.text}
              />
              <ActionButton
                backgroundColor={palette.primary}
                hint=""
                isLoading={
                  Boolean(teacherApprovalTarget) &&
                  approvingLoginId === teacherApprovalTarget?.loginId
                }
                label={ui.approveWithTeacher}
                onPress={confirmTeacherApproval}
                style={styles.modalActionButton}
                textColor={palette.primaryText}
              />
            </View>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionRoot: {
    alignSelf: 'stretch',
    flex: 1,
    minHeight: 0,
    position: 'relative',
  },
  topOverlayWrap: {
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 10,
  },
  scrollRoot: {
    bottom: 0,
    left: 0,
    minHeight: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  scrollContent: {
    gap: 16,
    paddingBottom: 12,
    paddingTop: HEADER_HEIGHT + 8,
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
  },
  headerCopy: {
    gap: 6,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  cardBody: {
    fontSize: 14,
    lineHeight: 22,
  },
  searchHeaderSurface: {
    borderRadius: 18,
  },
  searchHeaderBody: {
    gap: 12,
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
    flexShrink: 0,
    minWidth: 112,
  },
  dropdownButton: {
    borderRadius: 16,
    borderWidth: 1,
    height: 48,
    paddingHorizontal: 14,
    paddingVertical: 0,
    justifyContent: 'center',
  },
  dropdownButtonCompact: {
    borderRadius: 12,
    height: 32,
    paddingHorizontal: 10,
  },
  dropdownButtonContent: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 10,
    height: '100%',
    justifyContent: 'space-between',
    width: '100%',
  },
  dropdownText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
    paddingRight: 8,
  },
  dropdownArrow: {
    flexShrink: 0,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 12,
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
  modalLayer: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 40,
  },
  modalBackdrop: {
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  modalCardWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    left: 0,
    padding: 20,
    position: 'absolute',
    right: 0,
  },
  modalCard: {
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    maxWidth: 520,
    padding: 20,
    width: '100%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  modalBody: {
    fontSize: 14,
    lineHeight: 22,
  },
  modalFieldLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  modalDropdownWrap: {
    minHeight: 48,
    position: 'relative',
    zIndex: 20,
  },
  modalDropdownButton: {
    width: '100%',
  },
  modalDropdownMenu: {
    top: 52,
  },
  modalDropdownSubtext: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  modalErrorText: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  modalActionButton: {
    borderRadius: 14,
    minWidth: 128,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    fontSize: 15,
    height: 48,
    paddingHorizontal: 14,
    paddingVertical: 0,
    textAlignVertical: 'center',
  },
  searchInputCompact: {
    height: 32,
  },
  searchButtonWrap: {
    width: 124,
  },
  searchButtonWrapMobile: {
    flexShrink: 0,
    width: 112,
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
    marginTop: 8,
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
