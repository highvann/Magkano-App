import { useState, useRef, useEffect } from 'react';
import { useRive, useStateMachineInput, Layout, Fit, Alignment } from '@rive-app/react-canvas';
import { supabase } from '../../supabaseClient';
import authCharacterRiv from '../../assets/auth-character.riv';
import './Auth.css';

// Interactive Rive Mascot Component
function AuthMascot({ isPasswordFocused, inputLength, isSuccess, isError }) {
  const [loadFailed, setLoadFailed] = useState(false);

  const { rive, RiveComponent } = useRive({
    src: authCharacterRiv,
    stateMachines: 'State Machine 1',
    autoplay: true,
    layout: new Layout({
      fit: Fit.Cover,
      alignment: Alignment.Center,
    }),
    onLoadError: () => {
      console.warn('Rive load fallback activated');
      setLoadFailed(true);
    },
  });

  // Wire up state machine inputs safely
  const lookInput1 = useStateMachineInput(rive, 'State Machine 1', 'numLook');
  const lookInput2 = useStateMachineInput(rive, 'State Machine 1', 'Look');
  const lookInput = lookInput1 || lookInput2;

  const isCheckingInput1 = useStateMachineInput(rive, 'State Machine 1', 'isChecking');
  const isCheckingInput2 = useStateMachineInput(rive, 'State Machine 1', 'Check');
  const isCheckingInput = isCheckingInput1 || isCheckingInput2;

  const isHandsUpInput1 = useStateMachineInput(rive, 'State Machine 1', 'isHandsUp');
  const isHandsUpInput2 = useStateMachineInput(rive, 'State Machine 1', 'hands_up');
  const isHandsUpInput = isHandsUpInput1 || isHandsUpInput2;

  const trigSuccessInput1 = useStateMachineInput(rive, 'State Machine 1', 'trigSuccess');
  const trigSuccessInput2 = useStateMachineInput(rive, 'State Machine 1', 'success');
  const trigSuccessInput = trigSuccessInput1 || trigSuccessInput2;

  const trigFailInput1 = useStateMachineInput(rive, 'State Machine 1', 'trigFail');
  const trigFailInput2 = useStateMachineInput(rive, 'State Machine 1', 'fail');
  const trigFailInput = trigFailInput1 || trigFailInput2;

  // React to password focus (Hands Up / Cover Eyes)
  useEffect(() => {
    if (isHandsUpInput) {
      // eslint-disable-next-line react-hooks/immutability
      isHandsUpInput.value = Boolean(isPasswordFocused);
    }
  }, [isPasswordFocused, isHandsUpInput]);

  // React to text input length (Look tracking)
  useEffect(() => {
    if (isCheckingInput) {
      // eslint-disable-next-line react-hooks/immutability
      isCheckingInput.value = inputLength > 0 && !isPasswordFocused;
    }
    if (lookInput) {
      // Map input character length to gaze range
      // eslint-disable-next-line react-hooks/immutability
      lookInput.value = Math.min(inputLength * 2.5, 100);
    }
  }, [inputLength, isPasswordFocused, isCheckingInput, lookInput]);

  // React to authentication success
  useEffect(() => {
    if (isSuccess && trigSuccessInput) {
      trigSuccessInput.fire();
    }
  }, [isSuccess, trigSuccessInput]);

  // React to authentication error
  useEffect(() => {
    if (isError && trigFailInput) {
      trigFailInput.fire();
    }
  }, [isError, trigFailInput]);

  if (loadFailed) {
    return (
      <div className="auth-fallback-mascot">
        <div className="fallback-shield-glow">
          <svg viewBox="0 0 24 24" width="56" height="56" fill="none" stroke="var(--accent-primary)" strokeWidth="1.5">
            <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" />
            <path d="M12 8v4" />
            <path d="M12 16h.01" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-rive-stage">
      <RiveComponent className="auth-rive-canvas" />
    </div>
  );
}

// Password Strength Evaluation Helper
const getPasswordStrength = (pwd) => {
  if (!pwd) return { score: 0, label: '', color: 'transparent' };
  let score = 0;
  if (pwd.length >= 8) score += 1;
  if (/[A-Z]/.test(pwd)) score += 1;
  if (/[0-9]/.test(pwd)) score += 1;
  if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

  if (score <= 1) return { score, label: 'Weak', color: 'var(--alert-red)' };
  if (score === 2 || score === 3) return { score, label: 'Fair', color: '#f59e0b' };
  return { score: 4, label: 'Strong', color: 'var(--accent-primary)' };
};

// Minimalist SVGs (no emojis)
const IconBack = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>;
const IconMail = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>;
const IconLock = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>;
const IconUser = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>;
const IconEye = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>;
const IconEyeOff = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>;
const IconGoogle = () => <svg className="social-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>;
const IconFacebook = () => <svg className="social-icon" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>;
const IconAlert = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);
const IconCheck = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

