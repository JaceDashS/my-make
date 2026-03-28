import type {AppPage} from '../src/screens/shared/shell-model';

describe('members page red stage', () => {
  test('app page model should include members for academy approval flow', () => {
    const nextPage: AppPage = 'members';

    expect(nextPage).toBe('members');
  });
});
