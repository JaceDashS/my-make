import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { PendingApprovalUiLabels } from './pendingApprovalLabels';
import type {
  PendingMemberSlot,
  ShellPaletteLike,
} from './pendingApprovalTypes';

type PendingApprovalMobileListProps = {
  approvingLoginId: string | null;
  currentPage: number;
  onApprove: (loginId: string) => void;
  pageSize: number;
  palette: ShellPaletteLike;
  slots: PendingMemberSlot[];
  ui: PendingApprovalUiLabels;
};

function renderMobileFieldRow(
  palette: ShellPaletteLike,
  label: string,
  value: string,
  options: {
    emphasize?: boolean;
  } = {},
) {
  return (
    <View style={styles.mobileFieldRow} key={`${label}-${value}`}>
      <Text style={[styles.mobileFieldLabel, { color: palette.textMuted }]}>
        {label}
      </Text>
      <Text
        style={[
          styles.mobileFieldValue,
          {
            color: options.emphasize ? palette.text : palette.textMuted,
          },
        ]}
      >
        {value || '-'}
      </Text>
    </View>
  );
}

function renderMobileRow(
  slot: PendingMemberSlot,
  index: number,
  approvingLoginId: string | null,
  currentPage: number,
  onApprove: (loginId: string) => void,
  pageSize: number,
  palette: ShellPaletteLike,
  ui: PendingApprovalUiLabels,
) {
  const isApprovingRow = slot.hasMember && approvingLoginId === slot.loginId;
  const isRowDisabled = !slot.hasMember || slot.mode === 'profile';
  const actionLabel =
    isApprovingRow
      ? ui.approving
      : slot.mode === 'profile'
      ? ui.profile
      : slot.hasMember
      ? ui.approve
      : ui.waiting;

  return (
    <View
      key={`pending-mobile-slot-${index}`}
      style={[
        styles.mobileRowCard,
        {
          backgroundColor:
            slot.mode === 'profile'
              ? palette.card
              : slot.hasMember
              ? palette.muted
              : palette.card,
          borderColor: palette.border,
        },
      ]}
    >
      <View style={styles.mobileRowCardHeader}>
        <Text style={[styles.mobileRowTitle, { color: palette.text }]}>
          {ui.member} {(currentPage - 1) * pageSize + index + 1}
        </Text>
        <Text
          style={[
            styles.mobileRowType,
            { color: slot.mode === 'profile' ? palette.text : palette.textMuted },
          ]}
        >
          {slot.mode === 'profile' ? ui.profile : ui.pending}
        </Text>
      </View>
      {renderMobileFieldRow(palette, ui.name, slot.displayName, {
        emphasize: true,
      })}
      {renderMobileFieldRow(palette, ui.email, slot.email)}
      {renderMobileFieldRow(palette, ui.phone, slot.phone)}
      {renderMobileFieldRow(palette, ui.role, slot.roleCode, {
        emphasize: true,
      })}
      <Pressable
        disabled={isRowDisabled}
        onPress={() => {
          if (slot.hasMember && slot.mode !== 'profile') {
            onApprove(slot.loginId);
          }
        }}
        style={[
          styles.mobileActionButton,
          {
            backgroundColor:
              isApprovingRow
                ? palette.muted
                : slot.hasMember && slot.mode !== 'profile'
                ? palette.primary
                : palette.card,
            borderColor:
              slot.hasMember && slot.mode !== 'profile'
                ? palette.primary
                : palette.border,
            opacity: slot.hasMember && slot.mode !== 'profile' ? 1 : 0.55,
          },
        ]}
      >
        {isApprovingRow ? (
          <ActivityIndicator
            color={palette.text}
            size="small"
            style={styles.mobileActionSpinner}
          />
        ) : null}
        <Text
          style={[
            styles.mobileActionButtonText,
            {
              color:
                slot.hasMember && slot.mode !== 'profile'
                  ? palette.primaryText
                  : palette.textMuted,
            },
          ]}
        >
          {actionLabel}
        </Text>
      </Pressable>
    </View>
  );
}

export function PendingApprovalMobileList({
  approvingLoginId,
  currentPage,
  onApprove,
  pageSize,
  palette,
  slots,
  ui,
}: PendingApprovalMobileListProps) {
  return (
    <View style={styles.mobileTableList}>
      {slots.map((slot, index) =>
        renderMobileRow(
          slot,
          index,
          approvingLoginId,
          currentPage,
          onApprove,
          pageSize,
          palette,
          ui,
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mobileTableList: {
    gap: 12,
  },
  mobileRowCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  mobileRowCardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  mobileRowTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  mobileRowType: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  mobileFieldRow: {
    gap: 4,
    marginTop: 8,
  },
  mobileFieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  mobileFieldValue: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  mobileActionButton: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 14,
    minHeight: 40,
    paddingHorizontal: 12,
  },
  mobileActionButtonText: {
    fontSize: 12,
    fontWeight: '800',
  },
  mobileActionSpinner: {
    marginRight: 6,
  },
});
