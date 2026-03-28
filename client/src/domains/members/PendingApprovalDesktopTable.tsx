import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { PendingApprovalUiLabels } from './pendingApprovalLabels';
import type {
  PendingMemberSlot,
  ShellPaletteLike,
} from './pendingApprovalTypes';

type PendingApprovalDesktopTableProps = {
  approvingLoginId: string | null;
  onApprove: (loginId: string) => void;
  palette: ShellPaletteLike;
  slots: PendingMemberSlot[];
  ui: PendingApprovalUiLabels;
};

function renderTableCell(
  value: string,
  palette: ShellPaletteLike,
  options: {
    align?: 'left' | 'center' | 'right';
    emphasize?: boolean;
    secondary?: string;
    widthStyle: object;
  },
) {
  return (
    <View
      style={[
        styles.tableCell,
        options.widthStyle,
        {
          borderRightColor: palette.border,
        },
      ]}
    >
      <Text
        numberOfLines={1}
        style={[
          styles.tableCellValue,
          {
            color: options.emphasize ? palette.text : palette.textMuted,
            textAlign: options.align ?? 'left',
          },
        ]}
      >
        {value || '-'}
      </Text>
      {options.secondary ? (
        <Text
          numberOfLines={1}
          style={[
            styles.tableCellSecondary,
            {
              color: palette.textMuted,
              textAlign: options.align ?? 'left',
            },
          ]}
        >
          {options.secondary}
        </Text>
      ) : null}
    </View>
  );
}

function renderTableRow(
  slot: PendingMemberSlot,
  index: number,
  approvingLoginId: string | null,
  onApprove: (loginId: string) => void,
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
      key={`pending-slot-${index}`}
      style={[
        styles.tableRow,
        {
          backgroundColor:
            slot.mode === 'profile'
              ? palette.card
              : slot.hasMember
              ? palette.muted
              : palette.card,
          borderBottomColor: palette.border,
          borderTopColor: palette.border,
        },
      ]}
    >
      {renderTableCell(slot.displayName, palette, {
        emphasize: slot.mode === 'profile',
        widthStyle: styles.colIndex,
      })}
      {renderTableCell(slot.email, palette, {
        widthStyle: styles.colEmail,
      })}
      {renderTableCell(slot.phone, palette, {
        widthStyle: styles.colPhone,
      })}
      {renderTableCell(slot.roleCode, palette, {
        align: 'center',
        emphasize: true,
        widthStyle: styles.colRole,
      })}
      <View style={[styles.tableCell, styles.colAction]}>
        <Pressable
          disabled={isRowDisabled}
          onPress={() => {
            if (slot.hasMember && slot.mode !== 'profile') {
              onApprove(slot.loginId);
            }
          }}
          style={[
            styles.tableActionButton,
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
                style={styles.tableActionSpinner}
              />
            ) : null}
            <Text
              style={[
                styles.tableActionButtonText,
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
    <View
      style={[
        styles.table,
        {
          borderColor: palette.border,
        },
      ]}
    >
      <View
        style={[
          styles.tableHeaderRow,
          {
            backgroundColor: palette.muted,
            borderBottomColor: palette.border,
          },
        ]}
      >
        <View style={[styles.tableHeaderCell, styles.colIndex]}>
          <Text
            numberOfLines={1}
            style={[styles.tableHeaderText, { color: palette.textMuted }]}
          >
            {ui.name}
          </Text>
        </View>
        <View style={[styles.tableHeaderCell, styles.colEmail]}>
          <Text
            numberOfLines={1}
            style={[styles.tableHeaderText, { color: palette.textMuted }]}
          >
            {ui.email}
          </Text>
        </View>
        <View style={[styles.tableHeaderCell, styles.colPhone]}>
          <Text
            numberOfLines={1}
            style={[styles.tableHeaderText, { color: palette.textMuted }]}
          >
            {ui.phone}
          </Text>
        </View>
        <View style={[styles.tableHeaderCell, styles.colRole]}>
          <Text
            numberOfLines={1}
            style={[styles.tableHeaderText, { color: palette.textMuted }]}
          >
            {ui.role}
          </Text>
        </View>
        <View style={[styles.tableHeaderCell, styles.colAction]}>
          <Text
            numberOfLines={1}
            style={[styles.tableHeaderText, { color: palette.textMuted }]}
          >
            {ui.action}
          </Text>
        </View>
      </View>
      <View style={styles.tableBody}>
        {slots.map((slot, index) =>
          renderTableRow(slot, index, approvingLoginId, onApprove, palette, ui),
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  table: {
    alignSelf: 'stretch',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    width: '100%',
  },
  tableHeaderRow: {
    borderBottomWidth: 1,
    flexDirection: 'row',
  },
  tableHeaderCell: {
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 0,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  tableBody: {
    gap: 0,
  },
  tableRow: {
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 56,
  },
  tableCell: {
    borderRightWidth: 1,
    justifyContent: 'center',
    minHeight: 56,
    minWidth: 0,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  tableCellValue: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  tableCellSecondary: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  tableActionButton: {
    alignItems: 'center',
    alignSelf: 'stretch',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 32,
    minWidth: 50,
    paddingHorizontal: 4,
  },
  tableActionButtonText: {
    fontSize: 11,
    fontWeight: '800',
  },
  tableActionSpinner: {
    marginRight: 4,
  },
  colIndex: {
    flex: 1.9,
  },
  colEmail: {
    flex: 2.3,
  },
  colPhone: {
    flex: 1.5,
  },
  colRole: {
    flex: 0.9,
  },
  colAction: {
    borderRightWidth: 0,
    flex: 0.82,
    minWidth: 64,
  },
});
