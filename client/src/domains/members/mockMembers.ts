import type {Member} from './types';

export const mockMembers: Member[] = [
  {
    id: 'member-001',
    name: 'Kim Hana',
    role: 'student',
    phone: '010-2458-1102',
    assignedInstructor: 'Lee Jisu',
    lessonCreditsRemaining: 8,
    status: 'active',
    skinTone: 'neutral-light',
  },
  {
    id: 'member-002',
    name: 'Park Minseo',
    role: 'student',
    phone: '010-9914-4415',
    assignedInstructor: 'Lee Jisu',
    lessonCreditsRemaining: 2,
    status: 'dormant',
    skinTone: 'warm-medium',
  },
  {
    id: 'member-003',
    name: 'Choi Yerin',
    role: 'teacher',
    phone: '010-7720-3041',
    assignedInstructor: 'Academy Admin',
    lessonCreditsRemaining: 0,
    status: 'active',
    skinTone: 'cool-light',
  },
];
