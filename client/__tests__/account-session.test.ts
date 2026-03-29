import {
  applyAccountProfileState,
  clearAccountProfileState,
  createAccountSession,
  runAccountLoginFlow,
  runAccountLogoutFlow,
} from '../src/shared/lib/accountSession';
import {loginAccount, logoutAccount} from '../src/shared/lib/accountApi';

jest.mock('../src/shared/lib/accountApi', () => ({
  loginAccount: jest.fn(),
  logoutAccount: jest.fn(),
}));

function createProfile() {
  return {
    accountCode: 'AC0001',
    academyCode: 'ACD001',
    academyName: 'My Academy',
    details: [
      {key: 'authPolicy', label: 'Auth Policy', value: 'ROOT_ONLY'},
      {key: 'statusCode', label: 'Status', value: 'ACTIVE'},
    ],
    displayName: 'Root Admin',
    email: 'root@example.com',
    expiresAt: '2027-03-24T00:00:00Z',
    licenseCode: 'LICENSE001',
    loginId: 'root-admin',
    message: 'ok',
    note: 'Profile note',
    phone: '010-1234-5678',
    roleCode: 'ROOT',
    status: 'ok',
  };
}

function createSetters() {
  return {
    setSession: jest.fn(),
    setIsAuthenticated: jest.fn(),
    setAccountCode: jest.fn(),
    setAcademyCode: jest.fn(),
    setAcademyName: jest.fn(),
    setAuthPolicy: jest.fn(),
    setDisplayName: jest.fn(),
    setEmail: jest.fn(),
    setLicenseCode: jest.fn(),
    setLoginId: jest.fn(),
    setNote: jest.fn(),
    setPhone: jest.fn(),
    setStatusCode: jest.fn(),
  };
}

describe('account session helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('createAccountSession maps detail fields into session fields', () => {
    const session = createAccountSession(createProfile());

    expect(session.accountCode).toBe('AC0001');
    expect(session.authPolicy).toBe('ROOT_ONLY');
    expect(session.statusCode).toBe('ACTIVE');
    expect(session.profileDetails).toHaveLength(2);
  });

  test('applyAccountProfileState pushes mapped values into setters', () => {
    const setters = createSetters();
    const appendAuthDebugLog = jest.fn();

    applyAccountProfileState(createProfile(), setters, appendAuthDebugLog);

    expect(setters.setSession).toHaveBeenCalled();
    expect(setters.setAccountCode).toHaveBeenCalledWith('AC0001');
    expect(setters.setAuthPolicy).toHaveBeenCalledWith('ROOT_ONLY');
    expect(setters.setStatusCode).toHaveBeenCalledWith('ACTIVE');
    expect(setters.setIsAuthenticated).toHaveBeenCalledWith(true);
    expect(appendAuthDebugLog).toHaveBeenCalledWith(
      'profile:apply',
      'applied profile to session',
      expect.objectContaining({
        loginId: 'root-admin',
        roleCode: 'ROOT',
      }),
    );
  });

  test('clearAccountProfileState resets all stored profile values', () => {
    const setters = createSetters();
    const appendAuthDebugLog = jest.fn();

    clearAccountProfileState(
      {
        accountCode: 'AC0001',
        academyCode: 'ACD001',
        academyName: 'My Academy',
        authPolicy: 'ROOT_ONLY',
        displayName: 'Root Admin',
        email: 'root@example.com',
        expiresAt: '2027-03-24T00:00:00Z',
        licenseCode: 'LICENSE001',
        loginId: 'root-admin',
        note: 'Profile note',
        phone: '010-1234-5678',
        profileDetails: [{key: 'statusCode', label: 'Status', value: 'ACTIVE'}],
        roleCode: 'ROOT',
        statusCode: 'ACTIVE',
      },
      setters,
      appendAuthDebugLog,
    );

    expect(setters.setSession).toHaveBeenCalledWith(null);
    expect(setters.setIsAuthenticated).toHaveBeenCalledWith(false);
    expect(setters.setAccountCode).toHaveBeenCalledWith('');
    expect(setters.setStatusCode).toHaveBeenCalledWith('');
  });

  test('runAccountLoginFlow applies profile when login succeeds', async () => {
    const appendAuthDebugLog = jest.fn();
    const applyProfile = jest.fn();
    const setAuthAction = jest.fn();
    const setAuthError = jest.fn();
    const setAuthNotice = jest.fn();
    const setIsAuthenticated = jest.fn();
    const setPage = jest.fn();
    const setRegisterSuccess = jest.fn();

    (loginAccount as jest.Mock).mockResolvedValue(createProfile());

    await runAccountLoginFlow({
      appendAuthDebugLog,
      applyProfile,
      localizeAccountError: message => message ?? 'unknown',
      loginId: 'root-admin',
      password: 'secret',
      setAuthAction,
      setAuthError,
      setAuthNotice,
      setIsAuthenticated,
      setPage,
      setRegisterSuccess,
    });

    expect(applyProfile).toHaveBeenCalledWith(expect.objectContaining({loginId: 'root-admin'}));
    expect(setAuthError).toHaveBeenCalledWith(null);
    expect(setAuthNotice).toHaveBeenCalledWith(null);
    expect(setRegisterSuccess).toHaveBeenCalledWith(null);
    expect(setPage).toHaveBeenCalledWith('account');
    expect(setAuthAction).toHaveBeenLastCalledWith(null);
  });

  test('runAccountLoginFlow exposes localized error when login fails', async () => {
    const setAuthError = jest.fn();
    const setIsAuthenticated = jest.fn();

    (loginAccount as jest.Mock).mockResolvedValue({
      status: 'error',
      message: 'Request failed.',
      error: 'Bad credentials.',
    });

    await runAccountLoginFlow({
      appendAuthDebugLog: jest.fn(),
      applyProfile: jest.fn(),
      localizeAccountError: message => `localized:${message}`,
      loginId: 'root-admin',
      password: 'wrong',
      setAuthAction: jest.fn(),
      setAuthError,
      setAuthNotice: jest.fn(),
      setIsAuthenticated,
      setPage: jest.fn(),
      setRegisterSuccess: jest.fn(),
    });

    expect(setIsAuthenticated).toHaveBeenCalledWith(false);
    expect(setAuthError).toHaveBeenCalledWith('localized:Bad credentials.');
  });

  test('runAccountLogoutFlow clears profile and page state before logout response returns', async () => {
    const clearProfile = jest.fn();
    const setAuthAction = jest.fn();
    const setAuthError = jest.fn();
    const setAuthNotice = jest.fn();
    const setPage = jest.fn();
    let resolveLogout:
      | ((value: {status: string; message: string}) => void)
      | undefined;

    (logoutAccount as jest.Mock).mockImplementation(
      () =>
        new Promise(resolve => {
          resolveLogout = resolve;
        }),
    );

    await runAccountLogoutFlow({
      appendAuthDebugLog: jest.fn(),
      clearProfile,
      currentLoginId: 'root-admin',
      currentRoleCode: 'ROOT',
      setAuthAction,
      setAuthError,
      setAuthNotice,
      setPage,
    });

    expect(clearProfile).toHaveBeenCalled();
    expect(setAuthError).toHaveBeenCalledWith(null);
    expect(setAuthNotice).toHaveBeenCalledWith(null);
    expect(setPage).toHaveBeenCalledWith('account');
    expect(setAuthAction).toHaveBeenLastCalledWith(null);

    resolveLogout?.({
      status: 'ok',
      message: 'Signed out successfully.',
    });
  });
});
