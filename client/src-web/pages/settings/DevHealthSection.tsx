import React, { useEffect, useState } from 'react';

import {
  resetRuntimeConfigOverride,
  RUNTIME_CONFIG,
  setRuntimeConfigOverride,
} from '../../../src/config/runtime/runtime-config';
import { ActionButton } from '../../components/ActionButton';
import { HealthCheckButton } from '../../components/HealthCheckButton';
import { copyText } from '../../lib/clipboard';
import {
  createLicense,
  emitServerLog,
  initializeAndInjectTestData,
  initializeTables,
  type DevToolsResult,
} from '../../../src/shared/lib/devTools';
import {
  buildCustomHealthCheckUrl,
  getHealthCheckCandidates,
  runCustomHealthCheck,
  type HealthCheckResult,
  type HealthCheckTarget,
} from '../../../src/shared/lib/healthCheck';
import { useRuntimeConfig } from '../../../src/shared/lib/useRuntimeConfig';
import type { TargetState } from '../../../src/screens/shared/shell-model';
import { BodyStrong, BodyText, Card } from '../../components/ui';
import { desktopShellStyles as styles } from '../../../src/screens/desktop/desktop-shell/config/styles';
import type { DesktopShellPalette } from '../../../src/screens/desktop/desktop-shell/model/types';

