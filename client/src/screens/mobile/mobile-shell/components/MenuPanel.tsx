import React, {useEffect, useRef, useState} from 'react';
import {Animated, Pressable, Text, View} from 'react-native';

import type {AppPage} from '../../../shared/shell-model';
import {windowsPressableFocusProps} from '../../../../shared/ui/windowsFocusProps';
import {mobileShellStyles as styles} from '../config/styles';
import type {MobileMenuSection, MobileShellPalette} from '../model/types';

export function MenuPanel({
  isAuthenticated,
  showInventoryPage,
  showMembersPage,
  showStudentReservationItem,
  showTeacherAccountItems,
  showTeacherReservationItem,
  showStudentAccountItems,
  currentPage,
  currentSection,
  labels,
  onSelectGroup,
  onSelectSection,
  palette,
}: {
  isAuthenticated: boolean;
  showInventoryPage: boolean;
  showMembersPage: boolean;
  showStudentReservationItem: boolean;
  showTeacherAccountItems: boolean;
  showTeacherReservationItem: boolean;
  showStudentAccountItems: boolean;
  currentPage: AppPage;
  currentSection: MobileMenuSection;
  labels: {
    account: string;
    adminMenu?: string;
    academyMembers: string;
    availableSchedule: string;
    classroom?: string;
    devHealth: string;
    general: string;
    inventory: string;
    inventoryList: string;
    login: string;
    members: string;
    myInfo?: string;
    pendingApproval: string;
    preset: string;
    profile: string;
    reservation: string;
    reservationView: string;
    register: string;
    settings: string;
    studentOptions: string;
  };
  onSelectGroup?: (page: AppPage) => void;
  onSelectSection: (page: AppPage, section: MobileMenuSection) => void;
  palette: MobileShellPalette;
}) {
  const [settingsTapCount, setSettingsTapCount] = useState(0);
  const [devHealthUnlocked, setDevHealthUnlocked] = useState(
    currentSection === 'dev-health',
  );
  const myInfoLabel = labels.myInfo ?? labels.account;
  const classroomLabel = labels.classroom ?? labels.account;
  const adminMenuLabel = labels.adminMenu ?? labels.members;
  const myInfoItemCount =
    (!isAuthenticated ? 2 : 1) + (showStudentAccountItems ? 1 : 0);
  const classroomItemCount =
    (showTeacherAccountItems ? 2 : 0) +
    (showTeacherReservationItem ? 1 : 0) +
    (showStudentReservationItem ? 1 : 0);
  const adminMenuItemCount =
    (showMembersPage ? 2 : 0) + (showInventoryPage ? 1 : 0);
  const currentGroup: 'settings' | 'my-info' | 'classroom' | 'admin-menu' | null =
    currentPage === 'settings'
      ? 'settings'
      : currentPage === 'account' &&
          (currentSection === 'login' ||
            currentSection === 'register' ||
            currentSection === 'student-options')
        ? 'my-info'
        : currentPage === 'account' &&
            (currentSection === 'preset' ||
              currentSection === 'available-schedule' ||
              currentSection === 'reservation-view' ||
              currentSection === 'reservation')
          ? 'classroom'
          : currentPage === 'members' || currentPage === 'inventory'
            ? 'admin-menu'
            : null;
  const [expandedGroup, setExpandedGroup] = useState<
    'settings' | 'my-info' | 'classroom' | 'admin-menu' | null
  >(
    currentGroup,
  );
  const settingsAnimation = useRef(
    new Animated.Value(currentGroup === 'settings' ? 1 : 0),
  ).current;
  const accountAnimation = useRef(
    new Animated.Value(currentGroup === 'my-info' ? 1 : 0),
  ).current;
  const membersAnimation = useRef(
    new Animated.Value(currentGroup === 'classroom' ? 1 : 0),
  ).current;
  const inventoryAnimation = useRef(
    new Animated.Value(currentGroup === 'admin-menu' ? 1 : 0),
  ).current;
  const showDevHealthItem = devHealthUnlocked || currentSection === 'dev-health';
  const settingsSubmenuHeight = showDevHealthItem ? 116 : 58;

  useEffect(() => {
    setExpandedGroup(currentGroup);
  }, [currentGroup]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(settingsAnimation, {
        duration: 180,
        toValue: expandedGroup === 'settings' ? 1 : 0,
        useNativeDriver: false,
      }),
      Animated.timing(accountAnimation, {
        duration: 180,
        toValue: expandedGroup === 'my-info' ? 1 : 0,
        useNativeDriver: false,
      }),
      Animated.timing(membersAnimation, {
        duration: 180,
        toValue: expandedGroup === 'classroom' ? 1 : 0,
        useNativeDriver: false,
      }),
      Animated.timing(inventoryAnimation, {
        duration: 180,
        toValue: expandedGroup === 'admin-menu' ? 1 : 0,
        useNativeDriver: false,
      }),
    ]).start();
  }, [accountAnimation, expandedGroup, inventoryAnimation, membersAnimation, settingsAnimation]);

  const getSubItemTextStyle = (active: boolean) => [
    styles.overlaySubItemText,
    active ? styles.overlaySubItemTextActive : styles.overlaySubItemTextInactive,
    {
      color: palette.menuText,
      fontWeight: active ? ('bold' as const) : ('400' as const),
    },
  ];

  const getTopLevelTextStyle = (active: boolean) => [
    styles.overlayItemText,
    {
      color: palette.sidebarItemText,
      fontWeight: active ? ('900' as const) : ('500' as const),
      opacity: active ? 1 : 0.82,
    },
  ];

  const resetSettingsTapCount = () => {
    setSettingsTapCount(0);
  };

  const navigate = (nextPage: AppPage, nextSection: MobileMenuSection) => {
    const staysOnSettingsTrigger =
      nextPage === 'settings' && nextSection === 'general';
    if (!staysOnSettingsTrigger) {
      resetSettingsTapCount();
    }
    onSelectSection(nextPage, nextSection);
  };

  const handleSettingsPress = () => {
    setSettingsTapCount(currentCount => {
      const nextCount = currentCount + 1;
      if (nextCount >= 5) {
        setDevHealthUnlocked(true);
        return 0;
      }
      return nextCount;
    });
    navigate('settings', 'general');
  };

  return (
    <View style={[styles.menuSurface, {backgroundColor: palette.menuCard}]}>
      {/* モバイルは上部バーを残し、その下だけをメニュー領域として使う。 */}
      <Pressable
        {...windowsPressableFocusProps}
        onPress={handleSettingsPress}
        style={[styles.overlayItem, {backgroundColor: palette.sidebarItem}]}>
        <Text style={getTopLevelTextStyle(currentGroup === 'settings')}>
          {labels.settings}
        </Text>
      </Pressable>
      <Animated.View
        pointerEvents={expandedGroup === 'settings' ? 'auto' : 'none'}
        style={[
          styles.overlaySubmenu,
          {
            opacity: settingsAnimation,
            maxHeight: settingsAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [0, settingsSubmenuHeight],
            }),
            transform: [
              {
                translateY: settingsAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-8, 0],
                }),
              },
            ],
          },
        ]}>
        <Pressable
          {...windowsPressableFocusProps}
          onPress={() => navigate('settings', 'general')}
          style={styles.overlaySubItem}>
          <Text
            style={getSubItemTextStyle(
              currentPage === 'settings' && currentSection === 'general',
            )}>
            {labels.general}
          </Text>
        </Pressable>
        {showDevHealthItem ? (
          <Pressable
            {...windowsPressableFocusProps}
            onPress={() => navigate('settings', 'dev-health')}
            style={styles.overlaySubItem}>
            <Text
              style={getSubItemTextStyle(
                currentPage === 'settings' && currentSection === 'dev-health',
              )}>
              {labels.devHealth}
            </Text>
          </Pressable>
        ) : null}
      </Animated.View>
      <Pressable
        {...windowsPressableFocusProps}
        onPress={() => onSelectSection('account', 'login')}
        style={[
          styles.overlayItem,
          styles.overlayItemSpaced,
          {backgroundColor: palette.sidebarItem},
        ]}>
        <Text style={getTopLevelTextStyle(currentGroup === 'my-info')}>
          {myInfoLabel}
        </Text>
      </Pressable>
      <Animated.View
        pointerEvents={expandedGroup === 'my-info' ? 'auto' : 'none'}
        style={[
          styles.overlaySubmenu,
          {
            opacity: accountAnimation,
            maxHeight: accountAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 24 + myInfoItemCount * 58],
            }),
            transform: [
              {
                translateY: accountAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-8, 0],
                }),
              },
            ],
          },
        ]}>
        {isAuthenticated ? (
          <>
              <Pressable
                {...windowsPressableFocusProps}
                onPress={() => navigate('account', 'login')}
                style={styles.overlaySubItem}>
              <Text
                style={getSubItemTextStyle(
                  currentPage === 'account' && currentSection === 'login',
                )}>
                {labels.profile}
              </Text>
            </Pressable>
            {showStudentAccountItems ? (
                <Pressable
                  {...windowsPressableFocusProps}
                  onPress={() => navigate('account', 'student-options')}
                  style={styles.overlaySubItem}>
                <Text
                  style={getSubItemTextStyle(
                    currentPage === 'account' &&
                      currentSection === 'student-options',
                  )}>
                  {labels.studentOptions}
                </Text>
              </Pressable>
            ) : null}
          </>
        ) : (
          <>
              <Pressable
                {...windowsPressableFocusProps}
                onPress={() => navigate('account', 'login')}
                style={styles.overlaySubItem}>
              <Text
                style={getSubItemTextStyle(
                  currentPage === 'account' && currentSection === 'login',
                )}>
                {labels.login}
              </Text>
            </Pressable>
              <Pressable
                {...windowsPressableFocusProps}
                onPress={() => navigate('account', 'register')}
                style={styles.overlaySubItem}>
              <Text
                style={getSubItemTextStyle(
                  currentPage === 'account' && currentSection === 'register',
                )}>
                {labels.register}
              </Text>
            </Pressable>
          </>
        )}
      </Animated.View>
      {classroomItemCount > 0 ? (
        <>
          <Pressable
            {...windowsPressableFocusProps}
            onPress={() =>
              navigate(
                'account',
                showTeacherAccountItems
                  ? 'available-schedule'
                  : showTeacherReservationItem
                    ? 'reservation-view'
                    : 'reservation',
              )
            }
            style={[
              styles.overlayItem,
              styles.overlayItemSpaced,
              {backgroundColor: palette.sidebarItem},
            ]}>
            <Text style={getTopLevelTextStyle(currentGroup === 'classroom')}>
              {classroomLabel}
            </Text>
          </Pressable>
          <Animated.View
            pointerEvents={expandedGroup === 'classroom' ? 'auto' : 'none'}
            style={[
              styles.overlaySubmenu,
              {
                opacity: membersAnimation,
                maxHeight: membersAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 20 + classroomItemCount * 58],
                }),
                transform: [
                  {
                    translateY: membersAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-8, 0],
                    }),
                  },
                ],
              },
            ]}>
            {showTeacherAccountItems ? (
              <Pressable
                {...windowsPressableFocusProps}
                onPress={() => navigate('account', 'available-schedule')}
                style={styles.overlaySubItem}>
                <Text
                  style={getSubItemTextStyle(
                    currentPage === 'account' &&
                      currentSection === 'available-schedule',
                  )}>
                  {labels.availableSchedule}
                </Text>
              </Pressable>
            ) : null}
            {showTeacherAccountItems ? (
              <Pressable
                {...windowsPressableFocusProps}
                onPress={() => navigate('account', 'preset')}
                style={styles.overlaySubItem}>
                <Text
                  style={getSubItemTextStyle(
                    currentPage === 'account' && currentSection === 'preset',
                  )}>
                  {labels.preset}
                </Text>
              </Pressable>
            ) : null}
            {showTeacherReservationItem ? (
              <Pressable
                {...windowsPressableFocusProps}
                onPress={() => navigate('account', 'reservation-view')}
                style={styles.overlaySubItem}>
                <Text
                  style={getSubItemTextStyle(
                    currentPage === 'account' &&
                      currentSection === 'reservation-view',
                  )}>
                  {labels.reservationView}
                </Text>
              </Pressable>
            ) : null}
            {showStudentReservationItem ? (
              <Pressable
                {...windowsPressableFocusProps}
                onPress={() => navigate('account', 'reservation')}
                style={styles.overlaySubItem}>
                <Text
                  style={getSubItemTextStyle(
                    currentPage === 'account' &&
                      currentSection === 'reservation',
                  )}>
                  {labels.reservation}
                </Text>
              </Pressable>
            ) : null}
          </Animated.View>
        </>
      ) : null}
      {adminMenuItemCount > 0 ? (
        <>
          <Pressable
            {...windowsPressableFocusProps}
            onPress={() =>
              navigate(
                showMembersPage ? 'members' : 'inventory',
                showMembersPage ? 'pending-approval' : 'inventory-list',
              )
            }
            style={[
              styles.overlayItem,
              styles.overlayItemSpaced,
              {backgroundColor: palette.sidebarItem},
            ]}>
            <Text style={getTopLevelTextStyle(currentGroup === 'admin-menu')}>
              {adminMenuLabel}
            </Text>
          </Pressable>
          <Animated.View
            pointerEvents={expandedGroup === 'admin-menu' ? 'auto' : 'none'}
            style={[
              styles.overlaySubmenu,
              {
                opacity: inventoryAnimation,
                maxHeight: inventoryAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 20 + adminMenuItemCount * 58],
                }),
                transform: [
                  {
                    translateY: inventoryAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-8, 0],
                    }),
                  },
                ],
              },
            ]}>
            {showMembersPage ? (
              <Pressable
                {...windowsPressableFocusProps}
                onPress={() => navigate('members', 'pending-approval')}
                style={styles.overlaySubItem}>
                <Text
                  style={getSubItemTextStyle(
                    currentPage === 'members' &&
                      currentSection === 'pending-approval',
                  )}>
                  {labels.pendingApproval}
                </Text>
              </Pressable>
            ) : null}
            {showMembersPage ? (
              <Pressable
                {...windowsPressableFocusProps}
                onPress={() => navigate('members', 'academy-members')}
                style={styles.overlaySubItem}>
                <Text
                  style={getSubItemTextStyle(
                    currentPage === 'members' &&
                      currentSection === 'academy-members',
                  )}>
                  {labels.academyMembers}
                </Text>
              </Pressable>
            ) : null}
            {showInventoryPage ? (
              <Pressable
                {...windowsPressableFocusProps}
                onPress={() => navigate('inventory', 'inventory-list')}
                style={styles.overlaySubItem}>
                <Text
                  style={getSubItemTextStyle(
                    currentPage === 'inventory' &&
                      currentSection === 'inventory-list',
                  )}>
                  {labels.inventoryList}
                </Text>
              </Pressable>
            ) : null}
          </Animated.View>
        </>
      ) : null}
    </View>
  );
}
