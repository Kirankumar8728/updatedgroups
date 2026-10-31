'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  Mail, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Check, 
  User, 
  ArrowRight, 
  Lock, 
  Eye, 
  EyeOff, 
  KeyRound, 
  RotateCcw,
  Gift
} from 'lucide-react';
import { UserProfile } from '@/src/types/user';
import { setStoredSessionToken, setStoredUserProfile } from '@/src/utils/userAuth';
import { fireConfetti } from '@/src/utils/confetti';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
  initialTab?: 'signin' | 'register';
  referralCode?: string;
  contextMessage?: string;
}

type AuthMode = 'signin' | 'register' | 'forgot_request' | 'forgot_verify';

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialTab = 'signin',
  referralCode,
  contextMessage
}) => {
  // Authentication Mode
  const [authMode, setAuthMode] = useState<AuthMode>(initialTab === 'register' ? 'register' : 'signin');

  // Sign-In Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Registration Form State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regReferral, setRegReferral] = useState(referralCode || '');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [regOtpSent, setRegOtpSent] = useState(false);
  const [regOtpCode, setRegOtpCode] = useState('');

  // Forgot Password / OTP State
  const [forgotEmail, setForgotEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [otpSentMessage, setOtpSentMessage] = useState<string | null>(null);

  // General Status State
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Please wait...');
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync initial tab when changed
  useEffect(() => {
    if (initialTab === 'register') {
      setAuthMode('register');
    } else if (initialTab === 'signin') {
      setAuthMode('signin');
    }
  }, [initialTab]);

  // Update referral code if passed as prop
  useEffect(() => {
    if (referralCode) {
      setRegReferral(referralCode);
    }
  }, [referralCode]);

  // Reset transient feedback when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setHint(null);
      setSuccessMsg(null);
      setIsLoading(false);
      setOtpSentMessage(null);
    }
  }, [isOpen]);

  // Handle successful login or registration
  const handleAuthCompletion = useCallback((user: UserProfile, token?: string) => {
    if (token) setStoredSessionToken(token);
    if (user) setStoredUserProfile(user);
    try {
      fireConfetti({ particleCount: 60, spread: 80 });
    } catch {}
    setSuccessMsg(`Welcome, ${user.displayName || user.email || 'Member'}!`);
    setTimeout(() => {
      onSuccess(user);
      onClose();
    }, 450);
  }, [onSuccess, onClose]);

  // 1. Handle Email + Password Registration with OTP Verification
  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setHint(null);

    if (!regEmail || !regEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match. Please re-enter your password.');
      return;
    }

    setIsLoading(true);

    try {
      // Step 1: Request Signup OTP if not yet sent
      if (!regOtpSent) {
        setLoadingMessage('Sending verification code to your email...');
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'send_otp',
            email: regEmail.trim().toLowerCase(),
            password: regPassword,
            displayName: regName.trim() || undefined,
            referralCode: regReferral.trim() || undefined,
          }),
        });

        const data = await res.json();
        if (data.success && data.otpSent) {
          setRegOtpSent(true);
          setOtpSentMessage(data.message || 'OTP verification code sent to your email.');
          setIsLoading(false);
        } else {
          setError(data.error || 'Failed to send verification OTP.');
          setIsLoading(false);
        }
        return;
      }

      // Step 2: Verify OTP and complete registration
      if (!regOtpCode || regOtpCode.trim().length < 6) {
        setError('Please enter the 6-digit verification code sent to your email.');
        setIsLoading(false);
        return;
      }

      setLoadingMessage('Verifying OTP & creating account...');
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_and_register',
          email: regEmail.trim().toLowerCase(),
          password: regPassword,
          displayName: regName.trim() || undefined,
          referralCode: regReferral.trim() || undefined,
          otpCode: regOtpCode.trim(),
        }),
      });

      const data = await res.json();
      if (data.success && data.user && data.token) {
        handleAuthCompletion(data.user, data.token);
      } else {
        setError(data.error || 'Invalid OTP code. Please try again.');
        setIsLoading(false);
      }
    } catch {
      setError('Network error during registration. Please check your connection.');
      setIsLoading(false);
    }
  };

  // 2. Handle Email + Password Sign In
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setHint(null);

    if (!loginEmail || !loginEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!loginPassword) {
      setError('Please enter your password.');
      return;
    }

    setIsLoading(true);
    setLoadingMessage('Verifying credentials...');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail.trim().toLowerCase(),
          password: loginPassword,
        }),
      });

      const data = await res.json();
      if (data.success && data.user && data.token) {
        handleAuthCompletion(data.user, data.token);
      } else {
        setError(data.error || 'Invalid email or password.');
        if (data.notRegistered) {
          setHint('No account exists yet with this email address. Switch to the Register tab to create your free account.');
        } else if (data.isIncorrectPassword) {
          setHint('Incorrect password. Click "Forgot password?" below to reset it in seconds.');
        } else if (data.isGoogleAccount) {
          setHint('This account was previously created with an external provider. Click "Forgot password?" to set a password and sign in.');
        }
        setIsLoading(false);
      }
    } catch {
      setError('Network error during login. Please try again.');
      setIsLoading(false);
    }
  };

  // 3. Request Password Reset OTP Code via Email
  const handleRequestResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setHint(null);

    if (!forgotEmail || !forgotEmail.includes('@')) {
      setError('Please enter a valid email address to receive your reset code.');
      return;
    }

    setIsLoading(true);
    setLoadingMessage('Dispatching 6-digit OTP code to your email...');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request_otp',
          email: forgotEmail.trim().toLowerCase(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setOtpSentMessage(data.message || `A 6-digit verification code was sent to ${forgotEmail}.`);
        setAuthMode('forgot_verify');
      } else {
        setError(data.error || 'Failed to send reset code. Please try again.');
      }
    } catch {
      setError('Network error dispatching OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Verify OTP Code and Reset Password
  const handleVerifyAndResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setHint(null);

    if (!otpCode || otpCode.trim().length < 6) {
      setError('Please enter the 6-digit verification code from your email.');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError('New passwords do not match. Please verify and try again.');
      return;
    }

    setIsLoading(true);
    setLoadingMessage('Verifying OTP code and securing new password...');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_and_reset',
          email: forgotEmail.trim().toLowerCase(),
          code: otpCode.trim(),
          newPassword,
        }),
      });

      const data = await res.json();
      if (data.success && data.user && data.token) {
        handleAuthCompletion(data.user, data.token);
      } else {
        setError(data.error || 'Failed to reset password. Please check the OTP code.');
        setIsLoading(false);
      }
    } catch {
      setError('Network error while resetting password. Please try again.');
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Gradient Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 shrink-0" />

        {/* Header Bar */}
        <div className="relative px-6 pt-5 pb-3.5 flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500/10 to-emerald-500/10 dark:bg-neutral-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-neutral-700 shadow-xs">
              <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-neutral-900 dark:text-white">
                {authMode === 'register' ? 'Create Your Account' : authMode.startsWith('forgot') ? 'Reset Password' : 'Sign in to GroupLinks'}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {authMode === 'register' ? 'Register in seconds & get 5 bonus credits' : authMode.startsWith('forgot') ? 'Verify via OTP email code' : 'Access your dashboard, bookmarks & credits'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Optional Context Message */}
        {contextMessage && (
          <div className="px-6 py-2.5 bg-blue-50/70 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/40 flex items-center gap-2 text-xs text-blue-900 dark:text-blue-200 font-medium shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span>{contextMessage}</span>
          </div>
        )}

        {/* Scrollable Modal Content */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Notifications / Alerts */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-200 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="space-y-1.5 w-full">
                <p className="font-semibold">{error}</p>
                {hint && (
                  <p className="text-[11px] text-rose-700 dark:text-rose-300 font-normal leading-relaxed">
                    💡 {hint}
                  </p>
                )}
                {error.includes('No account') && (
                  <button
                    type="button"
                    onClick={() => {
                      setRegEmail(loginEmail);
                      setError(null);
                      setHint(null);
                      setAuthMode('register');
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-all cursor-pointer mt-1"
                  >
                    <span>Create Account for {loginEmail || 'free'} (+5 Credits) →</span>
                  </button>
                )}
                {error.includes('Incorrect password') && (
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(loginEmail);
                      setError(null);
                      setHint(null);
                      setAuthMode('forgot_request');
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs transition-all cursor-pointer mt-1"
                  >
                    <span>Reset Password via Email OTP →</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {otpSentMessage && !error && (
            <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 flex items-start gap-2.5 text-xs text-blue-800 dark:text-blue-200 animate-in fade-in">
              <Mail className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{otpSentMessage}</p>
                <p className="text-[11px] text-blue-600 dark:text-blue-300 mt-0.5">
                  Check your inbox or spam folder for your 6-digit code.
                </p>
              </div>
            </div>
          )}

          {successMsg && !error && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-200 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* SECTION: SIGN IN & REGISTRATION */}
          {authMode !== 'forgot_request' && authMode !== 'forgot_verify' ? (
            <div className="space-y-4">
              {/* Segmented Mode Selector: Sign In vs Register */}
              <div className="grid grid-cols-2 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
                <button
                  type="button"
                  id="tab-signin"
                  onClick={() => { setAuthMode('signin'); setError(null); }}
                  className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    authMode === 'signin'
                      ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                      : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  id="tab-register"
                  onClick={() => { setAuthMode('register'); setError(null); }}
                  className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    authMode === 'register'
                      ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                      : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
                  }`}
                >
                  <span>Register</span>
                  <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500 text-white rounded-full font-extrabold">
                    +5 Credits
                  </span>
                </button>
              </div>

              {/* A. SIGN IN FORM */}
              {authMode === 'signin' && (
                <form onSubmit={handleEmailLogin} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3 w-4 h-4 text-neutral-400" />
                      <input
                        type="email"
                        id="login-email"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="yourname@domain.com"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        Password
                      </label>
                      <button
                        type="button"
                        id="btn-forgot-password-link"
                        onClick={() => {
                          setForgotEmail(loginEmail || '');
                          setError(null);
                          setAuthMode('forgot_request');
                        }}
                        className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-medium cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3 w-4 h-4 text-neutral-400" />
                      <input
                        type={showLoginPassword ? 'text' : 'password'}
                        id="login-password"
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3 top-3 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                        tabIndex={-1}
                      >
                        {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    id="btn-submit-login"
                    disabled={isLoading || !loginEmail || !loginPassword}
                    className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] mt-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white shrink-0" />
                        <span>{loadingMessage || 'Signing In...'}</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* B. REGISTRATION FORM */}
              {authMode === 'register' && (
                <form onSubmit={handleEmailRegister} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Display Name <span className="font-normal text-neutral-400">(Optional)</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3 w-4 h-4 text-neutral-400" />
                      <input
                        type="text"
                        id="reg-name"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="e.g. Kiran Kumar"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3 w-4 h-4 text-neutral-400" />
                      <input
                        type="email"
                        id="reg-email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="yourname@domain.com"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                        Password <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 w-3.5 h-3.5 text-neutral-400" />
                        <input
                          type={showRegPassword ? 'text' : 'password'}
                          id="reg-password"
                          required
                          minLength={6}
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="Min 6 chars"
                          className="w-full pl-8 pr-8 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPassword(!showRegPassword)}
                          className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                          tabIndex={-1}
                        >
                          {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                        Confirm Password <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 w-3.5 h-3.5 text-neutral-400" />
                        <input
                          type={showRegConfirmPassword ? 'text' : 'password'}
                          id="reg-confirm-password"
                          required
                          minLength={6}
                          value={regConfirmPassword}
                          onChange={(e) => setRegConfirmPassword(e.target.value)}
                          placeholder="Re-type password"
                          className="w-full pl-8 pr-8 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                          className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                          tabIndex={-1}
                        >
                          {showRegConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Verification OTP Input when code is dispatched */}
                  {regOtpSent && (
                    <div className="p-3.5 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 space-y-2 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-blue-950 dark:text-blue-200">
                          Enter 6-Digit Email OTP
                        </label>
                        <span className="text-[10px] text-blue-600 dark:text-blue-300">
                          Sent to {regEmail}
                        </span>
                      </div>
                      <input
                        type="text"
                        id="reg-otp-code"
                        required
                        maxLength={6}
                        value={regOtpCode}
                        onChange={(e) => setRegOtpCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="123456"
                        autoFocus
                        className="w-full text-center tracking-[8px] font-mono text-lg font-bold py-2 rounded-xl border border-blue-300 dark:border-blue-700 bg-white dark:bg-neutral-900 text-blue-600 dark:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}

                  <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/40 flex items-center gap-2 text-[11px] text-emerald-800 dark:text-emerald-300">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      <strong>Safe &amp; Secure:</strong> Passwords are cryptographically salted and hashed with 100,000 PBKDF2 rounds.
                    </span>
                  </div>

                  <button
                    type="submit"
                    id="btn-submit-register"
                    disabled={isLoading || !regEmail || regPassword.length < 6 || (regOtpSent && regOtpCode.length < 6)}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white shrink-0" />
                        <span>{loadingMessage || (regOtpSent ? 'Verifying Code & Creating Account...' : 'Sending Verification Code...')}</span>
                      </>
                    ) : regOtpSent ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Verify OTP &amp; Create Account (+5 Free Credits)</span>
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        <span>Send Signup OTP Code to Email</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          ) : (
            /* SECTION 3: FORGOT PASSWORD FLOW (OTP DISPATCH VIA SMTP) */
            <div className="space-y-3.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-1 border-b border-neutral-100 dark:border-neutral-800">
                <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-blue-600" />
                  Forgot Password? OTP Recovery
                </span>
                <button
                  type="button"
                  onClick={() => { setAuthMode('signin'); setError(null); }}
                  className="text-[11px] text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 font-medium cursor-pointer"
                >
                  ← Back to Sign In
                </button>
              </div>

              {authMode === 'forgot_request' ? (
                /* Step 1: Enter email to request 6-digit OTP */
                <form onSubmit={handleRequestResetOtp} className="space-y-3">
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    Enter the email associated with your account. We will send a secure 6-digit one-time passcode (OTP) to your inbox to reset your password.
                  </p>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Your Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3 w-4 h-4 text-neutral-400" />
                      <input
                        type="email"
                        id="forgot-email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="yourname@domain.com"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    id="btn-request-otp"
                    disabled={isLoading || !forgotEmail.includes('@')}
                    className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white shrink-0" />
                        <span>{loadingMessage || 'Sending 6-Digit OTP...'}</span>
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        <span>Send 6-Digit Verification Code</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* Step 2: Enter 6-digit OTP and new password */
                <form onSubmit={handleVerifyAndResetPassword} className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        Enter 6-Digit OTP Code
                      </label>
                      <button
                        type="button"
                        onClick={handleRequestResetOtp}
                        disabled={isLoading}
                        className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Resend Code</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      id="otp-code-input"
                      required
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      autoFocus
                      className="w-full text-center tracking-[8px] font-mono text-xl font-extrabold py-2.5 rounded-xl border-2 border-blue-400 dark:border-blue-600 bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                        New Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 w-3.5 h-3.5 text-neutral-400" />
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          id="new-password"
                          required
                          minLength={6}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Min 6 chars"
                          className="w-full pl-8 pr-8 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-neutral-600 cursor-pointer"
                          tabIndex={-1}
                        >
                          {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                        Confirm New
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 w-3.5 h-3.5 text-neutral-400" />
                        <input
                          type={showConfirmNewPassword ? 'text' : 'password'}
                          id="confirm-new-password"
                          required
                          minLength={6}
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          placeholder="Re-type password"
                          className="w-full pl-8 pr-8 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                          className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-neutral-600 cursor-pointer"
                          tabIndex={-1}
                        >
                          {showConfirmNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    id="btn-verify-and-reset"
                    disabled={isLoading || otpCode.length < 6 || newPassword.length < 6}
                    className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white shrink-0" />
                        <span>{loadingMessage || 'Updating Password...'}</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Confirm OTP &amp; Reset Password</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-neutral-50 dark:bg-neutral-900/90 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-center gap-2 text-neutral-400 text-xs shrink-0">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Secured with 256-Bit SSL • PBKDF2 Password Protection</span>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
