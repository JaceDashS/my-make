import React, {useState} from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {RUNTIME_CONFIG} from '../../config/runtime/runtime-config';
import {HealthCheckButton} from '../../shared/components/HealthCheckButton';
import {
  getHealthCheckCandidates,
  getHealthCheckLabel,
  runHealthCheck,
  type HealthCheckResult,
  type HealthCheckTarget,
} from '../../shared/lib/healthCheck';

type TargetState = {
  checkedAt: string | null;
  message: string;
  result: HealthCheckResult | null;
};

type TargetConfig = {
  target: HealthCheckTarget;
  title: string;
  subtitle: string;
};

type DiagnosticState = {
  message: string;
  step: string | null;
};

const TARGETS: TargetConfig[] = [
  {
    target: 'local',
    title: 'Local Server',
    subtitle: 'Use the development machine host and fallback localhost targets.',
  },
  {
    target: 'docker',
    title: 'Docker Server',
    subtitle: 'Check the container-mapped port from the mobile runtime.',
  },
  {
    target: 'render',
    title: 'Cloud Server',
    subtitle: 'Verify the deployed Render endpoint through the public URL.',
  },
];

const INITIAL_TARGET_STATE: Record<HealthCheckTarget, TargetState> = {
  local: {
    checkedAt: null,
    message: 'Ready to test the local server health endpoint.',
    result: null,
  },
  docker: {
    checkedAt: null,
    message: 'Ready to test the Docker server health endpoint.',
    result: null,
  },
  render: {
    checkedAt: null,
    message: 'Ready to test the cloud server health endpoint.',
    result: null,
  },
};

function createDebugTimestamp() {
  return `${Date.now()}`;
}

