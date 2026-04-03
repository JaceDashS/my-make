export type TeacherScheduleSlot = {
  start: string;
  end: string;
};

export type TeacherScheduleException = {
  type?: 'period-block' | 'time-block' | 'custom-slots';
  date?: string;
  startDate?: string;
  endDate?: string;
  closed?: boolean;
  allDay?: boolean;
  slots?: TeacherScheduleSlot[];
};

export type TeacherAvailableScheduleDocument = {
  timezone: string;
  weekly: Record<string, TeacherScheduleSlot[]>;
  exceptions: TeacherScheduleException[];
};

export const TEACHER_SCHEDULE_DAYS = [
  {key: 'mon', label: 'Mon'},
  {key: 'tue', label: 'Tue'},
  {key: 'wed', label: 'Wed'},
  {key: 'thu', label: 'Thu'},
  {key: 'fri', label: 'Fri'},
  {key: 'sat', label: 'Sat'},
  {key: 'sun', label: 'Sun'},
] as const;

function normalizeSlot(slot: Partial<TeacherScheduleSlot> | null | undefined) {
  return {
    end: typeof slot?.end === 'string' ? slot.end : '18:00',
    start: typeof slot?.start === 'string' ? slot.start : '10:00',
  };
}

function normalizeWeekly(
  weekly: Record<string, TeacherScheduleSlot[]> | null | undefined,
) {
  return TEACHER_SCHEDULE_DAYS.reduce<Record<string, TeacherScheduleSlot[]>>(
    (accumulator, day) => {
      const slots = Array.isArray(weekly?.[day.key]) ? weekly?.[day.key] : [];
      accumulator[day.key] = slots.map(slot => normalizeSlot(slot));
      return accumulator;
    },
    {},
  );
}

export function createEmptyTeacherAvailableScheduleDocument(): TeacherAvailableScheduleDocument {
  return {
    exceptions: [],
    timezone: 'Asia/Seoul',
    weekly: normalizeWeekly(undefined),
  };
}

export function parseTeacherAvailableScheduleDocument(
  value: string,
): TeacherAvailableScheduleDocument {
  if (!value || !value.trim()) {
    return createEmptyTeacherAvailableScheduleDocument();
  }

  try {
    const parsed = JSON.parse(value) as Partial<TeacherAvailableScheduleDocument>;
    return {
      exceptions: Array.isArray(parsed?.exceptions)
        ? parsed.exceptions.map(exception => ({
            type:
              typeof exception?.type === 'string' ? exception.type : undefined,
            allDay:
              typeof exception?.allDay === 'boolean'
                ? exception.allDay
                : undefined,
            closed:
              typeof exception?.closed === 'boolean'
                ? exception.closed
                : undefined,
            date: typeof exception?.date === 'string' ? exception.date : undefined,
            endDate:
              typeof exception?.endDate === 'string'
                ? exception.endDate
                : undefined,
            startDate:
              typeof exception?.startDate === 'string'
                ? exception.startDate
                : undefined,
            slots: Array.isArray(exception?.slots)
              ? exception.slots.map(slot => normalizeSlot(slot))
              : [],
          }))
        : [],
      timezone:
        typeof parsed?.timezone === 'string' && parsed.timezone.trim()
          ? parsed.timezone.trim()
          : 'Asia/Seoul',
      weekly: normalizeWeekly(parsed?.weekly),
    };
  } catch {
    return createEmptyTeacherAvailableScheduleDocument();
  }
}

export function serializeTeacherAvailableScheduleDocument(
  document: TeacherAvailableScheduleDocument,
) {
  return JSON.stringify(document);
}
