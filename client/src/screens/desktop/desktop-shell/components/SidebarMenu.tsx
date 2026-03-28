import React, {useEffect, useRef} from 'react';
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
  labels,
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
  labels: {
    account: string;
    devHealth: string;
    general: string;
    login: string;
    members: string;
    pendingApproval: string;
    profile: string;
    register: string;
    settings: string;
  };
  onPageChange: (page: AppPage) => void;
  onSectionChange: (section: DesktopMenuSection) => void;
  page: AppPage;
  palette: DesktopShellPalette;
  section: DesktopMenuSection;
}) {
  const settingsAnimation = useRef(
    new Animated.Value(page === 'settings' ? 1 : 0),
  ).current;
  const accountAnimation = useRef(
    new Animated.Value(page === 'account' ? 1 : 0),
  ).current;
  const membersAnimation = useRef(
    new Animated.Value(page === 'members' ? 1 : 0),
  ).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(settingsAnimation, {
        duration: 180,
        toValue: page === 'settings' ? 1 : 0,
        useNativeDriver: false,
      }),
      Animated.timing(accountAnimation, {
        duration: 180,
        toValue: page === 'account' ? 1 : 0,
        useNativeDriver: false,
      }),
      Animated.timing(membersAnimation, {
        duration: 180,
        toValue: page === 'members' ? 1 : 0,
        useNativeDriver: false,
      }),
    ]).start();
  }, [accountAnimation, membersAnimation, page, settingsAnimation]);

  const getTopLevelTextStyle = () => [
    styles.sidebarItemLabel,
    {
      color: palette.sidebarItemText,
      fontWeight: '500' as const,
      opacity: 1,
    },
  ];

  return (
    <Animated.View
      pointerEvents={isOpen ? 'auto' : 'none'}
      style={[
        styles.sidebar,
        {
          backgroundColor: palette.sidebar,
          width: animation.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 220],
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
              onPress={() => onPageChange('settings')}
              style={[styles.sidebarItem, {backgroundColor: palette.sidebarItem}]}>
              <Text style={getTopLevelTextStyle()}>{labels.settings}</Text>
            </Pressable>
            {/* 設定配下の項目は同じサイドバー内で展開する。 */}
            <Animated.View
              pointerEvents={page === 'settings' ? 'auto' : 'none'}
              style={[
                styles.sidebarSubmenuAnimated,
                {
                  opacity: settingsAnimation,
                  maxHeight: settingsAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 96],
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
                  onPress={() => onSectionChange('general')}
                  palette={palette}
                />
                <SidebarSubItem
                  active={section === 'dev-health'}
                  label={labels.devHealth}
                  onPress={() => onSectionChange('dev-health')}
                  palette={palette}
                />
              </View>
            </Animated.View>
            <Pressable
              {...windowsPressableFocusProps}
              onPress={() => onPageChange('account')}
              style={[
                styles.sidebarItem,
                styles.sidebarItemSpaced,
                {backgroundColor: palette.sidebarItem},
              ]}>
              <Text style={getTopLevelTextStyle()}>{labels.account}</Text>
            </Pressable>
            <Animated.View
              pointerEvents={page === 'account' ? 'auto' : 'none'}
              style={[
                styles.sidebarSubmenuAnimated,
                {
                  opacity: accountAnimation,
                  maxHeight: accountAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 104],
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
                  onPress={() => onSectionChange('login')}
                  palette={palette}
                />
                {!isAuthenticated || disableConditionalVisibility ? (
                  <SidebarSubItem
                    active={section === 'register'}
                    label={labels.register}
                    onPress={() => onSectionChange('register')}
                    palette={palette}
                  />
                ) : null}
              </View>
            </Animated.View>
            <Pressable
              {...windowsPressableFocusProps}
              onPress={() => onPageChange('members')}
              style={[
                styles.sidebarItem,
                styles.sidebarItemSpaced,
                {backgroundColor: palette.sidebarItem},
            ]}>
              <Text style={getTopLevelTextStyle()}>{labels.members}</Text>
            </Pressable>
            <Animated.View
              pointerEvents={page === 'members' ? 'auto' : 'none'}
              style={[
                styles.sidebarSubmenuAnimated,
                {
                  opacity: membersAnimation,
                  maxHeight: membersAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 64],
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
                <SidebarSubItem
                  active={section === 'pending-approval'}
                  label={labels.pendingApproval}
                  onPress={() => onSectionChange('pending-approval')}
                  palette={palette}
                />
              </View>
            </Animated.View>
          </>
        ) : null}
      </Animated.View>
    </Animated.View>
  );
}
