import React, {useState} from 'react';
import {Alert, Pressable, ScrollView, Text, View} from 'react-native';

import {RUNTIME_CONFIG} from '../../../../../config/runtime/runtime-config';
import {ActionButton} from '../../../../../shared/components/ActionButton';
import {HealthCheckButton} from '../../../../../shared/components/HealthCheckButton';
import {copyText} from '../../../../../shared/lib/clipboard';
import {createLicense, initializeTables, type DevToolsResult} from '../../../../../shared/lib/devTools';
import {getHealthCheckCandidates, type HealthCheckTarget} from '../../../../../shared/lib/healthCheck';
import {windowsPressableFocusProps} from '../../../../../shared/ui/windowsFocusProps';
import type {TargetState} from '../../../../shared/shell-model';
import {BodyStrong, BodyText, Card} from '../../components/ui';
import {desktopShellStyles as styles} from '../../config/styles';
import type {DesktopShellPalette} from '../../model/types';

export function DevHealthSection({
  disableConditionalVisibility,
  unmountLoginContainer,
  unmountProfileContainer,
  labels,
  loadingTarget,
  onRunAll,
  onRunTarget,
  onToggleDisableConditionalVisibility,
  onToggleUnmountLoginContainer,
  onToggleUnmountProfileContainer,
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
    docker: string;
    env: string;
    lastChecked: string;
    local: string;
    result: string;
  };
  loadingTarget: HealthCheckTarget | null;
  onRunAll: () => Promise<void>;
  onRunTarget: (target: HealthCheckTarget) => Promise<void>;
  onToggleDisableConditionalVisibility: () => void;
  onToggleUnmountLoginContainer: () => void;
  onToggleUnmountProfileContainer: () => void;
  palette: DesktopShellPalette;
  targetStates: Record<HealthCheckTarget, TargetState>;
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
        <Pressable
          {...windowsPressableFocusProps}
          onPress={onToggleDisableConditionalVisibility}
          style={styles.checkboxRow}>
          <View
            style={[
              styles.checkboxBox,
              {
                backgroundColor: disableConditionalVisibility
                  ? palette.primary
                  : palette.soft,
                borderColor: disableConditionalVisibility
                  ? palette.primary
                  : palette.border,
              },
            ]}>
            <Text
              style={[
                styles.checkboxMark,
                {
                  color: disableConditionalVisibility
                    ? palette.primaryText
                    : palette.textMuted,
                },
              ]}>
              {disableConditionalVisibility ? '✓' : ''}
            </Text>
          </View>
          <View style={styles.checkboxTextWrap}>
            <Text style={[styles.checkboxTitle, {color: palette.text}]}>
              {labels.devDisableConditionalVisibility}
            </Text>
            <Text style={[styles.checkboxHint, {color: palette.textMuted}]}>
              {labels.devDisableConditionalVisibilityHint}
            </Text>
          </View>
        </Pressable>
        <Pressable
          {...windowsPressableFocusProps}
          onPress={onToggleUnmountLoginContainer}
          style={styles.checkboxRow}>
          <View
            style={[
              styles.checkboxBox,
              {
                backgroundColor: unmountLoginContainer ? palette.primary : palette.soft,
                borderColor: unmountLoginContainer ? palette.primary : palette.border,
              },
            ]}>
            <Text
              style={[
                styles.checkboxMark,
                {
                  color: unmountLoginContainer ? palette.primaryText : palette.textMuted,
                },
              ]}>
              {unmountLoginContainer ? '✓' : ''}
            </Text>
          </View>
          <View style={styles.checkboxTextWrap}>
            <Text style={[styles.checkboxTitle, {color: palette.text}]}>
              {labels.devUnmountLoginContainer}
            </Text>
            <Text style={[styles.checkboxHint, {color: palette.textMuted}]}>
              {labels.devUnmountLoginContainerHint}
            </Text>
          </View>
        </Pressable>
        <Pressable
          {...windowsPressableFocusProps}
          onPress={onToggleUnmountProfileContainer}
          style={styles.checkboxRow}>
          <View
            style={[
              styles.checkboxBox,
              {
                backgroundColor: unmountProfileContainer ? palette.primary : palette.soft,
                borderColor: unmountProfileContainer ? palette.primary : palette.border,
              },
            ]}>
            <Text
              style={[
                styles.checkboxMark,
                {
                  color: unmountProfileContainer ? palette.primaryText : palette.textMuted,
                },
              ]}>
              {unmountProfileContainer ? '✓' : ''}
            </Text>
          </View>
          <View style={styles.checkboxTextWrap}>
            <Text style={[styles.checkboxTitle, {color: palette.text}]}>
              {labels.devUnmountProfileContainer}
            </Text>
            <Text style={[styles.checkboxHint, {color: palette.textMuted}]}>
              {labels.devUnmountProfileContainerHint}
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
        style={styles.primaryCardAction}
        textColor={palette.primaryText}
        hintStyle={styles.primaryCardActionHint}
        titleStyle={styles.primaryCardActionTitle}
      />
      <ActionButton
        backgroundColor={palette.soft}
        hint={labels.devLicenseCreateHint}
        isLoading={loadingAction === 'license'}
        label={labels.devLicenseCreate}
        onPress={() => {
          runDeveloperAction('license', createLicense).catch(() => undefined);
        }}
        style={styles.primaryCardAction}
        textColor={palette.text}
        hintStyle={styles.primaryCardActionHint}
        titleStyle={styles.primaryCardActionTitle}
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
        style={styles.primaryCardAction}
        textColor={palette.primaryText}
        hintStyle={styles.primaryCardActionHint}
        titleStyle={styles.primaryCardActionTitle}
      />
      {/* 共通ヘルスチェックロジックをそのまま使い、UI だけデスクトップ向けに包む。 */}
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
