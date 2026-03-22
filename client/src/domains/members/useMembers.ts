import {useState} from 'react';

import {mockMembers} from './mockMembers';

export function useMembers() {
  const [members] = useState(mockMembers);

  return {
    members,
    totalCount: members.length,
    activeCount: members.filter(member => member.status === 'active').length,
  };
}
