import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Pressable, Text, View} from 'react-native';

import {ActionButton} from '../../shared/components/ActionButton';
import {
  approveTeacherReservation,
  cancelTeacherReservation,
  fetchTeacherReservationList,
  searchPresetInventory,
  type PresetInventoryItemApiResult,
  type TeacherReservationRecordApiResult,
} from '../../shared/lib/accountApi';
import {
  formatUtcDateKeyInTimezone,
  formatUtcTimeInTimezone,
  RESERVATION_TIMEZONE_OPTIONS,
} from '../../shared/lib/reservationTimezone';
import {
  buildTeacherReservationItemMatches,
  parseTeacherReservationPresets,
} from './teacherReservationMatching';
import type {PresetItems} from '../teacher-preset/presetTypes';

type PaletteLike = {
  border: string;
  card?: string;
  muted: string;
  primary: string;
  primaryText: string;
  soft: string;
  text: string;
  textMuted: string;
};

type UiComponents = {
  BodyStrong: React.ComponentType<any>;
  BodyText: React.ComponentType<any>;
  Card: React.ComponentType<any>;
  FieldLabel: React.ComponentType<any>;
  OptionChip: React.ComponentType<any>;
};

type TeacherReservationTexts = {
  cancel: string;
  reservationNote: string;
  reservationPreset: string;
  reservationStatusConfirmed: string;
  reservationStatusPending: string;
  reservationStatusCanceled: string;
  reservationTimezone: string;
  reservationViewApprove: string;
  reservationViewCanceled: string;
  reservationViewEmpty: string;
  reservationViewMismatchGuide: string;
  reservationViewNoPreference: string;
  reservationViewPresetItems: string;
  reservationViewPending: string;
  reservationViewReject: string;
  reservationViewSkin: string;
  reservationViewStudent: string;
  reservationViewUpcoming: string;
};

type Props = {
  palette: PaletteLike;
  presetValue: string;
  styles: any;
  teacherLoginId?: string;
  texts: TeacherReservationTexts;
  title: string;
  ui: UiComponents;
};

type ReservationRecord = {
  date: string;
  id: string;
  passRemainingCount?: string;
  passTotalCount?: string;
  preferenceRanges?: string;
  presetId?: string;
  skinCValue?: string;
  skinHValue?: string;
  skinLValue?: string;
  skinTraits?: string;
  startsAtUtc?: string;
  status: 'confirmed' | 'pending' | 'canceled';
  studentLoginId?: string;
  studentName?: string;
  time: string;
};

type PresetOption = {
  id: string;
  items: PresetItems;
  name: string;
  note: string;
};

type CalendarCell = {
  date: Date;
  dateKey: string;
  inCurrentMonth: boolean;
};

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function normalizeTeacherReservationRecords(
  reservations: TeacherReservationRecordApiResult[] | undefined,
  displayTimezone: string,
): ReservationRecord[] {
  return (reservations ?? [])
    .map(reservation => ({
      date:
        formatUtcDateKeyInTimezone(reservation.startsAtUtc, displayTimezone) ||
        reservation.date,
      id: reservation.id,
      passRemainingCount: reservation.passRemainingCount,
      passTotalCount: reservation.passTotalCount,
      preferenceRanges: reservation.preferenceRanges,
      presetId: reservation.presetId,
      skinCValue: reservation.skinCValue,
      skinHValue: reservation.skinHValue,
      skinLValue: reservation.skinLValue,
      skinTraits: reservation.skinTraits,
      startsAtUtc: reservation.startsAtUtc,
      status:
        reservation.status === 'confirmed'
          ? 'confirmed'
          : reservation.status === 'canceled'
          ? 'canceled'
          : 'pending',
      studentLoginId: reservation.studentLoginId,
      studentName: reservation.studentName,
      time:
        formatUtcTimeInTimezone(reservation.startsAtUtc, displayTimezone) ||
        reservation.time,
    }));
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatMonthLabel(date: Date) {
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function buildCalendarCells(monthDate: Date) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({length: 42}, (_, index): CalendarCell => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      date,
      dateKey: formatDateKey(date),
      inCurrentMonth: date.getMonth() === monthDate.getMonth(),
    };
  });
}

