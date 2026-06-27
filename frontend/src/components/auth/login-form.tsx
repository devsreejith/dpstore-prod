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
  const { mutate: login, isPending, error } = useLoginMutation();
  const apiError = (error as any)?.response?.data?.message || (error as any)?.message;
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
      {apiError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-md text-sm text-center font-semibold shadow-sm animate-fade-in">
          {apiError}
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
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleForgetPassword}
              className="text-sm underline text-heading hover:no-underline focus:outline-none"
            >
              {t('common:text-forgot-password')}
            </button>
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

          {isCheckoutRedirect && (
            <div className="relative">
              <div className="flex items-center my-4">
                <hr className="w-full border-gray-300" />
                <span className="px-3 text-xs text-gray-400 uppercase font-semibold">or</span>
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
                Checkout as Guest
              </button>
            </div>
          )}
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
