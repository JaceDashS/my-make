import React, {useRef, useState} from 'react';
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

import {ActionButton} from '../../shared/components/ActionButton';
import type {LanguageMode} from '../../screens/shared/shell-model';
import {AcademyMembersDesktopTable} from './AcademyMembersDesktopTable';
import {canEditAcademyMemberProfile} from './academyMembersActionModel';
import {
  ACADEMY_MEMBER_FIELD_LABELS,
  ACADEMY_MEMBER_FIELD_ORDER,
  ACADEMY_MEMBERS_LABELS,
  ACADEMY_MEMBER_STATUS_FILTER_LABELS,
  ACADEMY_MEMBER_STATUS_FILTER_ORDER,
} from './academyMembersLabels';
import {AcademyMembersMobileList} from './AcademyMembersMobileList';
import {TABLE_PAGE_SIZE} from './academyMembersModel';
import type {
  AcademyMemberSlot,
  SearchField,
  ShellPaletteLike,
} from './academyMembersTypes';
import {formatPhoneQuery} from './pendingApprovalModel';
import {useAcademyMembers} from './useAcademyMembers';

export function AcademyMembersSection({
  academyCode,
  compact = false,
  isAuthenticated,
  language,
  palette,
  roleCode,
}: {
  academyCode: string;
  compact?: boolean;
  isAuthenticated: boolean;
  language: LanguageMode;
  palette: ShellPaletteLike;
  roleCode: string;
}) {
  const [field, setField] = useState<SearchField>('phone');
  const [editingDraft, setEditingDraft] = useState({
    displayName: '',
    email: '',
    phone: '',
  });
  const [editingMember, setEditingMember] = useState<AcademyMemberSlot | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [query, setQuery] = useState('');
  const queryInputRef = useRef<TextInput | null>(null);
  const rootScrollRef = useRef<ScrollView | null>(null);
  const ui = ACADEMY_MEMBERS_LABELS[language];
  const fieldLabels = ACADEMY_MEMBER_FIELD_LABELS[language];
  const statusLabels = ACADEMY_MEMBER_STATUS_FILTER_LABELS[language];
  const isMobileLayout = Platform.OS !== 'windows';

  const cleanupNativeState = (reason: string) => {
    void reason;
    setIsDropdownOpen(false);
    queryInputRef.current?.blur();
    Keyboard.dismiss();
    rootScrollRef.current?.scrollTo?.({animated: false, x: 0, y: 0});
  };

  const {
    currentPage,
    errorMessage,
    handleLoadAllMembers,
    handleSearch,
    handleStatusFilterChange,
    handleStatusUpdate,
    isSearching,
    paginatedSlots,
    setCurrentPage,
    statusFilter,
    statusMessage,
    totalPages,
    updatingKey,
  } = useAcademyMembers({
    academyCode,
    field,
    isAuthenticated,
    language,
    onCleanupNativeState: cleanupNativeState,
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

  const handleDropdownKeyDown = (event: any) => {
    const key = event?.nativeEvent?.key;
    if (key === 'Enter') {
      handleSearch();
    }
  };

  const handleEditProfile = (slot: AcademyMemberSlot) => {
    if (!canEditAcademyMemberProfile(roleCode, slot.roleCode)) {
      return;
    }

    setEditingMember(slot);
    setEditingDraft({
      displayName: slot.displayName,
      email: slot.email,
      phone: slot.phone,
    });
  };

  const renderDropdown = (mobile = false) => (
    <View style={[styles.dropdownWrap, mobile ? styles.dropdownWrapMobile : null]}>
      <Pressable
        onPress={() => setIsDropdownOpen(open => !open)}
        {...(Platform.OS === 'windows'
          ? ({
              focusable: true,
              onKeyDown: handleDropdownKeyDown,
            } as any)
          : ({} as any))}
        style={[
          styles.dropdownButton,
          compact ? styles.dropdownButtonCompact : null,
          {
            backgroundColor: palette.muted,
            borderColor: palette.border,
          },
        ]}>
        <Text style={[styles.dropdownText, {color: palette.text}]}>
          {fieldLabels[field]}
        </Text>
        <Text style={[styles.dropdownArrow, {color: palette.textMuted}]}>
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
            display: isDropdownOpen ? 'flex' : 'none',
          },
        ]}>
        {ACADEMY_MEMBER_FIELD_ORDER.map(option => (
          <Pressable
            key={option}
            onPress={() => {
              setField(option);
              setQuery(currentQuery =>
                option === 'phone' ? formatPhoneQuery(currentQuery) : currentQuery,
              );
              setIsDropdownOpen(false);
            }}
            style={[
              styles.dropdownItem,
              option === field ? {backgroundColor: palette.muted} : null,
            ]}>
            <Text style={[styles.dropdownItemText, {color: palette.text}]}>
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
      keyboardShouldPersistTaps="handled">
      <View
        style={[
          styles.card,
          {
            backgroundColor: palette.card,
            borderColor: palette.border,
          },
        ]}>
        <Text style={[styles.cardTitle, {color: palette.text}]}>{ui.title}</Text>
        <Text style={[styles.cardBody, {color: palette.textMuted}]}>
          {ui.notice}
        </Text>

        <View style={styles.searchCard}>
          <View
            style={[
              styles.searchRow,
              isMobileLayout ? styles.searchRowMobile : null,
            ]}>
            {!isMobileLayout ? renderDropdown() : null}
            <TextInput
              ref={queryInputRef}
              onChangeText={handleQueryChange}
              onSubmitEditing={() => handleSearch()}
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
              value={query}
            />
            {!isMobileLayout ? (
              <View style={styles.searchButtonsRow}>
                <ActionButton
                  backgroundColor={palette.primary}
                  hint=""
                  isLoading={isSearching}
                  label={ui.search}
                  onPress={() => handleSearch()}
                  style={[
                    styles.searchButton,
                    compact ? styles.searchButtonCompact : null,
                  ]}
                  textColor={palette.primaryText}
                />
                <ActionButton
                  backgroundColor={palette.muted}
                  hint=""
                  isLoading={isSearching}
                  label={ui.allMembers}
                  onPress={handleLoadAllMembers}
                  style={[
                    styles.searchButton,
                    compact ? styles.searchButtonCompact : null,
                  ]}
                  textColor={palette.text}
                />
              </View>
            ) : null}
          </View>

          {isMobileLayout ? (
            <View style={[styles.searchActionRow, styles.searchActionRowMobile]}>
              {renderDropdown(true)}
              <View style={[styles.searchButtonWrap, styles.searchButtonWrapMobile]}>
                <ActionButton
                  backgroundColor={palette.primary}
                  hint=""
                  isLoading={isSearching}
                  label={ui.search}
                  onPress={() => handleSearch()}
                  style={[
                    styles.searchButton,
                    compact ? styles.searchButtonCompact : null,
                  ]}
                  textColor={palette.primaryText}
                />
              </View>
              <View style={[styles.searchButtonWrap, styles.searchButtonWrapMobile]}>
                <ActionButton
                  backgroundColor={palette.muted}
                  hint=""
                  isLoading={isSearching}
                  label={ui.allMembers}
                  onPress={handleLoadAllMembers}
                  style={[
                    styles.searchButton,
                    compact ? styles.searchButtonCompact : null,
                  ]}
                  textColor={palette.text}
                />
              </View>
            </View>
          ) : null}

          <View style={styles.filterRow}>
            {ACADEMY_MEMBER_STATUS_FILTER_ORDER.map(option => (
              <Pressable
                key={option}
                onPress={() => {
                  handleStatusFilterChange(option);
                }}
                style={[
                  styles.filterButton,
                  {
                    backgroundColor:
                      statusFilter === option ? palette.primary : palette.card,
                    borderColor:
                      statusFilter === option ? palette.primary : palette.border,
                  },
                ]}>
                <Text
                  style={[
                    styles.filterButtonText,
                    {
                      color:
                        statusFilter === option
                          ? palette.primaryText
                          : palette.text,
                    },
                  ]}>
                  {statusLabels[option]}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Text
          style={[
            styles.metaText,
            errorMessage ? styles.errorText : {color: palette.textMuted},
          ]}>
          {statusMessage}
        </Text>

        <View style={styles.tableWrap}>
          {isMobileLayout ? (
            <AcademyMembersMobileList
              actorRoleCode={roleCode}
              currentPage={currentPage}
              onEditProfile={handleEditProfile}
              onAction={handleStatusUpdate}
              pageSize={TABLE_PAGE_SIZE}
              palette={palette}
              slots={paginatedSlots}
              ui={ui}
              updatingKey={updatingKey}
            />
          ) : (
            <AcademyMembersDesktopTable
              actorRoleCode={roleCode}
              onEditProfile={handleEditProfile}
              onAction={handleStatusUpdate}
              palette={palette}
              slots={paginatedSlots}
              ui={ui}
              updatingKey={updatingKey}
            />
          )}
        </View>

        {editingMember ? (
          <View
            style={[
              styles.editorCard,
              {
                backgroundColor: palette.muted,
                borderColor: palette.border,
              },
            ]}>
            <View style={styles.editorHeader}>
              <View style={styles.editorHeaderCopy}>
                <Text style={[styles.editorTitle, {color: palette.text}]}>
                  {ui.editorTitle}
                </Text>
                <Text style={[styles.editorNotice, {color: palette.textMuted}]}>
                  {ui.editorDraftNotice}
                </Text>
              </View>
              <Pressable
                onPress={() => setEditingMember(null)}
                style={[
                  styles.editorCloseButton,
                  {
                    backgroundColor: palette.card,
                    borderColor: palette.border,
                  },
                ]}>
                <Text style={[styles.editorCloseButtonText, {color: palette.text}]}>
                  {ui.closeEditor}
                </Text>
              </Pressable>
            </View>
            <View style={styles.editorMetaRow}>
              <Text style={[styles.editorMetaText, {color: palette.textMuted}]}>
                {ui.loginId}: {editingMember.loginId}
              </Text>
              <Text style={[styles.editorMetaText, {color: palette.textMuted}]}>
                {ui.role}: {editingMember.roleCode}
              </Text>
              <Text style={[styles.editorMetaText, {color: palette.textMuted}]}>
                {ui.status}: {editingMember.statusCode}
              </Text>
            </View>
            <TextInput
              onChangeText={value =>
                setEditingDraft(current => ({...current, displayName: value}))
              }
              placeholder={ui.name}
              placeholderTextColor={palette.textMuted}
              style={[
                styles.editorInput,
                {
                  backgroundColor: palette.card,
                  borderColor: palette.border,
                  color: palette.text,
                },
              ]}
              value={editingDraft.displayName}
            />
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              onChangeText={value =>
                setEditingDraft(current => ({...current, email: value}))
              }
              placeholder={ui.email}
              placeholderTextColor={palette.textMuted}
              style={[
                styles.editorInput,
                {
                  backgroundColor: palette.card,
                  borderColor: palette.border,
                  color: palette.text,
                },
              ]}
              value={editingDraft.email}
            />
            <TextInput
              keyboardType="phone-pad"
              onChangeText={value =>
                setEditingDraft(current => ({...current, phone: formatPhoneQuery(value)}))
              }
              placeholder={ui.phone}
              placeholderTextColor={palette.textMuted}
              style={[
                styles.editorInput,
                {
                  backgroundColor: palette.card,
                  borderColor: palette.border,
                  color: palette.text,
                },
              ]}
              value={editingDraft.phone}
            />
          </View>
        ) : null}

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
            ]}>
            <Text style={[styles.paginationButtonText, {color: palette.text}]}>
              {ui.prev}
            </Text>
          </Pressable>
          <Text style={[styles.paginationText, {color: palette.textMuted}]}>
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
            ]}>
            <Text style={[styles.paginationButtonText, {color: palette.text}]}>
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
  searchButtonsRow: {
    flexDirection: 'row',
    gap: 12,
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
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  filterButton: {
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '800',
  },
  metaText: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 12,
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
  editorCard: {
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    marginTop: 14,
    padding: 16,
  },
  editorHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  editorHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  editorTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  editorNotice: {
    fontSize: 13,
    lineHeight: 20,
  },
  editorCloseButton: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: 12,
  },
  editorCloseButtonText: {
    fontSize: 12,
    fontWeight: '800',
  },
  editorMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  editorMetaText: {
    fontSize: 12,
    fontWeight: '700',
  },
  editorInput: {
    borderRadius: 14,
    borderWidth: 1,
    fontSize: 14,
    height: 46,
    paddingHorizontal: 14,
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
});
