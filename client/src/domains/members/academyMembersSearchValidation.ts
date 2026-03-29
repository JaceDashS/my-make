import type {LanguageMode} from '../../screens/shared/shell-model';

import {
  normalizePendingSearchQuery,
  validatePendingSearchQuery,
} from './pendingApprovalSearchValidation';
import type {SearchField} from './pendingApprovalTypes';

export function normalizeAcademyMembersSearchQuery(
  field: SearchField,
  query: string,
) {
  return normalizePendingSearchQuery(field, query);
}

export function validateAcademyMembersSearchQuery(
  field: SearchField,
  query: string,
  language: LanguageMode,
) {
  return validatePendingSearchQuery(field, query, language);
}
