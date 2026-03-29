import React from 'react';
import {ActivityIndicator, Pressable, StyleSheet, Text, View} from 'react-native';

import {
  buildAcademyMemberRowActions,
  canEditAcademyMemberProfile,
} from './academyMembersActionModel';
import type {AcademyMembersUiLabels} from './academyMembersLabels';
import type {
  AcademyMemberSlot,
  AcademyMemberStatus,
  ShellPaletteLike,
} from './academyMembersTypes';

type AcademyMembersDesktopTableProps = {
  actorRoleCode: string;
  onEditProfile: (slot: AcademyMemberSlot) => void;
  onAction: (
    loginId: string,
    currentStatus: AcademyMemberStatus,
    nextStatus: AcademyMemberStatus,
  ) => void;
  palette: ShellPaletteLike;
  slots: AcademyMemberSlot[];
  ui: AcademyMembersUiLabels;
  updatingKey: string | null;
};

const NEXT_STATUS_BY_ACTION = {
  activate: 'ACTIVE',
  hold: 'HOLD',
  deactivate: 'INACTIVE',
} as const satisfies Record<string, AcademyMemberStatus>;

function getActionLabel(action: keyof typeof NEXT_STATUS_BY_ACTION, ui: AcademyMembersUiLabels) {
  switch (action) {
    case 'activate':
      return ui.activate;
    case 'hold':
      return ui.hold;
    default:
      return ui.deactivate;
  }
}

function getUpdatingLabel(
  action: keyof typeof NEXT_STATUS_BY_ACTION,
  ui: AcademyMembersUiLabels,
) {
  switch (action) {
    case 'activate':
      return ui.activating;
    case 'hold':
      return ui.holding;
    default:
      return ui.deactivating;
  }
}

export function AcademyMembersDesktopTable({
  actorRoleCode,
  onEditProfile,
  onAction,
  palette,
  slots,
  ui,
  updatingKey,
}: AcademyMembersDesktopTableProps) {
  return (
    <View style={[styles.table, {borderColor: palette.border}]}>
      <View
        style={[
          styles.tableHeaderRow,
          {
            backgroundColor: palette.muted,
            borderBottomColor: palette.border,
          },
        ]}>
        {[
          [ui.name, styles.colIndex],
          [ui.email, styles.colEmail],
          [ui.phone, styles.colPhone],
          [ui.role, styles.colRole],
          [ui.status, styles.colStatus],
          [ui.action, styles.colAction],
        ].map(([label, widthStyle]) => (
          <View key={label} style={[styles.tableHeaderCell, widthStyle]}>
            <Text style={[styles.tableHeaderText, {color: palette.textMuted}]}>
              {label}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.tableBody}>
        {slots.map((slot, index) => {
          const canEditProfile =
            slot.hasMember &&
            canEditAcademyMemberProfile(actorRoleCode, slot.roleCode);
          const actions = slot.hasMember && slot.roleCode !== 'ROOT'
            ? buildAcademyMemberRowActions(slot.statusCode)
            : [];

          return (
            <View
              key={`academy-member-slot-${index}`}
              style={[
                styles.tableRow,
                {
                  backgroundColor: slot.hasMember ? palette.muted : palette.card,
                  borderBottomColor: palette.border,
                  borderTopColor: palette.border,
                },
              ]}>
              <Cell palette={palette} value={slot.displayName} widthStyle={styles.colIndex} />
              <Cell palette={palette} value={slot.email} widthStyle={styles.colEmail} />
              <Cell palette={palette} value={slot.phone} widthStyle={styles.colPhone} />
              <Cell
                align="center"
                palette={palette}
                value={slot.roleCode}
                widthStyle={styles.colRole}
              />
              <Cell
                align="center"
                palette={palette}
                value={slot.statusCode}
                widthStyle={styles.colStatus}
              />
              <View style={[styles.tableCell, styles.colAction, {borderRightColor: palette.border}]}>
                <View style={styles.actionRow}>
                  {canEditProfile ? (
                    <Pressable
                      key="edit-profile"
                      onPress={() => onEditProfile(slot)}
                      style={[
                        styles.tableActionButton,
                        {
                          backgroundColor: palette.card,
                          borderColor: palette.border,
                        },
                      ]}>
                      <Text
                        style={[
                          styles.tableActionButtonText,
                          {color: palette.text},
                        ]}>
                        {ui.editProfile}
                      </Text>
                    </Pressable>
                  ) : null}
                  {actions.map(action => {
                    const nextStatus = NEXT_STATUS_BY_ACTION[action];
                    const actionKey = `${slot.loginId}:${nextStatus}`;
                    const isUpdating = updatingKey === actionKey;

                    return (
                      <Pressable
                        key={action}
                        onPress={() =>
                          onAction(slot.loginId, slot.statusCode, nextStatus)
                        }
                        style={[
                          styles.tableActionButton,
                          {
                            backgroundColor: palette.primary,
                            borderColor: palette.primary,
                          },
                        ]}>
                        {isUpdating ? (
                          <ActivityIndicator
                            color={palette.primaryText}
                            size="small"
                            style={styles.spinner}
                          />
                        ) : null}
                        <Text
                          style={[
                            styles.tableActionButtonText,
                            {color: palette.primaryText},
                          ]}>
                          {isUpdating
                            ? getUpdatingLabel(action, ui)
                            : getActionLabel(action, ui)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function Cell({
  align = 'left',
  palette,
  value,
  widthStyle,
}: {
  align?: 'left' | 'center';
  palette: ShellPaletteLike;
  value: string;
  widthStyle: object;
}) {
  return (
    <View
      style={[
        styles.tableCell,
        widthStyle,
        {
          borderRightColor: palette.border,
        },
      ]}>
      <Text
        numberOfLines={1}
        style={[
          styles.tableCellValue,
          {
            color: palette.text,
            textAlign: align,
          },
        ]}>
        {value || '-'}
      </Text>
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
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tableActionButton: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 32,
    minWidth: 86,
    paddingHorizontal: 8,
  },
  tableActionButtonText: {
    fontSize: 11,
    fontWeight: '800',
  },
  spinner: {
    marginRight: 4,
  },
  colIndex: {
    flex: 1.8,
  },
  colEmail: {
    flex: 2.1,
  },
  colPhone: {
    flex: 1.4,
  },
  colRole: {
    flex: 0.9,
  },
  colStatus: {
    flex: 1,
  },
  colAction: {
    borderRightWidth: 0,
    flex: 1.8,
  },
});
