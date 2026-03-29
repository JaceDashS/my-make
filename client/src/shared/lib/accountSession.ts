import {
  loginAccount,
  logoutAccount,
  type AccountApiResult,
} from './accountApi';

export type AccountSession = {
  accountCode: string;
  academyCode: string;
  academyName: string;
  authPolicy: string;
  displayName: string;
  email: string;
  profileDetails: Array<{ key: string; label: string; value: string }>;
  expiresAt: string;
  licenseCode: string;
  loginId: string;
  note: string;
  phone: string;
  roleCode: string;
  statusCode: string;
};

type AccountSessionApplySetters = {
  setSession: (value: AccountSession | null) => void;
  setIsAuthenticated: (value: boolean) => void;
};

type AccountSessionClearSetters = AccountSessionApplySetters & {
  resetLocalProfileState: () => void;
};

type AuthLog = (
  event: string,
  message?: string,
  payload?: Record<string, unknown>,
) => void;

type LoginFlowOptions = {
  appendAuthDebugLog: AuthLog;
  applyProfile: (profile: AccountApiResult) => void;
  localizeAccountError: (message?: string | null) => string;
  loginId: string;
  password: string;
  setAuthAction: (value: 'login' | 'logout' | 'profile' | 'register' | null) => void;
  setAuthError: (value: string | null) => void;
  setAuthNotice: (value: string | null) => void;
  setIsAuthenticated: (value: boolean) => void;
  setPage: (value: 'account') => void;
  setRegisterSuccess: (value: string | null) => void;
};

type LogoutFlowOptions = {
  appendAuthDebugLog: AuthLog;
  clearProfile: () => void;
  currentLoginId: string;
  currentRoleCode: string;
  setAuthAction: (value: 'login' | 'logout' | 'profile' | 'register' | null) => void;
  setAuthError: (value: string | null) => void;
  setAuthNotice: (value: string | null) => void;
  setPage: (value: 'account') => void;
};

export function createAccountSession(
  profile: AccountApiResult,
): AccountSession {
  const details = profile.details ?? [];
  const findDetailValue = (key: string) =>
    details.find(detail => detail?.key === key)?.value ?? '';

  return {
    accountCode: profile.accountCode ?? '',
    academyCode: profile.academyCode ?? '',
    academyName: profile.academyName ?? '',
    authPolicy: findDetailValue('authPolicy'),
    displayName: profile.displayName ?? '',
    email: profile.email ?? '',
    profileDetails: details.map(detail => ({
      key: detail?.key ?? '',
      label: detail?.label ?? '',
      value: detail?.value ?? '',
    })),
    expiresAt: profile.expiresAt ?? '',
    licenseCode: profile.licenseCode ?? '',
    loginId: profile.loginId ?? '',
    note: profile.note ?? '',
    phone: profile.phone ?? '',
    roleCode: profile.roleCode ?? '',
    statusCode: findDetailValue('statusCode'),
  };
}

export function applyAccountProfileState(
  profile: AccountApiResult,
  setters: AccountSessionApplySetters,
  appendAuthDebugLog: AuthLog,
) {
  const nextSession = createAccountSession(profile);

  setters.setSession(nextSession);
  setters.setIsAuthenticated(true);
  appendAuthDebugLog('profile:apply', 'applied profile to session', {
    detailsCount: nextSession.profileDetails.length,
    loginId: nextSession.loginId,
    roleCode: nextSession.roleCode,
  });
}

export function clearAccountProfileState(
  currentSession: AccountSession | null,
  setters: AccountSessionClearSetters,
  appendAuthDebugLog: AuthLog,
) {
  appendAuthDebugLog('profile:clear', 'clearing profile state', {
    currentLoginId: currentSession?.loginId ?? '',
    currentRoleCode: currentSession?.roleCode ?? '',
    detailsCount: currentSession?.profileDetails.length ?? 0,
  });
  setters.resetLocalProfileState();
  setters.setSession(null);
  setters.setIsAuthenticated(false);
}

export async function runAccountLoginFlow({
  appendAuthDebugLog,
  applyProfile,
  localizeAccountError,
  loginId,
  password,
  setAuthAction,
  setAuthError,
  setAuthNotice,
  setIsAuthenticated,
  setPage,
  setRegisterSuccess,
}: LoginFlowOptions) {
  setAuthAction('login');
  appendAuthDebugLog(
    'login:start',
    `loginId=${loginId || '(empty)'} passwordLength=${password.length}`,
    { loginId, passwordLength: password.length },
  );

  try {
    const result = await loginAccount({
      loginId,
      password,
    });
    appendAuthDebugLog('login:response', JSON.stringify(result), {
      status: result.status,
      roleCode: result.roleCode ?? '',
      academyCode: result.academyCode ?? '',
    });

    if (result.status !== 'ok') {
      setIsAuthenticated(false);
      setAuthNotice(null);
      setAuthError(localizeAccountError(result.error));
      appendAuthDebugLog(
        'login:error',
        result.error ?? result.message ?? 'unknown',
        {
          loginId,
          error: result.error ?? result.message ?? 'unknown',
        },
      );
      return;
    }

    applyProfile(result);
    setAuthError(null);
    setAuthNotice(null);
    setRegisterSuccess(null);
    setPage('account');
    appendAuthDebugLog(
      'login:success',
      `academyCode=${result.academyCode ?? ''} roleCode=${
        result.roleCode ?? ''
      }`,
      {
        loginId: result.loginId ?? loginId,
        academyCode: result.academyCode ?? '',
        roleCode: result.roleCode ?? '',
      },
    );
  } catch (error) {
    appendAuthDebugLog(
      'login:exception',
      error instanceof Error ? error.message : String(error),
      {
        loginId,
        error: error instanceof Error ? error.message : String(error),
      },
    );
    setIsAuthenticated(false);
    setAuthNotice(null);
    setAuthError(
      localizeAccountError(
        error instanceof Error ? error.message : String(error),
      ),
    );
  } finally {
    setAuthAction(null);
  }
}

export async function runAccountLogoutFlow({
  appendAuthDebugLog,
  clearProfile,
  currentLoginId,
  currentRoleCode,
  setAuthAction,
  setAuthError,
  setAuthNotice,
  setPage,
}: LogoutFlowOptions) {
  setAuthAction('logout');
  appendAuthDebugLog('logout:start', 'logout started', {
    currentLoginId,
    currentRoleCode,
  });

  clearProfile();
  setAuthError(null);
  setAuthNotice(null);
  setPage('account');
  setAuthAction(null);
  appendAuthDebugLog('logout:finish', 'logout finished locally', {});

  logoutAccount()
    .then(result => {
      appendAuthDebugLog('logout:response', 'logout response received', {
        error: result.error ?? '',
        message: result.message ?? '',
        status: result.status,
      });
    })
    .catch(error => {
      appendAuthDebugLog(
        'logout:exception',
        error instanceof Error ? error.message : String(error),
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
    });
}
