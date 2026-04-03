import React from 'react';

import { ActionButton } from './ActionButton';

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
      style={{ padding: 18, borderRadius: 22 }}
      textColor="#0b1f1a"
      hintStyle={{ fontSize: 13, lineHeight: '18px' }}
      titleStyle={{ fontSize: 18, fontWeight: '700' }}
    />
  );
}
