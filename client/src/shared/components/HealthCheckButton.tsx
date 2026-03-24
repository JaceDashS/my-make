import React from 'react';
import {StyleSheet} from 'react-native';

import {ActionButton} from './ActionButton';

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
    <ActionButton
      backgroundColor="#b7e4c7"
      hint={hint}
      isLoading={isLoading}
      label={label}
      onPress={onPress}
      style={styles.button}
      textColor="#0b1f1a"
      hintStyle={styles.buttonHint}
      titleStyle={styles.buttonLabel}
    />
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 18,
    borderRadius: 22,
  },
  buttonLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  buttonHint: {
    fontSize: 13,
    lineHeight: 18,
  },
});