export function HealthCheckScreen() {
  const [loadingTarget, setLoadingTarget] = useState<HealthCheckTarget | null>(
    null,
  );
  const [targetStates, setTargetStates] = useState(INITIAL_TARGET_STATE);
  const [diagnosticState, setDiagnosticState] = useState<DiagnosticState>({
    message: 'Windows diagnostic actions have not been run yet.',
    step: null,
  });

  const handleHealthCheck = async (target: HealthCheckTarget) => {
    const candidates = getHealthCheckCandidates(target);
    const label = getHealthCheckLabel(target);

    console.log(
      `[health-check-screen] pressed target=${target} label=${label} candidates=${candidates.join(
        ' | ',
      )}`,
    );

    setLoadingTarget(target);
    setTargetStates(current => ({
      ...current,
      [target]: {
        checkedAt: current[target].checkedAt,
        message: `${label} health check in progress...\nCandidates: ${candidates.join(
          ', ',
        )}`,
        result: null,
      },
    }));

    try {
      const response = await runHealthCheck(target);
      const checkedAt = createDebugTimestamp();

      setTargetStates(current => ({
        ...current,
        [target]: {
          checkedAt,
          message: response.ok
            ? `${response.label} health check succeeded.`
            : `${response.label} health check failed.`,
          result: response,
        },
      }));
    } catch (error) {
      const checkedAt = createDebugTimestamp();
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      console.error(
        `[health-check-screen] unexpected failure target=${target} error=${errorMessage}`,
      );

      setTargetStates(current => ({
        ...current,
        [target]: {
          checkedAt,
          message: `${label} health check failed unexpectedly.`,
          result: {
            ok: false,
            candidates,
            error: errorMessage,
            label,
          },
        },
      }));
    } finally {
      setLoadingTarget(null);
    }
  };

  const runWindowsDiagnostic = async (step: 'js-log' | 'state-only' | 'xhr-local') => {
    console.log(`[windows-diagnostic] start step=${step}`);

    if (step === 'js-log') {
      console.log('[windows-diagnostic] js-log reached');
      setDiagnosticState({
        message: 'JS log step completed.',
        step,
      });
      return;
    }

    if (step === 'state-only') {
      setDiagnosticState({
        message: `State update completed at ${createDebugTimestamp()}.`,
        step,
      });
      return;
    }

    setDiagnosticState({
      message: 'XHR request in progress...',
      step,
    });

    const localUrl = getHealthCheckCandidates('local')[0];
    const xhr = new XMLHttpRequest();

    xhr.open('GET', localUrl, true);
    xhr.timeout = 5000;

    xhr.onload = () => {
      console.log(
        `[windows-diagnostic] xhr-local success status=${xhr.status} url=${localUrl}`,
      );
      setDiagnosticState({
        message: `XHR completed with status ${xhr.status}.`,
        step,
      });
    };

    xhr.onerror = () => {
      console.warn(`[windows-diagnostic] xhr-local error url=${localUrl}`);
      setDiagnosticState({
        message: 'XHR failed with a network error.',
        step,
      });
    };

    xhr.ontimeout = () => {
      console.warn(`[windows-diagnostic] xhr-local timeout url=${localUrl}`);
      setDiagnosticState({
        message: 'XHR timed out.',
        step,
      });
    };

    xhr.send();
  };

  if (Platform.OS === 'windows') {
    return (
      <WindowsHealthCheckScreen
        diagnosticState={diagnosticState}
        loadingTarget={loadingTarget}
        onRunDiagnostic={runWindowsDiagnostic}
        onRunTarget={handleHealthCheck}
        targetStates={targetStates}
      />
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.screen}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>MY MAKE</Text>
          <Text style={styles.title}>Server Health Test Page</Text>
          <Text style={styles.subtitle}>
            Use this page to verify whether the local server, Docker server, and
            cloud server health endpoints are reachable from the app.
          </Text>
          <Text style={styles.detectedHost}>
            Env: {RUNTIME_CONFIG.APP_ENV} / Host: {RUNTIME_CONFIG.DEV_HOST_IP}
          </Text>
        </View>

        <Pressable
          disabled={loadingTarget !== null}
          onPress={async () => {
            for (const {target} of TARGETS) {
              await handleHealthCheck(target);
            }
          }}
          style={({pressed}) => [
            styles.runAllButton,
            pressed && loadingTarget === null ? styles.runAllButtonPressed : null,
            loadingTarget !== null ? styles.runAllButtonDisabled : null,
          ]}>
          <Text style={styles.runAllTitle}>Run All Health Checks</Text>
          <Text style={styles.runAllHint}>
            Test the local, Docker, and cloud endpoints in sequence.
          </Text>
        </Pressable>

        <View style={styles.targets}>
          {Platform.OS === 'windows' ? (
            <View style={styles.targetCard}>
              <View style={styles.targetHeaderText}>
                <Text style={styles.targetTitle}>Windows Diagnostic</Text>
                <Text style={styles.targetSubtitle}>
                  Use these smaller steps to find which Hermes path crashes first.
                </Text>
              </View>
              <View style={styles.diagnosticButtons}>
                <HealthCheckButton
                  label="JS Log"
                  hint="Only log and update local diagnostic state."
                  isLoading={false}
                  onPress={() => runWindowsDiagnostic('js-log')}
                />
                <HealthCheckButton
                  label="State Only"
                  hint="Only perform a state update without network I/O."
                  isLoading={false}
                  onPress={() => runWindowsDiagnostic('state-only')}
                />
                <HealthCheckButton
                  label="XHR Local"
                  hint="Issue a minimal XMLHttpRequest to the local health URL."
                  isLoading={false}
                  onPress={() => runWindowsDiagnostic('xhr-local')}
                />
              </View>
              <View style={styles.resultCard}>
                <Text style={styles.resultLabel}>Diagnostic</Text>
                <Text style={styles.resultMessage}>{diagnosticState.message}</Text>
                <Text style={styles.resultMeta}>
                  Last step: {diagnosticState.step ?? 'Not yet'}
                </Text>
              </View>
            </View>
          ) : null}

          {TARGETS.map(({target, title, subtitle}) => {
            const state = targetStates[target];
            const result = state.result;
            const isLoading = loadingTarget === target;
            const candidates = getHealthCheckCandidates(target);

            return (
              <View key={target} style={styles.targetCard}>
                <View style={styles.targetHeader}>
                  <View style={styles.targetHeaderText}>
                    <Text style={styles.targetTitle}>{title}</Text>
                    <Text style={styles.targetSubtitle}>{subtitle}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      result == null
                        ? styles.statusPillIdle
                        : result.ok
                          ? styles.statusPillSuccess
                          : styles.statusPillError,
                    ]}>
                    <Text style={styles.statusPillText}>
                      {isLoading
                        ? 'Running'
                        : result == null
                          ? 'Idle'
                          : result.ok
                            ? 'OK'
                            : 'Error'}
                    </Text>
                  </View>
                </View>

                <HealthCheckButton
                  label={
                    target === 'local'
                      ? `Local ${RUNTIME_CONFIG.CLIENT_LOCAL_PORT}`
                      : target === 'docker'
                        ? `Docker ${RUNTIME_CONFIG.CLIENT_DOCKER_PORT}`
                        : 'Cloud'
                  }
                  hint={candidates.join(' -> ')}
                  isLoading={isLoading}
                  onPress={() => handleHealthCheck(target)}
                />

                <View style={styles.resultCard}>
                  <Text style={styles.resultLabel}>Status</Text>
                  <Text style={styles.resultMessage}>{state.message}</Text>
                  <Text style={styles.resultMeta}>
                    Last checked: {state.checkedAt ?? 'Not yet'}
                  </Text>
                  {result?.ok ? (
                    <View style={styles.resultDetails}>
                      <Text style={styles.resultText}>URL: {result.url}</Text>
                      <Text style={styles.resultText}>
                        Status: {result.status}
                      </Text>
                      <Text style={styles.resultText}>
                        Body: {result.body || '(empty)'}
                      </Text>
                    </View>
                  ) : result ? (
                    <View style={styles.resultDetails}>
                      <Text style={styles.resultText}>
                        Candidates: {result.candidates.join(', ')}
                      </Text>
                      <Text style={styles.resultText}>Error: {result.error}</Text>
                    </View>
                  ) : (
                    <View style={styles.resultDetails}>
                      <Text style={styles.resultText}>
                        Candidates: {candidates.join(', ')}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type WindowsHealthCheckScreenProps = {
  diagnosticState: DiagnosticState;
  loadingTarget: HealthCheckTarget | null;
  onRunDiagnostic: (step: 'js-log' | 'state-only' | 'xhr-local') => void;
  onRunTarget: (target: HealthCheckTarget) => Promise<void>;
  targetStates: Record<HealthCheckTarget, TargetState>;
};

function WindowsHealthCheckScreen({
  diagnosticState,
  loadingTarget,
  onRunDiagnostic,
  onRunTarget,
  targetStates,
}: WindowsHealthCheckScreenProps) {
  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.windowsSafeArea}>
      <ScrollView contentContainerStyle={styles.windowsContent}>
        <View style={styles.windowsHero}>
          <Text style={styles.windowsEyebrow}>DEV HEALTH</Text>
          <Text style={styles.windowsTitle}>Windows Minimal Check</Text>
          <Text style={styles.windowsSubtitle}>
            This reduced layout keeps the page closer to the working main screen.
          </Text>
        </View>

        <View style={styles.windowsCard}>
          <Text style={styles.windowsCardTitle}>Windows Diagnostic</Text>
          <Text style={styles.windowsCardSubtitle}>
            Run smaller actions before the full health checks.
          </Text>
          <View style={styles.windowsActions}>
            <HealthCheckButton
              label="JS Log"
              hint="Only log and update local diagnostic state."
              isLoading={false}
              onPress={() => onRunDiagnostic('js-log')}
            />
            <HealthCheckButton
              label="State Only"
              hint="Only perform a state update."
              isLoading={false}
              onPress={() => onRunDiagnostic('state-only')}
            />
            <HealthCheckButton
              label="XHR Local"
              hint="Send a minimal XMLHttpRequest to the local health URL."
              isLoading={false}
              onPress={() => onRunDiagnostic('xhr-local')}
            />
          </View>
          <View style={styles.windowsResultCard}>
            <Text style={styles.windowsResultLabel}>Diagnostic</Text>
            <Text style={styles.windowsResultText}>{diagnosticState.message}</Text>
            <Text style={styles.windowsResultMeta}>
              Last step: {diagnosticState.step ?? 'Not yet'}
            </Text>
          </View>
        </View>

        {TARGETS.map(({target, title}) => {
          const state = targetStates[target];
          const result = state.result;
          const candidates = getHealthCheckCandidates(target);

          return (
            <View key={target} style={styles.windowsCard}>
              <Text style={styles.windowsCardTitle}>{title}</Text>
              <Text style={styles.windowsCardSubtitle}>
                {candidates.join(' -> ')}
              </Text>
              <HealthCheckButton
                label={
                  target === 'local'
                    ? `Local ${RUNTIME_CONFIG.CLIENT_LOCAL_PORT}`
                    : target === 'docker'
                      ? `Docker ${RUNTIME_CONFIG.CLIENT_DOCKER_PORT}`
                      : 'Cloud'
                }
                hint={candidates.join(' -> ')}
                isLoading={loadingTarget === target}
                onPress={() => onRunTarget(target)}
              />
              <View style={styles.windowsResultCard}>
                <Text style={styles.windowsResultLabel}>Result</Text>
                <Text style={styles.windowsResultText}>{state.message}</Text>
                <Text style={styles.windowsResultMeta}>
                  Last checked: {state.checkedAt ?? 'Not yet'}
                </Text>
                {result?.ok ? (
                  <Text style={styles.windowsResultText}>
                    URL: {result.url}
                    {'\n'}
                    Status: {result.status}
                    {'\n'}
                    Body: {result.body || '(empty)'}
                  </Text>
                ) : result ? (
                  <Text style={styles.windowsResultText}>
                    Error: {result.error}
                  </Text>
                ) : null}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#081c15',
  },
  screen: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 18,
    backgroundColor: '#081c15',
  },
  hero: {
    marginTop: 20,
    padding: 24,
    borderRadius: 28,
    backgroundColor: '#0f2a22',
  },
  eyebrow: {
    color: '#95d5b2',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 12,
  },
  title: {
    color: '#ffffff',
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 40,
    marginBottom: 10,
  },
  subtitle: {
    color: '#d8f3dc',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 12,
  },
  detectedHost: {
    color: '#95d5b2',
    fontSize: 14,
    fontWeight: '600',
  },
  runAllButton: {
    padding: 18,
    borderRadius: 24,
    backgroundColor: '#2d6a4f',
  },
  runAllButtonPressed: {
    opacity: 0.92,
  },
  runAllButtonDisabled: {
    opacity: 0.72,
  },
  runAllTitle: {
    color: '#f1faee',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  runAllHint: {
    color: '#d8f3dc',
    fontSize: 14,
    lineHeight: 20,
  },
  targets: {
    gap: 16,
    paddingBottom: 28,
  },
  diagnosticButtons: {
    gap: 12,
  },
  targetCard: {
    padding: 18,
    borderRadius: 26,
    backgroundColor: '#0f2a22',
    gap: 14,
  },
  targetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  targetHeaderText: {
    flex: 1,
    gap: 6,
  },
  targetTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
  },
  targetSubtitle: {
    color: '#d8f3dc',
    fontSize: 14,
    lineHeight: 20,
  },
  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  statusPillIdle: {
    backgroundColor: '#355070',
  },
  statusPillSuccess: {
    backgroundColor: '#40916c',
  },
  statusPillError: {
    backgroundColor: '#bc4749',
  },
  statusPillText: {
    color: '#f8f9fa',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  resultCard: {
    padding: 20,
    borderRadius: 24,
    backgroundColor: '#1b4332',
  },
  resultLabel: {
    color: '#95d5b2',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  resultMessage: {
    color: '#f1faee',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
  },
  resultMeta: {
    color: '#95d5b2',
    fontSize: 13,
    marginBottom: 10,
  },
  resultDetails: {
    gap: 6,
  },
  resultText: {
    color: '#f1faee',
    fontSize: 14,
    lineHeight: 20,
  },
  windowsActions: {
    gap: 12,
  },
  windowsCard: {
    padding: 18,
    borderRadius: 24,
    backgroundColor: '#422006',
    gap: 12,
  },
  windowsCardSubtitle: {
    color: '#fde68a',
    fontSize: 14,
    lineHeight: 20,
  },
  windowsCardTitle: {
    color: '#fef3c7',
    fontSize: 20,
    fontWeight: '800',
  },
  windowsContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 18,
  },
  windowsEyebrow: {
    color: '#fed7aa',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 10,
  },
  windowsHero: {
    padding: 24,
    borderRadius: 28,
    backgroundColor: '#7c2d12',
  },
  windowsResultCard: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#78350f',
  },
  windowsResultLabel: {
    color: '#fde68a',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
  },
  windowsResultMeta: {
    color: '#fde68a',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  windowsResultText: {
    color: '#fffbeb',
    fontSize: 14,
    lineHeight: 21,
  },
  windowsSafeArea: {
    flex: 1,
    backgroundColor: '#fef3c7',
  },
  windowsSubtitle: {
    color: '#ffedd5',
    fontSize: 15,
    lineHeight: 22,
  },
  windowsTitle: {
    color: '#fffbeb',
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 38,
    marginBottom: 10,
  },
});
