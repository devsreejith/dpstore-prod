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
import { useEffect } from 'react';

const SignUpForm: React.FC = () => {
  const { t } = useTranslation();
  const { mutate: signUp, isPending, error } = useSignUpMutation();
  const apiError = (error as any)?.response?.data?.message || (error as any)?.message;
  const { setModalView, openModal, closeModal, isAuthorized } = useUI();
  const router = useRouter();
  const isCheckoutRedirect = router.query.redirect === '/checkout' || router.asPath.includes('redirect=%2Fcheckout');

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

  function onSubmit({ name, email, password }: SignUpInputType) {
    signUp({
      name,
      email,
      password,
    });
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
              loading={isPending}
              disabled={isPending}
              className="h-11 md:h-12 w-full mt-2"
            >
              {t('common:text-register')}
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
