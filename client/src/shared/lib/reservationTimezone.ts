export const RESERVATION_TIMEZONE_OPTIONS = [
  'Asia/Seoul',
  'Asia/Tokyo',
  'UTC',
  'America/Los_Angeles',
  'America/New_York',
  'Europe/London',
] as const;

function getFormatter(
  timeZone: string,
  options: Intl.DateTimeFormatOptions,
) {
  return new Intl.DateTimeFormat('en-US', {
    hour12: false,
    timeZone,
    ...options,
  });
}

function getParts(date: Date, timeZone: string) {
  const parts = getFormatter(timeZone, {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(date);

  const partMap = parts.reduce<Record<string, string>>((nextMap, part) => {
    if (part.type !== 'literal') {
      nextMap[part.type] = part.value;
    }
    return nextMap;
  }, {});

  return {
    day: partMap.day ?? '01',
    hour: partMap.hour ?? '00',
    minute: partMap.minute ?? '00',
    month: partMap.month ?? '01',
    year: partMap.year ?? '1970',
  };
}

export function formatUtcDateKeyInTimezone(
  utcValue: string | undefined,
  timeZone: string,
) {
  if (!utcValue) {
    return '';
  }

  const parts = getParts(new Date(utcValue), timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function formatUtcTimeInTimezone(
  utcValue: string | undefined,
  timeZone: string,
) {
  if (!utcValue) {
    return '';
  }

  const parts = getParts(new Date(utcValue), timeZone);
  return `${parts.hour}:${parts.minute}`;
}

export function formatUtcTimeRangeInTimezone(
  startsAtUtc: string | undefined,
  endsAtUtc: string | undefined,
  timeZone: string,
) {
  const startTime = formatUtcTimeInTimezone(startsAtUtc, timeZone);
  const endTime = formatUtcTimeInTimezone(endsAtUtc, timeZone);
  if (!startTime) {
    return '';
  }
  if (!endTime) {
    return startTime;
  }
  return `${startTime}-${endTime}`;
}

