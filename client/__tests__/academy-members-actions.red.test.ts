import {buildAcademyMemberRowActions} from '../src/domains/members/academyMembersActionModel';

describe('academy members row actions red stage', () => {
  test.each([
    ['ACTIVE', ['hold', 'deactivate']],
    ['HOLD', ['activate', 'deactivate']],
    ['INACTIVE', ['activate', 'hold']],
  ] as const)('maps %s to %j', (status, expectedActions) => {
    expect(buildAcademyMemberRowActions(status)).toEqual(expectedActions);
  });
});
