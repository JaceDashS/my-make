import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {canEditAcademyMemberProfile} from './academyMembersActionModel';
import type {AcademyMembersUiLabels} from './academyMembersLabels';
import type {AcademyMemberSlot, ShellPaletteLike} from './academyMembersTypes';

type AcademyMembersDesktopTableProps = {
  actorRoleCode: string;
  onEditProfile: (slot: AcademyMemberSlot) => void;
  palette: ShellPaletteLike;
  renderInlineEditor?: (slot: AcademyMemberSlot) => React.ReactNode;
  slots: AcademyMemberSlot[];
  ui: AcademyMembersUiLabels;
};

function renderCell(
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
          {color: options.emphasize ? palette.text : palette.textMuted},
        ]}>
        {value || '-'}
      </Text>
      {options.secondary ? (
        <Text numberOfLines={1} style={[styles.cellSecondary, {color: palette.textMuted}]}>
          {options.secondary}
        </Text>
      ) : null}
    </View>
  );
}

export function AcademyMembersDesktopTable({
  actorRoleCode,
  onEditProfile,
  palette,
  renderInlineEditor,
  slots,
  ui,
}: AcademyMembersDesktopTableProps) {
  return (
    <View style={styles.chartWrap}>
      <View style={[styles.chartHeaderRow, {borderColor: palette.border}]}>
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
        <Text numberOfLines={1} style={[styles.headerStatus, {color: palette.textMuted}]}>
          {ui.status}
        </Text>
        <Text numberOfLines={1} style={[styles.headerAction, {color: palette.textMuted}]}>
          {ui.action}
        </Text>
      </View>

      <View style={styles.chartBody}>
        {slots.map((slot, index) => {
          const canEdit =
            slot.hasMember &&
            canEditAcademyMemberProfile(actorRoleCode, slot.roleCode);

          return (
            <React.Fragment key={`academy-member-slot-${index}`}>
              <View
                style={[
                  styles.chartRow,
                  {
                    backgroundColor: slot.hasMember ? `${palette.primary}10` : 'transparent',
                    borderColor: palette.border,
                  },
                ]}>
                {renderCell(slot.displayName, palette, {
                  emphasize: true,
                  style: styles.nameCell,
                })}
                {renderCell(slot.email, palette, {
                  style: styles.emailCell,
                })}
                {renderCell(slot.phone, palette, {
                  style: styles.phoneCell,
                })}
                {renderCell(slot.roleCode, palette, {
                  emphasize: true,
                  style: styles.roleCell,
                })}
                {renderCell(slot.statusCode, palette, {
                  style: styles.statusCell,
                })}
                <View style={styles.actionCell}>
                  {canEdit ? (
                    <Pressable
                      onPress={() => onEditProfile(slot)}
                      style={[
                        styles.actionButton,
                        {
                          backgroundColor: palette.primary,
                          borderColor: palette.primary,
                        },
                      ]}>
                      <Text style={[styles.actionText, {color: palette.primaryText}]}>
                        {ui.editProfile}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
              {renderInlineEditor ? renderInlineEditor(slot) : null}
            </React.Fragment>
          );
        })}
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
    flex: 1.8,
    fontSize: 12,
    fontWeight: '700',
  },
  headerEmail: {
    flex: 2.1,
    fontSize: 12,
    fontWeight: '700',
  },
  headerPhone: {
    flex: 1.35,
    fontSize: 12,
    fontWeight: '700',
  },
  headerRole: {
    flex: 0.9,
    fontSize: 12,
    fontWeight: '700',
  },
  headerStatus: {
    flex: 1,
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
    flex: 1.8,
    minWidth: 0,
    paddingRight: 12,
  },
  emailCell: {
    flex: 2.1,
    minWidth: 0,
    paddingRight: 12,
  },
  phoneCell: {
    flex: 1.35,
    minWidth: 0,
    paddingRight: 12,
  },
  roleCell: {
    flex: 0.9,
    minWidth: 0,
    paddingRight: 12,
  },
  statusCell: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },
  actionCell: {
    flex: 0.95,
    minWidth: 96,
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
    justifyContent: 'center',
    minHeight: 32,
    paddingHorizontal: 10,
  },
  actionText: {
    fontSize: 11,
    fontWeight: '800',
  },
});
