import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import {AcademyMembersSection} from '../src/domains/members/AcademyMembersSection';

function collectText(node: any): string[] {
  if (node == null) {
    return [];
  }

  if (typeof node === 'string' || typeof node === 'number') {
    return [String(node)];
  }

  if (Array.isArray(node)) {
    return node.flatMap(collectText);
  }

  return collectText(node.children ?? []);
}

describe('academy members section', () => {
  test('renders the academy members search shell and status filters', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <AcademyMembersSection
          academyCode="abc123def456"
          compact={true}
          isAuthenticated={true}
          language="en"
          palette={
            {
              border: '#333333',
              card: '#111111',
              muted: '#222222',
              primary: '#3366ff',
              primaryText: '#ffffff',
              text: '#ffffff',
              textMuted: '#cccccc',
            } as any
          }
          roleCode="ROOT"
        />,
      );
    });

    const textContent = collectText(renderer!.toJSON()).join(' ');

    expect(textContent).toContain('Academy Members');
    expect(textContent).toContain('All');
    expect(textContent).toContain('All Members');
    expect(textContent).toContain('Active');
    expect(textContent).toContain('Hold');
    expect(textContent).toContain('Inactive');
  });
});
