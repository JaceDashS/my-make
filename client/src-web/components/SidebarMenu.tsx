import React, { useState } from 'react';

import type { AppPage } from '../../src/screens/shared/shell-model';
import { desktopShellStyles as styles } from '../../src/screens/desktop/desktop-shell/config/styles';
import type { DesktopMenuSection, DesktopShellPalette } from '../../src/screens/desktop/desktop-shell/model/types';
import { SidebarSubItem } from './ui';

export function SidebarMenu({
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
  page,
  palette,
  section,
}: {
  // animation prop accepted but unused – CSS transitions handle it
  animation?: any;
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
  const showDevHealthItem = devHealthUnlocked || section === 'dev-health';
  const settingsSubmenuHeight = showDevHealthItem ? 96 : 52;

  const sidebarStyle: React.CSSProperties = {
    ...(styles.sidebar as React.CSSProperties),
    backgroundColor: palette.sidebar,
    width: isOpen ? 240 : 0,
    paddingLeft: isOpen ? 16 : 0,
    paddingRight: isOpen ? 16 : 0,
    paddingTop: isOpen ? 24 : 0,
    overflow: 'hidden',
    transition: 'width 220ms ease, padding 220ms ease',
    flexShrink: 0,
  };

  const contentStyle: React.CSSProperties = {
    opacity: isOpen ? 1 : 0,
    transform: isOpen ? 'translateX(0)' : 'translateX(-32px)',
    transition: 'opacity 180ms ease, transform 180ms ease',
    minWidth: 188,
  };

  const getTopLevelButtonStyle = (): React.CSSProperties => ({
    ...(styles.sidebarItem as React.CSSProperties),
    backgroundColor: palette.sidebarItem,
    color: palette.sidebarItemText,
    border: 'none',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
    display: 'flex',
    alignItems: 'center',
  });

  const getTopLevelTextStyle = (): React.CSSProperties => ({
    ...(styles.sidebarItemLabel as React.CSSProperties),
    color: palette.sidebarItemText,
    fontWeight: '500',
    opacity: 1,
  });

  const submenuStyle = (isExpanded: boolean, maxCollapsedHeight: number, maxExpandedHeight: number): React.CSSProperties => ({
    overflow: 'hidden',
    maxHeight: isExpanded ? `${maxExpandedHeight}px` : '0',
    opacity: isExpanded ? 1 : 0,
    transform: isExpanded ? 'translateY(0)' : 'translateY(-8px)',
    transition: 'max-height 180ms ease, opacity 180ms ease, transform 180ms ease',
    pointerEvents: isExpanded ? 'auto' : 'none',
  });

  const resetSettingsTapCount = () => {
    setSettingsTapCount(0);
  };

  const navigate = (nextPage: AppPage, nextSection: DesktopMenuSection) => {
    const staysOnSettingsTrigger =
      nextPage === 'settings' && nextSection === 'general';
    if (!staysOnSettingsTrigger) {
      resetSettingsTapCount();
    }
    onNavigate(nextPage, nextSection);
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
    <div style={sidebarStyle}>
      <div style={contentStyle}>
        {isOpen ? (
          <>
            <button
              onClick={handleSettingsPress}
              style={getTopLevelButtonStyle()}
            >
              <span style={getTopLevelTextStyle()}>{labels.settings}</span>
            </button>
            <div style={submenuStyle(settingsActive, 0, settingsSubmenuHeight)}>
              <div style={styles.sidebarSubmenu as React.CSSProperties}>
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
              </div>
            </div>

            <button
              onClick={() => navigate('account', 'login')}
              style={{
                ...getTopLevelButtonStyle(),
                ...(styles.sidebarItemSpaced as React.CSSProperties),
              }}
            >
              <span style={getTopLevelTextStyle()}>{myInfoLabel}</span>
            </button>
            <div style={submenuStyle(myInfoActive, 0, 52 + myInfoItemCount * 48)}>
              <div style={styles.sidebarSubmenu as React.CSSProperties}>
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
              </div>
            </div>

            {classroomItemCount > 0 ? (
              <>
                <button
                  onClick={() =>
                    navigate(
                      'account',
                      showTeacherReservationItem
                        ? 'reservation-view'
                        : showTeacherAccountItems
                        ? 'available-schedule'
                        : 'reservation',
                    )
                  }
                  style={{
                    ...getTopLevelButtonStyle(),
                    ...(styles.sidebarItemSpaced as React.CSSProperties),
                  }}
                >
                  <span style={getTopLevelTextStyle()}>{classroomLabel}</span>
                </button>
                <div style={submenuStyle(classroomActive, 0, 20 + classroomItemCount * 48)}>
                  <div style={styles.sidebarSubmenu as React.CSSProperties}>
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
                  </div>
                </div>
              </>
            ) : null}

            {adminMenuItemCount > 0 ? (
              <>
                <button
                  onClick={() =>
                    navigate(
                      showMembersPage ? 'members' : 'inventory',
                      showMembersPage ? 'pending-approval' : 'inventory-list',
                    )
                  }
                  style={{
                    ...getTopLevelButtonStyle(),
                    ...(styles.sidebarItemSpaced as React.CSSProperties),
                  }}
                >
                  <span style={getTopLevelTextStyle()}>{adminMenuLabel}</span>
                </button>
                <div style={submenuStyle(adminMenuActive, 0, 20 + adminMenuItemCount * 48)}>
                  <div style={styles.sidebarSubmenu as React.CSSProperties}>
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
                  </div>
                </div>
              </>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
