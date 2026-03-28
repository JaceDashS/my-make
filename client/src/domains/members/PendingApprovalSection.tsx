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

import { ActionButton } from '../../shared/components/ActionButton';
import type { LanguageMode } from '../../screens/shared/shell-model';
import { FIELD_LABELS, FIELD_ORDER, MEMBERS_LABELS } from './pendingApprovalLabels';
import { PendingApprovalDesktopTable } from './PendingApprovalDesktopTable';
import { PendingApprovalMobileList } from './PendingApprovalMobileList';
import { TABLE_PAGE_SIZE, formatPhoneQuery } from './pendingApprovalModel';
import type {
  ProfileSlotSource,
  SearchField,
  ShellPaletteLike,
} from './pendingApprovalTypes';
import { logPendingApprovalEvent } from './pendingApprovalLogging';
import { usePendingApproval } from './usePendingApproval';

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
  const queryInputRef = useRef<TextInput | null>(null);
  const rootScrollRef = useRef<ScrollView | null>(null);
  const ui = MEMBERS_LABELS[language];
  const fieldLabels = FIELD_LABELS[language];
  const isMobileLayout = Platform.OS !== 'windows';
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
            <PendingApprovalMobileList
              approvingLoginId={approvingLoginId}
              currentPage={currentPage}
              onApprove={handleApprove}
              pageSize={TABLE_PAGE_SIZE}
              palette={palette}
              slots={paginatedSlots}
              ui={ui}
            />
          ) : (
            <PendingApprovalDesktopTable
              approvingLoginId={approvingLoginId}
              onApprove={handleApprove}
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
