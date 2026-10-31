'use client';
import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  User, 
  ArrowRight, 
  X, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle, 
  Shield, 
  LifeBuoy, 
  Key, 
  RefreshCw 
} from 'lucide-react';
import { 
  AUTHORIZED_ADMIN_EMAIL, 
  DEFAULT_ADMIN_USERNAME, 
  getAdminCredentials,
  verifyAdminPrimaryCredentials,
  requestAdminLoginOtp,
  verifyAdminLoginOtp,
  verifyAdmin2FACode,
  setAdminLoginSession,
  getLoginOtpRateLimitStatus,
  requestPasswordReset, 
  confirmPasswordReset,
  getResetRateLimitStatus
} from '../utils/adminAuth';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  // Views: 'login_credentials' | 'login_email_otp' | 'forgot_request' | 'forgot_verify'
  const [view, setView] = useState<'login_credentials' | 'login_email_otp' | 'forgot_request' | 'forgot_verify'>('login_credentials');
  
  // Login credentials state
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Email OTP / TOTP 2FA state
  const [active2FAMethod, setActive2FAMethod] = useState<'authenticator' | 'email_otp'>('email_otp');
  const [emailOtpCode, setEmailOtpCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [backupCodeInput, setBackupCodeInput] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [loginCooldown, setLoginCooldown] = useState(0);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [resendNotice, setResendNotice] = useState<string | null>(null);

  // Direct passwordless Email OTP Login via Resend API
  const handleDirectEmailOtpLogin = async () => {
    setIsSendingOtp(true);
    setLoginError(null);
    setActive2FAMethod('email_otp');
    try {
      const targetEmail = usernameOrEmail.includes('@') ? usernameOrEmail : AUTHORIZED_ADMIN_EMAIL;
      const otpRes = await requestAdminLoginOtp(targetEmail);
      if (otpRes.success) {
        if (otpRes.cooldownRemainingSeconds) {
          setLoginCooldown(otpRes.cooldownRemainingSeconds);
        }
        setEmailOtpCode('');
        setResendNotice(`6-digit code dispatched via Resend to ${AUTHORIZED_ADMIN_EMAIL}`);
        setView('login_email_otp');
      } else {
        setLoginError(otpRes.message || 'Failed to dispatch verification code via Resend.');
      }
    } catch (err: any) {
      setLoginError('Error connecting to Resend email service.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Forgot password state & rate limiting
  const [resetEmail, setResetEmail] = useState(AUTHORIZED_ADMIN_EMAIL);
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetCooldownSeconds, setResetCooldownSeconds] = useState<number>(0);
  const [resetRateLimitLocked, setResetRateLimitLocked] = useState<boolean>(false);
  const [resetLockoutMinutes, setResetLockoutMinutes] = useState<number>(0);

  // Live countdown for login OTP cooldown
  useEffect(() => {
    if (loginCooldown <= 0) return;
    const timer = setInterval(() => {
      setLoginCooldown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [loginCooldown]);

  // Live countdown for password reset cooldown / lockout
  useEffect(() => {
    const checkRateLimit = () => {
      const status = getResetRateLimitStatus();
      setResetCooldownSeconds(status.cooldownRemainingSeconds);
      setResetRateLimitLocked(status.isLockedOut);
      setResetLockoutMinutes(status.lockoutRemainingMinutes);
    };

    checkRateLimit();
    const timer = setInterval(() => {
      setResetCooldownSeconds(prev => {
        if (prev <= 1) {
          checkRateLimit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [view]);

  if (!isOpen) return null;

  // Step 1: Submit Primary Credentials (Username & Password)
  const handlePrimaryLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const res = await verifyAdminPrimaryCredentials(usernameOrEmail, password);
    if (!res.success) {
      setLoginError(res.error || 'Invalid credentials');
      return;
    }

    if (res.requires2FA) {
      const method = res.twoFactorMethod || 'authenticator';
      setActive2FAMethod(method);
      setEmailOtpCode('');
      setOtpError(null);

      if (method === 'email_otp') {
        // Trigger Email OTP step
        setIsSendingOtp(true);
        try {
          const otpRes = await requestAdminLoginOtp(usernameOrEmail);
          if (otpRes.success) {
            if (otpRes.cooldownRemainingSeconds) {
              setLoginCooldown(otpRes.cooldownRemainingSeconds);
            }
            setView('login_email_otp');
          } else {
            setLoginError(otpRes.message);
          }
        } catch (err: any) {
          setLoginError('Failed to initiate 2FA verification. Please try again.');
        } finally {
          setIsSendingOtp(false);
        }
      } else {
        // Google Authenticator active: directly prompt for 6-digit TOTP code
        setView('login_email_otp');
      }
    } else {
      onLoginSuccess();
      onClose();
    }
  };

  // Step 2: Resend / Dispatch Email OTP
  const handleResendLoginOtp = async () => {
    if (loginCooldown > 0) return;
    setOtpError(null);
    setResendNotice(null);

    const otpRes = await requestAdminLoginOtp(usernameOrEmail);
    if (otpRes.success) {
      setEmailOtpCode('');
      setLoginCooldown(otpRes.cooldownRemainingSeconds || 60);
      setResendNotice(`6-digit code sent to ${AUTHORIZED_ADMIN_EMAIL}`);
      setTimeout(() => setResendNotice(null), 4000);
    } else {
      setOtpError(otpRes.message);
    }
  };

  // Switch to Email OTP mode from Google Authenticator
  const handleSwitchToEmailOtp = () => {
    setActive2FAMethod('email_otp');
    setOtpError(null);
    handleResendLoginOtp();
  };

  // Step 3: Submit 2FA Code (Google Authenticator TOTP, Email OTP, or Emergency Backup Key)
  const handleEmailOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError(null);

    const codeToVerify = useBackupCode ? backupCodeInput : emailOtpCode;
    if (!codeToVerify.trim()) {
      setOtpError(useBackupCode ? 'Please enter an 8-digit backup code' : 'Please enter the 6-digit 2FA code');
      return;
    }

    const localRes = await verifyAdmin2FACode(codeToVerify);
    if (localRes.success) {
      onLoginSuccess();
      onClose();
      return;
    }

    setOtpError(localRes.error || 'Invalid 2FA verification code. Please check and try again.');
  };

  // Step 4: Request Password Reset with Anti-Spam Rate Limiting
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);

    if (resetCooldownSeconds > 0 || resetRateLimitLocked) {
      setResetError(`Security limit active. Please wait ${resetCooldownSeconds}s before requesting a new code.`);
      return;
    }

    const res = await requestPasswordReset(resetEmail);
    if (res.success) {
      setResetOtp('');
      if (res.cooldownRemainingSeconds) {
        setResetCooldownSeconds(res.cooldownRemainingSeconds);
      }
      setView('forgot_verify');
    } else {
      setResetError(res.message);
      if (res.cooldownRemainingSeconds) {
        setResetCooldownSeconds(res.cooldownRemainingSeconds);
      }
    }
  };

  // Step 5: Confirm Reset & Set New Password
  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);

    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match.');
      return;
    }

    const res = await confirmPasswordReset(resetEmail, resetOtp, newPassword);
    if (res.success) {
      setResetSuccess(true);
      setTimeout(() => {
        onLoginSuccess();
        onClose();
      }, 1200);
    } else {
      setResetError(res.error || 'Failed to reset password');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden p-6 sm:p-8">
        
        {/* URL Route Badge */}
        <div className="absolute top-4 left-6 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-[10px] font-mono text-neutral-500">
          <span>Route:</span>
          <strong className="text-indigo-600 dark:text-indigo-400">/kiran8728</strong>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mt-4">
          {/* VIEW 1: Primary Username & Password Login */}
          {view === 'login_credentials' && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-inner">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-neutral-900 dark:text-white">
                    Admin Portal Login
                  </h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Direct access via <strong>/kiran8728</strong>
                  </p>
                </div>
              </div>

              {loginError && (
                <div className="mb-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handlePrimaryLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Admin Username or Email
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={usernameOrEmail}
                      onChange={(e) => setUsernameOrEmail(e.target.value)}
                      placeholder="Enter username or email"
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setLoginError(null);
                        setView('forgot_request');
                      }}
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter admin password"
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSendingOtp}
                    className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm shadow-md shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <span>{isSendingOtp ? 'Authenticating...' : 'Sign In with Password'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="relative my-4 flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-neutral-200 dark:border-neutral-800" />
                  </div>
                  <div className="relative bg-white dark:bg-neutral-900 px-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                    or
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDirectEmailOtpLogin}
                  disabled={isSendingOtp}
                  className="w-full py-2.5 px-4 rounded-xl border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/50 dark:bg-indigo-950/30 hover:bg-indigo-100/60 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  <Mail className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>{isSendingOtp ? 'Dispatching OTP via Resend...' : 'Sign In with Email OTP Code (via Resend)'}</span>
                </button>
              </form>
            </div>
          )}

          {/* VIEW 2: 2FA Verification Screen */}
          {view === 'login_email_otp' && (
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-inner">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-neutral-900 dark:text-white flex items-center gap-2">
                    <span>{active2FAMethod === 'authenticator' ? 'Google Authenticator' : 'Email Verification'}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      2FA Active
                    </span>
                  </h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {active2FAMethod === 'authenticator'
                      ? 'Enter the 6-digit code from your Google Authenticator app'
                      : `A 6-digit code was sent to ${AUTHORIZED_ADMIN_EMAIL}`}
                  </p>
                </div>
              </div>

              {resendNotice && (
                <div className="mb-3 p-2.5 rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 text-xs font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{resendNotice}</span>
                </div>
              )}

              {otpError && (
                <div className="mb-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{otpError}</span>
                </div>
              )}

              <form onSubmit={handleEmailOtpSubmit} className="space-y-4">
                {!useBackupCode ? (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-indigo-600" />
                        <span>
                          {active2FAMethod === 'authenticator' ? 'Enter 6-Digit Authenticator Code' : 'Enter 6-Digit Email Code'}
                        </span>
                      </label>
                      
                      {active2FAMethod === 'email_otp' && (
                        <button
                          type="button"
                          onClick={handleResendLoginOtp}
                          disabled={loginCooldown > 0}
                          className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50 disabled:no-underline flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>{loginCooldown > 0 ? `Resend in ${loginCooldown}s` : 'Resend Code'}</span>
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoFocus
                      required
                      maxLength={6}
                      value={emailOtpCode}
                      onChange={(e) => setEmailOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000 000"
                      className="w-full px-4 py-3 text-center tracking-[0.5em] font-mono text-2xl font-black bg-neutral-50 dark:bg-neutral-800/80 border-2 border-indigo-200 dark:border-indigo-800 rounded-2xl text-neutral-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1.5">
                      {active2FAMethod === 'authenticator'
                        ? 'Open Google Authenticator on your phone to view the live 6-digit code.'
                        : `Check your inbox at ${AUTHORIZED_ADMIN_EMAIL}. Code expires in 5 minutes.`}
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5 flex items-center gap-1.5">
                      <LifeBuoy className="w-3.5 h-3.5 text-amber-600" />
                      <span>Emergency Backup Recovery Key</span>
                    </label>
                    <input
                      type="text"
                      autoFocus
                      required
                      value={backupCodeInput}
                      onChange={(e) => setBackupCodeInput(e.target.value.trim())}
                      placeholder="e.g. 1234-5678"
                      className="w-full px-4 py-2.5 text-center font-mono text-base font-bold bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                      Enter one of your 8-digit emergency backup recovery keys saved during setup.
                    </p>
                  </div>
                )}

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setView('login_credentials')}
                    className="w-1/3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-bold text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-md shadow-indigo-600/25 transition-all flex items-center justify-center gap-2"
                  >
                    <Shield className="w-4 h-4" />
                    <span>Verify & Enter Portal</span>
                  </button>
                </div>

                {/* Alternative 2FA Options */}
                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex flex-col gap-1.5 text-center">
                  {active2FAMethod === 'authenticator' ? (
                    <button
                      type="button"
                      onClick={handleSwitchToEmailOtp}
                      disabled={isSendingOtp}
                      className="text-xs font-semibold text-neutral-500 hover:text-indigo-600 dark:text-neutral-400 dark:hover:text-indigo-400 inline-flex items-center justify-center gap-1 transition-colors"
                    >
                      <Mail className="w-3 h-3" />
                      <span>{isSendingOtp ? 'Sending email code...' : 'Prefer email? Send OTP to your inbox instead'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setActive2FAMethod('authenticator');
                        setOtpError(null);
                      }}
                      className="text-xs font-semibold text-neutral-500 hover:text-indigo-600 dark:text-neutral-400 dark:hover:text-indigo-400 inline-flex items-center justify-center gap-1 transition-colors"
                    >
                      <ShieldCheck className="w-3 h-3" />
                      <span>Use Google Authenticator App instead</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setUseBackupCode(!useBackupCode);
                      setOtpError(null);
                    }}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center justify-center gap-1"
                  >
                    <Key className="w-3 h-3" />
                    <span>{useBackupCode ? 'Use 6-Digit 2FA Code' : 'Can\'t access phone? Use Emergency Backup Key'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* VIEW 3: Forgot Password Request (Rate Limited & Anti-Spam Protected) */}
          {view === 'forgot_request' && (
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-inner">
                  <KeyRound className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-neutral-900 dark:text-white">
                    Reset Admin Password
                  </h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Enter authorized admin email address
                  </p>
                </div>
              </div>

              {/* Rate Limit Alert / Cooldown Warning */}
              {resetCooldownSeconds > 0 && (
                <div className="mb-4 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
                  <div className="flex items-center justify-between font-bold">
                    <span>Anti-Spam Security Cooldown</span>
                    <span className="font-mono">{resetCooldownSeconds}s</span>
                  </div>
                  <p className="mt-1 text-[11px] opacity-90">
                    Please wait {resetCooldownSeconds}s before requesting another reset code.
                  </p>
                </div>
              )}

              {resetRateLimitLocked && (
                <div className="mb-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300">
                  <strong className="block font-bold">Security Lockout Active</strong>
                  <p className="mt-1 text-[11px]">
                    Maximum password reset attempts reached. Please wait {resetLockoutMinutes} minutes before trying again.
                  </p>
                </div>
              )}

              {resetError && (
                <div className="mb-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{resetError}</span>
                </div>
              )}

              <form onSubmit={handleRequestReset} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Authorized Administrator Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="Enter administrator email"
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-1">
                    A 6-digit password reset verification code will be dispatched to your inbox via Resend API.
                  </p>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setView('login_credentials')}
                    className="w-1/3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-bold text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={resetCooldownSeconds > 0 || resetRateLimitLocked}
                    className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-950 font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                  >
                    {resetCooldownSeconds > 0 ? (
                      <span>Wait ({resetCooldownSeconds}s)</span>
                    ) : (
                      <>
                        <span>Send Reset Code</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* VIEW 4: Verify Reset OTP & Set New Password */}
          {view === 'forgot_verify' && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-inner">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-neutral-900 dark:text-white">
                    Enter Verification Code
                  </h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Dispatched to {resetEmail || AUTHORIZED_ADMIN_EMAIL} via Resend
                  </p>
                </div>
              </div>

              {resetError && (
                <div className="mb-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{resetError}</span>
                </div>
              )}

              {resetSuccess && (
                <div className="mb-4 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Password reset successfully! Redirecting to admin dashboard...</span>
                </div>
              )}

              <form onSubmit={handleConfirmReset} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={resetOtp}
                    onChange={(e) => setResetOtp(e.target.value.trim())}
                    placeholder="Enter 6-digit code"
                    className="w-full px-3.5 py-2 text-center tracking-widest font-mono text-lg font-bold bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full px-3.5 py-2 text-sm bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full px-3.5 py-2 text-sm bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setView('forgot_request')}
                    className="w-1/3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-bold text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={resetSuccess}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>Update Password & Log In</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
