import React, { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  resetRuntimeConfigOverride,
  RUNTIME_CONFIG,
  setRuntimeConfigOverride,
} from '../../../../../config/runtime/runtime-config';
import { ActionButton } from '../../../../../shared/components/ActionButton';
import { HealthCheckButton } from '../../../../../shared/components/HealthCheckButton';
import { copyText } from '../../../../../shared/lib/clipboard';
import { useRuntimeConfig } from '../../../../../shared/lib/useRuntimeConfig';
import {
  createLicense,
  emitServerLog,
  initializeAndInjectTestData,
  initializeTables,
  type DevToolsResult,
} from '../../../../../shared/lib/devTools';
import {
  buildCustomHealthCheckUrl,
  getHealthCheckCandidates,
  runCustomHealthCheck,
  type HealthCheckResult,
  type HealthCheckTarget,
} from '../../../../../shared/lib/healthCheck';
import type { TargetState } from '../../../../shared/shell-model';
import { BodyStrong, BodyText, Card } from '../../components/ui';
import { mobileShellStyles as styles } from '../../config/styles';
import type { MobileShellPalette } from '../../model/types';

export function DevHealthSection({
  labels,
  loadingTarget,
  onRunAll,
  onRunTarget,
  onToggleShowStudentSkinPreview,
  palette,
  showStudentSkinPreview,
  targetStates,
}: {
  labels: {
    allChecks: string;
    allChecksHint: string;
    cloud: string;
    copyLicenseCode: string;
    devClientLog: string;
    devClientLogHint: string;
    devHealth: string;
    devHealthBody: string;
    devLicenseCreate: string;
    devLicenseCreateHint: string;
    devServerLog: string;
    devServerLogHint: string;
    devShowStudentSkinPreview: string;
    devShowStudentSkinPreviewHint: string;
    devResult: string;
    devTableInit: string;
    devTableInitHint: string;
    devTableInitAndSeed: string;
    devTableInitAndSeedHint: string;
    docker: string;
    env: string;
    lastChecked: string;
    local: string;
    licenseCode: string;
    result: string;
    academyName: string;
    rootLoginId: string;
    seedPasswordHint: string;
    memberRoleStudent: string;
    memberRoleTeacher: string;
    memberRoleAdmin: string;
  };
  loadingTarget: HealthCheckTarget | null;
  onRunAll: () => Promise<void>;
  onRunTarget: (target: HealthCheckTarget) => Promise<void>;
  onToggleShowStudentSkinPreview: () => void;
  palette: MobileShellPalette;
  showStudentSkinPreview: boolean;
  targetStates: Record<HealthCheckTarget, TargetState>;
}) {
  const [actionResult, setActionResult] = useState<DevToolsResult | null>(null);
  const [loadingAction, setLoadingAction] = useState<
    'tables' | 'seed' | 'license' | 'server-log' | null
  >(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [devHostIpDraft, setDevHostIpDraft] = useState('');
  const [localPortDraft, setLocalPortDraft] = useState('');
  const [dockerPortDraft, setDockerPortDraft] = useState('');
  const [renderBaseUrlDraft, setRenderBaseUrlDraft] = useState('');
  const [runtimeConfigMessage, setRuntimeConfigMessage] = useState<string | null>(
    null,
  );
  const [customHealthCheckResult, setCustomHealthCheckResult] =
    useState<HealthCheckResult | null>(null);
  const [customHealthCheckMessage, setCustomHealthCheckMessage] = useState(
    'Custom base URL health check is ready.',
  );
  const [customHealthCheckLoading, setCustomHealthCheckLoading] = useState(false);
  const {runtimeConfig, runtimeConfigBase, runtimeConfigOverride} =
    useRuntimeConfig();

  useEffect(() => {
    setDevHostIpDraft(runtimeConfig.DEV_HOST_IP);
    setLocalPortDraft(runtimeConfig.CLIENT_LOCAL_PORT);
    setDockerPortDraft(runtimeConfig.CLIENT_DOCKER_PORT);
    setRenderBaseUrlDraft(runtimeConfig.CLIENT_RENDER_BASE_URL);
  }, [
    runtimeConfig.CLIENT_DOCKER_PORT,
    runtimeConfig.CLIENT_LOCAL_PORT,
    runtimeConfig.CLIENT_RENDER_BASE_URL,
    runtimeConfig.DEV_HOST_IP,
  ]);

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
    action: 'tables' | 'seed' | 'license' | 'server-log',
    runner: () => Promise<DevToolsResult>,
  ) => {
    setLoadingAction(action);
    setCopyMessage(null);
    try {
      const result = await runner();
      setActionResult(result);
    } finally {
      setLoadingAction(null);
    }
  };

  const copyLicenseCode = async (licenseCode: string) => {
    if (!copyText(licenseCode)) {
      setCopyMessage('Copy is not available on this device.');
      Alert.alert('Copy unavailable', 'Copy is not available on this device.');
      return;
    }

    setCopyMessage('License code copied.');
  };

  const triggerClientLog = () => {
    const triggeredAt = new Date().toISOString();

    console.log('[dev-client-log]', {
      env: RUNTIME_CONFIG.APP_ENV,
      host: RUNTIME_CONFIG.DEV_HOST_IP,
      platform: Platform.OS,
      triggeredAt,
    });

    setCopyMessage(null);
    setActionResult({
      message: `Client log emitted at ${triggeredAt}.`,
      status: 'success',
    });
  };

  const localBaseUrl = `http://${runtimeConfig.DEV_HOST_IP}:${runtimeConfig.CLIENT_LOCAL_PORT}`;
  const dockerBaseUrl = `http://${runtimeConfig.DEV_HOST_IP}:${runtimeConfig.CLIENT_DOCKER_PORT}`;
  const renderHealthUrl = `${runtimeConfig.CLIENT_RENDER_BASE_URL}${runtimeConfig.CLIENT_HEALTH_PATH}`;

  const applyRenderBaseUrl = () => {
    const nextDevHostIp = devHostIpDraft.trim();
    const nextLocalPort = localPortDraft.trim();
    const nextDockerPort = dockerPortDraft.trim();
    const nextRenderBaseUrl = renderBaseUrlDraft.trim();

    if (!nextDevHostIp || !nextLocalPort || !nextDockerPort || !nextRenderBaseUrl) {
      resetRuntimeConfigOverride();
      setDevHostIpDraft(runtimeConfigBase.DEV_HOST_IP);
      setLocalPortDraft(runtimeConfigBase.CLIENT_LOCAL_PORT);
      setDockerPortDraft(runtimeConfigBase.CLIENT_DOCKER_PORT);
      setRenderBaseUrlDraft(runtimeConfigBase.CLIENT_RENDER_BASE_URL);
      setRuntimeConfigMessage(
        'Runtime config reset because one or more fields were empty.',
      );
      return;
    }

    setRuntimeConfigOverride({
      DEV_HOST_IP: nextDevHostIp,
      CLIENT_LOCAL_PORT: nextLocalPort,
      CLIENT_DOCKER_PORT: nextDockerPort,
      CLIENT_RENDER_BASE_URL: nextRenderBaseUrl,
    });
    setRuntimeConfigMessage('Runtime config override applied.');
  };

  const resetRenderBaseUrl = () => {
    resetRuntimeConfigOverride();
    setDevHostIpDraft(runtimeConfigBase.DEV_HOST_IP);
    setLocalPortDraft(runtimeConfigBase.CLIENT_LOCAL_PORT);
    setDockerPortDraft(runtimeConfigBase.CLIENT_DOCKER_PORT);
    setRenderBaseUrlDraft(runtimeConfigBase.CLIENT_RENDER_BASE_URL);
    setRuntimeConfigMessage('Runtime config reset to the injected values.');
  };

  const runCustomBaseUrlHealthCheck = async () => {
    const targetBaseUrl = renderBaseUrlDraft.trim();

    if (!targetBaseUrl) {
      setCustomHealthCheckResult(null);
      setCustomHealthCheckMessage('Enter a custom base URL first.');
      return;
    }

    setCustomHealthCheckLoading(true);
    setCustomHealthCheckMessage(
      `Checking ${buildCustomHealthCheckUrl(targetBaseUrl)} ...`,
    );

    try {
      const result = await runCustomHealthCheck(targetBaseUrl);
      setCustomHealthCheckResult(result);
      setCustomHealthCheckMessage(
        result.ok ? 'Custom base URL is reachable.' : 'Custom base URL check failed.',
      );
    } finally {
      setCustomHealthCheckLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.stack}>
      <Card palette={palette} title={labels.devHealth}>
        <BodyText palette={palette}>{labels.devHealthBody}</BodyText>
        <BodyStrong palette={palette}>
          {labels.env}: {RUNTIME_CONFIG.APP_ENV} / Host:{' '}
          {RUNTIME_CONFIG.DEV_HOST_IP}
        </BodyStrong>
        <View
          style={[
            styles.resultPanel,
            {backgroundColor: palette.soft, marginTop: 12},
          ]}>
          <Text style={[styles.resultLabel, {color: palette.primary}]}>
            Runtime Config
          </Text>
          <BodyText palette={palette}>
            APP_ENV={runtimeConfig.APP_ENV}
            {'\n'}
            DEV_HOST_IP={runtimeConfig.DEV_HOST_IP}
            {'\n'}
            CLIENT_LOCAL_PORT={runtimeConfig.CLIENT_LOCAL_PORT}
            {'\n'}
            CLIENT_DOCKER_PORT={runtimeConfig.CLIENT_DOCKER_PORT}
            {'\n'}
            CLIENT_HEALTH_PATH={runtimeConfig.CLIENT_HEALTH_PATH}
            {'\n'}
            CLIENT_RENDER_BASE_URL={runtimeConfig.CLIENT_RENDER_BASE_URL}
          </BodyText>
          <Text style={[styles.metaText, {color: palette.textMuted}]}>
            Injected cloud base URL: {runtimeConfigBase.CLIENT_RENDER_BASE_URL}
            {'\n'}
            Override active:{' '}
            {Object.keys(runtimeConfigOverride).length > 0 ? 'yes' : 'no'}
            {'\n'}
            Local base URL: {localBaseUrl}
            {'\n'}
            Docker base URL: {dockerBaseUrl}
            {'\n'}
            Cloud health URL: {renderHealthUrl}
          </Text>
          <Text style={[styles.fieldLabel, {color: palette.text}]}>
            Dev Host IP
          </Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={value => {
              setDevHostIpDraft(value);
              setRuntimeConfigMessage(null);
            }}
            placeholder="192.168.1.2"
            placeholderTextColor={palette.textMuted}
            style={[
              styles.input,
              {
                backgroundColor: palette.card,
                borderColor: palette.border,
                color: palette.text,
              },
            ]}
            value={devHostIpDraft}
          />
          <Text style={[styles.fieldLabel, {color: palette.text}]}>
            Local API Port
          </Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="number-pad"
            onChangeText={value => {
              setLocalPortDraft(value);
              setRuntimeConfigMessage(null);
            }}
            placeholder="8080"
            placeholderTextColor={palette.textMuted}
            style={[
              styles.input,
              {
                backgroundColor: palette.card,
                borderColor: palette.border,
                color: palette.text,
              },
            ]}
            value={localPortDraft}
          />
          <Text style={[styles.fieldLabel, {color: palette.text}]}>
            Docker API Port
          </Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="number-pad"
            onChangeText={value => {
              setDockerPortDraft(value);
              setRuntimeConfigMessage(null);
            }}
            placeholder="18080"
            placeholderTextColor={palette.textMuted}
            style={[
              styles.input,
              {
                backgroundColor: palette.card,
                borderColor: palette.border,
                color: palette.text,
              },
            ]}
            value={dockerPortDraft}
          />
          <Text style={[styles.fieldLabel, {color: palette.text}]}>
            Cloud Base URL
          </Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={value => {
              setRenderBaseUrlDraft(value);
              setRuntimeConfigMessage(null);
            }}
            placeholder="https://your-render-service.onrender.com"
            placeholderTextColor={palette.textMuted}
            style={[
              styles.input,
              {
                backgroundColor: palette.card,
                borderColor: palette.border,
                color: palette.text,
              },
            ]}
            value={renderBaseUrlDraft}
          />
          <View style={styles.optionRow}>
            <ActionButton
              backgroundColor={palette.primary}
              label="Apply Base URL"
              onPress={applyRenderBaseUrl}
              style={styles.actionButton}
              textColor={palette.primaryText}
              titleStyle={styles.actionText}
            />
            <ActionButton
              backgroundColor={palette.soft}
              label="Reset Base URL"
              onPress={resetRenderBaseUrl}
              style={styles.actionButton}
              textColor={palette.text}
              titleStyle={styles.actionText}
            />
            <ActionButton
              backgroundColor={palette.soft}
              isLoading={customHealthCheckLoading}
              label="Check Custom URL"
              onPress={() => {
                runCustomBaseUrlHealthCheck().catch(() => undefined);
              }}
              style={styles.actionButton}
              textColor={palette.text}
              titleStyle={styles.actionText}
            />
          </View>
          {runtimeConfigMessage ? (
            <BodyText palette={palette}>{runtimeConfigMessage}</BodyText>
          ) : null}
          <View
            style={[
              styles.resultPanel,
              {backgroundColor: palette.card, marginTop: 12},
            ]}>
            <Text style={[styles.resultLabel, {color: palette.primary}]}>
              Custom Base URL Health
            </Text>
            <BodyText palette={palette}>{customHealthCheckMessage}</BodyText>
            <Text style={[styles.metaText, {color: palette.textMuted}]}>
              Target: {buildCustomHealthCheckUrl(renderBaseUrlDraft || runtimeConfig.CLIENT_RENDER_BASE_URL)}
            </Text>
            <Text style={[styles.metaText, {color: palette.textMuted}]}>
              {customHealthCheckResult?.ok
                ? `URL: ${customHealthCheckResult.url}\nStatus: ${customHealthCheckResult.status}`
                : `Candidates: ${
                    customHealthCheckResult?.candidates.join(', ') ||
                    buildCustomHealthCheckUrl(
                      renderBaseUrlDraft || runtimeConfig.CLIENT_RENDER_BASE_URL,
                    )
                  }`}
            </Text>
            {!customHealthCheckResult?.ok && customHealthCheckResult?.error ? (
              <Text style={styles.errorText}>{customHealthCheckResult.error}</Text>
            ) : null}
          </View>
        </View>
        <Pressable
          onPress={onToggleShowStudentSkinPreview}
          style={{flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12}}>
          <View
            style={{
              width: 18,
              height: 18,
              borderRadius: 4,
              borderWidth: 1,
              borderColor: showStudentSkinPreview ? palette.primary : palette.border,
              backgroundColor: showStudentSkinPreview ? palette.primary : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            {showStudentSkinPreview && (
              <Text style={{fontSize: 11, color: palette.primaryText, lineHeight: 16}}>✓</Text>
            )}
          </View>
          <View style={{flex: 1}}>
            <Text style={{fontSize: 13, fontWeight: '600', color: palette.text}}>
              {labels.devShowStudentSkinPreview}
            </Text>
            <Text style={{fontSize: 12, color: palette.textMuted}}>
              {labels.devShowStudentSkinPreviewHint}
            </Text>
          </View>
        </Pressable>
      </Card>
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
        hint={labels.devTableInitAndSeedHint}
        isLoading={loadingAction === 'seed'}
        label={labels.devTableInitAndSeed}
        onPress={() => {
          runDeveloperAction('seed', initializeAndInjectTestData).catch(
            () => undefined,
          );
        }}
        style={styles.primaryAction}
        textColor={palette.text}
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
      <ActionButton
        backgroundColor={palette.soft}
        hint={labels.devClientLogHint}
        label={labels.devClientLog}
        onPress={triggerClientLog}
        style={styles.primaryAction}
        textColor={palette.text}
        hintStyle={styles.primaryActionHint}
        titleStyle={styles.primaryActionTitle}
      />
      <ActionButton
        backgroundColor={palette.soft}
        hint={labels.devServerLogHint}
        isLoading={loadingAction === 'server-log'}
        label={labels.devServerLog}
        onPress={() => {
          runDeveloperAction('server-log', emitServerLog).catch(() => undefined);
        }}
        style={styles.primaryAction}
        textColor={palette.text}
        hintStyle={styles.primaryActionHint}
        titleStyle={styles.primaryActionTitle}
      />
      {actionResult ? (
        <Card palette={palette} title={labels.devResult}>
          <BodyStrong palette={palette}>{actionResult.message}</BodyStrong>
          {actionResult.academyName ? (
            <BodyText palette={palette}>
              {labels.academyName}: {actionResult.academyName}
            </BodyText>
          ) : null}
          {actionResult.rootLoginId ? (
            <BodyText palette={palette}>
              {labels.rootLoginId}: {actionResult.rootLoginId}
            </BodyText>
          ) : null}
          {actionResult.seedPasswordHint ? (
            <BodyText palette={palette}>
              {labels.seedPasswordHint}: {actionResult.seedPasswordHint}
            </BodyText>
          ) : null}
          {actionResult.licenseCode ? (
            <>
              <BodyText palette={palette}>
                {labels.licenseCode}: {actionResult.licenseCode}
              </BodyText>
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
            <BodyText palette={palette}>
              Expires At: {actionResult.expiresAt}
            </BodyText>
          ) : null}
          {actionResult.pendingStudents != null ? (
            <BodyText palette={palette}>
              {labels.memberRoleStudent}: {actionResult.pendingStudents}
            </BodyText>
          ) : null}
          {actionResult.pendingTeachers != null ? (
            <BodyText palette={palette}>
              {labels.memberRoleTeacher}: {actionResult.pendingTeachers}
            </BodyText>
          ) : null}
          {actionResult.pendingAdmins != null ? (
            <BodyText palette={palette}>
              {labels.memberRoleAdmin}: {actionResult.pendingAdmins}
            </BodyText>
          ) : null}
          {actionResult.migrations?.length ? (
            <BodyText palette={palette}>
              Migrations: {actionResult.migrations.join(', ')}
            </BodyText>
          ) : null}
          {actionResult.error ? (
            <Text style={styles.errorText}>{actionResult.error}</Text>
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
      {(
        [
          ['local', labels.local],
          ['docker', labels.docker],
          ['render', labels.cloud],
        ] as const
      ).map(([target, title]) => {
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
            <View
              style={[styles.resultPanel, { backgroundColor: palette.soft }]}
            >
              <Text style={[styles.resultLabel, { color: palette.primary }]}>
                {labels.result}
              </Text>
              <BodyText palette={palette}>
                {state.message || resetTargetMessage(target)}
              </BodyText>
              <Text style={[styles.metaText, { color: palette.textMuted }]}>
                {labels.lastChecked}: {state.checkedAt ?? 'Not yet'}
              </Text>
              <Text style={[styles.metaText, { color: palette.textMuted }]}>
                {result?.ok
                  ? `URL: ${result.url}\nStatus: ${result.status}`
                  : `Candidates: ${candidates.join(', ')}`}
              </Text>
              {!result?.ok && result?.error ? (
                <Text style={styles.errorText}>{result.error}</Text>
              ) : null}
            </View>
          </Card>
        );
      })}
    </ScrollView>
  );
}
