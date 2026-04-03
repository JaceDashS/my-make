import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {Animated} from 'react-native';

import {SidebarMenu} from '../src/screens/desktop/desktop-shell/components/SidebarMenu';
import {MenuPanel} from '../src/screens/mobile/mobile-shell/components/MenuPanel';

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

function findPressableByText(
  root: ReactTestRenderer.ReactTestInstance,
  label: string,
) {
  return root.find(
    node =>
      typeof node.props?.onPress === 'function' &&
      collectText(node.children ?? []).includes(label),
  );
}

beforeAll(() => {
  jest.spyOn(Animated, 'timing').mockReturnValue({
    start: () => undefined,
  } as any);
  jest.spyOn(Animated, 'parallel').mockReturnValue({
    start: () => undefined,
  } as any);
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe('members page red stage', () => {
  test('desktop dev health stays hidden until settings is pressed five times', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <SidebarMenu
          animation={new Animated.Value(1)}
          disableConditionalVisibility={false}
          isAuthenticated={true}
          isOpen={true}
          showInventoryPage={false}
          showMembersPage={false}
          showStudentReservationItem={false}
          showStudentAccountItems={false}
          showTeacherAccountItems={false}
          showTeacherReservationItem={false}
          labels={
            {
              account: 'Account',
              devHealth: 'Dev Health',
              general: 'General',
              login: 'Login',
              members: 'Members',
              profile: 'Profile',
              register: 'Register',
              settings: 'Settings',
            } as any
          }
          onNavigate={() => undefined}
          page="settings"
          palette={
            {
              sidebar: '#111111',
              sidebarItem: '#222222',
              sidebarItemText: '#ffffff',
            } as any
          }
          section="general"
        />,
      );
    });

    expect(collectText(renderer!.toJSON())).not.toContain('Dev Health');

    const settingsPressable = findPressableByText(renderer!.root, 'Settings');
    ReactTestRenderer.act(() => {
      for (let index = 0; index < 5; index += 1) {
        settingsPressable.props.onPress();
      }
    });

    expect(collectText(renderer!.toJSON())).toContain('Dev Health');
  });

  test('mobile dev health stays hidden until settings is pressed five times', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <MenuPanel
          currentPage="settings"
          currentSection="general"
          isAuthenticated={true}
          showInventoryPage={false}
          showMembersPage={false}
          showStudentReservationItem={false}
          showStudentAccountItems={false}
          showTeacherAccountItems={false}
          showTeacherReservationItem={false}
          labels={
            {
              account: 'Account',
              devHealth: 'Dev Health',
              general: 'General',
              login: 'Login',
              members: 'Members',
              profile: 'Profile',
              register: 'Register',
              settings: 'Settings',
            } as any
          }
          onSelectSection={() => undefined}
          palette={
            {
              menuCard: '#111111',
              menuText: '#ffffff',
              sidebarItem: '#222222',
              sidebarItemText: '#ffffff',
            } as any
          }
        />,
      );
    });

    expect(collectText(renderer!.toJSON())).not.toContain('Dev Health');

    const settingsPressable = findPressableByText(renderer!.root, 'Settings');
    ReactTestRenderer.act(() => {
      for (let index = 0; index < 5; index += 1) {
        settingsPressable.props.onPress();
      }
    });

    expect(collectText(renderer!.toJSON())).toContain('Dev Health');
  });

  test('desktop academy members menu should request the academy-members section', () => {
    const onSectionChange = jest.fn();
    let renderer: ReactTestRenderer.ReactTestRenderer;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <SidebarMenu
          animation={new Animated.Value(1)}
          disableConditionalVisibility={false}
          isAuthenticated={true}
          isOpen={true}
          showInventoryPage={false}
          showMembersPage={true}
          showStudentReservationItem={false}
          showStudentAccountItems={false}
          showTeacherAccountItems={false}
          showTeacherReservationItem={false}
          labels={
            {
              account: 'Account',
              academyMembers: 'Academy Members',
              devHealth: 'Dev Health',
              general: 'General',
              login: 'Login',
              members: 'Members',
              pendingApproval: 'Pending Approval',
              profile: 'Profile',
              register: 'Register',
              settings: 'Settings',
            } as any
          }
          onNavigate={() => undefined}
          onSectionChange={onSectionChange}
          page="members"
          palette={
            {
              sidebar: '#111111',
              sidebarItem: '#222222',
              sidebarItemText: '#ffffff',
            } as any
          }
          section="pending-approval"
        />,
      );
    });

    const academyPressable = findPressableByText(
      renderer!.root,
      'Academy Members',
    );

    ReactTestRenderer.act(() => {
      academyPressable.props.onPress();
    });

    expect(onSectionChange).toHaveBeenCalledWith('academy-members');
  });

  test('desktop members menu should expose academy members in addition to pending approval', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <SidebarMenu
          animation={new Animated.Value(1)}
          disableConditionalVisibility={false}
          isAuthenticated={true}
          isOpen={true}
          showInventoryPage={false}
          showMembersPage={true}
          showStudentReservationItem={false}
          showStudentAccountItems={false}
          showTeacherAccountItems={false}
          showTeacherReservationItem={false}
          labels={
            {
              account: 'Account',
              academyMembers: 'Academy Members',
              devHealth: 'Dev Health',
              general: 'General',
              login: 'Login',
              members: 'Members',
              pendingApproval: 'Pending Approval',
              profile: 'Profile',
              register: 'Register',
              settings: 'Settings',
            } as any
          }
          onNavigate={() => undefined}
          onSectionChange={() => undefined}
          page="members"
          palette={
            {
              sidebar: '#111111',
              sidebarItem: '#222222',
              sidebarItemText: '#ffffff',
            } as any
          }
          section="pending-approval"
        />,
      );
    });

    const textContent = collectText(renderer!.toJSON()).join(' ');

    expect(textContent).toContain('Pending Approval');
    expect(textContent).toContain('Academy Members');
  });

  test('mobile members menu should expose academy members in addition to pending approval', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <MenuPanel
          currentPage="members"
          currentSection="pending-approval"
          isAuthenticated={true}
          showInventoryPage={false}
          showMembersPage={true}
          showStudentReservationItem={false}
          showStudentAccountItems={false}
          showTeacherAccountItems={false}
          showTeacherReservationItem={false}
          labels={
            {
              account: 'Account',
              academyMembers: 'Academy Members',
              devHealth: 'Dev Health',
              general: 'General',
              login: 'Login',
              members: 'Members',
              pendingApproval: 'Pending Approval',
              profile: 'Profile',
              register: 'Register',
              settings: 'Settings',
            } as any
          }
          onSelectGroup={() => undefined}
          onSelectSection={() => undefined}
          palette={
            {
              menuCard: '#111111',
              menuText: '#ffffff',
              sidebarItem: '#222222',
              sidebarItemText: '#ffffff',
            } as any
          }
        />,
      );
    });

    const textContent = collectText(renderer!.toJSON()).join(' ');

    expect(textContent).toContain('Pending Approval');
    expect(textContent).toContain('Academy Members');
  });

  test('mobile academy members menu should request the academy-members section', () => {
    const onSelectSection = jest.fn();
    let renderer: ReactTestRenderer.ReactTestRenderer;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <MenuPanel
          currentPage="members"
          currentSection="pending-approval"
          isAuthenticated={true}
          showInventoryPage={false}
          showMembersPage={true}
          showStudentReservationItem={false}
          showStudentAccountItems={false}
          showTeacherAccountItems={false}
          showTeacherReservationItem={false}
          labels={
            {
              account: 'Account',
              academyMembers: 'Academy Members',
              devHealth: 'Dev Health',
              general: 'General',
              login: 'Login',
              members: 'Members',
              pendingApproval: 'Pending Approval',
              profile: 'Profile',
              register: 'Register',
              settings: 'Settings',
            } as any
          }
          onSelectGroup={() => undefined}
          onSelectSection={onSelectSection}
          palette={
            {
              menuCard: '#111111',
              menuText: '#ffffff',
              sidebarItem: '#222222',
              sidebarItemText: '#ffffff',
            } as any
          }
        />,
      );
    });

    const academyPressable = findPressableByText(
      renderer!.root,
      'Academy Members',
    );

    ReactTestRenderer.act(() => {
      academyPressable.props.onPress();
    });

    expect(onSelectSection).toHaveBeenCalledWith('members', 'academy-members');
  });

  test('desktop members menu should be hidden when access is not allowed', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <SidebarMenu
          animation={new Animated.Value(1)}
          disableConditionalVisibility={false}
          isAuthenticated={true}
          isOpen={true}
          showInventoryPage={false}
          showMembersPage={false}
          showStudentReservationItem={false}
          showStudentAccountItems={false}
          showTeacherAccountItems={false}
          showTeacherReservationItem={false}
          labels={
            {
              account: 'Account',
              academyMembers: 'Academy Members',
              devHealth: 'Dev Health',
              general: 'General',
              login: 'Login',
              members: 'Members',
              pendingApproval: 'Pending Approval',
              profile: 'Profile',
              register: 'Register',
              settings: 'Settings',
            } as any
          }
          onNavigate={() => undefined}
          onSectionChange={() => undefined}
          page="account"
          palette={
            {
              sidebar: '#111111',
              sidebarItem: '#222222',
              sidebarItemText: '#ffffff',
            } as any
          }
          section="login"
        />,
      );
    });

    const textContent = collectText(renderer!.toJSON()).join(' ');

    expect(textContent).not.toContain('Members');
    expect(textContent).not.toContain('Pending Approval');
    expect(textContent).not.toContain('Academy Members');
  });

  test('mobile members menu should be hidden when access is not allowed', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <MenuPanel
          currentPage="account"
          currentSection="login"
          isAuthenticated={true}
          showInventoryPage={false}
          showMembersPage={false}
          showStudentReservationItem={false}
          showStudentAccountItems={false}
          showTeacherAccountItems={false}
          showTeacherReservationItem={false}
          labels={
            {
              account: 'Account',
              academyMembers: 'Academy Members',
              devHealth: 'Dev Health',
              general: 'General',
              login: 'Login',
              members: 'Members',
              pendingApproval: 'Pending Approval',
              profile: 'Profile',
              register: 'Register',
              settings: 'Settings',
            } as any
          }
          onSelectGroup={() => undefined}
          onSelectSection={() => undefined}
          palette={
            {
              menuCard: '#111111',
              menuText: '#ffffff',
              sidebarItem: '#222222',
              sidebarItemText: '#ffffff',
            } as any
          }
        />,
      );
    });

    const textContent = collectText(renderer!.toJSON()).join(' ');

    expect(textContent).not.toContain('Members');
    expect(textContent).not.toContain('Pending Approval');
    expect(textContent).not.toContain('Academy Members');
  });
});
