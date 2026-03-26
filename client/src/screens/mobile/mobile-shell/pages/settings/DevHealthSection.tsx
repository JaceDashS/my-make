import React, {useState} from 'react';
import {Alert, ScrollView, Text, View} from 'react-native';

import {RUNTIME_CONFIG} from '../../../../../config/runtime/runtime-config';
import {ActionButton} from '../../../../../shared/components/ActionButton';
import {HealthCheckButton} from '../../../../../shared/components/HealthCheckButton';
import {copyText} from '../../../../../shared/lib/clipboard';
import {createLicense, initializeTables, type DevToolsResult} from '../../../../../shared/lib/devTools';
import {getHealthCheckCandidates, type HealthCheckTarget} from '../../../../../shared/lib/healthCheck';
import type {TargetState} from '../../../../shared/shell-model';
import {BodyStrong, BodyText, Card} from '../../components/ui';
import {mobileShellStyles as styles} from '../../config/styles';
import type {MobileShellPalette} from '../../model/types';

export function DevHealthSection({
  labels,
  loadingTarget,
  onRunAll,
  onRunTarget,
  onToggleUnmountLoginContainer,
  onToggleUnmountProfileContainer,
  palette,
  targetStates,
  unmountLoginContainer,
  unmountProfileContainer,
}: {
  labels: {
    allChecks: string;
    allChecksHint: string;
    cloud: string;
    copyLicenseCode: string;
    devHealth: string;
    devHealthBody: string;
    devLicenseCreate: string;
    devLicenseCreateHint: string;
    devUnmountLoginContainer: string;
    devUnmountLoginContainerHint: string;
    devUnmountProfileContainer: string;
    devUnmountProfileContainerHint: string;
    devResult: string;
    devTableInit: string;
    devTableInitHint: string;
    docker: string;
    env: string;
    lastChecked: string;
    local: string;
    result: string;
  };
  loadingTarget: HealthCheckTarget | null;
  onRunAll: () => Promise<void>;
  onRunTarget: (target: HealthCheckTarget) => Promise<void>;
  onToggleUnmountLoginContainer: () => void;
  onToggleUnmountProfileContainer: () => void;
  palette: MobileShellPalette;
  targetStates: Record<HealthCheckTarget, TargetState>;
  unmountLoginContainer: boolean;
  unmountProfileContainer: boolean;
}) {
  const [actionResult, setActionResult] = useState<DevToolsResult | null>(null);
  const [loadingAction, setLoadingAction] = useState<'tables' | 'license' | null>(
    null,
  );
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  const resetTargetMessage = (target: HealthCheckTarget) => {
    if (target === 'local') {
      return `${labels.local}: ready`;
    }
    if (target === 'docker') {
      return `${labels.docker}: ready`;
    }
    return `${labels.cloud}: ready`;
  };

  const runDeveloperAction = async (
    action: 'tables' | 'license',
    runner: () => Promise<DevToolsResult>,
  ) => {
    setLoadingAction(action);
    setCopyMessage(null);
    const result = await runner();
    setActionResult(result);
    setLoadingAction(null);
  };

  const copyLicenseCode = async (licenseCode: string) => {
    if (!copyText(licenseCode)) {
      setCopyMessage('Copy is not available on this device.');
      Alert.alert('Copy unavailable', 'Copy is not available on this device.');
      return;
    }

    setCopyMessage('License code copied.');
  };

  return (
    <ScrollView contentContainerStyle={styles.stack}>
      <Card palette={palette} title={labels.devHealth}>
        <BodyText palette={palette}>{labels.devHealthBody}</BodyText>
        <BodyStrong palette={palette}>
          {labels.env}: {RUNTIME_CONFIG.APP_ENV} / Host: {RUNTIME_CONFIG.DEV_HOST_IP}
        </BodyStrong>
      </Card>
      <ActionButton
        backgroundColor={unmountLoginContainer ? palette.primary : palette.soft}
        hint={labels.devUnmountLoginContainerHint}
        label={labels.devUnmountLoginContainer}
        onPress={onToggleUnmountLoginContainer}
        style={styles.primaryAction}
        textColor={unmountLoginContainer ? palette.primaryText : palette.text}
        hintStyle={styles.primaryActionHint}
        titleStyle={styles.primaryActionTitle}
      />
      <ActionButton
        backgroundColor={unmountProfileContainer ? palette.primary : palette.soft}
        hint={labels.devUnmountProfileContainerHint}
        label={labels.devUnmountProfileContainer}
        onPress={onToggleUnmountProfileContainer}
        style={styles.primaryAction}
        textColor={unmountProfileContainer ? palette.primaryText : palette.text}
        hintStyle={styles.primaryActionHint}
        titleStyle={styles.primaryActionTitle}
      />
      <ActionButton
        backgroundColor={palette.primary}
        hint={labels.devTableInitHint}
        isLoading={loadingAction === 'tables'}
        label={labels.devTableInit}
        onPress={() => {
          runDeveloperAction('tables', initializeTables).catch(() => undefined);
        }}
        style={styles.primaryAction}
        textColor={palette.primaryText}
        hintStyle={styles.primaryActionHint}
        titleStyle={styles.primaryActionTitle}
      />
      <ActionButton
        backgroundColor={palette.soft}
        hint={labels.devLicenseCreateHint}
        isLoading={loadingAction === 'license'}
        label={labels.devLicenseCreate}
        onPress={() => {
          runDeveloperAction('license', createLicense).catch(() => undefined);
        }}
        style={styles.primaryAction}
        textColor={palette.text}
        hintStyle={styles.primaryActionHint}
        titleStyle={styles.primaryActionTitle}
      />
      {actionResult ? (
        <Card palette={palette} title={labels.devResult}>
          <BodyStrong palette={palette}>{actionResult.message}</BodyStrong>
          {actionResult.licenseCode ? (
            <>
              <BodyText palette={palette}>License Code: {actionResult.licenseCode}</BodyText>
              <View style={styles.optionRow}>
                <ActionButton
                  backgroundColor={palette.soft}
                  label={labels.copyLicenseCode}
                  onPress={() => {
                    copyLicenseCode(actionResult.licenseCode ?? '').catch(
                      () => undefined,
                    );
                  }}
                  style={styles.actionButton}
                  textColor={palette.text}
                  titleStyle={styles.actionText}
                />
              </View>
              {copyMessage ? (
                <BodyText palette={palette}>{copyMessage}</BodyText>
              ) : null}
            </>
          ) : null}
          {actionResult.expiresAt ? (
            <BodyText palette={palette}>Expires At: {actionResult.expiresAt}</BodyText>
          ) : null}
          {actionResult.migrations?.length ? (
            <BodyText palette={palette}>
              Migrations: {actionResult.migrations.join(', ')}
            </BodyText>
          ) : null}
          {actionResult.error ? (
            <Text style={styles.errorText}>
              {actionResult.error}
            </Text>
          ) : null}
        </Card>
      ) : null}
      <ActionButton
        backgroundColor={palette.primary}
        hint={labels.allChecksHint}
        label={labels.allChecks}
        onPress={() => {
          onRunAll().catch(() => undefined);
        }}
        style={styles.primaryAction}
        textColor={palette.primaryText}
        hintStyle={styles.primaryActionHint}
        titleStyle={styles.primaryActionTitle}
      />
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
              {!result?.ok && result?.error ? (
                <Text style={styles.errorText}>
                  {result.error}
                </Text>
              ) : null}
            </View>
          </Card>
        );
      })}
    </ScrollView>
  );
}
