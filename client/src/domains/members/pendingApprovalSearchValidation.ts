import type { LanguageMode } from '../../screens/shared/shell-model';
import { formatPhoneQuery } from './pendingApprovalModel';
import type { SearchField } from './pendingApprovalTypes';

export function normalizePendingSearchQuery(
  field: SearchField,
  query: string,
) {
  const trimmed = query.trim();

  if (field === 'phone') {
    return formatPhoneQuery(trimmed);
  }

  return trimmed;
}

export function hasMinimumDisplayNameSearchLength(query: string) {
  return Array.from(query.trim()).length >= 2;
}

export function validatePendingSearchQuery(
  field: SearchField,
  query: string,
  language: LanguageMode,
) {
  const normalizedQuery = normalizePendingSearchQuery(field, query);

  if (!normalizedQuery) {
    return language === 'ja'
      ? '検索キーワードを入力してください。'
      : 'Enter a search value first.';
  }

  if (
    field === 'displayName' &&
    !hasMinimumDisplayNameSearchLength(normalizedQuery)
  ) {
    return language === 'ja'
      ? '名前は 2 文字以上入力したときだけ検索できます。'
      : 'Enter at least two characters for the name search.';
  }

  return null;
}
