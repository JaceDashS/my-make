import React, {useState} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {RUNTIME_CONFIG} from '../../config/runtime/runtime-config';
import {HealthCheckButton} from '../../shared/components/HealthCheckButton';
import {
  getHealthCheckCandidates,
  runHealthCheck,
  type HealthCheckTarget,
} from '../../shared/lib/healthCheck';
import {MemberCard} from './MemberCard';
import {useMembers} from './useMembers';

export function MembersHomeScreen() {
  const {members, totalCount, activeCount} = useMembers();
  const [loadingTarget, setLoadingTarget] = useState<HealthCheckTarget | null>(
    null,
  );
  const [healthResult, setHealthResult] = useState(
    'Use the quick health checks to verify local or Render connectivity.',
  );

  const handleHealthCheck = async (target: 'local' | 'render') => {
    const candidates = getHealthCheckCandidates(target);
    setLoadingTarget(target);
    setHealthResult(
      [
        `${target === 'local' ? 'Local' : 'Render'} health check in progress...`,
        `Candidates: ${candidates.join(', ')}`,
      ].join('\n'),
    );
    try {
      const response = await runHealthCheck(target);

      setHealthResult(
        response.ok
          ? [
              `${response.label} response`,
              `URL: ${response.url}`,
              `Status: ${response.status}`,
              response.body ? `Body: ${response.body}` : 'Body: (empty)',
            ].join('\n')
          : [
            `${response.label} request failed`,
            `Candidates: ${response.candidates.join(', ')}`,
            `Error: ${response.error}`,
          ].join('\n'),
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      setHealthResult(
        [
          `${target === 'local' ? 'Local' : 'Render'} request failed unexpectedly`,
          `Candidates: ${candidates.join(', ')}`,
          `Error: ${errorMessage}`,
        ].join('\n'),
      );
    } finally {
      setLoadingTarget(null);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>MEMBERS</Text>
          <Text style={styles.title}>Member Overview</Text>
          <Text style={styles.subtitle}>
            Basic student and instructor records, lesson status, and skin profile
            entry points start here.
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{totalCount}</Text>
            <Text style={styles.summaryLabel}>Total Members</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{activeCount}</Text>
            <Text style={styles.summaryLabel}>Active</Text>
          </View>
        </View>

        <View style={styles.healthCard}>
          <Text style={styles.healthTitle}>Quick Health Checks</Text>
          <Text style={styles.healthSubtitle}>
            Run quick API checks from the main screen against the configured
            local and Render health endpoints.
          </Text>
          <View style={styles.healthActions}>
            <HealthCheckButton
              label={`Local ${RUNTIME_CONFIG.CLIENT_LOCAL_PORT}`}
              hint={getHealthCheckCandidates('local').join(' -> ')}
              isLoading={loadingTarget === 'local'}
              onPress={() => handleHealthCheck('local')}
            />
            <HealthCheckButton
              label="Render"
              hint={getHealthCheckCandidates('render')[0]}
              isLoading={loadingTarget === 'render'}
              onPress={() => handleHealthCheck('render')}
            />
          </View>
          <View style={styles.healthResultCard}>
            <Text style={styles.healthResultLabel}>Result</Text>
            <Text style={styles.healthResultText}>{healthResult}</Text>
          </View>
        </View>

        <View style={styles.list}>
          {members.map(member => (
            <MemberCard key={member.id} member={member} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fef3c7',
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 18,
  },
  hero: {
    padding: 24,
    borderRadius: 28,
    backgroundColor: '#7c2d12',
  },
  eyebrow: {
    color: '#fed7aa',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 10,
  },
  title: {
    color: '#fffbeb',
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 38,
    marginBottom: 10,
  },
  subtitle: {
    color: '#ffedd5',
    fontSize: 15,
    lineHeight: 22,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    padding: 18,
    borderRadius: 22,
    backgroundColor: '#ffedd5',
  },
  summaryValue: {
    color: '#7c2d12',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 6,
  },
  summaryLabel: {
    color: '#9a3412',
    fontSize: 13,
    fontWeight: '600',
  },
  list: {
    gap: 12,
    paddingBottom: 24,
  },
  healthCard: {
    padding: 18,
    borderRadius: 24,
    backgroundColor: '#422006',
    gap: 12,
  },
  healthTitle: {
    color: '#fef3c7',
    fontSize: 20,
    fontWeight: '800',
  },
  healthSubtitle: {
    color: '#fde68a',
    fontSize: 14,
    lineHeight: 20,
  },
  healthActions: {
    gap: 12,
  },
  healthResultCard: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#78350f',
  },
  healthResultLabel: {
    color: '#fde68a',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
  },
  healthResultText: {
    color: '#fffbeb',
    fontSize: 14,
    lineHeight: 21,
  },
});