export function DevHealthSection({
  disableConditionalVisibility,
  unmountLoginContainer,
  unmountProfileContainer,
  showStudentSkinPreview,
  labels,
  loadingTarget,
  onRunAll,
  onRunTarget,
  onToggleDisableConditionalVisibility,
  onToggleUnmountLoginContainer,
  onToggleUnmountProfileContainer,
  onToggleShowStudentSkinPreview,
  palette,
  targetStates,
}: {
  disableConditionalVisibility: boolean;
  unmountLoginContainer: boolean;
  unmountProfileContainer: boolean;
  labels: {
    allChecks: string;
    allChecksHint: string;
    cloud: string;
    copyLicenseCode: string;
    devClientLog: string;
    devClientLogHint: string;
    devServerLog: string;
    devServerLogHint: string;
    devShowStudentSkinPreview: string;
    devShowStudentSkinPreviewHint: string;
    devDisableConditionalVisibility: string;
    devDisableConditionalVisibilityHint: string;
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
    memberRoleStudent: string;
    memberRoleTeacher: string;
    memberRoleAdmin: string;
  };
  loadingTarget: HealthCheckTarget | null;
  onRunAll: () => Promise<void>;
  onRunTarget: (target: HealthCheckTarget) => Promise<void>;
  onToggleDisableConditionalVisibility: () => void;
  onToggleUnmountLoginContainer: () => void;
  onToggleUnmountProfileContainer: () => void;
  onToggleShowStudentSkinPreview: () => void;
  showStudentSkinPreview: boolean;
  palette: DesktopShellPalette;
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
  const [runtimeConfigMessage, setRuntimeConfigMessage] = useState<string | null>(null);
  const [customHealthCheckResult, setCustomHealthCheckResult] =
    useState<HealthCheckResult | null>(null);
  const [customHealthCheckMessage, setCustomHealthCheckMessage] = useState(
    'Custom base URL health check is ready.',
  );
  const [customHealthCheckLoading, setCustomHealthCheckLoading] = useState(false);
  const {runtimeConfig, runtimeConfigBase, runtimeConfigOverride} = useRuntimeConfig();

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
    if (target === 'local') return `${labels.local}: ready`;
    if (target === 'docker') return `${labels.docker}: ready`;
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
    try {
      await copyText(licenseCode);
      setCopyMessage('License code copied.');
    } catch {
      setCopyMessage('Copy is not available on this device.');
      window.alert('Copy unavailable — copy is not available on this device.');
    }
  };

  const triggerClientLog = () => {
    const triggeredAt = new Date().toISOString();
    console.log('[dev-client-log]', {
      env: RUNTIME_CONFIG.APP_ENV,
      host: RUNTIME_CONFIG.DEV_HOST_IP,
      platform: 'web',
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

  const checkboxRowStyle: React.CSSProperties = {
    ...(styles.checkboxRow as React.CSSProperties),
    cursor: 'pointer',
    border: 'none',
    background: 'none',
    textAlign: 'left',
    width: '100%',
    display: 'flex',
  };

  function Checkbox({
    checked,
    onToggle,
    title,
    hint,
  }: {
    checked: boolean;
    onToggle: () => void;
    title: string;
    hint: string;
  }) {
    return (
      <button onClick={onToggle} style={checkboxRowStyle}>
        <div
          style={{
            ...(styles.checkboxBox as React.CSSProperties),
            backgroundColor: checked ? palette.primary : palette.soft,
            borderColor: checked ? palette.primary : palette.border,
            borderStyle: 'solid',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              ...(styles.checkboxMark as React.CSSProperties),
              color: checked ? palette.primaryText : palette.textMuted,
            }}
          >
            {checked ? '✓' : ''}
          </span>
        </div>
        <div style={styles.checkboxTextWrap as React.CSSProperties}>
          <span
            style={{
              ...(styles.checkboxTitle as React.CSSProperties),
              color: palette.text,
              display: 'block',
            }}
          >
            {title}
          </span>
          <span
            style={{
              ...(styles.checkboxHint as React.CSSProperties),
              color: palette.textMuted,
              display: 'block',
            }}
          >
            {hint}
          </span>
        </div>
      </button>
    );
  }

  return (
    <div style={{ overflowY: 'auto', flex: 1 }}>
      <div style={styles.stack as React.CSSProperties}>
        <Card palette={palette} title={labels.devHealth}>
          <BodyText palette={palette}>{labels.devHealthBody}</BodyText>
        <BodyStrong palette={palette}>
          {labels.env}: {RUNTIME_CONFIG.APP_ENV} / Host: {RUNTIME_CONFIG.DEV_HOST_IP}
        </BodyStrong>
        <div
          style={{
            ...(styles.resultPanel as React.CSSProperties),
            backgroundColor: palette.soft,
            marginTop: 12,
          }}
        >
          <span
            style={{
              ...(styles.resultLabel as React.CSSProperties),
              color: palette.primary,
              display: 'block',
            }}
          >
            Runtime Config
          </span>
          <BodyText palette={palette}>
            {`APP_ENV=${runtimeConfig.APP_ENV}
DEV_HOST_IP=${runtimeConfig.DEV_HOST_IP}
CLIENT_LOCAL_PORT=${runtimeConfig.CLIENT_LOCAL_PORT}
CLIENT_DOCKER_PORT=${runtimeConfig.CLIENT_DOCKER_PORT}
CLIENT_HEALTH_PATH=${runtimeConfig.CLIENT_HEALTH_PATH}
CLIENT_RENDER_BASE_URL=${runtimeConfig.CLIENT_RENDER_BASE_URL}`}
          </BodyText>
          <span
            style={{
              ...(styles.metaText as React.CSSProperties),
              color: palette.textMuted,
              display: 'block',
              whiteSpace: 'pre-wrap',
            }}
          >
            {`Injected cloud base URL: ${runtimeConfigBase.CLIENT_RENDER_BASE_URL}
Override active: ${Object.keys(runtimeConfigOverride).length > 0 ? 'yes' : 'no'}
Local base URL: ${localBaseUrl}
Docker base URL: ${dockerBaseUrl}
Cloud health URL: ${renderHealthUrl}`}
          </span>
          <span
            style={{
              ...(styles.fieldLabel as React.CSSProperties),
              color: palette.text,
              display: 'block',
            }}
          >
            Dev Host IP
          </span>
          <input
            onChange={event => {
              setDevHostIpDraft(event.target.value);
              setRuntimeConfigMessage(null);
            }}
            placeholder="192.168.1.2"
            style={{
              ...(styles.input as React.CSSProperties),
              width: '100%',
              backgroundColor: palette.card,
              borderColor: palette.border,
              color: palette.text,
            }}
            value={devHostIpDraft}
          />
          <span
            style={{
              ...(styles.fieldLabel as React.CSSProperties),
              color: palette.text,
              display: 'block',
            }}
          >
            Local API Port
          </span>
          <input
            onChange={event => {
              setLocalPortDraft(event.target.value);
              setRuntimeConfigMessage(null);
            }}
            placeholder="8080"
            style={{
              ...(styles.input as React.CSSProperties),
              width: '100%',
              backgroundColor: palette.card,
              borderColor: palette.border,
              color: palette.text,
            }}
            value={localPortDraft}
          />
          <span
            style={{
              ...(styles.fieldLabel as React.CSSProperties),
              color: palette.text,
              display: 'block',
            }}
          >
            Docker API Port
          </span>
          <input
            onChange={event => {
              setDockerPortDraft(event.target.value);
              setRuntimeConfigMessage(null);
            }}
            placeholder="18080"
            style={{
              ...(styles.input as React.CSSProperties),
              width: '100%',
              backgroundColor: palette.card,
              borderColor: palette.border,
              color: palette.text,
            }}
            value={dockerPortDraft}
          />
          <span
            style={{
              ...(styles.fieldLabel as React.CSSProperties),
              color: palette.text,
              display: 'block',
            }}
          >
            Cloud Base URL
          </span>
          <input
            onChange={event => {
              setRenderBaseUrlDraft(event.target.value);
              setRuntimeConfigMessage(null);
            }}
            placeholder="https://your-render-service.onrender.com"
            style={{
              ...(styles.input as React.CSSProperties),
              width: '100%',
              backgroundColor: palette.card,
              borderColor: palette.border,
              color: palette.text,
            }}
            value={renderBaseUrlDraft}
          />
          <div style={styles.optionRow as React.CSSProperties}>
            <ActionButton
              backgroundColor={palette.primary}
              label="Apply Base URL"
              onPress={applyRenderBaseUrl}
              style={styles.actionButton as React.CSSProperties}
              textColor={palette.primaryText}
              titleStyle={styles.actionText as React.CSSProperties}
            />
            <ActionButton
              backgroundColor={palette.soft}
              label="Reset Base URL"
              onPress={resetRenderBaseUrl}
              style={styles.actionButton as React.CSSProperties}
              textColor={palette.text}
              titleStyle={styles.actionText as React.CSSProperties}
            />
            <ActionButton
              backgroundColor={palette.soft}
              isLoading={customHealthCheckLoading}
              label="Check Custom URL"
              onPress={() => { runCustomBaseUrlHealthCheck().catch(() => undefined); }}
              style={styles.actionButton as React.CSSProperties}
              textColor={palette.text}
              titleStyle={styles.actionText as React.CSSProperties}
            />
          </div>
          {runtimeConfigMessage ? (
            <BodyText palette={palette}>{runtimeConfigMessage}</BodyText>
          ) : null}
          <div
            style={{
              ...(styles.resultPanel as React.CSSProperties),
              backgroundColor: palette.card,
              marginTop: 12,
            }}
          >
            <span
              style={{
                ...(styles.resultLabel as React.CSSProperties),
                color: palette.primary,
                display: 'block',
              }}
            >
              Custom Base URL Health
            </span>
            <BodyText palette={palette}>{customHealthCheckMessage}</BodyText>
            <span
              style={{
                ...(styles.metaText as React.CSSProperties),
                color: palette.textMuted,
                display: 'block',
                whiteSpace: 'pre-wrap',
              }}
            >
              {`Target: ${buildCustomHealthCheckUrl(
                renderBaseUrlDraft || runtimeConfig.CLIENT_RENDER_BASE_URL,
              )}`}
            </span>
            <span
              style={{
                ...(styles.metaText as React.CSSProperties),
                color: palette.textMuted,
                display: 'block',
                whiteSpace: 'pre-wrap',
              }}
            >
              {customHealthCheckResult?.ok
                ? `URL: ${customHealthCheckResult.url}\nStatus: ${customHealthCheckResult.status}`
                : `Candidates: ${
                    customHealthCheckResult?.candidates.join(', ') ||
                    buildCustomHealthCheckUrl(
                      renderBaseUrlDraft || runtimeConfig.CLIENT_RENDER_BASE_URL,
                    )
                  }`}
            </span>
            {!customHealthCheckResult?.ok && customHealthCheckResult?.error ? (
              <span style={styles.errorText as React.CSSProperties}>
                {customHealthCheckResult.error}
              </span>
            ) : null}
          </div>
        </div>
        <Checkbox
          checked={disableConditionalVisibility}
          onToggle={onToggleDisableConditionalVisibility}
            title={labels.devDisableConditionalVisibility}
            hint={labels.devDisableConditionalVisibilityHint}
          />
          <Checkbox
            checked={unmountLoginContainer}
            onToggle={onToggleUnmountLoginContainer}
            title={labels.devUnmountLoginContainer}
            hint={labels.devUnmountLoginContainerHint}
          />
          <Checkbox
            checked={unmountProfileContainer}
            onToggle={onToggleUnmountProfileContainer}
            title={labels.devUnmountProfileContainer}
            hint={labels.devUnmountProfileContainerHint}
          />
          <Checkbox
            checked={showStudentSkinPreview}
            onToggle={onToggleShowStudentSkinPreview}
            title={labels.devShowStudentSkinPreview}
            hint={labels.devShowStudentSkinPreviewHint}
          />
        </Card>

        <ActionButton
          backgroundColor={palette.primary}
          hint={labels.devTableInitHint}
          isLoading={loadingAction === 'tables'}
          label={labels.devTableInit}
          onPress={() => { runDeveloperAction('tables', initializeTables).catch(() => undefined); }}
          style={styles.primaryCardAction as React.CSSProperties}
          textColor={palette.primaryText}
          hintStyle={styles.primaryCardActionHint as React.CSSProperties}
          titleStyle={styles.primaryCardActionTitle as React.CSSProperties}
        />
        <ActionButton
          backgroundColor={palette.soft}
          hint={labels.devTableInitAndSeedHint}
          isLoading={loadingAction === 'seed'}
          label={labels.devTableInitAndSeed}
          onPress={() => { runDeveloperAction('seed', initializeAndInjectTestData).catch(() => undefined); }}
          style={styles.primaryCardAction as React.CSSProperties}
          textColor={palette.text}
          hintStyle={styles.primaryCardActionHint as React.CSSProperties}
          titleStyle={styles.primaryCardActionTitle as React.CSSProperties}
        />
        <ActionButton
          backgroundColor={palette.soft}
          hint={labels.devLicenseCreateHint}
          isLoading={loadingAction === 'license'}
          label={labels.devLicenseCreate}
          onPress={() => { runDeveloperAction('license', createLicense).catch(() => undefined); }}
          style={styles.primaryCardAction as React.CSSProperties}
          textColor={palette.text}
          hintStyle={styles.primaryCardActionHint as React.CSSProperties}
          titleStyle={styles.primaryCardActionTitle as React.CSSProperties}
        />
        <ActionButton
          backgroundColor={palette.soft}
          hint={labels.devClientLogHint}
          label={labels.devClientLog}
          onPress={triggerClientLog}
          style={styles.primaryCardAction as React.CSSProperties}
          textColor={palette.text}
          hintStyle={styles.primaryCardActionHint as React.CSSProperties}
          titleStyle={styles.primaryCardActionTitle as React.CSSProperties}
        />
        <ActionButton
          backgroundColor={palette.soft}
          hint={labels.devServerLogHint}
          isLoading={loadingAction === 'server-log'}
          label={labels.devServerLog}
          onPress={() => { runDeveloperAction('server-log', emitServerLog).catch(() => undefined); }}
          style={styles.primaryCardAction as React.CSSProperties}
          textColor={palette.text}
          hintStyle={styles.primaryCardActionHint as React.CSSProperties}
          titleStyle={styles.primaryCardActionTitle as React.CSSProperties}
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
            {actionResult.licenseCode ? (
              <>
                <BodyText palette={palette}>
                  {labels.licenseCode}: {actionResult.licenseCode}
                </BodyText>
                <div style={styles.optionRow as React.CSSProperties}>
                  <ActionButton
                    backgroundColor={palette.soft}
                    label={labels.copyLicenseCode}
                    onPress={() => { copyLicenseCode(actionResult.licenseCode ?? '').catch(() => undefined); }}
                    style={styles.actionButton as React.CSSProperties}
                    textColor={palette.text}
                    titleStyle={styles.actionText as React.CSSProperties}
                  />
                </div>
                {copyMessage ? <BodyText palette={palette}>{copyMessage}</BodyText> : null}
              </>
            ) : null}
            {actionResult.expiresAt ? (
              <BodyText palette={palette}>Expires At: {actionResult.expiresAt}</BodyText>
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
              <span style={styles.errorText as React.CSSProperties}>{actionResult.error}</span>
            ) : null}
          </Card>
        ) : null}

        <ActionButton
          backgroundColor={palette.primary}
          hint={labels.allChecksHint}
          label={labels.allChecks}
          onPress={() => { onRunAll().catch(() => undefined); }}
          style={styles.primaryCardAction as React.CSSProperties}
          textColor={palette.primaryText}
          hintStyle={styles.primaryCardActionHint as React.CSSProperties}
          titleStyle={styles.primaryCardActionTitle as React.CSSProperties}
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
                onPress={() => { onRunTarget(target).catch(() => undefined); }}
              />
              <div
                style={{
                  ...(styles.resultPanel as React.CSSProperties),
                  backgroundColor: palette.soft,
                }}
              >
                <span
                  style={{
                    ...(styles.resultLabel as React.CSSProperties),
                    color: palette.primary,
                    display: 'block',
                  }}
                >
                  {labels.result}
                </span>
                <BodyText palette={palette}>
                  {state.message || resetTargetMessage(target)}
                </BodyText>
                <span
                  style={{
                    ...(styles.metaText as React.CSSProperties),
                    color: palette.textMuted,
                    display: 'block',
                  }}
                >
                  {labels.lastChecked}: {state.checkedAt ?? 'Not yet'}
                </span>
                <span
                  style={{
                    ...(styles.metaText as React.CSSProperties),
                    color: palette.textMuted,
                    display: 'block',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {result?.ok
                    ? `URL: ${result.url}\nStatus: ${result.status}`
                    : `Candidates: ${candidates.join(', ')}`}
                </span>
                {!result?.ok && result?.error ? (
                  <span style={styles.errorText as React.CSSProperties}>{result.error}</span>
                ) : null}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
