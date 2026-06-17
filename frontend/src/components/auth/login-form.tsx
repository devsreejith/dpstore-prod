import Input from '@components/ui/input';
import PasswordInput from '@components/ui/password-input';
import Button from '@components/ui/button';
import { useForm } from 'react-hook-form';
import { useLoginMutation, LoginInputType } from '@framework/auth/use-login';
import Logo from '@components/ui/logo';
import { useUI } from '@contexts/ui.context';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

const LoginForm: React.FC = () => {
  const { t } = useTranslation();
  const { setModalView, openModal, closeModal, isAuthorized } = useUI();
  const { mutate: login, isPending } = useLoginMutation();
  const router = useRouter();
  const isCheckoutRedirect = router.query.redirect === '/checkout' || router.asPath.includes('redirect=%2Fcheckout');

  useEffect(() => {
    if (isAuthorized) {
      const redirect = router.query.redirect as string;
      if (redirect) {
        router.push(redirect);
      } else {
        // Only redirect to home if we are actually on a login page (not modal)
        if (router.pathname.startsWith('/signin') || router.pathname.startsWith('/login')) {
          router.push('/');
        }
      }
    }
  }, [isAuthorized, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInputType>();

  function onSubmit({ email, password, remember_me }: LoginInputType) {
    login({
      email,
      password,
      remember_me,
    });
    console.log(email, password, remember_me, 'data');
  }
  function handleSignUp() {
    setModalView('SIGN_UP_VIEW');
    return openModal();
  }
  function handleForgetPassword() {
    setModalView('FORGET_PASSWORD');
    return openModal();
  }
  return (
    <div className="w-full px-5 py-5 mx-auto overflow-hidden bg-white border border-gray-300 rounded-lg sm:w-96 md:w-450px sm:px-8">
      <div className="text-center mb-6 pt-2.5">
        <div onClick={closeModal}>
          <Logo />
        </div>
        <p className="mt-2 mb-8 text-sm md:text-base text-body sm:mb-10">
          {t('common:login-helper')}
        </p>
      </div>
      {isCheckoutRedirect && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-md text-sm text-center font-semibold animate-pulse shadow-sm">
          Please login or create an account to continue with checkout.
        </div>
      )}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col justify-center"
        noValidate
      >
        <div className="flex flex-col space-y-3.5">
          <Input
            labelKey="forms:label-email"
            type="email"
            variant="solid"
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
            {...register('password', {
              required: `${t('forms:password-required')}`,
            })}
          />
          <div className="flex items-center justify-center">
            <div className="flex items-center flex-shrink-0">
              <label className="relative inline-block w-10 cursor-pointer switch">
                <input
                  id="remember"
                  type="checkbox"
                  className="w-0 h-0 opacity-0"
                  {...register('remember_me')}
                />
                <span className="absolute inset-0 transition-all duration-300 ease-in bg-gray-500 slider round"></span>
              </label>
              <label
                htmlFor="remember"
                className="flex-shrink-0 text-sm cursor-pointer text-heading ltr:pl-3 rtl:pr-3"
              >
                {t('forms:label-remember-me')}
              </label>
            </div>
            <div className="flex ltr:ml-auto rtl:mr-auto">
              <button
                type="button"
                onClick={handleForgetPassword}
                className="text-sm underline ltr:text-right rtl:text-left text-heading ltr:pl-3 rtl:pr-3 hover:no-underline focus:outline-none"
              >
                {t('common:text-forgot-password')}
              </button>
            </div>
          </div>
          <div className="relative">
            <Button
              type="submit"
              loading={isPending}
              disabled={isPending}
              className="h-11 md:h-12 w-full mt-1.5"
            >
              {t('common:text-login')}
            </Button>
          </div>
        </div>
      </form>
      <div className="mt-5 mb-1 text-sm text-center sm:text-base text-[#58585B]">
        {t('common:text-no-account')}{' '}
        <button
          type="button"
          className="text-sm font-bold underline sm:text-base text-heading hover:no-underline focus:outline-none"
          onClick={handleSignUp}
        >
          {t('common:text-register')}
        </button>
      </div>
    </div>
  );
};

export default LoginForm;
