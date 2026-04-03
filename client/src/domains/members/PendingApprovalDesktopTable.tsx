import React from 'react';
import {ActivityIndicator, Pressable, StyleSheet, Text, View} from 'react-native';

import type {PendingApprovalUiLabels} from './pendingApprovalLabels';
import type {PendingMemberSlot, ShellPaletteLike} from './pendingApprovalTypes';

type PendingApprovalDesktopTableProps = {
  approvingLoginId: string | null;
  onApprove: (slot: PendingMemberSlot) => void;
  palette: ShellPaletteLike;
  slots: PendingMemberSlot[];
  ui: PendingApprovalUiLabels;
};

function renderChartCell(
  value: string,
  palette: ShellPaletteLike,
  options: {
    emphasize?: boolean;
    secondary?: string;
    style: object;
  },
) {
  return (
    <View style={options.style}>
      <Text
        numberOfLines={1}
        style={[
          styles.cellValue,
          {
            color: options.emphasize ? palette.text : palette.textMuted,
          },
        ]}>
        {value || '-'}
      </Text>
      {options.secondary ? (
        <Text
          numberOfLines={1}
          style={[styles.cellSecondary, {color: palette.textMuted}]}>
          {options.secondary}
        </Text>
      ) : null}
    </View>
  );
}

function renderActionCell(
  slot: PendingMemberSlot,
  approvingLoginId: string | null,
  onApprove: (slot: PendingMemberSlot) => void,
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
    <View style={styles.actionCell}>
      <Pressable
        disabled={isRowDisabled}
        onPress={() => {
          if (slot.hasMember && slot.mode !== 'profile') {
            onApprove(slot);
          }
        }}
        style={[
          styles.actionButton,
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
        ]}>
        {isApprovingRow ? (
          <ActivityIndicator
            color={palette.text}
            size="small"
            style={styles.actionSpinner}
          />
        ) : null}
        <Text
          numberOfLines={1}
          style={[
            styles.actionText,
            {
              color:
                slot.hasMember && slot.mode !== 'profile'
                  ? palette.primaryText
                  : palette.textMuted,
            },
          ]}>
          {actionLabel}
        </Text>
      </Pressable>
    </View>
  );
}

function renderChartRow(
  slot: PendingMemberSlot,
  index: number,
  approvingLoginId: string | null,
  onApprove: (slot: PendingMemberSlot) => void,
  palette: ShellPaletteLike,
  ui: PendingApprovalUiLabels,
) {
  return (
    <View
      key={`pending-slot-${index}`}
      style={[
        styles.chartRow,
        {
          backgroundColor:
            slot.mode === 'profile'
              ? palette.card
              : slot.hasMember
              ? `${palette.primary}10`
              : 'transparent',
          borderColor: palette.border,
        },
      ]}>
      {renderChartCell(slot.displayName, palette, {
        emphasize: true,
        secondary: slot.mode === 'profile' ? ui.profile : undefined,
        style: styles.nameCell,
      })}
      {renderChartCell(slot.email, palette, {
        style: styles.emailCell,
      })}
      {renderChartCell(slot.phone, palette, {
        style: styles.phoneCell,
      })}
      {renderChartCell(slot.roleCode, palette, {
        emphasize: true,
        style: styles.roleCell,
      })}
      {renderActionCell(slot, approvingLoginId, onApprove, palette, ui)}
    </View>
  );
}

export function PendingApprovalDesktopTable({
  approvingLoginId,
  onApprove,
  palette,
  slots,
  ui,
}: PendingApprovalDesktopTableProps) {
  return (
    <View style={styles.chartWrap}>
      <View
        style={[
          styles.chartHeaderRow,
          {
            borderColor: palette.border,
          },
        ]}>
        <Text numberOfLines={1} style={[styles.headerName, {color: palette.textMuted}]}>
          {ui.name}
        </Text>
        <Text numberOfLines={1} style={[styles.headerEmail, {color: palette.textMuted}]}>
          {ui.email}
        </Text>
        <Text numberOfLines={1} style={[styles.headerPhone, {color: palette.textMuted}]}>
          {ui.phone}
        </Text>
        <Text numberOfLines={1} style={[styles.headerRole, {color: palette.textMuted}]}>
          {ui.role}
        </Text>
        <Text numberOfLines={1} style={[styles.headerAction, {color: palette.textMuted}]}>
          {ui.action}
        </Text>
      </View>

      <View style={styles.chartBody}>
        {slots.map((slot, index) =>
          renderChartRow(slot, index, approvingLoginId, onApprove, palette, ui),
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chartWrap: {
    width: '100%',
  },
  chartHeaderRow: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  chartBody: {
    gap: 0,
  },
  chartRow: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 50,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  headerName: {
    flex: 2,
    fontSize: 12,
    fontWeight: '700',
  },
  headerEmail: {
    flex: 2.35,
    fontSize: 12,
    fontWeight: '700',
  },
  headerPhone: {
    flex: 1.45,
    fontSize: 12,
    fontWeight: '700',
  },
  headerRole: {
    flex: 0.95,
    fontSize: 12,
    fontWeight: '700',
  },
  headerAction: {
    flex: 0.95,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  nameCell: {
    flex: 2,
    minWidth: 0,
    paddingRight: 12,
  },
  emailCell: {
    flex: 2.35,
    minWidth: 0,
    paddingRight: 12,
  },
  phoneCell: {
    flex: 1.45,
    minWidth: 0,
    paddingRight: 12,
  },
  roleCell: {
    flex: 0.95,
    minWidth: 0,
    paddingRight: 12,
  },
  actionCell: {
    flex: 0.95,
    minWidth: 88,
  },
  cellValue: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  cellSecondary: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 32,
    paddingHorizontal: 10,
  },
  actionText: {
    fontSize: 11,
    fontWeight: '800',
  },
  actionSpinner: {
    marginRight: 4,
  },
});
