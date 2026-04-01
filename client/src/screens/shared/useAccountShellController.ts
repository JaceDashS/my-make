import { useState } from 'react';

import {
  fetchAccountProfile,
  registerMemberAccount,
  registerRootAccount,
  updateAccountProfile,
  type AccountApiResult,
} from '../../shared/lib/accountApi';
import {
  applyAccountProfileState,
  clearAccountProfileState,
  runAccountLoginFlow,
  runAccountLogoutFlow,
  type AccountSession,
} from '../../shared/lib/accountSession';
import { canAccessMembersShellPage } from './shell-routing';

type AuthAction = 'login' | 'logout' | 'profile' | 'register' | null;

export type AccountErrorLabels = {
  academyActive?: string;
  academyCreateFailed: string;
  academyInactive: string;
  accountInactive: string;
  accountOnHold: string;
  accountPending: string;
  duplicateLoginId: string;
  invalid: string;
  licenseAssigned: string;
  licenseExpired: string;
  licenseNotFound: string;
  licenseRenewUnavailable: string;
  licenseUnavailable: string;
  memberRegisterBody: string;
  memberRegisterSuccess: string;
  memberRoleInvalid: string;
  passwordMismatch: string;
  passwordSetupFailed: string;
  profileAuthPolicyDenied: string;
  profileSaveSuccess: string;
  profileStatusDenied: string;
  profileStatusInvalid: string;
  profileUpdateFailed: string;
  registerSuccess: string;
  registrationBusy: string;
  requiredField: string;
  rootAlreadyExists: string;
  signInFailed: string;
};

type UseAccountShellControllerParams<TSection extends string> = {
  labels: AccountErrorLabels;
  loginSection: TSection;
  profileLoadLogLabel: string;
  setPage: (value: 'account') => void;
  setSection: (value: TSection) => void;
};

function localizeAccountError(
  labels: AccountErrorLabels,
  message?: string | null,
) {
  switch (message) {
    case 'Please enter your login ID and password.':
    case 'Please enter a login ID.':
    case 'Please enter a display name.':
    case 'Please enter a password.':
    case 'Please enter a phone number.':
      return labels.requiredField;
    case 'Please choose a member role.':
    case 'Please choose a valid member role.':
      return labels.memberRoleInvalid;
    case 'That login ID is already in use. Please choose another one.':
    case 'That email address is already in use. Please choose another one.':
      return labels.duplicateLoginId;
    case 'This academy already has a root account.':
      return labels.rootAlreadyExists;
    case 'This license has already been assigned to an academy.':
      return labels.licenseAssigned;
    case 'This license is not available for registration.':
      return labels.licenseUnavailable;
    case 'This license has expired.':
      return labels.licenseExpired;
    case 'That license code could not be found.':
      return labels.licenseNotFound;
    case 'This license can only be renewed before it expires.':
      return labels.licenseRenewUnavailable;
    case 'account approval is pending':
    case 'Your account is waiting for approval.':
      return labels.accountPending;
    case 'account is on hold':
    case 'Your account is currently on hold.':
      return labels.accountOnHold;
    case 'account is inactive':
    case 'Your account is inactive.':
      return labels.accountInactive;
    case 'academy is inactive':
    case 'Your academy is currently inactive.':
      return labels.academyInactive;
    case 'We could not create the academy right now. Please try again.':
      return labels.academyCreateFailed;
    case 'We could not prepare your password right now. Please try again.':
      return labels.passwordSetupFailed;
    case 'Only root accounts can update auth policy.':
      return labels.profileAuthPolicyDenied;
    case 'You do not have permission to update this status.':
      return labels.profileStatusDenied;
    case 'Please choose a valid status.':
      return labels.profileStatusInvalid;
    case 'We could not update your profile right now. Please try again.':
      return labels.profileUpdateFailed;
    case 'We could not sign you in right now. Please try again.':
    case "We couldn't complete sign-in right now. Please try again.":
      return labels.signInFailed;
    case 'We could not complete registration right now. Please try again.':
    case "We couldn't create your member account right now. Please try again.":
    case "We couldn't create your member registration right now. Please try again.":
    case "We couldn't create the root account right now. Please try again.":
    case "We couldn't complete root registration right now. Please try again.":
    case "We couldn't finish registration right now. Please try again.":
    case "We couldn't assign the license right now. Please try again.":
    case "We couldn't confirm the license assignment right now. Please try again.":
    case "We couldn't assign that license. Please check the license and try again.":
    case "We couldn't start registration right now. Please try again.":
      return labels.registrationBusy;
    default:
      return message ?? labels.invalid;
  }
}

