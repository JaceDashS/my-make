import React, {useEffect, useRef, useState} from 'react';
import {Animated, Pressable, Text, View} from 'react-native';

import type {AppPage} from '../../../shared/shell-model';
import {windowsPressableFocusProps} from '../../../../shared/ui/windowsFocusProps';
import {mobileShellStyles as styles} from '../config/styles';
import type {MobileMenuSection, MobileShellPalette} from '../model/types';

export function MenuPanel({
  currentPage,
  currentSection,
  labels,
  onSelectGroup,
  onSelectSection,
  palette,
}: {
  currentPage: AppPage;
  currentSection: MobileMenuSection;
  labels: {
    devHealth: string;
    general: string;
    login: string;
    signIn: string;
    settings: string;
  };
  onSelectGroup: (page: AppPage) => void;
  onSelectSection: (page: AppPage, section: MobileMenuSection) => void;
  palette: MobileShellPalette;
}) {
  const [expandedGroup, setExpandedGroup] = useState<'settings' | 'login' | null>(
    currentPage === 'settings' || currentPage === 'login' ? currentPage : null,
  );
  const settingsAnimation = useRef(
    new Animated.Value(currentPage === 'settings' ? 1 : 0),
  ).current;
  const loginAnimation = useRef(
    new Animated.Value(currentPage === 'login' ? 1 : 0),
  ).current;

  useEffect(() => {
    // 現在表示中のページに合わせて、対応するメニュー群だけを初期展開する。
    if (currentPage === 'settings' || currentPage === 'login') {
      setExpandedGroup(currentPage);
      return;
    }
    setExpandedGroup(null);
  }, [currentPage]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(settingsAnimation, {
        duration: 180,
        toValue: expandedGroup === 'settings' ? 1 : 0,
        useNativeDriver: false,
      }),
      Animated.timing(loginAnimation, {
        duration: 180,
        toValue: expandedGroup === 'login' ? 1 : 0,
        useNativeDriver: false,
      }),
    ]).start();
  }, [expandedGroup, loginAnimation, settingsAnimation]);

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

  return (
    <View style={[styles.menuSurface, {backgroundColor: palette.menuCard}]}>
      {/* モバイルは上部バーを残し、その下だけをメニュー領域として使う。 */}
      <Pressable
        {...windowsPressableFocusProps}
        onPress={() => onSelectGroup('settings')}
        style={[styles.overlayItem, {backgroundColor: palette.sidebarItem}]}>
        <Text style={getTopLevelTextStyle(currentPage === 'settings')}>
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
              outputRange: [0, 116],
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
          onPress={() => onSelectSection('settings', 'general')}
          style={styles.overlaySubItem}>
          <Text
            style={getSubItemTextStyle(
              currentPage === 'settings' && currentSection === 'general',
            )}>
            {labels.general}
          </Text>
        </Pressable>
        <Pressable
          {...windowsPressableFocusProps}
          onPress={() => onSelectSection('settings', 'dev-health')}
          style={styles.overlaySubItem}>
          <Text
            style={getSubItemTextStyle(
              currentPage === 'settings' && currentSection === 'dev-health',
            )}>
            {labels.devHealth}
          </Text>
        </Pressable>
      </Animated.View>
      <Pressable
        {...windowsPressableFocusProps}
        onPress={() => onSelectGroup('login')}
        style={[
          styles.overlayItem,
          styles.overlayItemSpaced,
          {backgroundColor: palette.sidebarItem},
        ]}>
        <Text style={getTopLevelTextStyle(currentPage === 'login')}>
          {labels.login}
        </Text>
      </Pressable>
      <Animated.View
        pointerEvents={expandedGroup === 'login' ? 'auto' : 'none'}
        style={[
          styles.overlaySubmenu,
          {
            opacity: loginAnimation,
            maxHeight: loginAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 58],
            }),
            transform: [
              {
                translateY: loginAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-8, 0],
                }),
              },
            ],
          },
        ]}>
        <Pressable
          {...windowsPressableFocusProps}
          onPress={() => onSelectSection('login', 'sign-in')}
          style={styles.overlaySubItem}>
          <Text
            style={getSubItemTextStyle(
              currentPage === 'login' && currentSection === 'sign-in',
            )}>
            {labels.signIn}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}
