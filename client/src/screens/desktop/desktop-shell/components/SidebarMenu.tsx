import React, {useEffect, useRef, useState} from 'react';
import {Animated, Pressable, Text, View} from 'react-native';

import type {AppPage} from '../../../shared/shell-model';
import {windowsPressableFocusProps} from '../../../../shared/ui/windowsFocusProps';
import {desktopShellStyles as styles} from '../config/styles';
import type {DesktopMenuSection, DesktopShellPalette} from '../model/types';
import {SidebarSubItem} from './ui';

export function SidebarMenu({
  animation,
  disableConditionalVisibility,
  isOpen,
  isAuthenticated,
  showInventoryPage,
  showMembersPage,
  showStudentReservationItem,
  showTeacherAccountItems,
  showTeacherReservationItem,
  showStudentAccountItems,
  labels,
  onNavigate,
  onPageChange,
  onSectionChange,
  page,
  palette,
  section,
}: {
  animation: Animated.Value;
  disableConditionalVisibility: boolean;
  isOpen: boolean;
  isAuthenticated: boolean;
  showInventoryPage: boolean;
  showMembersPage: boolean;
  showStudentReservationItem: boolean;
  showTeacherAccountItems: boolean;
  showTeacherReservationItem: boolean;
  showStudentAccountItems: boolean;
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
  onNavigate: (page: AppPage, section: DesktopMenuSection) => void;
  onPageChange?: (page: AppPage) => void;
  onSectionChange?: (section: DesktopMenuSection) => void;
  page: AppPage;
  palette: DesktopShellPalette;
  section: DesktopMenuSection;
}) {
  const [settingsTapCount, setSettingsTapCount] = useState(0);
  const [devHealthUnlocked, setDevHealthUnlocked] = useState(
    section === 'dev-health',
  );
  const myInfoLabel = labels.myInfo ?? labels.account;
  const classroomLabel = labels.classroom ?? labels.account;
  const adminMenuLabel = labels.adminMenu ?? labels.members;
  const myInfoItemCount =
    (!isAuthenticated || disableConditionalVisibility ? 2 : 1) +
    (showStudentAccountItems ? 1 : 0);
  const classroomItemCount =
    (showTeacherAccountItems ? 2 : 0) +
    (showTeacherReservationItem ? 1 : 0) +
    (showStudentReservationItem ? 1 : 0);
  const adminMenuItemCount =
    (showMembersPage ? 2 : 0) + (showInventoryPage ? 1 : 0);
  const settingsActive = page === 'settings';
  const myInfoActive =
    page === 'account' &&
    (section === 'login' ||
      section === 'register' ||
      section === 'student-options');
  const classroomActive =
    page === 'account' &&
    (section === 'preset' ||
      section === 'available-schedule' ||
      section === 'reservation-view' ||
      section === 'reservation');
  const adminMenuActive = page === 'members' || page === 'inventory';
  const settingsAnimation = useRef(
    new Animated.Value(settingsActive ? 1 : 0),
  ).current;
  const accountAnimation = useRef(
    new Animated.Value(myInfoActive ? 1 : 0),
  ).current;
  const membersAnimation = useRef(
    new Animated.Value(classroomActive ? 1 : 0),
  ).current;
  const inventoryAnimation = useRef(
    new Animated.Value(adminMenuActive ? 1 : 0),
  ).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(settingsAnimation, {
        duration: 180,
        toValue: settingsActive ? 1 : 0,
        useNativeDriver: false,
      }),
      Animated.timing(accountAnimation, {
        duration: 180,
        toValue: myInfoActive ? 1 : 0,
        useNativeDriver: false,
      }),
      Animated.timing(membersAnimation, {
        duration: 180,
        toValue: classroomActive ? 1 : 0,
        useNativeDriver: false,
      }),
      Animated.timing(inventoryAnimation, {
        duration: 180,
        toValue: adminMenuActive ? 1 : 0,
        useNativeDriver: false,
      }),
    ]).start();
  }, [
    accountAnimation,
    adminMenuActive,
    classroomActive,
    inventoryAnimation,
    membersAnimation,
    myInfoActive,
    settingsActive,
    settingsAnimation,
  ]);

  const getTopLevelTextStyle = () => [
    styles.sidebarItemLabel,
    {
      color: palette.sidebarItemText,
      fontWeight: '500' as const,
      opacity: 1,
    },
  ];
  const showDevHealthItem = devHealthUnlocked || section === 'dev-health';
  const settingsSubmenuHeight = showDevHealthItem ? 96 : 52;

  const resetSettingsTapCount = () => {
    setSettingsTapCount(0);
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

  const navigate = (nextPage: AppPage, nextSection: DesktopMenuSection) => {
    const staysOnSettingsTrigger =
      nextPage === 'settings' && nextSection === 'general';
    if (!staysOnSettingsTrigger) {
      resetSettingsTapCount();
    }

    if (onNavigate) {
      onNavigate(nextPage, nextSection);
      return;
    }

    if (page !== nextPage) {
      onPageChange?.(nextPage);
    }

    onSectionChange?.(nextSection);
  };

  return (
    <Animated.View
      pointerEvents={isOpen ? 'auto' : 'none'}
      style={[
        styles.sidebar,
        {
          backgroundColor: palette.sidebar,
          width: animation.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 250],
          }),
          paddingHorizontal: animation.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 16],
          }),
          paddingTop: animation.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 24],
          }),
        },
      ]}>
      <Animated.View
        style={{
          opacity: animation,
          transform: [
            {
              translateX: animation.interpolate({
                inputRange: [0, 1],
                outputRange: [-32, 0],
              }),
            },
          ],
        }}>
        {isOpen ? (
          <>
            <Pressable
              {...windowsPressableFocusProps}
              onPress={handleSettingsPress}
              style={[styles.sidebarItem, {backgroundColor: palette.sidebarItem}]}>
              <Text style={getTopLevelTextStyle()}>{labels.settings}</Text>
            </Pressable>
            {/* 設定配下の項目は同じサイドバー内で展開する。 */}
            <Animated.View
              pointerEvents={settingsActive ? 'auto' : 'none'}
              style={[
                styles.sidebarSubmenuAnimated,
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
              <View style={styles.sidebarSubmenu}>
                <SidebarSubItem
                  active={section === 'general'}
                  label={labels.general}
                  onPress={() => navigate('settings', 'general')}
                  palette={palette}
                />
                {showDevHealthItem ? (
                  <SidebarSubItem
                    active={section === 'dev-health'}
                    label={labels.devHealth}
                    onPress={() => navigate('settings', 'dev-health')}
                    palette={palette}
                  />
                ) : null}
              </View>
            </Animated.View>
            <Pressable
              {...windowsPressableFocusProps}
              onPress={() => navigate('account', 'login')}
              style={[
                styles.sidebarItem,
                styles.sidebarItemSpaced,
                {backgroundColor: palette.sidebarItem},
              ]}>
              <Text style={getTopLevelTextStyle()}>{myInfoLabel}</Text>
            </Pressable>
            <Animated.View
              pointerEvents={myInfoActive ? 'auto' : 'none'}
              style={[
                styles.sidebarSubmenuAnimated,
                {
                  opacity: accountAnimation,
                  maxHeight: accountAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 52 + myInfoItemCount * 48],
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
              <View style={styles.sidebarSubmenu}>
                <SidebarSubItem
                  active={section === 'login'}
                  label={isAuthenticated ? labels.profile : labels.login}
                  onPress={() => navigate('account', 'login')}
                  palette={palette}
                />
                {!isAuthenticated || disableConditionalVisibility ? (
                  <SidebarSubItem
                    active={section === 'register'}
                    label={labels.register}
                    onPress={() => navigate('account', 'register')}
                    palette={palette}
                  />
                ) : null}
                {showStudentAccountItems ? (
                  <SidebarSubItem
                    active={section === 'student-options'}
                    label={labels.studentOptions}
                    onPress={() => navigate('account', 'student-options')}
                    palette={palette}
                  />
                ) : null}
              </View>
            </Animated.View>
            {classroomItemCount > 0 ? (
              <>
                <Pressable
                  {...windowsPressableFocusProps}
                  onPress={() =>
                    navigate(
                      'account',
                      showTeacherReservationItem
                        ? 'reservation-view'
                        : showTeacherAccountItems
                        ? 'available-schedule'
                        : 'reservation',
                    )
                  }
                  style={[
                    styles.sidebarItem,
                    styles.sidebarItemSpaced,
                    {backgroundColor: palette.sidebarItem},
                  ]}>
                  <Text style={getTopLevelTextStyle()}>{classroomLabel}</Text>
                </Pressable>
                <Animated.View
                  pointerEvents={classroomActive ? 'auto' : 'none'}
                  style={[
                    styles.sidebarSubmenuAnimated,
                    {
                      opacity: membersAnimation,
                      maxHeight: membersAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 20 + classroomItemCount * 48],
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
                  <View style={styles.sidebarSubmenu}>
                    {showTeacherReservationItem ? (
                      <SidebarSubItem
                        active={section === 'reservation-view'}
                        label={labels.reservationView}
                        onPress={() => navigate('account', 'reservation-view')}
                        palette={palette}
                      />
                    ) : null}
                    {showTeacherAccountItems ? (
                      <SidebarSubItem
                        active={section === 'available-schedule'}
                        label={labels.availableSchedule}
                        onPress={() => navigate('account', 'available-schedule')}
                        palette={palette}
                      />
                    ) : null}
                    {showTeacherAccountItems ? (
                      <SidebarSubItem
                        active={section === 'preset'}
                        label={labels.preset}
                        onPress={() => navigate('account', 'preset')}
                        palette={palette}
                      />
                    ) : null}
                    {showStudentReservationItem ? (
                      <SidebarSubItem
                        active={section === 'reservation'}
                        label={labels.reservation}
                        onPress={() => navigate('account', 'reservation')}
                        palette={palette}
                      />
                    ) : null}
                  </View>
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
                    styles.sidebarItem,
                    styles.sidebarItemSpaced,
                    {backgroundColor: palette.sidebarItem},
                  ]}>
                  <Text style={getTopLevelTextStyle()}>{adminMenuLabel}</Text>
                </Pressable>
                <Animated.View
                  pointerEvents={adminMenuActive ? 'auto' : 'none'}
                  style={[
                    styles.sidebarSubmenuAnimated,
                    {
                      opacity: inventoryAnimation,
                      maxHeight: inventoryAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 20 + adminMenuItemCount * 48],
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
                  <View style={styles.sidebarSubmenu}>
                    {showMembersPage ? (
                      <SidebarSubItem
                        active={section === 'pending-approval'}
                        label={labels.pendingApproval}
                        onPress={() => navigate('members', 'pending-approval')}
                        palette={palette}
                      />
                    ) : null}
                    {showMembersPage ? (
                      <SidebarSubItem
                        active={section === 'academy-members'}
                        label={labels.academyMembers}
                        onPress={() => navigate('members', 'academy-members')}
                        palette={palette}
                      />
                    ) : null}
                    {showInventoryPage ? (
                      <SidebarSubItem
                        active={section === 'inventory-list'}
                        label={labels.inventoryList}
                        onPress={() => navigate('inventory', 'inventory-list')}
                        palette={palette}
                      />
                    ) : null}
                  </View>
                </Animated.View>
              </>
            ) : null}
          </>
        ) : null}
      </Animated.View>
    </Animated.View>
  );
}
