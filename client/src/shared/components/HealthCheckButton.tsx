import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {windowsPressableFocusProps} from '../ui/windowsFocusProps';

type HealthCheckButtonProps = {
  hint: string;
  isLoading: boolean;
  label: string;
  onPress: () => void;
};

export function HealthCheckButton({
  hint,
  isLoading,
  label,
  onPress,
}: HealthCheckButtonProps) {
  return (
    <Pressable
      {...windowsPressableFocusProps}
      disabled={isLoading}
      onPress={onPress}
      style={({pressed}) => [
        styles.button,
        pressed && !isLoading ? styles.buttonPressed : null,
        isLoading ? styles.buttonDisabled : null,
      ]}>
      <View style={styles.buttonHeader}>
        <Text style={styles.buttonLabel}>{label}</Text>
        {isLoading ? (
          <ActivityIndicator color="#0b1f1a" size="small" />
        ) : null}
      </View>
      <Text style={styles.buttonHint}>{hint}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 18,
    borderRadius: 22,
    backgroundColor: '#b7e4c7',
  },
  buttonPressed: {
    opacity: 0.88,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  buttonLabel: {
    color: '#0b1f1a',
    fontSize: 18,
    fontWeight: '700',
  },
  buttonHint: {
    color: '#1b4332',
    fontSize: 13,
    lineHeight: 18,
  },
});
