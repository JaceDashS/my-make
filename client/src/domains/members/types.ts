export type MemberStatus = 'new' | 'active' | 'dormant' | 'completed';

export type MemberRole = 'student' | 'teacher';

export type Member = {
  id: string;
  name: string;
  role: MemberRole;
  phone: string;
  assignedInstructor: string;
  lessonCreditsRemaining: number;
  status: MemberStatus;
  skinTone: string;
};
