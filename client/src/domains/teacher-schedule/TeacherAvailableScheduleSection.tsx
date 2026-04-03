import React, {useEffect, useMemo, useState} from 'react';
import {Platform, Pressable, ScrollView, Text, TextInput, View} from 'react-native';

import {ActionButton} from '../../shared/components/ActionButton';
import {RESERVATION_TIMEZONE_OPTIONS} from '../../shared/lib/reservationTimezone';
import type {ProfileDetail} from '../../screens/shared/account-section-model';
import {windowsTextInputFocusProps} from '../../shared/ui/windowsFocusProps';

type ScheduleSlot = {
  start: string;
  end: string;
};

type ScheduleExceptionType = 'period-block' | 'time-block';

type ScheduleException = {
  type: ScheduleExceptionType;
  date?: string;
  startDate?: string;
  endDate?: string;
  closed?: boolean;
  slots?: ScheduleSlot[];
};

type TeacherAvailableSchedule = {
  timezone: string;
  weekly: Record<string, ScheduleSlot[]>;
  exceptions: ScheduleException[];
};

type UiComponents = {
  BodyStrong: React.ComponentType<any>;
  BodyText: React.ComponentType<any>;
  Card: React.ComponentType<any>;
  FieldLabel: React.ComponentType<any>;
  OptionChip: React.ComponentType<any>;
};

type AvailableScheduleTexts = {
  availableScheduleGuide: string;
  availableScheduleTimezone: string;
  availableScheduleWeeklyGrid: string;
  availableScheduleSlotsSelected: string;
  availableScheduleBusinessHours: string;
  availableScheduleClearAll: string;
  availableScheduleTimeColumn: string;
  availableScheduleClearDay: string;
  availableScheduleExceptions: string;
  availableScheduleExceptionGuide: string;
  availableScheduleAddException: string;
  availableScheduleAddSlot: string;
  availableScheduleSlotTo: string;
  availableScheduleSave: string;
  availableScheduleExceptionPeriodBlock?: string;
  availableScheduleExceptionTimeBlock?: string;
  availableScheduleExceptionStartDate?: string;
  availableScheduleExceptionEndDate?: string;
  availableScheduleExceptionDate?: string;
};

type Props = {
  isSubmitting: boolean;
  language: 'ja' | 'en';
  onSaveProfile: (overrides?: {availableSchedule?: string}) => Promise<void> | void;
  palette: any;
  profileDetails: ProfileDetail[];
  styles: any;
  texts: AvailableScheduleTexts;
  title: string;
  ui: UiComponents;
};

type WeeklyGrid = Record<string, boolean[]>;
type CalendarCell = {
  date: Date;
  dateKey: string;
  inCurrentMonth: boolean;
};

const WEEKDAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const WEEKDAY_LABELS: Record<(typeof WEEKDAY_ORDER)[number], string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
};
const GRID_START_HOUR = 8;
const GRID_END_HOUR = 22;
const SLOT_MINUTES = 60;
const SLOTS_PER_HOUR = 60 / SLOT_MINUTES;
const GRID_SLOT_COUNT = (GRID_END_HOUR - GRID_START_HOUR) * SLOTS_PER_HOUR;

function createEmptySchedule(): TeacherAvailableSchedule {
  return {
    timezone: 'Asia/Seoul',
    weekly: {
      mon: [],
      tue: [],
      wed: [],
      thu: [],
      fri: [],
      sat: [],
      sun: [],
    },
    exceptions: [],
  };
}

function createEmptyWeeklyGrid(): WeeklyGrid {
  return Object.fromEntries(
    WEEKDAY_ORDER.map(day => [day, Array.from({length: GRID_SLOT_COUNT}, () => false)]),
  );
}

