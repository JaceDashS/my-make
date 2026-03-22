import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {MembersHomeScreen} from '../../domains/members/MembersHomeScreen';
import {HealthCheckScreen} from '../../screens/dev/HealthCheckScreen';

export function AppNavigator() {
  const [route, setRoute] = React.useState<'members' | 'dev-health'>('members');
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <View style={[styles.switcher, {paddingTop: insets.top + 12}]}>
        <RouteButton
          isActive={route === 'members'}
          label="Members"
          onPress={() => setRoute('members')}
        />
        <RouteButton
          isActive={route === 'dev-health'}
          label="Dev Health"
          onPress={() => setRoute('dev-health')}
        />
      </View>
      <View style={styles.content}>
        {route === 'members' ? <MembersHomeScreen /> : <HealthCheckScreen />}
      </View>
    </View>
  );
}

type RouteButtonProps = {
  isActive: boolean;
  label: string;
  onPress: () => void;
};

function RouteButton({isActive, label, onPress}: RouteButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.routeButton, isActive ? styles.routeButtonActive : null]}>
      <Text
        style={[
          styles.routeButtonText,
          isActive ? styles.routeButtonTextActive : null,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#111827',
  },
  switcher: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#111827',
  },
  content: {
    flex: 1,
  },
  routeButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#1f2937',
  },
  routeButtonActive: {
    backgroundColor: '#f59e0b',
  },
  routeButtonText: {
    color: '#e5e7eb',
    fontSize: 13,
    fontWeight: '700',
  },
  routeButtonTextActive: {
    color: '#1f2937',
  },
});