function formatStudentSkinSummary(reservation: ReservationRecord) {
  const values = [reservation.skinLValue, reservation.skinCValue, reservation.skinHValue].map(
    value => value?.trim() || '-',
  );
  return `L ${values[0]} / C ${values[1]} / H ${values[2]}`;
}

export function TeacherReservationApprovalSection({
  palette,
  presetValue,
  texts,
  teacherLoginId,
  title,
  ui: {BodyStrong, BodyText, Card, FieldLabel, OptionChip},
}: Props) {
  const [reservations, setReservations] = useState<ReservationRecord[]>([]);
  const [inventoryItems, setInventoryItems] = useState<PresetInventoryItemApiResult[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [displayTimezone, setDisplayTimezone] = useState('Asia/Seoul');
  const [selectedPresetByReservation, setSelectedPresetByReservation] = useState<
    Record<string, string>
  >({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const presetOptions = useMemo<PresetOption[]>(
    () => parseTeacherReservationPresets(presetValue),
    [presetValue],
  );

  const loadReservations = useCallback(async () => {
    const result = await fetchTeacherReservationList({teacherLoginId});
    if (result.status !== 'ok') {
      setReservations([]);
      setErrorMessage(result.error ?? result.message);
      return;
    }

    const nextReservations = normalizeTeacherReservationRecords(
      result.reservations,
      displayTimezone,
    );
    setErrorMessage(null);
    setReservations(nextReservations);

    const firstPendingDate =
      nextReservations.find(reservation => reservation.status === 'pending')?.date ??
      nextReservations[0]?.date ??
      null;
    if (firstPendingDate) {
      setSelectedDate(currentSelectedDate =>
        currentSelectedDate &&
        nextReservations.some(reservation => reservation.date === currentSelectedDate)
          ? currentSelectedDate
          : firstPendingDate,
      );
      setVisibleMonth(currentMonth => {
        const selectedMonth = parseDateKey(firstPendingDate);
        if (
          currentMonth.getFullYear() === selectedMonth.getFullYear() &&
          currentMonth.getMonth() === selectedMonth.getMonth()
        ) {
          return currentMonth;
        }
        return new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
      });
    }
  }, [displayTimezone, teacherLoginId]);

  const loadInventoryItems = useCallback(async () => {
    const result = await searchPresetInventory({});
    if (result.status !== 'ok') {
      setInventoryItems([]);
      return;
    }

    setInventoryItems(result.items ?? []);
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      await Promise.all([loadReservations(), loadInventoryItems()]);
    };

    loadInitialData().catch(() => undefined);
  }, [loadInventoryItems, loadReservations]);

  const reservationsByDate = useMemo(() => {
    return reservations.reduce<Record<string, ReservationRecord[]>>((nextMap, reservation) => {
      const current = nextMap[reservation.date] ?? [];
      current.push(reservation);
      nextMap[reservation.date] = current.sort((left, right) =>
        left.time.localeCompare(right.time),
      );
      return nextMap;
    }, {});
  }, [reservations]);

  const calendarCells = useMemo(() => buildCalendarCells(visibleMonth), [visibleMonth]);
  const selectedReservations = useMemo(
    () => (selectedDate ? reservationsByDate[selectedDate] ?? [] : []),
    [reservationsByDate, selectedDate],
  );
  const pendingReservations = useMemo(
    () => selectedReservations.filter(reservation => reservation.status === 'pending'),
    [selectedReservations],
  );
  const confirmedReservations = useMemo(
    () => selectedReservations.filter(reservation => reservation.status === 'confirmed'),
    [selectedReservations],
  );
  const canceledReservations = useMemo(
    () => selectedReservations.filter(reservation => reservation.status === 'canceled'),
    [selectedReservations],
  );

  const runMutation = async (
    reservationId: string,
    payload: {presetId?: string; teacherLoginId?: string},
    mutation: (payload: {
      reservationId: string;
      presetId?: string;
      teacherLoginId?: string;
    }) => Promise<{
      error?: string;
      message: string;
      status: string;
    }>,
  ) => {
    setIsBusy(true);
    setErrorMessage(null);
    try {
      const result = await mutation({reservationId, ...payload});
      if (result.status !== 'ok') {
        setErrorMessage(result.error ?? result.message);
        return;
      }

      setErrorMessage(null);
      await loadReservations();
    } finally {
      setIsBusy(false);
    }
  };

  const renderPresetMatchBlock = (reservation: ReservationRecord) => {
    const selectedPreset = presetOptions.find(
      option => option.id === (selectedPresetByReservation[reservation.id] ?? reservation.presetId),
    );
    if (!selectedPreset) {
      return null;
    }

    const itemMatches = buildTeacherReservationItemMatches({
      inventoryItems,
      preferenceRangesValue: reservation.preferenceRanges,
      presetItems: selectedPreset.items,
    });

    return (
      <View style={{gap: 6}}>
        <FieldLabel palette={palette}>{texts.reservationViewPresetItems}</FieldLabel>
        {selectedPreset.note ? (
          <BodyText palette={palette}>{`${texts.reservationNote}: ${selectedPreset.note}`}</BodyText>
        ) : null}
        <Text style={{color: palette.textMuted, fontSize: 12}}>
          {texts.reservationViewMismatchGuide}
        </Text>
        {itemMatches.length === 0 ? (
          <BodyText palette={palette}>-</BodyText>
        ) : (
          <View style={{gap: 4}}>
            {itemMatches.map(item => (
              <Text
                key={`${reservation.id}-${item.category}-${item.sku}`}
                style={{
                  color:
                    item.reason === 'mismatch' ? '#bc4749' : palette.text,
                  fontSize: 12,
                  fontWeight: item.reason === 'mismatch' ? '700' : '500',
                }}>
                {`${item.category} · ${item.sku} · ${item.itemName}`}
                {item.reason === 'no-preference'
                  ? ` · ${texts.reservationViewNoPreference}`
                  : ''}
              </Text>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderReservationRow = (
    reservation: ReservationRecord,
    mode: 'pending' | 'confirmed' | 'canceled',
  ) => (
    <View
      key={reservation.id}
      style={{
        backgroundColor: palette.muted,
        borderColor: palette.border,
        borderRadius: 12,
        borderWidth: 1,
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
      }}>
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          gap: 12,
        }}>
        <View style={{flex: 1, gap: 4}}>
          <BodyStrong palette={palette}>{reservation.time}</BodyStrong>
          <View style={{alignItems: 'center', flexDirection: 'row', gap: 6}}>
            <FieldLabel palette={palette}>{texts.reservationViewStudent}</FieldLabel>
            <BodyText palette={palette}>{reservation.studentName ?? '-'}</BodyText>
          </View>
          <BodyText palette={palette}>{`${texts.reservationViewSkin}: ${formatStudentSkinSummary(reservation)}`}</BodyText>
        </View>
        <Text
          style={{
            color:
              reservation.status === 'confirmed'
                ? palette.primary
                : reservation.status === 'canceled'
                ? '#bc4749'
                : palette.textMuted,
            fontSize: 11,
            fontWeight: '600',
          }}>
          {reservation.status === 'confirmed'
            ? texts.reservationStatusConfirmed
            : reservation.status === 'canceled'
            ? texts.reservationStatusCanceled
            : texts.reservationStatusPending}
        </Text>
      </View>
      {mode !== 'canceled' ? (
        <View style={{flexDirection: 'row', gap: 8}}>
          {mode === 'pending' ? (
            <>
              <ActionButton
                backgroundColor={palette.primary}
                isLoading={isBusy}
                label={texts.reservationViewApprove}
                onPress={() =>
                  runMutation(
                    reservation.id,
                    {
                      presetId: selectedPresetByReservation[reservation.id],
                      teacherLoginId,
                    },
                    approveTeacherReservation,
                  )
                }
                style={{paddingHorizontal: 14, paddingVertical: 10}}
                testID={`teacher-reservation-approve-${reservation.id}`}
                textColor={palette.primaryText}
              />
              <ActionButton
                backgroundColor={palette.soft}
                isLoading={isBusy}
                label={texts.reservationViewReject}
                onPress={() =>
                  runMutation(reservation.id, {teacherLoginId}, cancelTeacherReservation)
                }
                style={{paddingHorizontal: 14, paddingVertical: 10}}
                testID={`teacher-reservation-cancel-${reservation.id}`}
                textColor={palette.text}
              />
            </>
          ) : (
            <ActionButton
              backgroundColor={palette.soft}
              isLoading={isBusy}
              label={texts.cancel}
              onPress={() =>
                runMutation(reservation.id, {teacherLoginId}, cancelTeacherReservation)
              }
              style={{paddingHorizontal: 14, paddingVertical: 10}}
              testID={`teacher-reservation-cancel-${reservation.id}`}
              textColor={palette.text}
            />
          )}
        </View>
      ) : null}
      {mode === 'pending' ? (
        <View style={{gap: 6}}>
          <FieldLabel palette={palette}>{texts.reservationPreset}</FieldLabel>
          <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
            <OptionChip
              active={(selectedPresetByReservation[reservation.id] ?? '') === ''}
              label={texts.reservationPreset}
              onPress={() =>
                setSelectedPresetByReservation(current => ({
                  ...current,
                  [reservation.id]: '',
                }))
              }
              palette={palette}
              testID={`teacher-reservation-preset-${reservation.id}-empty`}
            />
            {presetOptions.map(option => (
              <OptionChip
                key={option.id}
                active={
                  (selectedPresetByReservation[reservation.id] ?? reservation.presetId ?? '') ===
                  option.id
                }
                label={option.name}
                onPress={() =>
                  setSelectedPresetByReservation(current => ({
                    ...current,
                    [reservation.id]: option.id,
                  }))
                }
                palette={palette}
                testID={`teacher-reservation-preset-${reservation.id}-${option.id}`}
              />
            ))}
          </View>
        </View>
      ) : null}
      {renderPresetMatchBlock(reservation)}
    </View>
  );

  return (
    <View style={{gap: 16}}>
      <Card palette={palette} title={title}>
        <View style={{gap: 14}}>
          <View>
            <FieldLabel palette={palette}>{texts.reservationTimezone}</FieldLabel>
            <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6}}>
              {RESERVATION_TIMEZONE_OPTIONS.map(option => (
                <OptionChip
                  key={option}
                  active={displayTimezone === option}
                  label={option}
                  onPress={() => setDisplayTimezone(option)}
                  palette={palette}
                  testID={`teacher-reservation-timezone-${option}`}
                />
              ))}
            </View>
          </View>
          <View
            style={{
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}>
            <Pressable
              onPress={() =>
                setVisibleMonth(
                  current =>
                    new Date(current.getFullYear(), current.getMonth() - 1, 1),
                )
              }
              style={{
                backgroundColor: palette.soft,
                borderColor: palette.border,
                borderRadius: 10,
                borderWidth: 1,
                paddingHorizontal: 10,
                paddingVertical: 6,
              }}
              testID="teacher-reservation-month-prev">
              <Text style={{color: palette.text, fontSize: 12}}>{'<'}</Text>
            </Pressable>
            <BodyStrong palette={palette}>{formatMonthLabel(visibleMonth)}</BodyStrong>
            <Pressable
              onPress={() =>
                setVisibleMonth(
                  current =>
                    new Date(current.getFullYear(), current.getMonth() + 1, 1),
                )
              }
              style={{
                backgroundColor: palette.soft,
                borderColor: palette.border,
                borderRadius: 10,
                borderWidth: 1,
                paddingHorizontal: 10,
                paddingVertical: 6,
              }}
              testID="teacher-reservation-month-next">
              <Text style={{color: palette.text, fontSize: 12}}>{'>'}</Text>
            </Pressable>
          </View>

          <View style={{flexDirection: 'row'}}>
            {DAY_LABELS.map(dayLabel => (
              <View key={dayLabel} style={{alignItems: 'center', flex: 1, paddingVertical: 4}}>
                <Text style={{color: palette.textMuted, fontSize: 11, fontWeight: '600'}}>
                  {dayLabel}
                </Text>
              </View>
            ))}
          </View>

          <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
            {calendarCells.map(cell => {
              const dayReservations = reservationsByDate[cell.dateKey] ?? [];
              const hasPending = dayReservations.some(
                reservation => reservation.status === 'pending',
              );
              const hasConfirmed = dayReservations.some(
                reservation => reservation.status === 'confirmed',
              );
              const hasCanceled = dayReservations.some(
                reservation => reservation.status === 'canceled',
              );
              const isSelected = selectedDate === cell.dateKey;

              return (
                <Pressable
                  key={cell.dateKey}
                  onPress={() => setSelectedDate(cell.dateKey)}
                  style={{
                    borderColor: isSelected ? palette.primary : palette.border,
                    borderRadius: 12,
                    borderWidth: 1,
                    marginBottom: 8,
                    paddingHorizontal: 6,
                    paddingVertical: 8,
                    width: '14.2857%',
                  }}
                  testID={`teacher-reservation-date-${cell.dateKey}`}>
                  <View style={{alignItems: 'center', gap: 4}}>
                    <Text
                      style={{
                        color: cell.inCurrentMonth ? palette.text : palette.textMuted,
                        fontSize: 12,
                        fontWeight: isSelected ? '700' : '500',
                      }}>
                      {cell.date.getDate()}
                    </Text>
                    <View style={{alignItems: 'center', flexDirection: 'row', gap: 4}}>
                      {hasPending ? (
                        <View
                          style={{
                            backgroundColor: '#6b7280',
                            borderRadius: 999,
                            height: 7,
                            width: 7,
                          }}
                        />
                      ) : null}
                      {hasConfirmed ? (
                        <View
                          style={{
                            backgroundColor: '#2f9e44',
                            borderRadius: 999,
                            height: 7,
                            width: 7,
                          }}
                        />
                      ) : null}
                      {hasCanceled ? (
                        <View
                          style={{
                            backgroundColor: '#bc4749',
                            borderRadius: 999,
                            height: 7,
                            width: 7,
                          }}
                        />
                      ) : null}
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <BodyText palette={palette}>
            {selectedDate && selectedReservations.length > 0
              ? `${selectedDate} · ${selectedReservations.length}`
              : texts.reservationViewEmpty}
          </BodyText>
        </View>
      </Card>

      {errorMessage ? (
        <View
          style={{
            backgroundColor: palette.soft,
            borderColor: palette.border,
            borderRadius: 12,
            borderWidth: 1,
            paddingHorizontal: 14,
            paddingVertical: 12,
          }}>
          <BodyText palette={palette}>{errorMessage}</BodyText>
        </View>
      ) : null}

      <Card
        palette={palette}
        title={`${texts.reservationViewPending}${selectedDate ? ` · ${selectedDate}` : ''}`}>
        {pendingReservations.length === 0 ? (
          <BodyText palette={palette}>{texts.reservationViewEmpty}</BodyText>
        ) : (
          <View style={{gap: 10, marginTop: 4}}>
            {pendingReservations.map(reservation =>
              renderReservationRow(reservation, 'pending'),
            )}
          </View>
        )}
      </Card>

      <Card palette={palette} title={texts.reservationViewUpcoming}>
        {confirmedReservations.length === 0 ? (
          <BodyText palette={palette}>{texts.reservationViewEmpty}</BodyText>
        ) : (
          <View style={{gap: 10, marginTop: 4}}>
            {confirmedReservations.map(reservation =>
              renderReservationRow(reservation, 'confirmed'),
            )}
          </View>
        )}
      </Card>

      <Card palette={palette} title={texts.reservationViewCanceled}>
        {canceledReservations.length === 0 ? (
          <BodyText palette={palette}>{texts.reservationViewEmpty}</BodyText>
        ) : (
          <View style={{gap: 10, marginTop: 4}}>
            {canceledReservations.map(reservation =>
              renderReservationRow(reservation, 'canceled'),
            )}
          </View>
        )}
      </Card>
    </View>
  );
}
