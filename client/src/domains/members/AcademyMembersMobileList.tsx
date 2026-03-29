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

type AcademyMembersMobileListProps = {
  actorRoleCode: string;
  currentPage: number;
  onEditProfile: (slot: AcademyMemberSlot) => void;
  onAction: (
    loginId: string,
    currentStatus: AcademyMemberStatus,
    nextStatus: AcademyMemberStatus,
  ) => void;
  pageSize: number;
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

export function AcademyMembersMobileList({
  actorRoleCode,
  currentPage,
  onEditProfile,
  onAction,
  pageSize,
  palette,
  slots,
  ui,
  updatingKey,
}: AcademyMembersMobileListProps) {
  return (
    <View style={styles.mobileTableList}>
      {slots.map((slot, index) => {
        const canEditProfile =
          slot.hasMember &&
          canEditAcademyMemberProfile(actorRoleCode, slot.roleCode);
        const actions = slot.hasMember && slot.roleCode !== 'ROOT'
          ? buildAcademyMemberRowActions(slot.statusCode)
          : [];

        return (
          <View
            key={`academy-mobile-slot-${index}`}
            style={[
              styles.mobileRowCard,
              {
                backgroundColor: slot.hasMember ? palette.muted : palette.card,
                borderColor: palette.border,
              },
            ]}>
            <View style={styles.mobileRowCardHeader}>
              <Text style={[styles.mobileRowTitle, {color: palette.text}]}>
                {ui.member} {(currentPage - 1) * pageSize + index + 1}
              </Text>
              <Text style={[styles.mobileRowType, {color: palette.textMuted}]}>
                {slot.statusCode}
              </Text>
            </View>
            <Field palette={palette} label={ui.name} value={slot.displayName} />
            <Field palette={palette} label={ui.email} value={slot.email} />
            <Field palette={palette} label={ui.phone} value={slot.phone} />
            <Field palette={palette} label={ui.role} value={slot.roleCode} />
            <View style={styles.actionWrap}>
              {canEditProfile ? (
                <Pressable
                  key="edit-profile"
                  onPress={() => onEditProfile(slot)}
                  style={[
                    styles.mobileActionButton,
                    {
                      backgroundColor: palette.card,
                      borderColor: palette.border,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.mobileActionButtonText,
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
                    onPress={() => onAction(slot.loginId, slot.statusCode, nextStatus)}
                    style={[
                      styles.mobileActionButton,
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
                        styles.mobileActionButtonText,
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
        );
      })}
    </View>
  );
}

function Field({
  palette,
  label,
  value,
}: {
  palette: ShellPaletteLike;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.mobileFieldRow}>
      <Text style={[styles.mobileFieldLabel, {color: palette.textMuted}]}>
        {label}
      </Text>
      <Text style={[styles.mobileFieldValue, {color: palette.text}]}>
        {value || '-'}
      </Text>
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
  actionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  mobileActionButton: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 40,
    minWidth: 104,
    paddingHorizontal: 12,
  },
  mobileActionButtonText: {
    fontSize: 12,
    fontWeight: '800',
  },
  spinner: {
    marginRight: 6,
  },
});