export function useAccountShellController<TSection extends string>({
  labels,
  loginSection,
  profileLoadLogLabel,
  setPage,
  setSection,
}: UseAccountShellControllerParams<TSection>) {
  const [session, setSession] = useState<AccountSession | null>(null);
  const [academyName, setAcademyName] = useState('');
  const [licenseCode, setLicenseCode] = useState('');
  const [loginId, setLoginId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [requestedRoleCode, setRequestedRoleCode] = useState<
    'STUDENT' | 'TEACHER' | 'ADMIN'
  >('STUDENT');
  const [registerType, setRegisterType] = useState<'user' | 'root'>('user');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerSuccess, setRegisterSuccess] = useState<string | null>(null);
  const [authAction, setAuthAction] = useState<AuthAction>(null);

  const appendAuthDebugLog = (
    event: string,
    message?: string,
    payload: Record<string, unknown> = {},
  ) => {
    console.log(`[accounts] ${event}`, {
      message: message ?? '',
      ...payload,
    });
  };

  const applyProfile = (profile: AccountApiResult) => {
    applyAccountProfileState(
      profile,
      {
        setSession,
        setIsAuthenticated,
      },
      appendAuthDebugLog,
    );
  };

  const clearProfile = () => {
    clearAccountProfileState(
      session,
      {
        resetLocalProfileState: clearRegistrationFields,
        setSession,
        setIsAuthenticated,
      },
      appendAuthDebugLog,
    );
  };

  const clearRegistrationFields = () => {
    setAcademyName('');
    setLicenseCode('');
    setLoginId('');
    setDisplayName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setConfirmPassword('');
    setRequestedRoleCode('STUDENT');
  };

  const resetAccountUi = () => {
    clearRegistrationFields();
    setAuthError(null);
    setAuthNotice(null);
    setRegisterError(null);
    setRegisterSuccess(null);
  };

  const loadProfile = async () => {
    const result = await fetchAccountProfile();
    if (result.status !== 'ok') {
      throw new Error(
        result.error ?? result.message ?? 'No active session was found.',
      );
    }

    appendAuthDebugLog('profile:load', profileLoadLogLabel, {
      detailsCount:
        (result as AccountApiResult & { details?: unknown[] }).details?.length ?? 0,
      loginId: result.loginId ?? '',
      roleCode: result.roleCode ?? '',
    });
    applyProfile(result);
    return result;
  };

  const handleLogin = async () => {
    await runAccountLoginFlow({
      appendAuthDebugLog,
      applyProfile,
      localizeAccountError: message => localizeAccountError(labels, message),
      loginId,
      password,
      setAuthAction,
      setAuthError,
      setAuthNotice,
      setIsAuthenticated,
      setPage,
      setRegisterSuccess,
    });
  };

  const handleRegister = async () => {
    if (registerType === 'user') {
      if (!loginId || !displayName || !phone || !password || !confirmPassword) {
        setRegisterError(labels.requiredField);
        setRegisterSuccess(null);
        return;
      }

      if (password !== confirmPassword) {
        setRegisterError(labels.passwordMismatch);
        setRegisterSuccess(null);
        return;
      }

      setAuthAction('register');

      try {
        const result = await registerMemberAccount({
          displayName,
          email,
          loginId,
          phone,
          password,
          requestedRoleCode,
        });

        if (result.status !== 'ok') {
          setRegisterError(
            localizeAccountError(labels, result.error) ?? labels.memberRegisterBody,
          );
          setRegisterSuccess(null);
          return;
        }

        setAuthError(null);
        setAuthNotice(labels.memberRegisterSuccess);
        setRegisterError(null);
        setRegisterSuccess(labels.memberRegisterSuccess);
        setPage('account');
        setSection(loginSection);
        clearRegistrationFields();
        return;
      } finally {
        setAuthAction(null);
      }
    }

    if (
      !licenseCode ||
      !academyName ||
      !loginId ||
      !displayName ||
      !phone ||
      !password ||
      !confirmPassword
    ) {
      setRegisterError(labels.requiredField);
      setRegisterSuccess(null);
      return;
    }

    if (password !== confirmPassword) {
      setRegisterError(labels.passwordMismatch);
      setRegisterSuccess(null);
      return;
    }

    setAuthAction('register');

    try {
      const result = await registerRootAccount({
        academyName,
        email,
        licenseCode,
        phone,
        password,
        rootDisplayName: displayName,
        rootLoginId: loginId,
      });

      if (result.status !== 'ok') {
        setRegisterError(
          localizeAccountError(labels, result.error) ?? labels.registrationBusy,
        );
        setRegisterSuccess(null);
        return;
      }

      await loadProfile();
      setAuthError(null);
      setAuthNotice(null);
      setRegisterError(null);
      setRegisterSuccess(
        `${labels.registerSuccess}${result.academyCode ? ` (${result.academyCode})` : ''}`,
      );
      setPage('account');
      setSection(loginSection);
      clearRegistrationFields();
    } finally {
      setAuthAction(null);
    }
  };

  const handleLogout = async () => {
    await runAccountLogoutFlow({
      appendAuthDebugLog,
      clearProfile,
      currentLoginId: session?.loginId ?? '',
      currentRoleCode: session?.roleCode ?? '',
      setAuthAction,
      setAuthError,
      setAuthNotice,
      setPage,
    });
  };

  const canEditAuthPolicy = (session?.roleCode ?? '') === 'ROOT';
  const canEditStatus = false;

  const handleSaveProfile = async (overrides?: {
    authPolicy?: string;
    email?: string;
    note?: string;
    password?: string;
    phone?: string;
    preferenceRanges?: string;
    skinCValue?: string;
    skinHValue?: string;
    skinLValue?: string;
    skinTraits?: string;
    statusCode?: string;
  }) => {
    setAuthAction('profile');
    setAuthError(null);
    setAuthNotice(null);

    try {
      const payload: {
        authPolicy?: string;
        email?: string;
        note?: string;
        password?: string;
        phone?: string;
        preferenceRanges?: string;
        skinCValue?: string;
        skinHValue?: string;
        skinLValue?: string;
        skinTraits?: string;
        statusCode?: string;
      } = {};

      if (overrides?.authPolicy !== undefined && canEditAuthPolicy) {
        payload.authPolicy = overrides.authPolicy;
      }
      if (overrides?.email !== undefined) {
        payload.email = overrides.email;
      }
      if (overrides?.note !== undefined) {
        payload.note = overrides.note;
      }
      if (overrides?.password !== undefined) {
        payload.password = overrides.password;
      }
      if (overrides?.phone !== undefined) {
        payload.phone = overrides.phone;
      }
      if (overrides?.skinLValue !== undefined) {
        payload.skinLValue = overrides.skinLValue;
      }
      if (overrides?.skinCValue !== undefined) {
        payload.skinCValue = overrides.skinCValue;
      }
      if (overrides?.skinHValue !== undefined) {
        payload.skinHValue = overrides.skinHValue;
      }
      if (overrides?.skinTraits !== undefined) {
        payload.skinTraits = overrides.skinTraits;
      }
      if (overrides?.preferenceRanges !== undefined) {
        payload.preferenceRanges = overrides.preferenceRanges;
      }
      if (overrides?.statusCode !== undefined && canEditStatus) {
        payload.statusCode = overrides.statusCode;
      }

      const result = await updateAccountProfile(payload);

      if (result.status !== 'ok') {
        setAuthError(
          localizeAccountError(labels, result.error ?? result.message),
        );
        return;
      }

      applyProfile(result);
      setAuthNotice(labels.profileSaveSuccess);
    } finally {
      setAuthAction(null);
    }
  };

  const handleRegisterTypeChange = (nextRegisterType: 'user' | 'root') => {
    clearRegistrationFields();
    setRegisterType(nextRegisterType);
    setAuthError(null);
    setAuthNotice(null);
    setRegisterError(null);
    setRegisterSuccess(null);
  };

  const canAccessMembersPage = canAccessMembersShellPage(
    isAuthenticated,
    session?.roleCode ?? '',
  );
  const showTeacherAccountItems =
    isAuthenticated && (session?.roleCode ?? '') === 'TEACHER';
  const showStudentAccountItems =
    isAuthenticated && (session?.roleCode ?? '') === 'STUDENT';

  return {
    academyName,
    authAction,
    authError,
    authNotice,
    canAccessMembersPage,
    canEditAuthPolicy,
    canEditStatus,
    clearRegistrationFields,
    confirmPassword,
    displayName,
    email,
    handleLogin,
    handleLogout,
    handleRegister,
    handleRegisterTypeChange,
    handleSaveProfile,
    isAuthenticated,
    licenseCode,
    loginId,
    password,
    phone,
    registerError,
    registerSuccess,
    registerType,
    requestedRoleCode,
    resetAccountUi,
    session,
    setAcademyName,
    setConfirmPassword,
    setDisplayName,
    setEmail,
    setLicenseCode,
    setLoginId,
    setPassword,
    setPhone,
    setRequestedRoleCode,
    showStudentAccountItems,
    showTeacherAccountItems,
  };
}
