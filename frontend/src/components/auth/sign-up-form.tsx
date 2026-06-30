import { useState, useEffect } from 'react';
import Input from '@components/ui/input';
import PasswordInput from '@components/ui/password-input';
import Button from '@components/ui/button';
import { useForm } from 'react-hook-form';
import Logo from '@components/ui/logo';
import { useUI } from '@contexts/ui.context';
import { useSignUpMutation, SignUpInputType } from '@framework/auth/use-signup';
import Link from '@components/ui/link';
import { ROUTES } from '@utils/routes';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import http from '@framework/utils/http';

const SignUpForm: React.FC = () => {
  const { t } = useTranslation();
  const { mutate: signUp, isPending: isSigningUp, error: signUpError } = useSignUpMutation();
  const { setModalView, openModal, closeModal, isAuthorized } = useUI();
  const router = useRouter();
  const isCheckoutRedirect = router.query.redirect === '/checkout' || router.asPath.includes('redirect=%2Fcheckout');

  // OTP flow states
  const [step, setStep] = useState<'FORM' | 'OTP'>('FORM');
  const [otpCode, setOtpCode] = useState('');
  const [formData, setFormData] = useState<SignUpInputType | null>(null);
  
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  
  const [localApiError, setLocalApiError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  const apiError = localApiError || (signUpError as any)?.response?.data?.message || (signUpError as any)?.message;

  useEffect(() => {
    if (isAuthorized) {
      const redirect = router.query.redirect as string;
      if (redirect) {
        router.push(redirect);
      } else {
        if (router.pathname.startsWith('/signin') || router.pathname.startsWith('/login') || router.pathname.startsWith('/signup')) {
          router.push('/');
        }
      }
    }
  }, [isAuthorized, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpInputType>();

  function handleSignIn() {
    setModalView('LOGIN_VIEW');
    return openModal();
  }

  // Handle first step submission (Name, Email, Password)
  async function onSubmit(input: SignUpInputType) {
    setLocalApiError(null);
    setOtpError(null);
    setResendStatus(null);
    setFormData(input);

    try {
      setIsSendingOtp(true);
      
      // Request OTP from backend
      const response = await http.post('/store/custom/auth/register-otp/send', {
        email: input.email.trim().toLowerCase(),
      });

      if (response.data?.success) {
        setStep('OTP');
      } else {
        setLocalApiError("Failed to send verification code. Please try again.");
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || "Failed to send verification code.";
      setLocalApiError(errMsg);
    } finally {
      setIsSendingOtp(false);
    }
  }

  // Resend OTP
  async function handleResendOtp() {
    if (!formData?.email) return;
    setLocalApiError(null);
    setOtpError(null);
    setResendStatus(null);

    try {
      setIsSendingOtp(true);
      await http.post('/store/custom/auth/register-otp/send', {
        email: formData.email.trim().toLowerCase(),
      });
      setResendStatus("A new verification code has been sent.");
    } catch (err: any) {
      setOtpError(err?.response?.data?.message || err?.message || "Failed to resend verification code.");
    } finally {
      setIsSendingOtp(false);
    }
  }

  // Verify OTP and complete final Medusa sign up
  async function handleVerifyAndRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!formData) return;

    if (!otpCode || otpCode.trim().length !== 6) {
      setOtpError("Please enter a valid 6-digit code.");
      return;
    }

    setLocalApiError(null);
    setOtpError(null);
    setResendStatus(null);

    try {
      setIsVerifyingOtp(true);
      
      // Verify OTP
      const response = await http.post('/store/custom/auth/register-otp/verify', {
        email: formData.email.trim().toLowerCase(),
        otp: otpCode.trim(),
      });

      if (response.data?.verified) {
        // Trigger actual Medusa signup workflow
        signUp({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        });
      } else {
        setOtpError("Verification failed. Please try again.");
      }
    } catch (err: any) {
      setOtpError(err?.response?.data?.message || err?.message || "Invalid or expired verification code.");
    } finally {
      setIsVerifyingOtp(false);
    }
  }

  function handleGoBack() {
    setStep('FORM');
    setLocalApiError(null);
    setOtpError(null);
    setResendStatus(null);
  }

  return (
    <div className="py-5 px-5 sm:px-8 bg-white mx-auto rounded-lg w-full sm:w-96 md:w-450px border border-gray-300">
      <div className="text-center mb-6 pt-2.5">
        <div onClick={closeModal}>
          <Logo />
        </div>
        <p className="text-sm md:text-base text-body mt-2 mb-8 sm:mb-10">
          {t('common:registration-helper')}{' '}
          <Link
            href={ROUTES.TERMS}
            className="text-heading underline hover:no-underline focus:outline-none"
            onClick={closeModal}
          >
            {t('common:text-terms')}
          </Link>{' '}
          &amp;{' '}
          <Link
            href={ROUTES.POLICY}
            className="text-heading underline hover:no-underline focus:outline-none"
            onClick={closeModal}
          >
            {t('common:text-policy')}
          </Link>
        </p>
      </div>

      {step === 'FORM' && (
        <>
          {apiError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-md text-sm text-center font-semibold shadow-sm animate-fade-in">
              {apiError}
            </div>
          )}
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col justify-center"
            noValidate
            autoComplete="new-password"
          >
            {/* Dummy inputs to absorb browser autofill */}
            <div className="absolute opacity-0 pointer-events-none w-0 h-0 overflow-hidden" aria-hidden="true">
              <input type="text" name="fake_email_prevent_autofill" tabIndex={-1} autoComplete="off" />
              <input type="password" name="fake_password_prevent_autofill" tabIndex={-1} autoComplete="off" />
            </div>
            <div className="flex flex-col space-y-4">
              <Input
                labelKey="forms:label-name"
                type="text"
                variant="solid"
                autoComplete="new-name"
                {...register('name', {
                  required: 'forms:name-required',
                })}
                errorKey={errors.name?.message}
              />
              <Input
                labelKey="forms:label-email"
                type="email"
                variant="solid"
                autoComplete="new-email"
                {...register('email', {
                  required: `${t('forms:email-required')}`,
                  pattern: {
                    value:
                      /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
                    message: t('forms:email-error'),
                  },
                })}
                errorKey={errors.email?.message}
              />
              <PasswordInput
                labelKey="forms:label-password"
                errorKey={errors.password?.message}
                autoComplete="new-password"
                {...register('password', {
                  required: `${t('forms:password-required')}`,
                })}
              />
              <div className="relative">
                <Button
                  type="submit"
                  loading={isSendingOtp}
                  disabled={isSendingOtp}
                  className="h-11 md:h-12 w-full mt-2 bg-[#005844] hover:bg-[#008755] transition duration-150"
                >
                  {t('common:text-register')}
                </Button>
              </div>

              {isCheckoutRedirect && (
                <div className="relative">
                  <div className="flex items-center my-4">
                    <hr className="w-full border-gray-300" />
                    <span className="px-3 text-xs text-gray-400 uppercase font-semibold">{t('common:text-or')}</span>
                    <hr className="w-full border-gray-300" />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      closeModal();
                      router.push('/checkout');
                    }}
                    className="w-full h-11 md:h-12 bg-white hover:bg-gray-50 text-[#005844] border-2 border-[#005844] hover:border-[#008755] hover:text-[#008755] rounded-md font-bold text-sm transition duration-150 uppercase"
                  >
                    {t('common:text-checkout-as-guest')}
                  </button>
                </div>
              )}
            </div>
          </form>
        </>
      )}

      {step === 'OTP' && (
        <div className="animate-fade-in">
          <h3 className="text-lg font-bold text-heading text-center mb-2">Verify Your Email</h3>
          <p className="text-sm text-body text-center mb-6">
            We sent a 6-digit verification code to <strong className="text-heading">{formData?.email}</strong>.
          </p>

          {otpError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-md text-sm text-center font-semibold">
              {otpError}
            </div>
          )}

          {resendStatus && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-800 rounded-md text-sm text-center font-semibold">
              {resendStatus}
            </div>
          )}

          <form onSubmit={handleVerifyAndRegister} className="flex flex-col space-y-4">
            <Input
              name="otp"
              labelKey="Verification Code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              variant="solid"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
            />

            <Button
              type="submit"
              loading={isVerifyingOtp || isSigningUp}
              disabled={isVerifyingOtp || isSigningUp}
              className="h-11 md:h-12 w-full bg-[#005844] hover:bg-[#008755] transition duration-150"
            >
              Verify &amp; Register
            </Button>

            <div className="flex justify-between items-center text-sm pt-2">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={isSendingOtp}
                className="text-[#005844] hover:text-[#008755] font-bold disabled:opacity-50"
              >
                {isSendingOtp ? "Sending..." : "Resend Code"}
              </button>
              <button
                type="button"
                onClick={handleGoBack}
                className="text-gray-500 hover:text-gray-700 underline"
              >
                Edit Email
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="text-sm sm:text-base text-[#58585B] text-center mt-5 mb-1">
        {t('common:text-have-account')}{' '}
        <button
          type="button"
          className="text-sm sm:text-base text-heading underline font-bold hover:no-underline focus:outline-none"
          onClick={handleSignIn}
        >
          {t('common:text-login')}
        </button>
      </div>
    </div>
  );
};

export default SignUpForm;
