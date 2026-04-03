import React, {useEffect, useMemo, useState} from 'react';
import {Image, Pressable, Text, View} from 'react-native';

import {ActionButton} from '../../shared/components/ActionButton';
import {
  cancelStudentReservation,
  createStudentReservation,
  fetchStudentReservationAvailability,
  fetchStudentReservationList,
  searchPresetInventory,
  type PresetInventoryItemApiResult,
  type StudentReservationRecordApiResult,
  type StudentReservationSlotApiResult,
} from '../../shared/lib/accountApi';
import {
  formatUtcDateKeyInTimezone,
  formatUtcTimeInTimezone,
  RESERVATION_TIMEZONE_OPTIONS,
} from '../../shared/lib/reservationTimezone';

type PaletteLike = {
  border: string;
  card: string;
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

type ReservationTexts = {
  cancel: string;
  reservationTimezone: string;
  reservationTeacher: string;
  reservationSelectDate: string;
  reservationTimeSlots: string;
  reservationConfirm: string;
  reservationDate: string;
  reservationTime: string;
  reservationBookLesson: string;
  reservationBooked: string;
  reservationBookedBody: string;
  reservationMyList: string;
  reservationNone: string;
  reservationSlotTaken: string;
  reservationSlotBooked: string;
  reservationStatusConfirmed: string;
  reservationStatusPending: string;
  reservationStatusCanceled: string;
  reservationDetails: string;
  reservationHideDetails: string;
  reservationPreset: string;
  reservationNote: string;
  reservationCosmetics: string;
  reservationNoCosmetics: string;
  presetCategoryBaseFoundation: string;
  presetCategoryBlush: string;
  presetCategoryLipColor: string;
  presetCategoryEyeshadow: string;
  presetCategoryContour: string;
  presetCategoryHighlighter: string;
  presetCategoryEtc: string;
};

type ReservationPreset = NonNullable<StudentReservationRecordApiResult['preset']>;

type Props = {
  language: 'ja' | 'en';
  palette: PaletteLike;
  studentLoginId?: string;
  styles: any;
  teacherName: string;
  texts: ReservationTexts;
  title: string;
  ui: UiComponents;
};

type MockReservation = {
  id: string;
  date: string;
  time: string;
  status: 'confirmed' | 'pending' | 'canceled';
};

const DAY_LABELS_JA = ['日', '月', '火', '水', '木', '金', '土'];
const DAY_LABELS_EN = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const WEEKEND_INDICES = new Set([0, 6]);

type ReservationSlot = StudentReservationSlotApiResult & {
  startsAtUtc?: string;
};
type ReservationRecord = MockReservation & {
  presetId?: string;
  preset?: ReservationPreset;
  startsAtUtc?: string;
  teacherName?: string;
};

type InventoryLookupItem = PresetInventoryItemApiResult;

type CalendarCell = {
  date: Date;
  dateKey: string;
  inCurrentMonth: boolean;
};

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
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

export function StudentReservationSection({
  language,
  palette,
  studentLoginId,
  styles,
  teacherName,
  texts,
  title,
  ui: {BodyStrong, BodyText, Card, FieldLabel, OptionChip},
}: Props) {
  const dayLabels = language === 'ja' ? DAY_LABELS_JA : DAY_LABELS_EN;
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [selectedDate, setSelectedDate] = useState<string | null>(
    formatDateKey(new Date()),
  );
  const [displayTimezone, setDisplayTimezone] = useState('Asia/Seoul');
  const [selectedSlot, setSelectedSlot] = useState<ReservationSlot | null>(null);
  const [slots, setSlots] = useState<ReservationSlot[]>([]);
  const [reservations, setReservations] = useState<ReservationRecord[]>([]);
  const [inventoryLookup, setInventoryLookup] = useState<Record<string, InventoryLookupItem>>({});
  const [bookingDone, setBookingDone] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expandedReservationId, setExpandedReservationId] = useState<string | null>(null);

  const reservationsByDate = useMemo(() => {
    return reservations.reduce<Record<string, ReservationRecord[]>>((nextMap, reservation) => {
      const current = nextMap[reservation.date] ?? [];
      current.push(reservation);
      nextMap[reservation.date] = current;
      return nextMap;
    }, {});
  }, [reservations]);
  const calendarCells = useMemo(() => buildCalendarCells(visibleMonth), [visibleMonth]);

  const loadReservations = async () => {
    const result = await fetchStudentReservationList(
      studentLoginId ? {studentLoginId} : undefined,
    );
    if (result.status !== 'ok') {
      setReservations([]);
      setErrorMessage(result.error ?? result.message);
      return;
    }

    setErrorMessage(null);
    setReservations(
      (result.reservations ?? []).map((reservation: StudentReservationRecordApiResult) => ({
        date:
          formatUtcDateKeyInTimezone(reservation.startsAtUtc, displayTimezone) ||
          reservation.date,
        id: reservation.id,
        presetId: reservation.presetId,
        preset: reservation.preset,
        startsAtUtc: reservation.startsAtUtc,
        status:
          reservation.status === 'confirmed'
            ? 'confirmed'
            : reservation.status === 'canceled'
            ? 'canceled'
            : 'pending',
        teacherName: reservation.teacherName,
        time:
          formatUtcTimeInTimezone(reservation.startsAtUtc, displayTimezone) ||
          reservation.time,
      })),
    );
  };

  const loadAvailability = async (date: string) => {
    const result = await fetchStudentReservationAvailability({
      date,
      ...(studentLoginId ? {studentLoginId} : {}),
      timezone: displayTimezone,
    });
    if (result.status !== 'ok') {
      setSlots([]);
      setErrorMessage(result.error ?? result.message);
      return;
    }

    const nextSlots = (result.slots ?? []).map(slot => ({
      ...slot,
      startTime:
        formatUtcTimeInTimezone(slot.startsAtUtc, displayTimezone) || slot.startTime,
    }));

    setErrorMessage(nextSlots.length === 0 ? result.message ?? null : null);
    setSlots(
      nextSlots,
    );
  };

  const loadPresetInventory = async () => {
    const result = await searchPresetInventory({});
    if (result.status !== 'ok') {
      setInventoryLookup({});
      return;
    }

    const nextLookup = (result.items ?? []).reduce<Record<string, InventoryLookupItem>>(
      (map, item) => {
        map[item.sku] = item;
        return map;
      },
      {},
    );
    setInventoryLookup(nextLookup);
  };

  useEffect(() => {
    void loadReservations();
    void loadPresetInventory();
  }, [displayTimezone, studentLoginId]);

  useEffect(() => {
    if (!selectedDate) {
      setSlots([]);
      return;
    }

    setSelectedSlot(null);
    void loadAvailability(selectedDate);
  }, [displayTimezone, selectedDate, studentLoginId]);

  const handleBook = () => {
    if (!selectedDate || !selectedSlot) return;
    setIsBusy(true);
    setErrorMessage(null);
    void createStudentReservation({
      startsAtUtc: selectedSlot.startsAtUtc,
      ...(studentLoginId ? {studentLoginId} : {}),
      timezone: displayTimezone,
    })
      .then(async result => {
        if (result.status !== 'ok') {
          setBookingDone(false);
          setErrorMessage(result.error ?? result.message);
          return;
        }

        setBookingDone(true);
        setErrorMessage(null);
        setSelectedSlot(null);
        await loadReservations();
        await loadAvailability(selectedDate);
        setTimeout(() => setBookingDone(false), 3000);
      })
      .finally(() => {
        setIsBusy(false);
      });
  };

  const handleCancel = (id: string) => {
    setIsBusy(true);
    setErrorMessage(null);
    void cancelStudentReservation({
      reservationId: id,
      ...(studentLoginId ? {studentLoginId} : {}),
    })
      .then(async result => {
        if (result.status !== 'ok') {
          setErrorMessage(result.error ?? result.message);
          return;
        }

        setErrorMessage(null);
        await loadReservations();
        if (selectedDate) {
          await loadAvailability(selectedDate);
        }
      })
      .finally(() => {
        setIsBusy(false);
      });
  };

  const selectedSlotLabel = selectedSlot?.startTime ?? null;

  const presetCategoryLabels: Record<string, string> = {
    base_foundation: texts.presetCategoryBaseFoundation,
    blush: texts.presetCategoryBlush,
    contour: texts.presetCategoryContour,
    etc: texts.presetCategoryEtc,
    eyeshadow: texts.presetCategoryEyeshadow,
    highlighter: texts.presetCategoryHighlighter,
    lip_color: texts.presetCategoryLipColor,
  };

  const renderPresetDetails = (reservation: ReservationRecord) => {
    const preset = reservation.preset;
    const presetItems = Object.entries(preset?.items ?? {}).filter(
      ([, skus]) => Array.isArray(skus) && skus.length > 0,
    );

    if (!preset && reservation.presetId?.trim()) {
      return (
        <BodyText palette={palette}>{`${texts.reservationPreset}: ${reservation.presetId}`}</BodyText>
      );
    }

    return (
      <View
        style={{
          backgroundColor: palette.card ?? palette.muted,
          borderColor: palette.border,
          borderRadius: 12,
          borderWidth: 1,
          gap: 8,
          padding: 12,
        }}>
        {preset ? (
          <>
            <BodyText palette={palette}>{`${texts.reservationPreset}: ${preset.name}`}</BodyText>
            {preset.note ? (
              <BodyText palette={palette}>{`${texts.reservationNote}: ${preset.note}`}</BodyText>
            ) : null}
          </>
        ) : null}
        <FieldLabel palette={palette}>{texts.reservationCosmetics}</FieldLabel>
        {presetItems.length === 0 ? (
          <BodyText palette={palette}>{texts.reservationNoCosmetics}</BodyText>
        ) : (
          <View style={{gap: 8}}>
            {presetItems.flatMap(([category, skus]) =>
              (skus ?? []).map(sku => {
                const item = inventoryLookup[sku];
                const categoryLabel = presetCategoryLabels[category] ?? category;
                return (
                  <View
                    key={`${reservation.id}-${category}-${sku}`}
                    style={{
                      alignItems: 'center',
                      backgroundColor: palette.muted,
                      borderColor: palette.border,
                      borderRadius: 12,
                      borderWidth: 1,
                      flexDirection: 'row',
                      gap: 12,
                      padding: 10,
                    }}>
                    {item?.imageUrl ? (
                      <Image
                        source={{uri: item.imageUrl}}
                        style={{
                          borderRadius: 10,
                          height: 56,
                          width: 56,
                        }}
                      />
                    ) : (
                      <View
                        style={{
                          alignItems: 'center',
                          backgroundColor: palette.soft,
                          borderColor: palette.border,
                          borderRadius: 10,
                          borderWidth: 1,
                          height: 56,
                          justifyContent: 'center',
                          width: 56,
                        }}>
                        <Text style={{color: palette.textMuted, fontSize: 10, textAlign: 'center'}}>
                          No Image
                        </Text>
                      </View>
                    )}
                    <View style={{flex: 1, gap: 4}}>
                      <Text style={{color: palette.textMuted, fontSize: 11, fontWeight: '700'}}>
                        {categoryLabel}
                      </Text>
                      <Text style={{color: palette.text, fontSize: 13, fontWeight: '600'}}>
                        {item?.itemName ?? 'Unknown item'}
                      </Text>
                    </View>
                  </View>
                );
              }),
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={{gap: 16}}>
      <Card palette={palette} title={title}>
        <FieldLabel palette={palette}>{texts.reservationTeacher}</FieldLabel>
        <BodyStrong palette={palette}>{teacherName}</BodyStrong>
        <View style={{marginTop: 12}}>
          <FieldLabel palette={palette}>{texts.reservationTimezone}</FieldLabel>
          <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6}}>
            {RESERVATION_TIMEZONE_OPTIONS.map(option => (
              <OptionChip
                key={option}
                active={displayTimezone === option}
                label={option}
                onPress={() => setDisplayTimezone(option)}
                palette={palette}
                testID={`student-reservation-timezone-${option}`}
              />
            ))}
          </View>
        </View>
      </Card>

      <Card palette={palette} title={texts.reservationSelectDate}>
        <View style={{gap: 14}}>
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
              testID="student-reservation-month-prev">
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
              testID="student-reservation-month-next">
              <Text style={{color: palette.text, fontSize: 12}}>{'>'}</Text>
            </Pressable>
          </View>

          <View style={{flexDirection: 'row'}}>
            {dayLabels.map(dayLabel => (
              <View key={dayLabel} style={{alignItems: 'center', flex: 1, paddingVertical: 4}}>
                <Text style={{color: palette.textMuted, fontSize: 11, fontWeight: '600'}}>
                  {dayLabel}
                </Text>
              </View>
            ))}
          </View>

          <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
            {calendarCells.map(cell => {
              const isSelected = selectedDate === cell.dateKey;
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
              const isWeekend = WEEKEND_INDICES.has(cell.date.getDay());

              return (
                <Pressable
                  key={cell.dateKey}
                  onPress={() => {
                    setSelectedDate(cell.dateKey);
                    setVisibleMonth(
                      current =>
                        current.getFullYear() === cell.date.getFullYear() &&
                        current.getMonth() === cell.date.getMonth()
                          ? current
                          : new Date(cell.date.getFullYear(), cell.date.getMonth(), 1),
                    );
                  }}
                  style={{
                    borderColor: isSelected ? palette.primary : palette.border,
                    borderRadius: 12,
                    borderWidth: 1,
                    marginBottom: 8,
                    paddingHorizontal: 6,
                    paddingVertical: 8,
                    width: '14.2857%',
                  }}
                  testID={`student-reservation-date-${cell.dateKey}`}>
                  <View style={{alignItems: 'center', gap: 4}}>
                    <Text
                      style={{
                        color: !cell.inCurrentMonth
                          ? palette.textMuted
                          : isSelected
                          ? palette.primary
                          : isWeekend
                          ? palette.textMuted
                          : palette.text,
                        fontSize: 12,
                        fontWeight: isSelected ? '700' : '500',
                      }}>
                      {cell.date.getDate()}
                    </Text>
                    {hasPending || hasConfirmed || hasCanceled ? (
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
                    ) : (
                      <View style={{height: 11}} />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Card>

      {selectedDate ? (
        <Card palette={palette} title={texts.reservationTimeSlots}>
          <BodyText palette={palette}>{selectedDate}</BodyText>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 8,
              marginTop: 12,
            }}>
            {slots.map(slot => {
              const taken = slot.status === 'taken';
              const mine = slot.status === 'booked';
              const isSelected = selectedSlotLabel === slot.startTime;

              let bgColor = palette.muted;
              let textColor = palette.text;
              let borderColor = palette.border;

              if (isSelected) {
                bgColor = palette.primary;
                textColor = palette.primaryText;
                borderColor = palette.primary;
              } else if (mine) {
                bgColor = palette.soft;
                textColor = palette.textMuted;
              } else if (taken) {
                bgColor = palette.muted;
                textColor = palette.textMuted;
                borderColor = palette.border;
              }

              return (
                <Pressable
                  key={slot.startsAtUtc ?? slot.startTime}
                  disabled={taken || mine}
                  onPress={() => setSelectedSlot(isSelected ? null : slot)}
                  style={{
                    alignItems: 'center',
                    backgroundColor: bgColor,
                    borderColor: borderColor,
                    borderRadius: 10,
                    borderWidth: 1,
                    minWidth: 68,
                    opacity: taken ? 0.4 : 1,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                  }}
                  testID={`student-reservation-slot-${slot.startTime}`}>
                  <Text style={{color: textColor, fontSize: 13, fontWeight: '500'}}>
                    {slot.startTime}
                  </Text>
                  {mine ? (
                    <Text style={{color: palette.textMuted, fontSize: 10, marginTop: 2}}>
                      {texts.reservationSlotBooked}
                    </Text>
                  ) : taken ? (
                    <Text style={{color: palette.textMuted, fontSize: 10, marginTop: 2}}>
                      {texts.reservationSlotTaken}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </Card>
      ) : null}

      {selectedDate && selectedSlot ? (
        <Card palette={palette} title={texts.reservationConfirm}>
          <View style={{gap: 6, marginBottom: 14}}>
            <FieldLabel palette={palette}>{texts.reservationDate}</FieldLabel>
            <BodyStrong palette={palette}>{selectedDate}</BodyStrong>
            <FieldLabel palette={palette}>{texts.reservationTime}</FieldLabel>
            <BodyStrong palette={palette}>{selectedSlot.startTime}</BodyStrong>
            <FieldLabel palette={palette}>{texts.reservationTeacher}</FieldLabel>
            <BodyStrong palette={palette}>{teacherName}</BodyStrong>
          </View>
          <ActionButton
            backgroundColor={palette.primary}
            isLoading={isBusy}
            label={texts.reservationBookLesson}
            onPress={handleBook}
            style={{paddingHorizontal: 18, paddingVertical: 14}}
            textColor={palette.primaryText}
          />
        </Card>
      ) : null}

      {bookingDone ? (
        <Card palette={palette} title={texts.reservationBooked}>
          <BodyText palette={palette}>{texts.reservationBookedBody}</BodyText>
        </Card>
      ) : null}

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

      <Card palette={palette} title={texts.reservationMyList}>
        {reservations.length === 0 ? (
          <BodyText palette={palette}>{texts.reservationNone}</BodyText>
        ) : (
          <View style={{gap: 10, marginTop: 4}}>
            {reservations.map(r => (
              <View
                key={r.id}
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
                  <View style={{flex: 1, gap: 2}}>
                    <BodyStrong palette={palette}>
                      {r.date} {r.time}
                    </BodyStrong>
                  </View>
                  <View style={{alignItems: 'flex-end', gap: 4}}>
                    <Text
                      style={{
                        color:
                          r.status === 'confirmed'
                            ? palette.primary
                            : r.status === 'canceled'
                            ? '#bc4749'
                            : palette.textMuted,
                        fontSize: 11,
                        fontWeight: '600',
                      }}>
                      {r.status === 'confirmed'
                        ? texts.reservationStatusConfirmed
                        : r.status === 'canceled'
                        ? texts.reservationStatusCanceled
                        : texts.reservationStatusPending}
                    </Text>
                    <View style={{flexDirection: 'row', gap: 6}}>
                      {r.status === 'confirmed' ? (
                        <ActionButton
                          backgroundColor={palette.soft}
                          isLoading={false}
                          label={
                            expandedReservationId === r.id
                              ? texts.reservationHideDetails
                              : texts.reservationDetails
                          }
                          onPress={() =>
                            setExpandedReservationId(current =>
                              current === r.id ? null : r.id,
                            )
                          }
                          style={{paddingHorizontal: 10, paddingVertical: 6}}
                          testID={`student-reservation-detail-${r.id}`}
                          textColor={palette.text}
                          titleStyle={{fontSize: 11}}
                        />
                      ) : null}
                      {r.status === 'pending' || r.status === 'confirmed' ? (
                        <ActionButton
                          backgroundColor={palette.soft}
                          isLoading={isBusy}
                          label={texts.cancel}
                          onPress={() => handleCancel(r.id)}
                          style={{paddingHorizontal: 10, paddingVertical: 6}}
                          testID={`student-reservation-cancel-${r.id}`}
                          textColor={palette.text}
                          titleStyle={{fontSize: 11}}
                        />
                      ) : null}
                    </View>
                  </View>
                </View>
                {r.status === 'confirmed' && expandedReservationId === r.id
                  ? renderPresetDetails(r)
                  : null}
              </View>
            ))}
          </View>
        )}
      </Card>
    </View>
  );
}
