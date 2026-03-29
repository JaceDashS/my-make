export type AcademyMemberStatus = 'ACTIVE' | 'HOLD' | 'INACTIVE';

export type AcademyMemberRowAction = 'activate' | 'hold' | 'deactivate';

const ACTIONS_BY_STATUS: Record<
  AcademyMemberStatus,
  AcademyMemberRowAction[]
> = {
  ACTIVE: ['hold', 'deactivate'],
  HOLD: ['activate', 'deactivate'],
  INACTIVE: ['activate', 'hold'],
};

export function buildAcademyMemberRowActions(
  status: AcademyMemberStatus,
): AcademyMemberRowAction[] {
  return ACTIONS_BY_STATUS[status];
}

export function resolveAcademyMemberNextStatus(
  action: AcademyMemberRowAction,
): AcademyMemberStatus {
  switch (action) {
    case 'activate':
      return 'ACTIVE';
    case 'deactivate':
      return 'INACTIVE';
    case 'hold':
      return 'HOLD';
  }
}

export function canEditAcademyMemberProfile(
  actorRoleCode: string,
  targetRoleCode: string,
) {
  if (actorRoleCode === 'ROOT') {
    return true;
  }

  if (actorRoleCode === 'ADMIN') {
    return targetRoleCode === 'TEACHER' || targetRoleCode === 'STUDENT';
  }

  return false;
}
