import React from 'react';
import {Pressable, ScrollView, Text, View} from 'react-native';

import {RUNTIME_CONFIG} from '../../../../../config/runtime/runtime-config';
import {HealthCheckButton} from '../../../../../shared/components/HealthCheckButton';
import {getHealthCheckCandidates, type HealthCheckTarget} from '../../../../../shared/lib/healthCheck';
import {windowsPressableFocusProps} from '../../../../../shared/ui/windowsFocusProps';
import type {TargetState} from '../../../../shared/shell-model';
import {BodyStrong, BodyText, Card} from '../../components/ui';
import {mobileShellStyles as styles} from '../../config/styles';
import type {MobileShellPalette} from '../../model/types';

export function DevHealthSection({
  labels,
  loadingTarget,
  onRunAll,
  onRunTarget,
  palette,
  targetStates,
}: {
  labels: {
    allChecks: string;
    allChecksHint: string;
    cloud: string;
    devHealth: string;
    devHealthBody: string;
    docker: string;
    env: string;
    lastChecked: string;
    local: string;
    result: string;
  };
  loadingTarget: HealthCheckTarget | null;
  onRunAll: () => Promise<void>;
  onRunTarget: (target: HealthCheckTarget) => Promise<void>;
  palette: MobileShellPalette;
  targetStates: Record<HealthCheckTarget, TargetState>;
}) {
  const resetTargetMessage = (target: HealthCheckTarget) => {
    if (target === 'local') {
      return `${labels.local}: ready`;
    }
    if (target === 'docker') {
      return `${labels.docker}: ready`;
    }
    return `${labels.cloud}: ready`;
  };

  return (
    <ScrollView contentContainerStyle={styles.stack}>
      <Card palette={palette} title={labels.devHealth}>
        <BodyText palette={palette}>{labels.devHealthBody}</BodyText>
        <BodyStrong palette={palette}>
          {labels.env}: {RUNTIME_CONFIG.APP_ENV} / Host: {RUNTIME_CONFIG.DEV_HOST_IP}
        </BodyStrong>
      </Card>
      <Pressable
        {...windowsPressableFocusProps}
        onPress={() => {
          onRunAll().catch(() => undefined);
        }}
        style={[styles.primaryAction, {backgroundColor: palette.primary}]}>
        <Text style={[styles.primaryActionTitle, {color: palette.primaryText}]}>
          {labels.allChecks}
        </Text>
        <Text style={[styles.primaryActionHint, {color: palette.primaryText}]}>
          {labels.allChecksHint}
        </Text>
      </Pressable>
      {([
        ['local', labels.local],
        ['docker', labels.docker],
        ['render', labels.cloud],
      ] as const).map(([target, title]) => {
        const state = targetStates[target];
        const candidates = getHealthCheckCandidates(target);
        const result = state.result;

        return (
          <Card key={target} palette={palette} title={title}>
            <HealthCheckButton
              hint={candidates.join(' -> ')}
              isLoading={loadingTarget === target}
              label={title}
              onPress={() => {
                onRunTarget(target).catch(() => undefined);
              }}
            />
            <View style={[styles.resultPanel, {backgroundColor: palette.soft}]}>
              <Text style={[styles.resultLabel, {color: palette.primary}]}>
                {labels.result}
              </Text>
              <BodyText palette={palette}>
                {state.message || resetTargetMessage(target)}
              </BodyText>
              <Text style={[styles.metaText, {color: palette.textMuted}]}>
                {labels.lastChecked}: {state.checkedAt ?? 'Not yet'}
              </Text>
              <Text style={[styles.metaText, {color: palette.textMuted}]}>
                {result?.ok
                  ? `URL: ${result.url}\nStatus: ${result.status}`
                  : `Candidates: ${candidates.join(', ')}`}
              </Text>
            </View>
          </Card>
        );
      })}
    </ScrollView>
  );
}