function normalizeTime(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) {
    return digits;
  }
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function clampTime(value: string) {
  const match = value.match(/^(\d{1,2}):(\d{1,2})$/);
  if (!match) {
    return value;
  }

  const hours = Math.max(0, Math.min(23, parseInt(match[1], 10)));
  const minutes = Math.max(0, Math.min(59, parseInt(match[2], 10)));
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function normalizeDate(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) {
    return digits;
  }
  if (digits.length <= 6) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

function getTodayDateKey() {
  return formatDateKey(new Date());
}

function clampDateToMin(value: string, minDateKey: string) {
  if (value.length !== 10) {
    return value;
  }
  return value < minDateKey ? minDateKey : value;
}

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

function sanitizeSlot(input: any): ScheduleSlot {
  return {
    end: typeof input?.end === 'string' ? clampTime(input.end) : '18:00',
    start: typeof input?.start === 'string' ? clampTime(input.start) : '10:00',
  };
}

function sanitizeSingleExceptionSlot(input: any): ScheduleSlot[] {
  if (!Array.isArray(input) || input.length === 0) {
    return [];
  }
  return [sanitizeSlot(input[0])];
}

function parseClockToMinutes(value: string) {
  const match = clampTime(value).match(/^(\d{2}):(\d{2})$/);
  if (!match) {
    return null;
  }
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

function minutesToClock(minutes: number) {
  const safeMinutes = Math.max(0, minutes);
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function slotIndexToLabel(index: number) {
  return minutesToClock(GRID_START_HOUR * 60 + index * SLOT_MINUTES);
}

function sanitizeSchedule(input: any): TeacherAvailableSchedule {
  const empty = createEmptySchedule();
  const weekly = {...empty.weekly};

  for (const key of WEEKDAY_ORDER) {
    const rawSlots = Array.isArray(input?.weekly?.[key]) ? input.weekly[key] : [];
    weekly[key] = rawSlots.map(sanitizeSlot);
  }

  const exceptions = Array.isArray(input?.exceptions)
    ? input.exceptions.map((exception: any) => {
        const rawType = typeof exception?.type === 'string' ? exception.type.trim() : '';
        if (rawType === 'period-block') {
          return {
            endDate:
              typeof exception?.endDate === 'string'
                ? normalizeDate(exception.endDate)
                : '',
            startDate:
              typeof exception?.startDate === 'string'
                ? normalizeDate(exception.startDate)
                : '',
            type: 'period-block' as const,
          };
        }

        if (rawType === 'time-block') {
          return {
            date:
              typeof exception?.date === 'string' ? normalizeDate(exception.date) : '',
            slots: sanitizeSingleExceptionSlot(exception?.slots),
            type: 'time-block' as const,
          };
        }

        if (rawType === 'custom-slots') {
          return {
            date:
              typeof exception?.date === 'string' ? normalizeDate(exception.date) : '',
            slots: sanitizeSingleExceptionSlot(exception?.slots),
            type: 'time-block' as const,
          };
        }

        if (exception?.closed) {
          const normalizedDate =
            typeof exception?.date === 'string' ? normalizeDate(exception.date) : '';
          return {
            endDate: normalizedDate,
            startDate: normalizedDate,
            type: 'period-block' as const,
          };
        }

        return {
          date: typeof exception?.date === 'string' ? normalizeDate(exception.date) : '',
          slots: sanitizeSingleExceptionSlot(exception?.slots),
          type: 'time-block' as const,
        };
      })
    : [];

  return {
    timezone:
      typeof input?.timezone === 'string' && input.timezone.trim()
        ? input.timezone.trim()
        : empty.timezone,
    weekly,
    exceptions,
  };
}

function parseSchedule(profileDetails: ProfileDetail[]) {
  const raw =
    profileDetails.find(detail => detail.key === 'availableSchedule')?.value ?? '';
  if (!raw || raw === '-') {
    return createEmptySchedule();
  }

  try {
    return sanitizeSchedule(JSON.parse(raw));
  } catch {
    return createEmptySchedule();
  }
}

function weeklySlotsToGrid(weekly: TeacherAvailableSchedule['weekly']) {
  const grid = createEmptyWeeklyGrid();

  for (const day of WEEKDAY_ORDER) {
    for (const slot of weekly[day] ?? []) {
      const startMinutes = parseClockToMinutes(slot.start);
      const endMinutes = parseClockToMinutes(slot.end);
      if (startMinutes == null || endMinutes == null || endMinutes <= startMinutes) {
        continue;
      }

      const startIndex = Math.max(
        0,
        Math.floor((startMinutes - GRID_START_HOUR * 60) / SLOT_MINUTES),
      );
      const endIndex = Math.min(
        GRID_SLOT_COUNT,
        Math.ceil((endMinutes - GRID_START_HOUR * 60) / SLOT_MINUTES),
      );

      for (let index = startIndex; index < endIndex; index += 1) {
        if (index >= 0 && index < GRID_SLOT_COUNT) {
          grid[day][index] = true;
        }
      }
    }
  }

  return grid;
}

function weeklyGridToSlots(grid: WeeklyGrid) {
  return Object.fromEntries(
    WEEKDAY_ORDER.map(day => {
      const values = grid[day] ?? [];
      const slots: ScheduleSlot[] = [];
      let blockStart: number | null = null;

      values.forEach((isActive, index) => {
        if (isActive && blockStart == null) {
          blockStart = index;
        }

        const blockEnds = blockStart != null && (!isActive || index === values.length - 1);
        if (!blockEnds) {
          return;
        }

        if (blockStart == null) {
          return;
        }

        const endIndex = isActive && index === values.length - 1 ? index + 1 : index;
        const startIndex: number = blockStart;
        slots.push({
          end: slotIndexToLabel(endIndex),
          start: slotIndexToLabel(startIndex),
        });
        blockStart = null;
      });

      return [day, slots];
    }),
  ) as TeacherAvailableSchedule['weekly'];
}

function serializeSchedule(schedule: TeacherAvailableSchedule) {
  const weekly = Object.fromEntries(
    WEEKDAY_ORDER.map(day => [
      day,
      (schedule.weekly[day] ?? [])
        .map(slot => ({
          end: clampTime(slot.end),
          start: clampTime(slot.start),
        }))
        .filter(slot => slot.start.length === 5 && slot.end.length === 5),
    ]),
  );

  const exceptions = schedule.exceptions
    .map(exception => {
      const sanitizedSlots = (exception.slots ?? [])
        .map(slot => ({
          end: clampTime(slot.end),
          start: clampTime(slot.start),
        }))
        .filter(slot => slot.start.length === 5 && slot.end.length === 5)
        .slice(0, 1);

      if (exception.type === 'period-block') {
        return {
          endDate: normalizeDate(exception.endDate ?? ''),
          startDate: normalizeDate(exception.startDate ?? ''),
          type: 'period-block' as const,
        };
      }

      if (exception.type === 'time-block') {
        return {
          date: normalizeDate(exception.date ?? ''),
          slots: sanitizedSlots,
          type: 'time-block' as const,
        };
      }

      return null;
    })
    .filter(
      (
        exception,
      ): exception is
        | {endDate: string; startDate: string; type: 'period-block'}
        | {date: string; slots: ScheduleSlot[]; type: 'time-block'} => exception !== null,
    )
    .filter(exception => {
      if (exception.type === 'period-block') {
        return exception.startDate.length === 10 && exception.endDate.length === 10;
      }
      return exception.date.length === 10 && exception.slots.length > 0;
    })
    .map(exception => {
      if (exception.type === 'period-block') {
        return {
          endDate: exception.endDate,
          startDate: exception.startDate,
          type: exception.type,
        };
      }

      return {
        date: exception.date,
        slots: exception.slots,
        type: exception.type,
      };
    });

  return JSON.stringify({
    exceptions,
    timezone: schedule.timezone.trim() || 'Asia/Seoul',
    weekly,
  });
}

function createDefaultException(type: ScheduleExceptionType = 'time-block'): ScheduleException {
  const todayDateKey = getTodayDateKey();
  if (type === 'period-block') {
    return {
      endDate: '',
      startDate: '',
      type,
    };
  }

  return {
    date: todayDateKey,
    slots: [{start: '10:00', end: '18:00'}],
    type,
  };
}

function resolveScheduleLanguage(
  language: 'ja' | 'en' | undefined,
  texts: AvailableScheduleTexts,
): 'ja' | 'en' {
  const globalDocument =
    typeof globalThis === 'object' && 'document' in globalThis
      ? ((globalThis as Record<string, unknown>).document as {
          documentElement?: {lang?: string};
        })
      : undefined;
  const globalNavigator =
    typeof globalThis === 'object' && 'navigator' in globalThis
      ? ((globalThis as Record<string, unknown>).navigator as {language?: string})
      : undefined;

  if (language === 'ja' || language === 'en') {
    return language;
  }

  const englishSignals = [
    texts.availableScheduleTimezone,
    texts.availableScheduleWeeklyGrid,
    texts.availableScheduleSave,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  if (
    englishSignals.includes('schedule') ||
    englishSignals.includes('save') ||
    englishSignals.includes('weekly')
  ) {
    return 'en';
  }

  if (globalDocument?.documentElement?.lang) {
    const documentLanguage = globalDocument.documentElement.lang.toLowerCase();
    if (documentLanguage.startsWith('ja')) {
      return 'ja';
    }
    if (documentLanguage.startsWith('en')) {
      return 'en';
    }
  }

  if (globalNavigator?.language) {
    const browserLanguage = globalNavigator.language.toLowerCase();
    if (browserLanguage.startsWith('ja')) {
      return 'ja';
    }
  }

  return 'en';
}

function getCalendarDayLabels(locale: string) {
  const baseSunday = new Date(2026, 0, 4);
  return Array.from({length: 7}, (_, index) =>
    new Intl.DateTimeFormat(locale, {weekday: 'short'}).format(
      new Date(baseSunday.getFullYear(), baseSunday.getMonth(), baseSunday.getDate() + index),
    ),
  );
}

function formatCalendarMonthLabel(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function TeacherAvailableScheduleSection({
  isSubmitting,
  language,
  onSaveProfile,
  palette,
  profileDetails,
  styles,
  texts,
  title,
  ui: {BodyStrong, BodyText, Card, FieldLabel, OptionChip},
}: Props) {
  const initialDraft = useMemo(() => parseSchedule(profileDetails), [profileDetails]);
  const [draft, setDraft] = useState<TeacherAvailableSchedule>(initialDraft);
  const [weeklyGrid, setWeeklyGrid] = useState<WeeklyGrid>(() =>
    weeklySlotsToGrid(initialDraft.weekly),
  );
  const [paintValue, setPaintValue] = useState<boolean | null>(null);
  const [activeCalendarKey, setActiveCalendarKey] = useState<string | null>(null);
  const [calendarPreviewDateKey, setCalendarPreviewDateKey] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const todayDateKey = getTodayDateKey();
  const periodBlockLabel =
    texts.availableScheduleExceptionPeriodBlock ?? 'Period Block';
  const timeBlockLabel = texts.availableScheduleExceptionTimeBlock ?? 'Time Block';
  const startDateLabel =
    texts.availableScheduleExceptionStartDate ?? 'Start Date';
  const endDateLabel = texts.availableScheduleExceptionEndDate ?? 'End Date';
  const dateLabel = texts.availableScheduleExceptionDate ?? 'Date';
  const resolvedLanguage = resolveScheduleLanguage(language, texts);
  const webDateInputLanguage = resolvedLanguage === 'ja' ? 'ja-JP' : 'en-US';
  const calendarDayLabels = useMemo(
    () => getCalendarDayLabels(webDateInputLanguage),
    [webDateInputLanguage],
  );
  const calendarCells = useMemo(
    () => buildCalendarCells(calendarMonth),
    [calendarMonth],
  );

  useEffect(() => {
    setDraft(initialDraft);
    setWeeklyGrid(weeklySlotsToGrid(initialDraft.weekly));
  }, [initialDraft]);

  useEffect(() => {
    const globalDocument =
      typeof globalThis === 'object' && 'document' in globalThis
        ? ((globalThis as Record<string, unknown>).document as {
            documentElement?: {lang?: string};
          })
        : undefined;

    if (!globalDocument?.documentElement) {
      return;
    }
    globalDocument.documentElement.lang = resolvedLanguage;
  }, [resolvedLanguage]);

  const timeLabels = useMemo(
    () => Array.from({length: GRID_SLOT_COUNT}, (_, index) => slotIndexToLabel(index)),
    [],
  );

  const activeCellCount = useMemo(
    () =>
      WEEKDAY_ORDER.reduce(
        (count, day) => count + (weeklyGrid[day] ?? []).filter(Boolean).length,
        0,
      ),
    [weeklyGrid],
  );

  const syncWeeklyDraft = (nextGrid: WeeklyGrid) => {
    setWeeklyGrid(nextGrid);
    setDraft(current => ({
      ...current,
      weekly: weeklyGridToSlots(nextGrid),
    }));
  };

  const setCell = (day: (typeof WEEKDAY_ORDER)[number], slotIndex: number, nextValue: boolean) => {
    const nextGrid = {
      ...weeklyGrid,
      [day]: weeklyGrid[day].map((cell, index) => (index === slotIndex ? nextValue : cell)),
    };
    syncWeeklyDraft(nextGrid);
  };

  const toggleCell = (day: (typeof WEEKDAY_ORDER)[number], slotIndex: number) => {
    const nextValue = !weeklyGrid[day][slotIndex];
    setPaintValue(nextValue);
    setCell(day, slotIndex, nextValue);
  };

  const paintCell = (day: (typeof WEEKDAY_ORDER)[number], slotIndex: number) => {
    if (paintValue == null) {
      return;
    }
    if (weeklyGrid[day][slotIndex] === paintValue) {
      return;
    }
    setCell(day, slotIndex, paintValue);
  };

  const clearDay = (day: (typeof WEEKDAY_ORDER)[number]) => {
    const nextGrid = {
      ...weeklyGrid,
      [day]: Array.from({length: GRID_SLOT_COUNT}, () => false),
    };
    syncWeeklyDraft(nextGrid);
  };

  const fillBusinessHours = () => {
    const nextGrid = createEmptyWeeklyGrid();
    for (const day of WEEKDAY_ORDER) {
      if (day === 'sat' || day === 'sun') {
        continue;
      }
      const startIndex = (10 - GRID_START_HOUR) * SLOTS_PER_HOUR;
      const endIndex = (18 - GRID_START_HOUR) * SLOTS_PER_HOUR;
      for (let index = startIndex; index < endIndex; index += 1) {
        nextGrid[day][index] = true;
      }
    }
    syncWeeklyDraft(nextGrid);
  };

  const updateException = (
    exceptionIndex: number,
    nextValue: Partial<ScheduleException>,
  ) => {
    setDraft(current => ({
      ...current,
      exceptions: current.exceptions.map((exception, index) =>
        index === exceptionIndex ? {...exception, ...nextValue} : exception,
      ),
    }));
  };

  const replaceExceptionType = (
    exceptionIndex: number,
    nextType: ScheduleExceptionType,
  ) => {
    setDraft(current => ({
      ...current,
      exceptions: current.exceptions.map((exception, index) => {
        if (index !== exceptionIndex) {
          return exception;
        }

        if (nextType === 'period-block') {
          const nextStartDate =
            exception.type === 'period-block'
              ? clampDateToMin(exception.startDate ?? '', todayDateKey)
              : '';
          return {
            endDate:
              exception.type === 'period-block'
                ? clampDateToMin(exception.endDate ?? '', nextStartDate || todayDateKey)
                : '',
            startDate: nextStartDate,
            type: nextType,
          };
        }

        return {
          date: clampDateToMin(
            exception.date ?? exception.startDate ?? todayDateKey,
            todayDateKey,
          ),
          slots:
            exception.slots && exception.slots.length > 0
              ? [exception.slots[0]]
              : [{start: '10:00', end: '18:00'}],
          type: nextType,
        };
      }),
    }));
  };

  const updateExceptionSlot = (
    exceptionIndex: number,
    slotIndex: number,
    key: keyof ScheduleSlot,
    value: string,
  ) => {
    setDraft(current => ({
      ...current,
      exceptions: current.exceptions.map((exception, index) => {
        if (index !== exceptionIndex) {
          return exception;
        }

        return {
          ...exception,
          slots: (exception.slots ?? []).map((slot, nextSlotIndex) =>
            nextSlotIndex === slotIndex
              ? {...slot, [key]: normalizeTime(value)}
              : slot,
          ),
        };
      }),
    }));
  };

  const handleSave = async () => {
    await Promise.resolve(
      onSaveProfile({
        availableSchedule: serializeSchedule(draft),
      }),
    );
  };

  const openCalendar = (fieldKey: string, value?: string) => {
    setActiveCalendarKey(current => (current === fieldKey ? null : fieldKey));
    setCalendarPreviewDateKey(null);
    const sourceDate =
      value && value.length === 10 ? parseDateKey(value) : new Date();
    setCalendarMonth(new Date(sourceDate.getFullYear(), sourceDate.getMonth(), 1));
  };

  const renderWebDateField = ({
    fieldKey,
    label,
    helperText,
    minDateKey,
    onChange,
    onSelect,
    rangeEndDateKey,
    rangeStartDateKey,
    testID,
    value,
  }: {
    fieldKey: string;
    label: string;
    helperText?: string;
    minDateKey?: string;
    onChange: (value: string) => void;
    onSelect?: (value: string) => void;
    rangeEndDateKey?: string;
    rangeStartDateKey?: string;
    testID: string;
    value?: string;
  }) => (
    <View style={{flex: 1, minWidth: 180}}>
      <FieldLabel palette={palette}>{label}</FieldLabel>
      {helperText ? (
        <BodyText
          palette={palette}
          style={{color: palette.textMuted, fontSize: 12, marginTop: 4}}>
          {helperText}
        </BodyText>
      ) : null}
      <button
        data-testid={testID}
        onClick={() => openCalendar(fieldKey, value)}
        style={{
          alignItems: 'center',
          backgroundColor: palette.muted,
          border: `1px solid ${palette.border}`,
          borderRadius: 10,
          color: value ? palette.text : palette.textMuted,
          cursor: 'pointer',
          display: 'flex',
          fontSize: 14,
          justifyContent: 'space-between',
          marginTop: 6,
          minHeight: 42,
          padding: '10px 12px',
          textAlign: 'left',
          width: '100%',
        }}
        type="button">
        <span>{value || todayDateKey}</span>
        <span style={{marginLeft: 12}}>{'▾'}</span>
      </button>
      {activeCalendarKey === fieldKey ? (
        <div
          style={{
            backgroundColor: palette.card,
            border: `1px solid ${palette.border}`,
            borderRadius: '12px',
            boxShadow: '0 12px 24px rgba(0, 0, 0, 0.18)',
            marginTop: '8px',
            minWidth: '280px',
            padding: '12px',
          }}>
          <div
            style={{
              alignItems: 'center',
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '10px',
            }}>
            <button
              onClick={() =>
                setCalendarMonth(
                  current => new Date(current.getFullYear(), current.getMonth() - 1, 1),
                )
              }
              style={{
                backgroundColor: palette.soft,
                border: `1px solid ${palette.border}`,
                borderRadius: '10px',
                color: palette.text,
                cursor: 'pointer',
                padding: '6px 10px',
              }}
              type="button">
              {'<'}
            </button>
            <span style={{color: palette.text, fontSize: 13, fontWeight: 700}}>
              {formatCalendarMonthLabel(calendarMonth, webDateInputLanguage)}
            </span>
            <button
              onClick={() =>
                setCalendarMonth(
                  current => new Date(current.getFullYear(), current.getMonth() + 1, 1),
                )
              }
              style={{
                backgroundColor: palette.soft,
                border: `1px solid ${palette.border}`,
                borderRadius: '10px',
                color: palette.text,
                cursor: 'pointer',
                padding: '6px 10px',
              }}
              type="button">
              {'>'}
            </button>
          </div>
          <div
            style={{
              display: 'grid',
              gap: '6px',
              gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
            }}
            onMouseLeave={() => {
              if (rangeStartDateKey) {
                setCalendarPreviewDateKey(null);
              }
            }}>
            {calendarDayLabels.map(dayLabel => (
              <div
                key={`${fieldKey}-${dayLabel}`}
                style={{
                  color: palette.textMuted,
                  fontSize: '11px',
                  fontWeight: 700,
                  paddingBottom: '4px',
                  textAlign: 'center',
                }}>
                {dayLabel}
              </div>
            ))}
            {calendarCells.map(cell => {
              const isSelected = value === cell.dateKey;
              const isDisabled = !!minDateKey && cell.dateKey < minDateKey;
              const previewEndDateKey =
                activeCalendarKey === fieldKey ? calendarPreviewDateKey : null;
              const effectiveRangeEndDateKey =
                previewEndDateKey ?? rangeEndDateKey ?? value ?? rangeStartDateKey;
              const rangeStart = rangeStartDateKey;
              const hasRange =
                !!rangeStart && !!effectiveRangeEndDateKey;
              const rangeMin =
                hasRange && rangeStart! <= effectiveRangeEndDateKey!
                  ? rangeStart!
                  : effectiveRangeEndDateKey;
              const rangeMax =
                hasRange && rangeStart! <= effectiveRangeEndDateKey!
                  ? effectiveRangeEndDateKey
                  : rangeStart;
              const isInRange =
                !!rangeMin && !!rangeMax && cell.dateKey >= rangeMin && cell.dateKey <= rangeMax;
              return (
                <button
                  key={`${fieldKey}-${cell.dateKey}`}
                  data-testid={`${testID}-calendar-day-${cell.dateKey}`}
                  onClick={() => {
                    if (isDisabled) {
                      return;
                    }
                    onChange(cell.dateKey);
                    setCalendarPreviewDateKey(null);
                    if (onSelect) {
                      onSelect(cell.dateKey);
                      return;
                    }
                    setActiveCalendarKey(null);
                  }}
                  onMouseEnter={() => {
                    if (rangeStartDateKey && !isDisabled) {
                      setCalendarPreviewDateKey(cell.dateKey);
                    }
                  }}
                  disabled={isDisabled}
                  style={{
                    backgroundColor: isSelected
                      ? palette.primary
                      : isInRange
                      ? palette.soft
                      : palette.card,
                    border: `1px solid ${
                      isSelected
                        ? palette.primary
                        : isInRange
                        ? palette.primary
                        : palette.border
                    }`,
                    borderRadius: '10px',
                    color: !cell.inCurrentMonth
                      ? palette.textMuted
                      : isDisabled
                      ? palette.textMuted
                      : isSelected
                      ? palette.primaryText
                      : isInRange
                      ? palette.text
                      : palette.text,
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontWeight: isSelected || isInRange ? 700 : 500,
                    minHeight: '34px',
                    opacity: isDisabled ? 0.45 : 1,
                    padding: '6px 0',
                  }}
                  type="button">
                  {cell.date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </View>
  );

  return (
    <View
      style={{
        alignSelf: 'stretch',
        backgroundColor: palette.card,
        minWidth: 0,
        width: '100%',
      }}>
      <Card palette={palette} title={title}>
        <BodyText palette={palette}>{texts.availableScheduleGuide}</BodyText>

        <View style={{marginBottom: 10, marginTop: 10}}>
          <FieldLabel palette={palette}>{texts.availableScheduleTimezone}</FieldLabel>
          <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6}}>
            {RESERVATION_TIMEZONE_OPTIONS.map(option => (
              <OptionChip
                key={option}
                active={draft.timezone === option}
                label={option}
                onPress={() =>
                  setDraft(current => ({...current, timezone: option}))
                }
                palette={palette}
                testID={`teacher-schedule-timezone-${option}`}
              />
            ))}
          </View>
        </View>

        <View
          style={{
            alignItems: 'center',
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 10,
            marginTop: 8,
          }}>
          <View style={{gap: 4}}>
            <FieldLabel palette={palette}>{texts.availableScheduleWeeklyGrid}</FieldLabel>
            <BodyText palette={palette}>
              {texts.availableScheduleSlotsSelected.replace('{n}', String(activeCellCount))}
            </BodyText>
          </View>
          <View style={[styles.optionRow, {flexWrap: 'wrap', justifyContent: 'flex-end'}]}>
            <OptionChip
              active={false}
              label={texts.availableScheduleBusinessHours}
              onPress={fillBusinessHours}
              palette={palette}
            />
            <OptionChip
              active={false}
              label={texts.availableScheduleClearAll}
              onPress={() => syncWeeklyDraft(createEmptyWeeklyGrid())}
              palette={palette}
            />
          </View>
        </View>

        <ScrollView
          horizontal
          style={{
            borderColor: palette.border,
            borderRadius: 14,
            borderWidth: 1,
            maxHeight: 540,
          }}
          testID="teacher-schedule-weekly-grid-scroll">
          <View style={{display: 'flex', flexDirection: 'row', minWidth: 640}}>
            <View
              style={{
                backgroundColor: palette.card,
                borderRightColor: palette.border,
                borderRightWidth: 1,
                width: 74,
              }}>
              <View
                style={{
                  borderBottomColor: palette.border,
                  borderBottomWidth: 1,
                  height: 42,
                  justifyContent: 'center',
                  paddingHorizontal: 10,
                }}>
                <Text style={{color: palette.text, fontSize: 12, fontWeight: '700'}}>
                  {texts.availableScheduleTimeColumn}
                </Text>
              </View>
              {timeLabels.map(label => (
                <View
                  key={`time-${label}`}
                  style={{
                    borderBottomColor: palette.border,
                    borderBottomWidth: 1,
                    height: 24,
                    justifyContent: 'center',
                    paddingHorizontal: 10,
                  }}>
                  <Text style={{color: palette.textMuted, fontSize: 10}}>{label}</Text>
                </View>
              ))}
            </View>

            {WEEKDAY_ORDER.map(day => (
              <View
                key={day}
                style={{
                  borderRightColor: palette.border,
                  borderRightWidth: 1,
                  width: 80,
                }}>
                <View
                  style={{
                    alignItems: 'center',
                    borderBottomColor: palette.border,
                    borderBottomWidth: 1,
                    gap: 6,
                    height: 42,
                    justifyContent: 'center',
                  }}>
                  <Text style={{color: palette.text, fontSize: 12, fontWeight: '700'}}>
                    {WEEKDAY_LABELS[day]}
                  </Text>
                  <Pressable onPress={() => clearDay(day)}>
                    <Text style={{color: palette.textMuted, fontSize: 10}}>
                      {texts.availableScheduleClearDay}
                    </Text>
                  </Pressable>
                </View>

                {weeklyGrid[day].map((isActive, slotIndex) => (
                  <Pressable
                    key={`${day}-${slotIndex}`}
                    onHoverIn={() => paintCell(day, slotIndex)}
                    onPressIn={() => toggleCell(day, slotIndex)}
                    onPressOut={() => setPaintValue(null)}
                    style={{
                      backgroundColor: isActive ? palette.primary : palette.card,
                      borderBottomColor: palette.border,
                      borderBottomWidth: 1,
                      height: 24,
                      opacity: isActive ? 1 : 0.92,
                    }}
                    testID={`teacher-schedule-cell-${day}-${slotIndex}`}
                  />
                ))}
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={{marginTop: 12}}>
          <FieldLabel palette={palette}>{texts.availableScheduleExceptions}</FieldLabel>
          <BodyText palette={palette}>{texts.availableScheduleExceptionGuide}</BodyText>
          <View style={[styles.optionRow, {marginTop: 10}]}>
            <OptionChip
              active={false}
              label={texts.availableScheduleAddException}
              onPress={() =>
                setDraft(current => ({
                  ...current,
                  exceptions: [...current.exceptions, createDefaultException('time-block')],
                }))
              }
              palette={palette}
            />
          </View>
        </View>

        {draft.exceptions.map((exception, exceptionIndex) => (
          <View
            key={`exception-${exceptionIndex}`}
            style={{
              borderColor: palette.border,
              borderRadius: 12,
              borderWidth: 1,
              gap: 10,
              marginTop: 10,
              padding: 12,
            }}>
            <View
              style={{
                alignItems: 'flex-start',
                display: 'flex',
                flexDirection: 'row',
                gap: 10,
                justifyContent: 'space-between',
              }}>
              <View style={[styles.optionRow, {flex: 1, flexWrap: 'wrap'}]}>
                <OptionChip
                  active={exception.type === 'period-block'}
                  label={periodBlockLabel}
                  onPress={() => replaceExceptionType(exceptionIndex, 'period-block')}
                  palette={palette}
                />
                <OptionChip
                  active={exception.type === 'time-block'}
                  label={timeBlockLabel}
                  onPress={() => replaceExceptionType(exceptionIndex, 'time-block')}
                  palette={palette}
                />
              </View>
              <ActionButton
                backgroundColor={palette.soft}
                isLoading={false}
                label="X"
                onPress={() =>
                  setDraft(current => ({
                    ...current,
                    exceptions: current.exceptions.filter(
                      (_exception, index) => index !== exceptionIndex,
                    ),
                  }))
                }
                style={{minWidth: 40}}
                textColor={palette.text}
                titleStyle={styles.actionText}
              />
            </View>

            {exception.type === 'period-block' ? (
              <View style={[styles.optionRow, {flexWrap: 'wrap'}]}>
                {Platform.OS === 'web' ? (
                  !exception.startDate ? (
                    renderWebDateField({
                      fieldKey: `exception-${exceptionIndex}-start-date`,
                      label: startDateLabel,
                      minDateKey: todayDateKey,
                      onChange: value =>
                        updateException(exceptionIndex, {
                          endDate: '',
                          startDate: clampDateToMin(normalizeDate(value), todayDateKey),
                        }),
                      onSelect: value => {
                        const normalizedStart = clampDateToMin(
                          normalizeDate(value),
                          todayDateKey,
                        );
                        updateException(exceptionIndex, {
                          endDate: '',
                          startDate: normalizedStart,
                        });
                        openCalendar(
                          `exception-${exceptionIndex}-end-date`,
                          normalizedStart,
                        );
                      },
                      testID: `teacher-schedule-exception-start-date-${exceptionIndex}`,
                      value: exception.startDate ?? todayDateKey,
                    })
                  ) : !exception.endDate ? (
                    renderWebDateField({
                      fieldKey: `exception-${exceptionIndex}-end-date`,
                      helperText: `${startDateLabel}: ${exception.startDate}`,
                      label: endDateLabel,
                      minDateKey: exception.startDate ?? todayDateKey,
                      onChange: value =>
                        updateException(exceptionIndex, {
                          endDate: clampDateToMin(
                            normalizeDate(value),
                            exception.startDate ?? todayDateKey,
                          ),
                        }),
                      rangeStartDateKey: exception.startDate ?? undefined,
                      testID: `teacher-schedule-exception-end-date-${exceptionIndex}`,
                      value: exception.endDate ?? exception.startDate ?? todayDateKey,
                    })
                  ) : (
                    <>
                      {renderWebDateField({
                        fieldKey: `exception-${exceptionIndex}-start-date`,
                        label: startDateLabel,
                        minDateKey: todayDateKey,
                        onChange: value =>
                          updateException(exceptionIndex, {
                            endDate:
                              exception.endDate &&
                              exception.endDate <
                                clampDateToMin(normalizeDate(value), todayDateKey)
                                ? ''
                                : exception.endDate,
                            startDate: clampDateToMin(normalizeDate(value), todayDateKey),
                          }),
                        testID: `teacher-schedule-exception-start-date-${exceptionIndex}`,
                        value: exception.startDate ?? todayDateKey,
                      })}
                      {renderWebDateField({
                        fieldKey: `exception-${exceptionIndex}-end-date`,
                        label: endDateLabel,
                        minDateKey: exception.startDate ?? todayDateKey,
                        onChange: value =>
                          updateException(exceptionIndex, {
                            endDate: clampDateToMin(
                              normalizeDate(value),
                              exception.startDate ?? todayDateKey,
                            ),
                          }),
                        rangeEndDateKey: exception.endDate ?? undefined,
                        rangeStartDateKey: exception.startDate ?? undefined,
                        testID: `teacher-schedule-exception-end-date-${exceptionIndex}`,
                        value: exception.endDate ?? exception.startDate ?? todayDateKey,
                      })}
                    </>
                  )
                ) : (
                  <View style={{flex: 1, minWidth: 180}}>
                    <FieldLabel palette={palette}>{startDateLabel}</FieldLabel>
                    <TextInput
                      {...windowsTextInputFocusProps}
                      onChangeText={value =>
                        updateException(exceptionIndex, {
                          startDate: clampDateToMin(normalizeDate(value), todayDateKey),
                        })
                      }
                      placeholder={todayDateKey}
                      placeholderTextColor={palette.textMuted}
                      style={[
                        styles.input,
                        {
                          backgroundColor: palette.muted,
                          borderColor: palette.border,
                          color: palette.text,
                          marginBottom: 0,
                          marginTop: 6,
                        },
                      ]}
                      testID={`teacher-schedule-exception-start-date-${exceptionIndex}`}
                      value={exception.startDate ?? todayDateKey}
                    />
                  </View>
                )}

                {Platform.OS !== 'web' ? (
                  <View style={{flex: 1, minWidth: 180}}>
                    <FieldLabel palette={palette}>{endDateLabel}</FieldLabel>
                    <TextInput
                      {...windowsTextInputFocusProps}
                      onChangeText={value =>
                        updateException(exceptionIndex, {
                          endDate: clampDateToMin(
                            normalizeDate(value),
                            exception.startDate ?? todayDateKey,
                          ),
                        })
                      }
                      placeholder={todayDateKey}
                      placeholderTextColor={palette.textMuted}
                      style={[
                        styles.input,
                        {
                          backgroundColor: palette.muted,
                          borderColor: palette.border,
                          color: palette.text,
                          marginBottom: 0,
                          marginTop: 6,
                        },
                      ]}
                      testID={`teacher-schedule-exception-end-date-${exceptionIndex}`}
                      value={exception.endDate ?? exception.startDate ?? todayDateKey}
                    />
                  </View>
                ) : null}
              </View>
            ) : (
              <View
                style={{
                  alignItems: 'center',
                  display: 'flex',
                  flexDirection: 'row',
                  gap: 8,
                }}>
                {Platform.OS === 'web' ? (
                  renderWebDateField({
                    fieldKey: `exception-${exceptionIndex}-date`,
                    label: dateLabel,
                    minDateKey: todayDateKey,
                    onChange: value =>
                      updateException(exceptionIndex, {
                        date: clampDateToMin(normalizeDate(value), todayDateKey),
                      }),
                    testID: `teacher-schedule-exception-date-${exceptionIndex}`,
                    value: exception.date ?? todayDateKey,
                  })
                ) : (
                  <View style={{flex: 1}}>
                    <FieldLabel palette={palette}>{dateLabel}</FieldLabel>
                    <TextInput
                      {...windowsTextInputFocusProps}
                      onChangeText={value =>
                        updateException(exceptionIndex, {
                          date: clampDateToMin(normalizeDate(value), todayDateKey),
                        })
                      }
                      placeholder={todayDateKey}
                      placeholderTextColor={palette.textMuted}
                      style={[
                        styles.input,
                        {
                          backgroundColor: palette.muted,
                          borderColor: palette.border,
                          color: palette.text,
                          flex: 1,
                          marginBottom: 0,
                          marginTop: 6,
                        },
                      ]}
                      testID={`teacher-schedule-exception-date-${exceptionIndex}`}
                      value={exception.date ?? todayDateKey}
                    />
                  </View>
                )}
              </View>
            )}

            {exception.type !== 'period-block'
              ? (exception.slots ?? []).slice(0, 1).map((slot, slotIndex) => (
                  <View
                    key={`exception-slot-${exceptionIndex}-${slotIndex}`}
                    style={{
                      alignItems: 'center',
                      display: 'flex',
                      flexDirection: 'row',
                      gap: 8,
                    }}>
                    <TextInput
                      {...windowsTextInputFocusProps}
                      onChangeText={value =>
                        updateExceptionSlot(exceptionIndex, slotIndex, 'start', value)
                      }
                      placeholder="10:00"
                      placeholderTextColor={palette.textMuted}
                      style={[
                        styles.input,
                        {
                          backgroundColor: palette.muted,
                          borderColor: palette.border,
                          color: palette.text,
                          flex: 1,
                          marginBottom: 0,
                        },
                      ]}
                      testID={`teacher-schedule-exception-start-${exceptionIndex}-${slotIndex}`}
                      value={slot.start}
                    />
                    <BodyText palette={palette}>{texts.availableScheduleSlotTo}</BodyText>
                    <TextInput
                      {...windowsTextInputFocusProps}
                      onChangeText={value =>
                        updateExceptionSlot(exceptionIndex, slotIndex, 'end', value)
                      }
                      placeholder="18:00"
                      placeholderTextColor={palette.textMuted}
                      style={[
                        styles.input,
                        {
                          backgroundColor: palette.muted,
                          borderColor: palette.border,
                          color: palette.text,
                          flex: 1,
                          marginBottom: 0,
                        },
                      ]}
                      testID={`teacher-schedule-exception-end-${exceptionIndex}-${slotIndex}`}
                      value={slot.end}
                    />
                  </View>
                ))
              : null}
          </View>
        ))}

        <View style={[styles.optionRow, {marginTop: 16}]}>
          <ActionButton
            backgroundColor={palette.primary}
            isLoading={isSubmitting}
            label={texts.availableScheduleSave}
            onPress={handleSave}
            style={styles.actionButton}
            textColor={palette.primaryText}
            titleStyle={styles.actionText}
          />
        </View>
      </Card>
    </View>
  );
}
