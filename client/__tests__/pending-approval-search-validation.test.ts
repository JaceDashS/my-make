import {
  validatePendingSearchQuery,
} from '../src/domains/members/pendingApprovalSearchValidation';

describe('pending approval search validation', () => {
  test('allows partial phone numbers', () => {
    expect(validatePendingSearchQuery('phone', '010-1234', 'en')).toBeNull();
  });

  test('allows complete phone numbers', () => {
    expect(validatePendingSearchQuery('phone', '01012345678', 'en')).toBeNull();
  });

  test('rejects single-character names', () => {
    expect(validatePendingSearchQuery('displayName', '가', 'en')).toBe(
      'Enter at least two characters for the name search.',
    );
  });

  test('allows two-character names', () => {
    expect(validatePendingSearchQuery('displayName', '가나', 'en')).toBeNull();
  });

  test('allows partial email queries', () => {
    expect(validatePendingSearchQuery('email', 'student1@exam', 'en')).toBeNull();
  });

  test('allows valid email queries', () => {
    expect(
      validatePendingSearchQuery('email', 'student1@example.com', 'en'),
    ).toBeNull();
  });
});