function Auth() {
  const [view, setView] = useState('login');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [notification, setNotification] = useState(null);

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Mascot reactive interaction states
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);

  // OTP states
  const [otp, setOtp] = useState(['', '', '', '', '', '', '', '']);
  const [otpHasError, setOtpHasError] = useState(false);
  const otpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];
  const [timeLeft, setTimeLeft] = useState(30);

  const changeView = (newView) => {
    setView(newView);
    setErrors({});
    setNotification(null);
    setOtpHasError(false);
    setIsPasswordFocused(false);
    setIsSuccess(false);
    setIsError(false);
  };

  useEffect(() => {
    let timer;
    if (view === 'otp' && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [view, timeLeft]);

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setNotification(null);
    setIsError(false);
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: null });
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setNotification(null);
    setIsError(false);
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    const cleanEmail = formData.email.trim();
    if (!cleanEmail) {
      newErrors.email = 'Email address is required';
    } else if (!validateEmail(cleanEmail)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!termsAccepted) {
      newErrors.terms = 'Please accept the Terms & Privacy Policy';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsError(true);
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.auth.signUp({
      email: cleanEmail.toLowerCase(),
      password: formData.password,
      options: {
        data: {
          first_name: formData.firstName.trim(),
          last_name: formData.lastName.trim(),
        }
      }
    });
    setIsLoading(false);

    if (error) {
      setNotification({ type: 'error', message: error.message });
      setIsError(true);
    } else {
      setIsSuccess(true);
      setTimeout(() => {
        changeView('otp');
        setTimeLeft(30);
      }, 600);
    }
  };
  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setNotification(null);
      setIsError(false);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });

      if (error) {
        setNotification({ type: 'error', message: error.message });
        setIsError(true);
        setIsLoading(false);
      }
    } catch (err) {
      setNotification({ type: 'error', message: 'Failed to initialize Google login.' });
      setIsError(true);
      setIsLoading(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setNotification(null);
    setIsError(false);

    const newErrors = {};
    const cleanEmail = formData.email.trim();
    if (!cleanEmail) {
      newErrors.email = 'Email address is required';
    } else if (!validateEmail(cleanEmail)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsError(true);
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: cleanEmail.toLowerCase(),
      password: formData.password,
    });
    setIsLoading(false);

    if (error) {
      setNotification({ type: 'error', message: 'Invalid email or password' });
      setIsError(true);
    } else {
      setIsSuccess(true);
      console.log("Login success!");
    }
  };

  const handleOtpChange = (index, value) => {
    if (isNaN(value)) return;
    setNotification(null);
    setIsError(false);
    setOtpHasError(false);
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value !== '' && index < 7) {
      otpRefs[index + 1].current?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && otp[index] === '' && index > 0) {
      otpRefs[index - 1].current?.focus();
    }
  };

  // Clipboard paste support for 8-digit OTP
  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim();
    if (!pasteData) return;
    const digits = pasteData.replace(/\D/g, '').slice(0, 8).split('');
    if (digits.length > 0) {
      setOtpHasError(false);
      const newOtp = [...otp];
      digits.forEach((digit, idx) => {
        if (idx < 8) newOtp[idx] = digit;
      });
      setOtp(newOtp);
      const nextFocus = Math.min(digits.length, 7);
      otpRefs[nextFocus]?.current?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    if (isLoading) return;
    const code = otp.join('');
    const cleanEmail = formData.email.trim().toLowerCase();

    setNotification(null);
    setIsError(false);

    if (code.length === 8) {
      setIsLoading(true);

      const { error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: code,
        type: 'signup'
      });

      setIsLoading(false);

      if (error) {
        setNotification({ type: 'error', message: `Verification failed: ${error.message}` });
        setIsError(true);
        setOtpHasError(true);
      } else {
        setIsSuccess(true);
        console.log("OTP Verification successful!");
      }
    } else {
      setNotification({ type: 'error', message: 'Please enter the complete 8-digit code.' });
      setIsError(true);
      setOtpHasError(true);
    }
  };

  const handleResendOtp = async () => {
    if (isResending || isLoading) return;
    setNotification(null);
    setIsResending(true);
    setIsError(false);

    const cleanEmail = formData.email.trim().toLowerCase();

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: cleanEmail,
    });
    setIsResending(false);

    if (error) {
      setNotification({ type: 'error', message: "Failed to resend: " + error.message });
      setIsError(true);
    } else {
      setOtp(['', '', '', '', '', '', '', '']);
      setOtpHasError(false);
      setNotification({ type: 'success', message: 'A new verification code has been dispatched to your email.' });
      setTimeLeft(30);
    }
  };

  const activeInputLength = (
    view === 'login' ? formData.email : (formData.firstName + formData.lastName + formData.email)
  ).length;

  const pwdStrength = getPasswordStrength(formData.password);

  return (
    <div className="auth-canvas">

      {/* Magkano logo — fixed top-left, outside the card */}
      <div className="auth-page-logo">
        <div className="auth-logo-mark">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--text-inverse)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <div>
          <span className="auth-logo-wordmark">Magkano</span>
          <span className="auth-logo-tagline">Expense Tracker</span>
        </div>
      </div>

      {/* Ambient background orbs */}
      <div className="aurora-mesh-bg">
        <div className="aurora-orb orb-1"></div>
        <div className="aurora-orb orb-2"></div>
      </div>

      <div className="auth-split-card">

        {/* Left Side: Mascot Stage (clean, no extra text) */}
        <div className="auth-image-side">
          <div className="auth-mascot-wrapper">
            <AuthMascot
              isPasswordFocused={isPasswordFocused}
              inputLength={activeInputLength}
              isSuccess={isSuccess}
              isError={isError}
            />
          </div>
        </div>

        {/* Right Side: Authentication Form */}
        <div className="auth-form-side">

          {view !== 'login' && (
            <button
              className="back-arrow"
              onClick={() => changeView('login')}
              title="Back to log in"
              disabled={isLoading}
            >
              <IconBack />
            </button>
          )}

          {view === 'login' && (
            <>
              <div className="auth-header-block">
                <h1 className="auth-title">Welcome Back</h1>
                <p className="auth-subtitle">
                  Don't have an account yet?{' '}
                  <span
                    className={`auth-switch-link ${isLoading ? 'disabled-link' : ''}`}
                    onClick={() => !isLoading && changeView('signup')}
                  >
                    Create an Account
                  </span>
                </p>
              </div>

              {notification && (
                <div className={`auth-notification ${notification.type}`} role="alert">
                  <span className="notification-icon">
                    {notification.type === 'error' ? <IconAlert /> : <IconCheck />}
                  </span>
                  <span>{notification.message}</span>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} noValidate>
                <div className="auth-input-group">
                  <label htmlFor="login-email">Email Address</label>
                  <div className={`auth-input-wrapper ${errors.email ? 'has-error' : ''}`}>
                    <span className="input-leading-icon"><IconMail /></span>
                    <input
                      id="login-email"
                      type="email"
                      name="email"
                      value={formData.email}
                      className={`auth-pill-input ${errors.email ? 'input-error' : ''}`}
                      placeholder="name@domain.com"
                      onChange={handleChange}
                      disabled={isLoading}
                      aria-invalid={Boolean(errors.email)}
                      required
                    />
                  </div>
                  {errors.email && (
                    <span className="auth-field-error" role="alert">{errors.email}</span>
                  )}
                </div>

                <div className="auth-input-group">
                  <label htmlFor="login-password">Password</label>
                  <div className={`auth-input-wrapper ${errors.password ? 'has-error' : ''}`}>
                    <span className="input-leading-icon"><IconLock /></span>
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      className={`auth-pill-input ${errors.password ? 'input-error' : ''}`}
                      placeholder="••••••••••••"
                      onChange={handleChange}
                      onFocus={() => setIsPasswordFocused(true)}
                      onBlur={() => setIsPasswordFocused(false)}
                      disabled={isLoading}
                      aria-invalid={Boolean(errors.password)}
                      required
                    />
                    <button
                      type="button"
                      className="input-trailing-action"
                      onClick={() => setShowPassword(!showPassword)}
                      title={showPassword ? 'Hide password' : 'Show password'}
                      disabled={isLoading}
                    >
                      {showPassword ? <IconEyeOff /> : <IconEye />}
                    </button>
                  </div>
                  {errors.password && (
                    <span className="auth-field-error" role="alert">{errors.password}</span>
                  )}
                </div>

                <div className="auth-row-aux">
                  <div className="auth-forgot-pwd">Forgot password?</div>
                </div>

                <button type="submit" className="btn-auth-primary" disabled={isLoading}>
                  {isLoading ? (
                    <span className="btn-loading-flex">
                      <span className="btn-spinner"></span>
                      Authenticating...
                    </span>
                  ) : 'Sign In'}
                </button>
              </form>

              <div className="auth-divider"><span>OR CONTINUE WITH</span></div>
              <div className="social-btn-group">
                <button className="btn-social" type="button" onClick={handleGoogleSignIn} disabled={isLoading}>
                  <IconGoogle /> Google
                </button>
                <button className="btn-social" type="button" disabled={isLoading}><IconFacebook /> Facebook</button>
              </div>
            </>
          )}

          {view === 'signup' && (
            <>
              <div className="auth-header-block">
                <h1 className="auth-title">Create Account</h1>
                <p className="auth-subtitle">
                  Already registered?{' '}
                  <span
                    className={`auth-switch-link ${isLoading ? 'disabled-link' : ''}`}
                    onClick={() => !isLoading && changeView('login')}
                  >
                    Sign in
                  </span>
                </p>
              </div>

              {notification && (
                <div className={`auth-notification ${notification.type}`} role="alert">
                  <span className="notification-icon">
                    {notification.type === 'error' ? <IconAlert /> : <IconCheck />}
                  </span>
                  <span>{notification.message}</span>
                </div>
              )}

              <form onSubmit={handleSignupSubmit} noValidate>
                <div className="auth-form-row">
                  <div className="auth-input-group">
                    <label htmlFor="signup-firstname">First Name</label>
                    <div className={`auth-input-wrapper ${errors.firstName ? 'has-error' : ''}`}>
                      <span className="input-leading-icon"><IconUser /></span>
                      <input
                        id="signup-firstname"
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        className={`auth-pill-input ${errors.firstName ? 'input-error' : ''}`}
                        placeholder="John"
                        onChange={handleChange}
                        disabled={isLoading}
                        aria-invalid={Boolean(errors.firstName)}
                        required
                      />
                    </div>
                    {errors.firstName && (
                      <span className="auth-field-error" role="alert">{errors.firstName}</span>
                    )}
                  </div>
                  <div className="auth-input-group">
                    <label htmlFor="signup-lastname">Last Name</label>
                    <div className={`auth-input-wrapper ${errors.lastName ? 'has-error' : ''}`}>
                      <span className="input-leading-icon"><IconUser /></span>
                      <input
                        id="signup-lastname"
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        className={`auth-pill-input ${errors.lastName ? 'input-error' : ''}`}
                        placeholder="Doe"
                        onChange={handleChange}
                        disabled={isLoading}
                        aria-invalid={Boolean(errors.lastName)}
                        required
                      />
                    </div>
                    {errors.lastName && (
                      <span className="auth-field-error" role="alert">{errors.lastName}</span>
                    )}
                  </div>
                </div>

                <div className="auth-input-group">
                  <label htmlFor="signup-email">Email Address</label>
                  <div className={`auth-input-wrapper ${errors.email ? 'has-error' : ''}`}>
                    <span className="input-leading-icon"><IconMail /></span>
                    <input
                      id="signup-email"
                      type="email"
                      name="email"
                      value={formData.email}
                      className={`auth-pill-input ${errors.email ? 'input-error' : ''}`}
                      placeholder="name@domain.com"
                      onChange={handleChange}
                      disabled={isLoading}
                      aria-invalid={Boolean(errors.email)}
                      required
                    />
                  </div>
                  {errors.email && (
                    <span className="auth-field-error" role="alert">{errors.email}</span>
                  )}
                </div>

                <div className="auth-input-group">
                  <label htmlFor="signup-password">Password</label>
                  <div className={`auth-input-wrapper ${errors.password ? 'has-error' : ''}`}>
                    <span className="input-leading-icon"><IconLock /></span>
                    <input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      className={`auth-pill-input ${errors.password ? 'input-error' : ''}`}
                      placeholder="Create secure password"
                      onChange={handleChange}
                      onFocus={() => setIsPasswordFocused(true)}
                      onBlur={() => setIsPasswordFocused(false)}
                      disabled={isLoading}
                      aria-invalid={Boolean(errors.password)}
                      required
                    />
                    <button
                      type="button"
                      className="input-trailing-action"
                      onClick={() => setShowPassword(!showPassword)}
                      title={showPassword ? 'Hide password' : 'Show password'}
                      disabled={isLoading}
                    >
                      {showPassword ? <IconEyeOff /> : <IconEye />}
                    </button>
                  </div>
                  {errors.password && (
                    <span className="auth-field-error" role="alert">{errors.password}</span>
                  )}

                  {/* Dynamic Password Strength Indicator */}
                  {formData.password && (
                    <div className="password-strength-wrap">
                      <div className="strength-bars">
                        {[1, 2, 3, 4].map(idx => (
                          <div
                            key={idx}
                            className="strength-bar-unit"
                            style={{
                              background: idx <= pwdStrength.score ? pwdStrength.color : undefined
                            }}
                          />
                        ))}
                      </div>
                      <span className="strength-label" style={{ color: pwdStrength.color }}>
                        {pwdStrength.label}
                      </span>
                    </div>
                  )}
                </div>

                <div className="auth-input-group">
                  <label htmlFor="signup-confirm-password">Confirm Password</label>
                  <div className={`auth-input-wrapper ${errors.confirmPassword ? 'has-error' : ''}`}>
                    <span className="input-leading-icon"><IconLock /></span>
                    <input
                      id="signup-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      className={`auth-pill-input ${errors.confirmPassword ? 'input-error' : ''}`}
                      placeholder="Repeat password"
                      onChange={handleChange}
                      onFocus={() => setIsPasswordFocused(true)}
                      onBlur={() => setIsPasswordFocused(false)}
                      disabled={isLoading}
                      aria-invalid={Boolean(errors.confirmPassword)}
                      required
                    />
                    <button
                      type="button"
                      className="input-trailing-action"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      title={showConfirmPassword ? 'Hide password' : 'Show password'}
                      disabled={isLoading}
                    >
                      {showConfirmPassword ? <IconEyeOff /> : <IconEye />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <span className="auth-field-error" role="alert">{errors.confirmPassword}</span>
                  )}
                </div>

                <div className="auth-checkbox-group">
                  <label className="custom-checkbox-container">
                    <input
                      type="checkbox"
                      id="terms"
                      checked={termsAccepted}
                      onChange={(e) => {
                        setTermsAccepted(e.target.checked);
                        if (errors.terms) setErrors({ ...errors, terms: null });
                      }}
                      disabled={isLoading}
                    />
                    <span className="custom-checkmark"></span>
                    <span className="checkbox-text">
                      I agree to the <a href="#" onClick={e => e.preventDefault()}>Terms & Privacy Policy</a>
                    </span>
                  </label>
                  {errors.terms && <span className="auth-field-error" role="alert">{errors.terms}</span>}
                </div>

                <button type="submit" className="btn-auth-primary" disabled={isLoading}>
                  {isLoading ? (
                    <span className="btn-loading-flex">
                      <span className="btn-spinner"></span>
                      Creating Account...
                    </span>
                  ) : 'Create Account'}
                </button>
              </form>

              <div className="auth-divider"><span>OR CONTINUE WITH</span></div>
              <div className="social-btn-group">
                <button className="btn-social" type="button" onClick={handleGoogleSignIn} disabled={isLoading}>
                  <IconGoogle /> Google
                </button>
                <button className="btn-social" type="button" disabled={isLoading}><IconFacebook /> Facebook</button>
              </div>
            </>
          )}

          {view === 'otp' && (
            <>
              <div className="auth-header-block">
                <h1 className="auth-title">Two-Factor Verification</h1>
                <p className="auth-subtitle">
                  Enter the 8-digit verification code sent to <span className="highlight-email">{formData.email || 'your email'}</span>
                </p>
              </div>

              {notification && (
                <div className={`auth-notification ${notification.type}`} role="alert">
                  <span className="notification-icon">
                    {notification.type === 'error' ? <IconAlert /> : <IconCheck />}
                  </span>
                  <span>{notification.message}</span>
                </div>
              )}

              <div className="otp-container" onPaste={handleOtpPaste}>
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={otpRefs[index]}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    className={`otp-input ${otpHasError ? 'otp-error' : ''}`}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    disabled={isLoading || isResending}
                    aria-label={`Digit ${index + 1}`}
                  />
                ))}
              </div>

              <div className="otp-resend">
                {timeLeft > 0 ? (
                  <div className="resend-countdown">
                    <span className="resend-pulse"></span>
                    Resend code in: <span className="countdown-number">00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn-resend-link"
                    onClick={handleResendOtp}
                    disabled={isLoading || isResending}
                  >
                    {isResending ? (
                      <span className="btn-loading-flex">
                        <span className="btn-spinner-sm"></span>
                        Resending code...
                      </span>
                    ) : (
                      'Dispatched another code? Click to Resend'
                    )}
                  </button>
                )}
              </div>

              <button onClick={handleVerifyOtp} className="btn-auth-primary" disabled={isLoading || isResending}>
                {isLoading ? (
                  <span className="btn-loading-flex">
                    <span className="btn-spinner"></span>
                    Verifying Code...
                  </span>
                ) : 'Complete Verification'}
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

export default Auth;