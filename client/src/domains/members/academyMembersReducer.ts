import {buildAcademyMemberSlots} from './academyMembersModel';
import type {AcademyMemberChartViewState} from './academyMembersTypes';
import type {AcademyMemberRecord} from '../../shared/lib/pendingMembersApi';

export type AcademyMembersState = {
  chartView: AcademyMemberChartViewState;
  errorMessage: string;
  isSearching: boolean;
  noticeMessage: string;
  updatingKey: string | null;
};

export type AcademyMembersAction =
  | {type: 'sync_notice'; noticeMessage: string}
  | {type: 'clear_feedback'}
  | {type: 'reset_results'; errorMessage: string}
  | {type: 'search_started'}
  | {type: 'search_succeeded'; noticeMessage: string; rows: AcademyMemberRecord[]}
  | {type: 'search_failed'; errorMessage: string}
  | {type: 'search_finished'}
  | {type: 'status_update_started'; updatingKey: string}
  | {type: 'status_update_succeeded'; noticeMessage: string}
  | {type: 'status_update_failed'; errorMessage: string}
  | {type: 'status_update_finished'};

const emptyChartView: AcademyMemberChartViewState = {
  memberCount: 0,
  slots: buildAcademyMemberSlots([]),
};

export function createAcademyMembersState(uiNotice: string): AcademyMembersState {
  return {
    chartView: emptyChartView,
    errorMessage: '',
    isSearching: false,
    noticeMessage: uiNotice,
    updatingKey: null,
  };
}

export function academyMembersReducer(
  state: AcademyMembersState,
  action: AcademyMembersAction,
): AcademyMembersState {
  switch (action.type) {
    case 'sync_notice':
      if (state.errorMessage) {
        return state;
      }
      return {...state, noticeMessage: action.noticeMessage};

    case 'clear_feedback':
      return {...state, errorMessage: '', noticeMessage: ''};

    case 'reset_results':
      return {
        ...state,
        chartView: emptyChartView,
        errorMessage: action.errorMessage,
        noticeMessage: '',
      };

    case 'search_started':
      return {...state, errorMessage: '', isSearching: true, noticeMessage: ''};

    case 'search_succeeded':
      return {
        ...state,
        chartView: {
          memberCount: action.rows.length,
          slots: buildAcademyMemberSlots(action.rows),
        },
        errorMessage: '',
        noticeMessage: action.noticeMessage,
      };

    case 'search_failed':
      return {
        ...state,
        chartView: emptyChartView,
        errorMessage: action.errorMessage,
      };

    case 'search_finished':
      return {...state, isSearching: false};

    case 'status_update_started':
      return {
        ...state,
        errorMessage: '',
        noticeMessage: '',
        updatingKey: action.updatingKey,
      };

    case 'status_update_succeeded':
      return {...state, noticeMessage: action.noticeMessage};

    case 'status_update_failed':
      return {...state, errorMessage: action.errorMessage};

    case 'status_update_finished':
      return {...state, updatingKey: null};

    default:
      return state;
  }
}
