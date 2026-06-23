import Input from '@components/ui/input';
import Button from '@components/ui/button';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { fadeInTop } from '@utils/motion/fade-in-top';
import {
  useUpdateUserMutation,
  UpdateUserType,
} from '@framework/customer/use-update-customer';
import { RadioBox } from '@components/ui/radiobox';
import { useTranslation } from 'next-i18next';
import { useQuery } from '@tanstack/react-query';
import http from '@framework/utils/http';
import { useEffect } from 'react';

const defaultValues = {};

const AccountDetails: React.FC = () => {
  const { mutate: updateUser, isPending } = useUpdateUserMutation();
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<UpdateUserType>({
    defaultValues,
  });

  const customerQuery = useQuery({
    queryKey: ['store.customer.me'],
    queryFn: async () => {
      const { data } = await http.get('/store/customers/me');
      return data?.customer ?? data;
    },
  });

  useEffect(() => {
    const c: any = customerQuery.data;
    if (!c) return;
    if (c.first_name) setValue('firstName', c.first_name);
    if (c.last_name) setValue('lastName', c.last_name);
    if (c.phone) setValue('phoneNumber', c.phone);
    if (c.email) setValue('email', c.email);
    if (c.metadata?.gender) setValue('gender', c.metadata.gender);
    else if (c.gender) setValue('gender', c.gender);
  }, [customerQuery.data, setValue]);

  function onSubmit(input: UpdateUserType) {
    updateUser(input);
  }

  return (
    <motion.div
      initial="from"
      animate="to"
      exit="from"
      //@ts-ignore
      variants={fadeInTop(0.35)}
      className={`w-full flex flex-col`}
    >
      <h2 className="text-xl md:text-2xl font-bold text-[#005844] mb-6 font-body">
        Account Details
      </h2>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full mx-auto flex flex-col justify-center "
        noValidate
      >
        <div className="flex flex-col space-y-4 sm:space-y-5">
          <div className="flex flex-col sm:flex-row sm:gap-x-3 space-y-4 sm:space-y-0">
            <Input
              labelKey="forms:label-first-name"
              {...register('firstName', {
                required: 'forms:first-name-required',
              })}
              variant="solid"
              className="w-full sm:w-1/2"
              errorKey={errors.firstName?.message}
            />
            <Input
              labelKey="forms:label-last-name"
              {...register('lastName', {
                required: 'forms:last-name-required',
              })}
              variant="solid"
              className="w-full sm:w-1/2"
              errorKey={errors.lastName?.message}
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:gap-x-3 space-y-4 sm:space-y-0">
            <Input
              type="tel"
              labelKey="forms:label-phone"
              inputMode="numeric"
              {...register('phoneNumber', {
                required: 'forms:phone-required',
                pattern: { value: /^[0-9]{6,15}$/, message: 'forms:phone-invalid' },
              })}
              variant="solid"
              className="w-full sm:w-1/2"
              errorKey={errors.phoneNumber?.message}
            />
            <Input
              type="email"
              labelKey="forms:label-email-star"
              {...register('email', {
                required: 'forms:email-required',
                pattern: {
                  value:
                    /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
                  message: 'forms:email-error',
                },
              })}
              variant="solid"
              className="w-full sm:w-1/2"
              errorKey={errors.email?.message}
            />
          </div>
          <div className="relative flex flex-col">
            <span className="mt-2 text-sm text-heading font-semibold block pb-1">
              {t('common:text-gender')}
            </span>
            <div className="mt-2 flex items-center gap-x-6">
              <RadioBox
                labelKey="forms:label-male"
                {...register('gender')}
                value="male"
              />
              <RadioBox
                labelKey="forms:label-female"
                {...register('gender')}
                value="female"
              />
            </div>
          </div>
          <div className="relative flex items-center gap-3">
            <Button
              type="submit"
              loading={isPending}
              disabled={isPending}
              className="h-11 px-8 bg-[#005844] hover:bg-[#008755] text-white font-semibold font-body rounded transition duration-150 mt-3 sm:w-auto"
            >
              {t('common:button-save')}
            </Button>
            <Button
              type="button"
              onClick={() => reset()}
              className="h-11 px-8 bg-black hover:bg-gray-900 text-white font-semibold font-body rounded transition duration-150 mt-3 sm:w-auto"
            >
              Cancel
            </Button>
          </div>
        </div>
      </form>
    </motion.div>
  );
};

export default AccountDetails;
