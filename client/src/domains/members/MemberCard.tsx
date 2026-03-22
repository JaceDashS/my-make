import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import type {Member} from './types';

type MemberCardProps = {
  member: Member;
};

const STATUS_LABEL: Record<Member['status'], string> = {
  new: 'New',
  active: 'Active',
  dormant: 'Dormant',
  completed: 'Completed',
};

export function MemberCard({member}: MemberCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.name}>{member.name}</Text>
          <Text style={styles.meta}>
            {member.role.toUpperCase()} · {STATUS_LABEL[member.status]}
          </Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{member.lessonCreditsRemaining} left</Text>
        </View>
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.label}>Instructor</Text>
        <Text style={styles.value}>{member.assignedInstructor}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.label}>Phone</Text>
        <Text style={styles.value}>{member.phone}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.label}>Skin Tone</Text>
        <Text style={styles.value}>{member.skinTone}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 18,
    borderRadius: 24,
    backgroundColor: '#fff7ed',
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  name: {
    color: '#431407',
    fontSize: 20,
    fontWeight: '700',
  },
  meta: {
    marginTop: 4,
    color: '#9a3412',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#fed7aa',
  },
  badgeText: {
    color: '#7c2d12',
    fontSize: 12,
    fontWeight: '700',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  label: {
    color: '#9a3412',
    fontSize: 13,
    fontWeight: '600',
  },
  value: {
    color: '#431407',
    fontSize: 14,
    fontWeight: '500',
    flexShrink: 1,
    textAlign: 'right',
  },
});
