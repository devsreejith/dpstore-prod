import Input from '@components/ui/input';
import TextArea from '@components/ui/text-area';
import Button from '@components/ui/button';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useCart } from '@contexts/cart/cart.context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import http from '@framework/utils/http';
import { useUI } from '@contexts/ui.context';
import Alert from '@components/ui/alert';
import { PhoneInput } from '@components/ui/phone-input';
import { isValidPhoneNumber } from 'libphonenumber-js';
import { ROUTES } from '@utils/routes';
import { useRouter } from 'next/router';
import { IoTrashOutline, IoHomeOutline, IoBriefcaseOutline, IoPricetagOutline, IoShieldCheckmarkOutline, IoLocationOutline, IoMapOutline, IoCreateOutline, IoPencilOutline, IoSaveOutline, IoCloseOutline, IoCheckmarkCircleOutline } from 'react-icons/io5';
import { GoogleMapPicker } from '@components/ui/google-map-picker';
import { parseAddress2, serializeAddress2, formatAddress2ForDisplay } from '@utils/address-helper';
import { formatPrice } from '@framework/product/use-price';
import { useTranslation } from 'next-i18next';

interface CheckoutInputType {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  zipCode: string;
  save: boolean;
  note: string;
  address_1?: string;
  address_2?: string;
  apartment?: string;
  building?: string;
  floor?: string;
  landmark?: string;
  lat?: string;
  lng?: string;
  address_type?: string;

  // Billing address fields
  billing_firstName?: string;
  billing_lastName?: string;
  billing_phone?: string;
  billing_address_1?: string;
  billing_city?: string;
  billing_state?: string;
  billing_zipCode?: string;
  billing_building?: string;
  billing_landmark?: string;
  billing_lat?: string;
  billing_lng?: string;
}

type AddressInput = {
  first_name: string;
  last_name: string;
  address_1: string;
  address_2?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  country_code: string;
  phone?: string;
  address_type?: string;
  apartment?: string;
  building?: string;
  floor?: string;
  landmark?: string;
  lat?: string;
  lng?: string;
};

const PHONE_ONLY_REGEX = /^[0-9]{6,15}$/;
const POSTAL_ONLY_REGEX = /^[0-9]{3,10}$/;

interface CheckoutFormProps {
  activeStep: 1 | 2 | 3;
  setActiveStep: React.Dispatch<React.SetStateAction<1 | 2 | 3>>;
  selectedAddress: any;
  setSelectedAddress: React.Dispatch<React.SetStateAction<any>>;
}

const CheckoutForm: React.FC<CheckoutFormProps> = ({
  activeStep,
  setActiveStep,
  selectedAddress,
  setSelectedAddress,
}) => {
  const { placeOrder, isEmpty, cartId, items } = useCart();
  const { isAuthorized } = useUI();
  const { t } = useTranslation('common');
  const queryClient = useQueryClient();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [shippingOptionId, setShippingOptionId] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [selectedPaymentProvider, setSelectedPaymentProvider] = useState<'pp_system_default' | 'pp_ngenius_ngenius'>('pp_ngenius_ngenius');

  const {
    register,
    handleSubmit,
    setValue,
    trigger,
    getValues,
    watch,
    control,
    formState: { errors },
  } = useForm<CheckoutInputType>({
    defaultValues: {
      apartment: "", building: "", floor: "", landmark: "", lat: "", lng: "", address_type: "Home",
      billing_firstName: "", billing_lastName: "", billing_phone: "", billing_address_1: "",
      billing_city: "", billing_state: "", billing_zipCode: "", billing_building: "",
      billing_landmark: "", billing_lat: "", billing_lng: ""
    }
  });

  const [billingSameAsShipping, setBillingSameAsShipping] = useState<boolean>(true);
  const [showBillingMapPicker, setShowBillingMapPicker] = useState<boolean>(true);
  const [selectedBillingAddress, setSelectedBillingAddress] = useState<any>(null);

  const {
    register: registerNewAddress,
    handleSubmit: handleSubmitNewAddress,
    reset: resetNewAddress,
    watch: watchNewAddress,
    control: controlNewAddress,
    setValue: setValueNewAddress,
    formState: { errors: newAddressErrors },
  } = useForm<AddressInput>({
    defaultValues: { country_code: 'ae', address_type: 'Home', apartment: "", building: "", floor: "", landmark: "", lat: "", lng: "" },
  });

  const [showMapPicker, setShowMapPicker] = useState<boolean>(true);
  const [showModalMapPicker, setShowModalMapPicker] = useState<boolean>(true);

  const selectedAddressType = watchNewAddress('address_type') ?? 'Home';
  const selectedGuestAddressType = watch('address_type') ?? 'Home';

  useEffect(() => {
    if (!billingSameAsShipping) {
      const currentValues = getValues();
      if (!getValues('billing_firstName')) setValue('billing_firstName', currentValues.firstName);
      if (!getValues('billing_lastName')) setValue('billing_lastName', currentValues.lastName);
      if (!getValues('billing_phone')) setValue('billing_phone', currentValues.phone);
    }
  }, [billingSameAsShipping, setValue, getValues]);

  useEffect(() => {
    if (billingSameAsShipping) {
      setValue('billing_firstName', '');
      setValue('billing_lastName', '');
      setValue('billing_phone', '');
      setValue('billing_address_1', '');
      setValue('billing_city', '');
      setValue('billing_state', '');
      setValue('billing_zipCode', '');
      setValue('billing_building', '');
      setValue('billing_landmark', '');
      setValue('billing_lat', '');
      setValue('billing_lng', '');
      setSelectedBillingAddress(null);
      setShowBillingMapPicker(true);
    }
  }, [billingSameAsShipping, setValue]);

  const customerQuery = useQuery({
    queryKey: ['store.customer.me.checkout'],
    enabled: isAuthorized === true,
    queryFn: async () => {
      const { data } = await http.get('/store/customers/me');
      return data?.customer ?? data;
    },
  });

  const addressesQuery = useQuery({
    queryKey: ['store.customer.addresses.checkout'],
    enabled: isAuthorized === true,
    queryFn: async () => {
      const { data } = await http.get('/store/customers/me/addresses', { params: { limit: 50 } });
      return {
        addresses: Array.isArray((data as any)?.addresses) ? (data as any).addresses : [],
      };
    },
  });

  const createAddressMutation = useMutation({
    mutationFn: async (input: AddressInput) => {
      const payload: any = {
        first_name: String(input.first_name || '').trim() || undefined,
        last_name: String(input.last_name || '').trim() || undefined,
        address_1: String(input.address_1 || '').trim(),
        address_2: String(input.address_2 || '').trim() || undefined,
        city: String(input.city || '').trim() || undefined,
        province: String(input.province || '').trim() || undefined,
        postal_code: String(input.postal_code || '').trim() || undefined,
        country_code: String(input.country_code || 'ae').trim().toLowerCase(),
        phone: String(input.phone || '').trim() || undefined,
        company: input.address_type || 'Home',
      };
      if (!payload.address_1) throw new Error('Address is required');
      const { data } = await http.post('/store/customers/me/addresses', payload);
      return data;
    },
    onSuccess: async (data: any) => {
      const maybeAddress =
        data?.address ??
        data?.customer_address ??
        data?.customer?.addresses?.[data?.customer?.addresses?.length - 1] ??
        null;
      if (maybeAddress) {
        const id = String(maybeAddress?.id ?? '').trim();
        if (id) {
          setSelectedAddressId(id);
          setSelectedAddress(maybeAddress);
        }
        applyAddressToForm(maybeAddress);
      }
      resetNewAddress({ country_code: 'ae', address_type: 'Home', apartment: '', building: '', floor: '', landmark: '', lat: '', lng: '' } as any);
      setShowModalMapPicker(true);
      setShowAddAddress(false);
      await queryClient.invalidateQueries({ queryKey: ['store.customer.addresses.checkout'] });
    },
  });

  const updateAddressMutation = useMutation({
    mutationFn: async (input: AddressInput & { id: string }) => {
      const payload: any = {
        first_name: String(input.first_name || '').trim() || undefined,
        last_name: String(input.last_name || '').trim() || undefined,
        address_1: String(input.address_1 || '').trim(),
        address_2: String(input.address_2 || '').trim() || undefined,
        city: String(input.city || '').trim() || undefined,
        province: String(input.province || '').trim() || undefined,
        postal_code: String(input.postal_code || '').trim() || undefined,
        country_code: String(input.country_code || 'ae').trim().toLowerCase(),
        phone: String(input.phone || '').trim() || undefined,
        company: input.address_type || 'Home',
      };
      if (!payload.address_1) throw new Error('Address is required');
      const { data } = await http.post(`/store/customers/me/addresses/${input.id}`, payload);
      return data;
    },
    onSuccess: async (data: any) => {
      const maybeAddress =
        data?.address ??
        data?.customer_address ??
        data?.customer?.addresses?.find((a: any) => String(a.id) === String(editingAddressId)) ??
        null;
      if (maybeAddress) {
        const id = String(maybeAddress?.id ?? '').trim();
        if (id) {
          setSelectedAddressId(id);
          setSelectedAddress(maybeAddress);
        }
        applyAddressToForm(maybeAddress);
      }
      resetNewAddress({ country_code: 'ae', address_type: 'Home', apartment: '', building: '', floor: '', landmark: '', lat: '', lng: '' } as any);
      setShowAddAddress(false);
      setEditingAddressId(null);
      await queryClient.invalidateQueries({ queryKey: ['store.customer.addresses.checkout'] });
    },
  });

  const deleteAddressMutation = useMutation({
    mutationFn: async (id: string) => {
      await http.delete(`/store/customers/me/addresses/${id}`);
      return { ok: true };
    },
    onSuccess: async (_data, id) => {
      if (String(selectedAddressId) === String(id)) {
        setSelectedAddressId('');
        setSelectedAddress(null);
      }
      await queryClient.invalidateQueries({ queryKey: ['store.customer.addresses.checkout'] });
    },
  });

  const onSubmitAddressModal = (input: AddressInput) => {
    const address_2 = serializeAddress2({
      apartment: input.apartment,
      building: input.building,
      floor: input.floor,
      landmark: input.landmark,
      lat: input.lat,
      lng: input.lng,
    });
    if (editingAddressId) {
      updateAddressMutation.mutate({
        ...input,
        address_2,
        id: editingAddressId,
      });
    } else {
      createAddressMutation.mutate({
        ...input,
        address_2,
      });
    }
  };

  const shippingOptionsQuery = useQuery({
    queryKey: ['store.shipping-options', cartId],
    enabled: Boolean(cartId) && !isEmpty,
    queryFn: async () => {
      const { data } = await http.get('/store/shipping-options', { params: { cart_id: cartId } });
      return Array.isArray((data as any)?.shipping_options) ? (data as any).shipping_options : [];
    },
  });

  const shippingOptions = useMemo(() => {
    return Array.isArray(shippingOptionsQuery.data) ? shippingOptionsQuery.data : [];
  }, [shippingOptionsQuery.data]);

  useEffect(() => {
    const c: any = customerQuery.data;
    if (!c) return;
    if (c.first_name) setValue('firstName', c.first_name);
    if (c.last_name) setValue('lastName', c.last_name);
    if (c.phone) setValue('phone', c.phone);
    if (c.email) setValue('email', c.email);
  }, [customerQuery.data, setValue]);

  useEffect(() => {
    if (shippingOptionId) return;
    const firstId = String((shippingOptions as any)?.[0]?.id ?? '').trim();
    if (firstId) setShippingOptionId(firstId);
  }, [shippingOptions, shippingOptionId]);

  function onSubmit(input: CheckoutInputType) {
    if (isEmpty) return;
    setFormError(null);
    setSubmitting(true);
    (async () => {
      try {
        const email = String(input.email || selectedAddress?.email || customerQuery.data?.email || '').trim();
        const phone = String(input.phone || selectedAddress?.phone || customerQuery.data?.phone || '987654321').trim();
        if (!email) {
          throw new Error('Email address is required for checkout.');
        }
        const deliveryInstructions = String(input.note ?? '').trim();
        const shipping_address = {
          first_name: String(input.firstName || selectedAddress?.first_name || 'N/A').trim(),
          last_name: String(input.lastName || selectedAddress?.last_name || 'N/A').trim(),
          address_1: selectedAddress?.address_1 || String(input.address_1 || '').trim() || 'N/A',
          address_2: selectedAddress?.address_2 || serializeAddress2({
            apartment: input.apartment,
            building: input.building,
            floor: input.floor,
            landmark: input.landmark,
            lat: input.lat,
            lng: input.lng,
          }) || deliveryInstructions || undefined,
          city: String(input.city || selectedAddress?.city || 'N/A').trim(),
          province: String(input.state || selectedAddress?.province || 'N/A').trim(),
          postal_code: String(input.zipCode || selectedAddress?.postal_code || '00000').trim(),
          phone: phone,
          country_code: 'ae',
          company: selectedAddress?.company || input.address_type || 'Home',
        };
        const billing_address = billingSameAsShipping
          ? shipping_address
          : (selectedBillingAddress || {
              first_name: String(input.billing_firstName || 'N/A').trim(),
              last_name: String(input.billing_lastName || 'N/A').trim(),
              address_1: String(input.billing_address_1 || 'N/A').trim(),
              address_2: serializeAddress2({
                apartment: "",
                building: "",
                floor: "",
                landmark: "",
                lat: input.billing_lat,
                lng: input.billing_lng,
              }),
              city: String(input.billing_city || 'N/A').trim(),
              province: String(input.billing_state || 'N/A').trim(),
              postal_code: String(input.billing_zipCode || '00000').trim(),
              phone: String(input.billing_phone || '987654321').trim(),
              country_code: 'ae',
            });
        const result = await placeOrder({
          email,
          shipping_address,
          billing_address,
          shipping_option_id: shippingOptionId || undefined,
          payment_provider_id: selectedPaymentProvider,
        });
        const getFriendlyOrderId = (o: any) => {
          if (o?.metadata?.order_number) {
            return String(o.metadata.order_number);
          }
          if (o?.display_id) {
            const orderDate = o?.created_at ? new Date(o.created_at) : new Date();
            const yy = String(orderDate.getFullYear()).slice(-2);
            const displayIdStr = String(o.display_id).padStart(4, '0');
            return `ORD-OL${yy}-${displayIdStr}`;
          }
          return String(o?.id ?? '');
        };

        if (result?.type === 'order' && result?.order?.id) {
          const friendlyId = getFriendlyOrderId(result.order);
          if (selectedPaymentProvider === 'pp_system_default') {
            router.push(`${ROUTES.ORDER}?id=${friendlyId}`);
          } else {
            const hasRedirect = !!(result as any).payment_url;
            if (!hasRedirect) {
              router.push(`/my-account/orders/${friendlyId}`);
            }
          }
        } else {
          router.push(ROUTES.ORDER);
        }
      } catch (e: any) {
        setFormError(String(e?.message ?? 'Checkout failed'));
      } finally {
        setSubmitting(false);
      }
    })();
  }

  const addresses = useMemo(() => {
    return Array.isArray((addressesQuery.data as any)?.addresses) ? (addressesQuery.data as any).addresses : [];
  }, [addressesQuery.data]);

  const applyAddressToForm = useCallback((a: any) => {
    const first = String(a?.first_name ?? '').trim();
    const last = String(a?.last_name ?? '').trim();
    const phone = String(a?.phone ?? '').trim();
    const address1 = String(a?.address_1 ?? '').trim();
    const city = String(a?.city ?? '').trim();
    const state = String(a?.province ?? '').trim();
    const zip = String(a?.postal_code ?? '').trim();
    
    if (first) setValue('firstName', first);
    if (last) setValue('lastName', last);
    if (phone) setValue('phone', phone);
    if (address1) setValue('address_1', address1);
    if (city) setValue('city', city);
    if (state) setValue('state', state);
    if (zip) setValue('zipCode', zip);

    // Parse extra details from address_2
    const parsedExtra = parseAddress2(a?.address_2 ?? '');
    setValue('apartment', parsedExtra.apartment);
    setValue('building', parsedExtra.building);
    setValue('floor', parsedExtra.floor);
    setValue('landmark', parsedExtra.landmark);
    setValue('lat', parsedExtra.lat);
    setValue('lng', parsedExtra.lng);
  }, [setValue]);

  useEffect(() => {
    if (showAddAddress) return;
    const defaultAddress =
      addresses.find((a: any) => a?.is_default_shipping) ||
      addresses?.[0] ||
      null;
    if (!defaultAddress) return;
    const defaultId = String(defaultAddress.id || '');
    if (!defaultId) return;
    if (!selectedAddressId) {
      setSelectedAddressId(defaultId);
      setSelectedAddress(defaultAddress);
      applyAddressToForm(defaultAddress);
    }
  }, [addresses, showAddAddress, selectedAddressId, setSelectedAddress, applyAddressToForm]);

  return (
    <div className="flex flex-col gap-4">
      {/* STEP 2: DELIVERY ADDRESS */}
      {activeStep === 2 && (
        <div className="space-y-4">
          {isAuthorized && (
            <div className="flex items-center justify-between pb-2">
              <h2 className="text-sm md:text-base font-bold text-[#008755] uppercase tracking-wider font-body">
                {showAddAddress ? (editingAddressId ? t("text-edit-address") : t("text-add-new-address")) : t("text-delivery-address")}
              </h2>
              <button
                type="button"
                onClick={() => {
                  if (showAddAddress) {
                    setEditingAddressId(null);
                  } else {
                    resetNewAddress({ country_code: 'ae', address_type: 'Home', apartment: '', building: '', floor: '', landmark: '', lat: '', lng: '' } as any);
                    setShowModalMapPicker(true);
                  }
                  setShowAddAddress(!showAddAddress);
                }}
                className="text-xs md:text-sm font-bold text-[#008755] hover:underline transition font-body"
              >
                {showAddAddress ? t("text-back-to-address-list") : t("text-add-new-address-btn")}
              </button>
            </div>
          )}

          {!isAuthorized ? (
            /* Guest Checkout Input Form */
            <div className="border border-gray-200 rounded-md p-5 bg-white shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-[#005844] uppercase tracking-wider font-body">{t('text-contact-info')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  labelKey={t('text-first-name')}
                  {...register('firstName', {
                    required: t('error-first-name-required'),
                    pattern: {
                      value: /^[a-zA-Z\s\.\u0600-\u06FF\u00C0-\u017F]+$/,
                      message: t('error-first-name-invalid'),
                    },
                  })}
                  errorKey={errors.firstName?.message}
                  variant="solid"
                />
                <Input
                  labelKey={t('text-last-name')}
                  {...register('lastName', {
                    required: t('error-last-name-required'),
                    pattern: {
                      value: /^[a-zA-Z\s\.\u0600-\u06FF\u00C0-\u017F]+$/,
                      message: t('error-last-name-invalid'),
                    },
                  })}
                  errorKey={errors.lastName?.message}
                  variant="solid"
                />
                <Input
                  labelKey={t('text-email-address')}
                  type="email"
                  {...register('email', {
                    required: t('error-email-required'),
                    pattern: {
                      value: /^\S+@\S+$/i,
                      message: t('error-email-invalid'),
                    },
                  })}
                  errorKey={errors.email?.message}
                  variant="solid"
                />
                <Controller
                  name="phone"
                  control={control}
                  rules={{
                    required: t('error-phone-required'),
                    validate: (value) => {
                      if (!value) return t('error-phone-required');
                      return isValidPhoneNumber(value) || t('error-phone-invalid');
                    }
                  }}
                  render={({ field: { onChange, value } }) => (
                    <PhoneInput
                      labelKey="text-phone-number"
                      value={value}
                      onChange={onChange}
                      errorKey={errors.phone?.message}
                      variant="solid"
                    />
                  )}
                />
              </div>

              <h3 className="text-sm font-bold text-[#005844] uppercase tracking-wider font-body pt-2">{t('text-shipping-address')}</h3>
              
              {showMapPicker ? (
                <div className="pt-2">
                  <GoogleMapPicker
                    initialLocation={
                      watch('lat') && watch('lng')
                        ? { lat: parseFloat(watch('lat')!), lng: parseFloat(watch('lng')!) }
                        : undefined
                    }
                    onConfirm={(loc) => {
                      setValue('address_1', loc.address_1 || loc.formattedAddress, { shouldValidate: true, shouldDirty: true });
                      if (loc.building) setValue('building', loc.building, { shouldValidate: true, shouldDirty: true });
                      if (loc.city) setValue('city', loc.city, { shouldValidate: true, shouldDirty: true });
                      if (loc.province) setValue('state', loc.province, { shouldValidate: true, shouldDirty: true });
                      if (loc.postalCode) setValue('zipCode', loc.postalCode, { shouldValidate: true, shouldDirty: true });
                      if (loc.lat) setValue('lat', String(loc.lat));
                      if (loc.lng) setValue('lng', String(loc.lng));
                      setShowMapPicker(false);
                    }}
                  />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {watch('lat') && watch('lng') && (
                      <div className="col-span-full p-3 bg-green-50 border border-green-200 text-green-800 rounded-md text-xs sm:text-sm flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="flex-shrink-0">📍</span>
                          <span className="truncate">Map location selected: <strong>{watch('address_1')}</strong></span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowMapPicker(true)}
                          className="text-[#008755] font-semibold underline hover:text-[#007044] text-xs ml-2 cursor-pointer whitespace-nowrap"
                        >
                          Change Location
                        </button>
                      </div>
                    )}

                    <Input
                      labelKey={t('text-address-line-1')}
                      {...register('address_1', { required: t('error-address-required') })}
                      errorKey={errors.address_1?.message}
                      variant="solid"
                    />
                    <Input
                      labelKey="text-building-name-number"
                      {...register('building')}
                      placeholderKey="placeholder-building"
                      variant="solid"
                    />
                    <Input
                      labelKey={t('text-city')}
                      {...register('city', { required: t('error-city-required') })}
                      errorKey={errors.city?.message}
                      variant="solid"
                    />
                    <div className="flex flex-col space-y-2">
                      <label className="text-heading font-semibold text-sm leading-none cursor-pointer">{t('text-emirate')}</label>
                      <select
                        {...register('state', { required: t('error-emirate-required') })}
                        className="form-select py-2 px-4 w-full transition duration-150 ease-in-out border text-input text-13px lg:text-sm font-body rounded-md placeholder-body min-h-12 bg-white border-gray-300 focus:outline-none focus:border-heading h-11 md:h-12"
                      >
                        <option value="">{t('text-select-emirate')}</option>
                        <option value="Abu Dhabi">Abu Dhabi</option>
                        <option value="Dubai">Dubai</option>
                        <option value="Sharjah">Sharjah</option>
                        <option value="Ajman">Ajman</option>
                        <option value="Umm Al Quwain">Umm Al Quwain</option>
                        <option value="Ras Al Khaimah">Ras Al Khaimah</option>
                        <option value="Fujairah">Fujairah</option>
                      </select>
                      {errors.state && (
                        <p className="my-2 text-13px text-brandRed">{errors.state.message}</p>
                      )}
                    </div>
                    <Input
                      labelKey={t('text-postal-code')}
                      inputMode="numeric"
                      {...register('zipCode', {
                        required: t('error-postal-code-required'),
                        pattern: { value: POSTAL_ONLY_REGEX, message: t('error-postal-code-invalid') },
                      })}
                      errorKey={errors.zipCode?.message}
                      variant="solid"
                    />
                    <Input
                      labelKey="text-landmark"
                      {...register('landmark')}
                      placeholderKey="placeholder-landmark"
                      variant="solid"
                    />
                    <input type="hidden" {...register('lat')} />
                    <input type="hidden" {...register('lng')} />
                    <input type="hidden" {...register('apartment')} />
                    <input type="hidden" {...register('floor')} />
                  </div>

                  {/* Premium Address Type selector */}
                  <div className="mt-6 pb-2 border-t border-gray-100 pt-4">
                    <div className="mb-3">
                      <h4 className="text-sm md:text-base font-bold text-heading font-body leading-none">{t('text-address-type')}</h4>
                      <p className="text-xs text-body mt-1 leading-none">{t('text-choose-address-label')}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <label className="cursor-pointer">
                        <input type="radio" value="Home" {...register("address_type")} className="sr-only" />
                        <div className={`flex items-center justify-between px-4 py-3 border rounded-md transition ${selectedGuestAddressType === 'Home' ? 'border-[#008755] bg-[#F4F9F6]' : 'border-gray-200 bg-white'}`}>
                          <div className="flex items-center gap-3">
                            <IoHomeOutline className={`w-5 h-5 ${selectedGuestAddressType === 'Home' ? 'text-[#008755]' : 'text-gray-400'}`} />
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-heading">{t('text-home-label')}</span>
                              <span className="text-[10px] text-gray-500 mt-0.5">{t('text-home-desc')}</span>
                            </div>
                          </div>
                          <div className={`w-4 h-4 rounded-full border transition-all ${selectedGuestAddressType === 'Home' ? 'border-[#008755] border-[4px] bg-white' : 'border-gray-300 bg-white'}`}></div>
                        </div>
                      </label>
                      <label className="cursor-pointer">
                        <input type="radio" value="Office" {...register("address_type")} className="sr-only" />
                        <div className={`flex items-center justify-between px-4 py-3 border rounded-md transition ${selectedGuestAddressType === 'Office' ? 'border-[#008755] bg-[#F4F9F6]' : 'border-gray-200 bg-white'}`}>
                          <div className="flex items-center gap-3">
                            <IoBriefcaseOutline className={`w-5 h-5 ${selectedGuestAddressType === 'Office' ? 'text-[#008755]' : 'text-gray-400'}`} />
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-heading">{t('text-office-label')}</span>
                              <span className="text-[10px] text-gray-500 mt-0.5">{t('text-office-desc')}</span>
                            </div>
                          </div>
                          <div className={`w-4 h-4 rounded-full border transition-all ${selectedGuestAddressType === 'Office' ? 'border-[#008755] border-[4px] bg-white' : 'border-gray-300 bg-white'}`}></div>
                        </div>
                      </label>
                      <label className="cursor-pointer">
                        <input type="radio" value="Other" {...register("address_type")} className="sr-only" />
                        <div className={`flex items-center justify-between px-4 py-3 border rounded-md transition ${selectedGuestAddressType === 'Other' ? 'border-[#008755] bg-[#F4F9F6]' : 'border-gray-200 bg-white'}`}>
                          <div className="flex items-center gap-3">
                            <IoPencilOutline className={`w-5 h-5 ${selectedGuestAddressType === 'Other' ? 'text-[#008755]' : 'text-gray-400'}`} />
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-heading">{t('text-other-label')}</span>
                              <span className="text-[10px] text-gray-500 mt-0.5">{t('text-other-desc')}</span>
                            </div>
                          </div>
                          <div className={`w-4 h-4 rounded-full border transition-all ${selectedGuestAddressType === 'Other' ? 'border-[#008755] border-[4px] bg-white' : 'border-gray-300 bg-white'}`}></div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Billing address same as shipping address checkbox */}
                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="billing-same-as-shipping"
                      className="form-checkbox text-[#008755] focus:ring-[#008755] h-4.5 w-4.5 rounded border-gray-300 transition duration-150 cursor-pointer"
                      checked={billingSameAsShipping}
                      onChange={(e) => setBillingSameAsShipping(e.target.checked)}
                    />
                    <label htmlFor="billing-same-as-shipping" className="text-sm font-semibold text-heading cursor-pointer select-none">
                      {t('text-billing-same-as-shipping', 'Billing address same as shipping address')}
                    </label>
                  </div>

                  {/* Billing Address Section */}
                  {!billingSameAsShipping && (
                    <div className="mt-6 pt-6 border-t border-gray-150 space-y-4">
                      <h3 className="text-sm font-bold text-[#005844] uppercase tracking-wider font-body">{t('text-billing-address', 'Billing Address')}</h3>
                      {showBillingMapPicker ? (
                        <div className="pt-2">
                          <GoogleMapPicker
                            initialLocation={
                              watch('billing_lat') && watch('billing_lng')
                                ? { lat: parseFloat(watch('billing_lat')!), lng: parseFloat(watch('billing_lng')!) }
                                : undefined
                            }
                            onConfirm={(loc) => {
                              setValue('billing_address_1', loc.address_1 || loc.formattedAddress, { shouldValidate: true, shouldDirty: true });
                              if (loc.city) setValue('billing_city', loc.city, { shouldValidate: true, shouldDirty: true });
                              if (loc.province) setValue('billing_state', loc.province, { shouldValidate: true, shouldDirty: true });
                              if (loc.postalCode) setValue('billing_zipCode', loc.postalCode, { shouldValidate: true, shouldDirty: true });
                              if (loc.lat) setValue('billing_lat', String(loc.lat));
                              if (loc.lng) setValue('billing_lng', String(loc.lng));
                              setShowBillingMapPicker(false);
                            }}
                          />
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {watch('billing_lat') && watch('billing_lng') && (
                            <div className="col-span-full p-3 bg-green-50 border border-green-200 text-green-800 rounded-md text-xs sm:text-sm flex items-center justify-between">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="flex-shrink-0">📍</span>
                                <span className="truncate">Map location selected: <strong>{watch('billing_address_1')}</strong></span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setShowBillingMapPicker(true)}
                                className="text-[#008755] font-semibold underline hover:text-[#007044] text-xs ml-2 cursor-pointer whitespace-nowrap"
                              >
                                Change Location
                              </button>
                            </div>
                          )}

                          <Input
                            labelKey={t('text-first-name')}
                            {...register('billing_firstName', {
                              required: t('error-first-name-required'),
                              pattern: {
                                value: /^[a-zA-Z\s\.\u0600-\u06FF\u00C0-\u017F]+$/,
                                message: t('error-first-name-invalid'),
                              },
                            })}
                            errorKey={errors.billing_firstName?.message}
                            variant="solid"
                          />
                          <Input
                            labelKey={t('text-last-name')}
                            {...register('billing_lastName', {
                              required: t('error-last-name-required'),
                              pattern: {
                                value: /^[a-zA-Z\s\.\u0600-\u06FF\u00C0-\u017F]+$/,
                                message: t('error-last-name-invalid'),
                              },
                            })}
                            errorKey={errors.billing_lastName?.message}
                            variant="solid"
                          />
                          <Controller
                            name="billing_phone"
                            control={control}
                            rules={{
                              required: t('error-phone-required'),
                              validate: (value) => {
                                if (!value) return t('error-phone-required');
                                return isValidPhoneNumber(value) || t('error-phone-invalid');
                              }
                            }}
                            render={({ field: { onChange, value } }) => (
                              <PhoneInput
                                labelKey="text-phone-number"
                                value={value}
                                onChange={onChange}
                                errorKey={errors.billing_phone?.message}
                                variant="solid"
                              />
                            )}
                          />
                          <Input
                            labelKey={t('text-address-line-1')}
                            {...register('billing_address_1', { required: t('error-address-required') })}
                            errorKey={errors.billing_address_1?.message}
                            variant="solid"
                          />
                          <Input
                            labelKey={t('text-city')}
                            {...register('billing_city', { required: t('error-city-required') })}
                            errorKey={errors.billing_city?.message}
                            variant="solid"
                          />
                          <div className="flex flex-col space-y-2">
                            <label className="text-heading font-semibold text-sm leading-none cursor-pointer">{t('text-emirate')}</label>
                            <select
                              {...register('billing_state', { required: t('error-emirate-required') })}
                              className="form-select py-2 px-4 w-full transition duration-150 ease-in-out border text-input text-13px lg:text-sm font-body rounded-md placeholder-body min-h-12 bg-white border-gray-300 focus:outline-none focus:border-heading h-11 md:h-12"
                            >
                              <option value="">{t('text-select-emirate')}</option>
                              <option value="Abu Dhabi">Abu Dhabi</option>
                              <option value="Dubai">Dubai</option>
                              <option value="Sharjah">Sharjah</option>
                              <option value="Ajman">Ajman</option>
                              <option value="Umm Al Quwain">Umm Al Quwain</option>
                              <option value="Ras Al Khaimah">Ras Al Khaimah</option>
                              <option value="Fujairah">Fujairah</option>
                            </select>
                            {errors.billing_state && (
                              <p className="my-2 text-13px text-brandRed">{errors.billing_state.message}</p>
                            )}
                          </div>
                          <Input
                            labelKey={t('text-postal-code')}
                            inputMode="numeric"
                            {...register('billing_zipCode', {
                              required: t('error-postal-code-required'),
                              pattern: { value: POSTAL_ONLY_REGEX, message: t('error-postal-code-invalid') },
                            })}
                            errorKey={errors.billing_zipCode?.message}
                            variant="solid"
                          />
                          <input type="hidden" {...register('billing_lat')} />
                          <input type="hidden" {...register('billing_lng')} />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Continue to Payment Button */}
                  {!( !billingSameAsShipping && showBillingMapPicker ) && (
                    <div className="pt-6 border-t border-gray-100 mt-6">
                      <button
                        type="button"
                        onClick={async () => {
                          const fieldsToTrigger = [
                            'email',
                            'phone',
                            'firstName',
                            'lastName',
                            'address_1',
                            'city',
                            'state',
                            'zipCode',
                          ];
                          if (!billingSameAsShipping) {
                            fieldsToTrigger.push(
                              'billing_firstName',
                              'billing_lastName',
                              'billing_phone',
                              'billing_address_1',
                              'billing_city',
                              'billing_state',
                              'billing_zipCode'
                            );
                          }
                          const isValid = await trigger(fieldsToTrigger as any);
                          if (isValid) {
                            const values = getValues();
                            const addr = {
                              first_name: values.firstName,
                              last_name: values.lastName,
                              phone: values.phone,
                              address_1: values.address_1,
                              address_2: serializeAddress2({
                                apartment: values.apartment,
                                building: values.building,
                                floor: values.floor,
                                landmark: values.landmark,
                                lat: values.lat,
                                lng: values.lng,
                              }),
                              city: values.city,
                              province: values.state,
                              postal_code: values.zipCode,
                              country_code: 'ae',
                              email: values.email,
                              company: values.address_type || 'Home',
                            };
                            setSelectedAddress(addr);

                            if (!billingSameAsShipping) {
                              const billAddr = {
                                first_name: values.billing_firstName,
                                last_name: values.billing_lastName,
                                phone: values.billing_phone,
                                address_1: values.billing_address_1,
                                address_2: serializeAddress2({
                                  apartment: "",
                                  building: "",
                                  floor: "",
                                  landmark: "",
                                  lat: values.billing_lat,
                                  lng: values.billing_lng,
                                }),
                                city: values.billing_city,
                                province: values.billing_state,
                                postal_code: values.billing_zipCode,
                                country_code: 'ae',
                              };
                              setSelectedBillingAddress(billAddr);
                            } else {
                              setSelectedBillingAddress(null);
                            }

                            setActiveStep(3);
                          }
                        }}
                        className="w-full h-12 bg-[#005844] hover:bg-[#008755] text-white font-bold text-sm rounded-lg transition duration-200 flex items-center justify-center gap-2 font-body mt-3 tracking-wider uppercase"
                      >
                        <span>{t('text-continue-to-payment')}</span>
                        <span className="text-lg font-normal mb-0.5 inline-block transform rtl:rotate-180">→</span>
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : showAddAddress ? (
            /* Form container */
            <div className="border border-gray-200 rounded-md p-5 bg-white shadow-sm">
              {showModalMapPicker ? (
                <GoogleMapPicker
                  initialLocation={
                    watchNewAddress('lat') && watchNewAddress('lng')
                      ? { lat: parseFloat(watchNewAddress('lat')!), lng: parseFloat(watchNewAddress('lng')!) }
                      : undefined
                  }
                  onConfirm={(loc) => {
                    setValueNewAddress('address_1', loc.address_1 || loc.formattedAddress, { shouldValidate: true, shouldDirty: true });
                    if (loc.building) setValueNewAddress('building', loc.building, { shouldValidate: true, shouldDirty: true });
                    setValueNewAddress('city', loc.city || '', { shouldValidate: true, shouldDirty: true });
                    setValueNewAddress('province', loc.province || '', { shouldValidate: true, shouldDirty: true });
                    setValueNewAddress('postal_code', loc.postalCode || '', { shouldValidate: true, shouldDirty: true });
                    setValueNewAddress('lat', String(loc.lat));
                    setValueNewAddress('lng', String(loc.lng));
                    setShowModalMapPicker(false);
                  }}
                  onCancel={() => setShowAddAddress(false)}
                />
              ) : (
                <form
                  className="space-y-4"
                  onSubmit={handleSubmitNewAddress(onSubmitAddressModal)}
                  noValidate
                >
                  {createAddressMutation.error ? (
                    <Alert message={String((createAddressMutation.error as any)?.message ?? 'Failed to save address')} />
                  ) : null}

                  {watchNewAddress('lat') && watchNewAddress('lng') && (
                    <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded-md text-xs sm:text-sm flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="flex-shrink-0">📍</span>
                        <span className="truncate">Map location selected: <strong>{watchNewAddress('address_1')}</strong></span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowModalMapPicker(true)}
                        className="text-[#008755] font-semibold underline hover:text-[#007044] text-xs ml-2 cursor-pointer whitespace-nowrap"
                      >
                        Change Location
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      labelKey="forms:label-first-name"
                      {...registerNewAddress('first_name', {
                        required: 'forms:first-name-required',
                        pattern: {
                          value: /^[a-zA-Z\s\.\u0600-\u06FF\u00C0-\u017F]+$/,
                          message: 'forms:first-name-invalid',
                        },
                      } as any)}
                      errorKey={(newAddressErrors as any)?.first_name?.message}
                      variant="solid"
                    />
                    <Input
                      labelKey="forms:label-last-name"
                      {...registerNewAddress('last_name', {
                        required: 'forms:last-name-required',
                        pattern: {
                          value: /^[a-zA-Z\s\.\u0600-\u06FF\u00C0-\u017F]+$/,
                          message: 'forms:last-name-invalid',
                        },
                      } as any)}
                      errorKey={(newAddressErrors as any)?.last_name?.message}
                      variant="solid"
                    />
                    <Controller
                      name="phone"
                      control={controlNewAddress}
                      rules={{
                        validate: (value) => {
                          if (!value) return true;
                          return isValidPhoneNumber(value) || 'forms:phone-invalid';
                        }
                      }}
                      render={({ field: { onChange, value } }) => (
                        <PhoneInput
                          labelKey="forms:label-phone"
                          value={value}
                          onChange={onChange}
                          errorKey={(newAddressErrors as any)?.phone?.message}
                          variant="solid"
                        />
                      )}
                    />
                    <Input
                      labelKey="forms:label-address"
                      {...registerNewAddress('address_1', { required: 'forms:address-required' } as any)}
                      errorKey={(newAddressErrors as any)?.address_1?.message}
                      variant="solid"
                    />
                    <Input
                      labelKey="text-building-name-number"
                      {...registerNewAddress('building')}
                      placeholderKey="placeholder-building"
                      variant="solid"
                    />
                    <Input
                      labelKey="forms:label-city"
                      {...registerNewAddress('city', { required: 'forms:city-required' } as any)}
                      errorKey={(newAddressErrors as any)?.city?.message}
                      variant="solid"
                    />
                    <div className="flex flex-col space-y-2">
                      <label className="text-heading font-semibold text-sm leading-none cursor-pointer">{t('text-emirate')}</label>
                      <select
                        {...registerNewAddress('province', { required: 'forms:state-required' } as any)}
                        className="form-select py-2 px-4 w-full transition duration-150 ease-in-out border text-input text-13px lg:text-sm font-body rounded-md placeholder-body min-h-12 bg-white border-gray-300 focus:outline-none focus:border-heading h-11 md:h-12"
                      >
                        <option value="">{t('text-select-emirate')}</option>
                        <option value="Abu Dhabi">Abu Dhabi</option>
                        <option value="Dubai">Dubai</option>
                        <option value="Sharjah">Sharjah</option>
                        <option value="Ajman">Ajman</option>
                        <option value="Umm Al Quwain">Umm Al Quwain</option>
                        <option value="Ras Al Khaimah">Ras Al Khaimah</option>
                        <option value="Fujairah">Fujairah</option>
                      </select>
                      {(newAddressErrors as any)?.province && (
                        <p className="my-2 text-13px text-brandRed">{(newAddressErrors as any).province.message}</p>
                      )}
                    </div>
                    <Input
                      labelKey="forms:label-postcode"
                      inputMode="numeric"
                      {...registerNewAddress('postal_code', {
                        required: 'forms:postcode-required',
                        pattern: { value: POSTAL_ONLY_REGEX, message: 'forms:postcode-invalid' },
                      } as any)}
                      errorKey={(newAddressErrors as any)?.postal_code?.message}
                      variant="solid"
                    />
                    <Input
                      labelKey="text-landmark"
                      {...registerNewAddress('landmark')}
                      placeholderKey="placeholder-landmark"
                      variant="solid"
                    />
                  </div>
                  <input type="hidden" value="ae" {...registerNewAddress("country_code")} />
                  <input type="hidden" {...registerNewAddress("lat")} />
                  <input type="hidden" {...registerNewAddress("lng")} />
                  <input type="hidden" {...registerNewAddress("apartment")} />
                  <input type="hidden" {...registerNewAddress("floor")} />

                  <div className="mt-6 pb-2">
                    <div className="mb-3">
                      <h4 className="text-sm md:text-base font-bold text-heading font-body leading-none">{t('text-address-type')}</h4>
                      <p className="text-xs text-body mt-1 leading-none">{t('text-choose-address-label')}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <label className="cursor-pointer">
                        <input type="radio" value="Home" {...registerNewAddress("address_type")} className="sr-only" />
                        <div className={`flex items-center justify-between px-4 py-3 border rounded-md transition ${selectedAddressType === 'Home' ? 'border-[#008755] bg-[#F4F9F6]' : 'border-gray-200 bg-white'}`}>
                          <div className="flex items-center gap-3">
                            <IoHomeOutline className={`w-5 h-5 ${selectedAddressType === 'Home' ? 'text-[#008755]' : 'text-gray-400'}`} />
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-heading">{t('text-home-label')}</span>
                              <span className="text-[10px] text-gray-500 mt-0.5">{t('text-home-desc')}</span>
                            </div>
                          </div>
                          <div className={`w-4 h-4 rounded-full border transition-all ${selectedAddressType === 'Home' ? 'border-[#008755] border-[4px] bg-white' : 'border-gray-300 bg-white'}`}></div>
                        </div>
                      </label>
                      <label className="cursor-pointer">
                        <input type="radio" value="Office" {...registerNewAddress("address_type")} className="sr-only" />
                        <div className={`flex items-center justify-between px-4 py-3 border rounded-md transition ${selectedAddressType === 'Office' ? 'border-[#008755] bg-[#F4F9F6]' : 'border-gray-200 bg-white'}`}>
                          <div className="flex items-center gap-3">
                            <IoBriefcaseOutline className={`w-5 h-5 ${selectedAddressType === 'Office' ? 'text-[#008755]' : 'text-gray-400'}`} />
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-heading">{t('text-office-label')}</span>
                              <span className="text-[10px] text-gray-500 mt-0.5">{t('text-office-desc')}</span>
                            </div>
                          </div>
                          <div className={`w-4 h-4 rounded-full border transition-all ${selectedAddressType === 'Office' ? 'border-[#008755] border-[4px] bg-white' : 'border-gray-300 bg-white'}`}></div>
                        </div>
                      </label>
                      <label className="cursor-pointer">
                        <input type="radio" value="Other" {...registerNewAddress("address_type")} className="sr-only" />
                        <div className={`flex items-center justify-between px-4 py-3 border rounded-md transition ${selectedAddressType === 'Other' ? 'border-[#008755] bg-[#F4F9F6]' : 'border-gray-200 bg-white'}`}>
                          <div className="flex items-center gap-3">
                            <IoPencilOutline className={`w-5 h-5 ${selectedAddressType === 'Other' ? 'text-[#008755]' : 'text-gray-400'}`} />
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-heading">{t('text-other-label')}</span>
                              <span className="text-[10px] text-gray-500 mt-0.5">{t('text-other-desc')}</span>
                            </div>
                          </div>
                          <div className={`w-4 h-4 rounded-full border transition-all ${selectedAddressType === 'Other' ? 'border-[#008755] border-[4px] bg-white' : 'border-gray-300 bg-white'}`}></div>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6 border-t border-gray-100 pt-4">
                    <Button
                      type="submit"
                      className="h-11 px-6 bg-[#005844] hover:bg-[#008755] text-white font-semibold font-body rounded transition duration-150 flex items-center gap-2 cursor-pointer text-xs md:text-sm uppercase tracking-wide"
                      loading={createAddressMutation.isPending || updateAddressMutation.isPending}
                      disabled={createAddressMutation.isPending || updateAddressMutation.isPending}
                    >
                      <IoSaveOutline className="text-base" />
                      <span>{t('text-save-address')}</span>
                    </Button>
                    <button
                      type="button"
                      onClick={() => { setShowAddAddress(false); setEditingAddressId(null); }}
                      className="h-11 px-6 bg-white border border-gray-200 text-[#005844] hover:bg-gray-50 hover:border-[#008755] font-semibold font-body rounded transition duration-150 flex items-center justify-center gap-2 cursor-pointer text-xs md:text-sm uppercase tracking-wide"
                    >
                      <IoCloseOutline className="text-lg" />
                      <span>{t('text-cancel')}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* Address cards list */
            <div className="space-y-3">
              {addresses.length ? (
                addresses.map((a: any) => {
                  const id = String(a?.id ?? '');
                  const name = `${String(a?.first_name ?? '').trim()} ${String(a?.last_name ?? '').trim()}`.trim();
                  const cc = String(a?.country_code ?? '').toUpperCase();
                  const displayAddress2 = formatAddress2ForDisplay(a?.address_2);
                  const line = [a?.address_1, displayAddress2, a?.city, a?.province, a?.postal_code, cc]
                    .map((x) => String(x ?? '').trim())
                    .filter(Boolean)
                    .join(', ');
                  const checked = selectedAddressId === id;
                  return (
                    <div
                      key={id || line}
                      onClick={() => {
                        setSelectedAddressId(id);
                        setSelectedAddress(a);
                        applyAddressToForm(a);
                      }}
                      className={`border rounded-xl p-5 cursor-pointer transition ${
                        checked ? 'border-[#008755] bg-white shadow-sm' : 'border-gray-200 bg-white hover:bg-gray-50/20'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          {/* Radio circle */}
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 transition ${
                            checked ? 'border-[#008755] bg-[#008755]' : 'border-gray-300'
                          }`}>
                            {checked && (
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          {/* Content */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-[10px] bg-[#E8F5E9] text-[#008755] px-2 py-1 rounded md:rounded-md font-bold uppercase tracking-wide border border-[#008755]/20 flex items-center gap-1 w-fit">
                                {(a?.company || '').toLowerCase() === 'office' ? (
                                  <IoBriefcaseOutline className="text-xs" />
                                ) : (
                                  <IoHomeOutline className="text-xs" />
                                )}
                                {a?.company || t('text-home-label')}
                              </span>
                              {a?.is_default_shipping && (
                                <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded font-semibold flex items-center gap-1">
                                  <IoHomeOutline className="text-xs" /> {t('text-default-address')}
                                </span>
                              )}
                            </div>
                            <h4 className="text-sm font-bold text-heading font-body">{name || t('text-delivery-address')}</h4>
                            <div className="flex items-start gap-1.5 mt-1.5">
                              <IoLocationOutline className="text-sm text-gray-400 mt-0.5 flex-shrink-0" />
                              <span className="text-xs text-black font-medium leading-relaxed">{line || '-'}</span>
                            </div>
                            {a?.phone && (
                              <div className="flex items-center gap-1.5 mt-1.5">
                                <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                <span className="text-xs text-black font-medium">{String(a.phone)}</span>
                              </div>
                            )}
                          </div>
                        </div>
 
                        {/* Top-Right Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                          <button
                            type="button"
                            className="flex items-center gap-1 text-xs font-semibold text-[#005844] hover:text-[#008755] transition font-body"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setEditingAddressId(id);
                              const parsedExtra = parseAddress2(a?.address_2 ?? '');
                              resetNewAddress({
                                first_name: a?.first_name ?? '',
                                last_name: a?.last_name ?? '',
                                address_1: a?.address_1 ?? '',
                                city: a?.city ?? '',
                                province: a?.province ?? '',
                                postal_code: a?.postal_code ?? '',
                                country_code: a?.country_code ?? 'ae',
                                phone: a?.phone ?? '',
                                address_type: a?.company ?? 'Home',
                                apartment: parsedExtra.apartment ?? '',
                                building: parsedExtra.building ?? '',
                                floor: parsedExtra.floor ?? '',
                                landmark: parsedExtra.landmark ?? '',
                                lat: parsedExtra.lat ?? '',
                                lng: parsedExtra.lng ?? '',
                              });
                              setShowModalMapPicker(false);
                              setShowAddAddress(true);
                            }}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                            {t('text-edit-address')}
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            type="button"
                            className="flex items-center gap-1 text-xs font-semibold text-rose-500 hover:text-rose-700 transition font-body"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (!id) return;
                              if (typeof window !== 'undefined' && !window.confirm(t('text-delete-address-confirm') || 'Delete this address?')) return;
                              deleteAddressMutation.mutate(id);
                            }}
                            disabled={deleteAddressMutation.isPending}
                          >
                            <IoTrashOutline className="text-sm" />
                            {t('text-delete')}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-sm text-body py-4 text-center">{t('text-no-addresses')}</div>
              )}


              {/* Billing address same as shipping address checkbox */}
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="billing-same-as-shipping-auth"
                  className="form-checkbox text-[#008755] focus:ring-[#008755] h-4.5 w-4.5 rounded border-gray-300 transition duration-150 cursor-pointer"
                  checked={billingSameAsShipping}
                  onChange={(e) => setBillingSameAsShipping(e.target.checked)}
                />
                <label htmlFor="billing-same-as-shipping-auth" className="text-sm font-semibold text-heading cursor-pointer select-none">
                  {t('text-billing-same-as-shipping', 'Billing address same as shipping address')}
                </label>
              </div>

              {/* Billing Address Section */}
              {!billingSameAsShipping && (
                <div className="mt-6 pt-6 border-t border-gray-150 space-y-4">
                  <h3 className="text-sm font-bold text-[#005844] uppercase tracking-wider font-body">{t('text-billing-address', 'Billing Address')}</h3>
                  {showBillingMapPicker ? (
                    <div className="pt-2">
                      <GoogleMapPicker
                        initialLocation={
                          watch('billing_lat') && watch('billing_lng')
                            ? { lat: parseFloat(watch('billing_lat')!), lng: parseFloat(watch('billing_lng')!) }
                            : undefined
                        }
                        onConfirm={(loc) => {
                          setValue('billing_address_1', loc.address_1 || loc.formattedAddress, { shouldValidate: true, shouldDirty: true });
                          if (loc.city) setValue('billing_city', loc.city, { shouldValidate: true, shouldDirty: true });
                          if (loc.province) setValue('billing_state', loc.province, { shouldValidate: true, shouldDirty: true });
                          if (loc.postalCode) setValue('billing_zipCode', loc.postalCode, { shouldValidate: true, shouldDirty: true });
                          if (loc.lat) setValue('billing_lat', String(loc.lat));
                          if (loc.lng) setValue('billing_lng', String(loc.lng));
                          setShowBillingMapPicker(false);
                        }}
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {watch('billing_lat') && watch('billing_lng') && (
                        <div className="col-span-full p-3 bg-green-50 border border-green-200 text-green-800 rounded-md text-xs sm:text-sm flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="flex-shrink-0">📍</span>
                            <span className="truncate">Map location selected: <strong>{watch('billing_address_1')}</strong></span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowBillingMapPicker(true)}
                            className="text-[#008755] font-semibold underline hover:text-[#007044] text-xs ml-2 cursor-pointer whitespace-nowrap"
                          >
                            Change Location
                          </button>
                        </div>
                      )}

                      <Input
                        labelKey={t('text-first-name')}
                        {...register('billing_firstName', {
                          required: t('error-first-name-required'),
                          pattern: {
                            value: /^[a-zA-Z\s\.\u0600-\u06FF\u00C0-\u017F]+$/,
                            message: t('error-first-name-invalid'),
                          },
                        })}
                        errorKey={errors.billing_firstName?.message}
                        variant="solid"
                      />
                      <Input
                        labelKey={t('text-last-name')}
                        {...register('billing_lastName', {
                          required: t('error-last-name-required'),
                          pattern: {
                            value: /^[a-zA-Z\s\.\u0600-\u06FF\u00C0-\u017F]+$/,
                            message: t('error-last-name-invalid'),
                          },
                        })}
                        errorKey={errors.billing_lastName?.message}
                        variant="solid"
                      />
                      <Controller
                        name="billing_phone"
                        control={control}
                        rules={{
                          required: t('error-phone-required'),
                          validate: (value) => {
                            if (!value) return t('error-phone-required');
                            return isValidPhoneNumber(value) || t('error-phone-invalid');
                          }
                        }}
                        render={({ field: { onChange, value } }) => (
                          <PhoneInput
                            labelKey="text-phone-number"
                            value={value}
                            onChange={onChange}
                            errorKey={errors.billing_phone?.message}
                            variant="solid"
                          />
                        )}
                      />
                      <Input
                        labelKey={t('text-address-line-1')}
                        {...register('billing_address_1', { required: t('error-address-required') })}
                        errorKey={errors.billing_address_1?.message}
                        variant="solid"
                      />
                      <Input
                        labelKey={t('text-city')}
                        {...register('billing_city', { required: t('error-city-required') })}
                        errorKey={errors.billing_city?.message}
                        variant="solid"
                      />
                      <div className="flex flex-col space-y-2">
                        <label className="text-heading font-semibold text-sm leading-none cursor-pointer">{t('text-emirate')}</label>
                        <select
                          {...register('billing_state', { required: t('error-emirate-required') })}
                          className="form-select py-2 px-4 w-full transition duration-150 ease-in-out border text-input text-13px lg:text-sm font-body rounded-md placeholder-body min-h-12 bg-white border-gray-300 focus:outline-none focus:border-heading h-11 md:h-12"
                        >
                          <option value="">{t('text-select-emirate')}</option>
                          <option value="Abu Dhabi">Abu Dhabi</option>
                          <option value="Dubai">Dubai</option>
                          <option value="Sharjah">Sharjah</option>
                          <option value="Ajman">Ajman</option>
                          <option value="Umm Al Quwain">Umm Al Quwain</option>
                          <option value="Ras Al Khaimah">Ras Al Khaimah</option>
                          <option value="Fujairah">Fujairah</option>
                        </select>
                        {errors.billing_state && (
                          <p className="my-2 text-13px text-brandRed">{errors.billing_state.message}</p>
                        )}
                      </div>
                      <Input
                        labelKey={t('text-postal-code')}
                        inputMode="numeric"
                        {...register('billing_zipCode', {
                          required: t('error-postal-code-required'),
                          pattern: { value: POSTAL_ONLY_REGEX, message: t('error-postal-code-invalid') },
                        })}
                        errorKey={errors.billing_zipCode?.message}
                        variant="solid"
                      />
                      <input type="hidden" {...register('billing_lat')} />
                      <input type="hidden" {...register('billing_lng')} />
                    </div>
                  )}
                </div>
              )}

              {/* Continue to Payment Button */}
              {!( !billingSameAsShipping && showBillingMapPicker ) && (
                <button
                  type="button"
                  onClick={async () => {
                    if (!selectedAddressId) return;
                    if (!billingSameAsShipping) {
                      const isValidBilling = await trigger([
                        'billing_firstName',
                        'billing_lastName',
                        'billing_phone',
                        'billing_address_1',
                        'billing_city',
                        'billing_state',
                        'billing_zipCode',
                      ]);
                      if (!isValidBilling) return;
                    }
                    setActiveStep(3);
                  }}
                  disabled={!selectedAddressId}
                  className="w-full h-12 bg-[#005844] hover:bg-[#008755] text-white font-bold text-sm rounded-lg transition duration-200 flex items-center justify-center gap-2 font-body mt-3 disabled:opacity-50 tracking-wider uppercase"
                >
                  <span>{t('text-continue-to-payment')}</span>
                  <span className="text-lg font-normal mb-0.5 inline-block transform rtl:rotate-180">→</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}


      {/* STEP 3: SELECT PAYMENT METHOD */}
      {activeStep === 3 && (
        <div className="flex flex-col gap-3">
          {/* Heading */}
          <h2 className="text-sm md:text-base font-bold text-[#005844] uppercase tracking-wider font-body mb-2">
            {t('text-select-payment-method')}
          </h2>

          <form
            id="checkout-shipping-form"
            onSubmit={handleSubmit(onSubmit)}
            className="w-full flex flex-col gap-3.5"
            noValidate
          >
            {formError ? <Alert message={formError} /> : null}

            {/* Hidden controls representing the saved shipping parameters */}
            <div className="hidden">
              <input type="hidden" {...register('firstName')} />
              <input type="hidden" {...register('lastName')} />
              <input type="hidden" {...register('phone')} />
              <input type="hidden" {...register('email')} />
              <input type="hidden" {...register('city')} />
              <input type="hidden" {...register('state')} />
              <input type="hidden" {...register('zipCode')} />
            </div>

            {/* Cash on Delivery Card */}
            <div
              onClick={() => setSelectedPaymentProvider('pp_system_default')}
              className={`border rounded-lg p-4 cursor-pointer flex flex-col gap-3 transition bg-white ${
                selectedPaymentProvider === 'pp_system_default'
                  ? 'border-[#008755]'
                  : 'border-gray-200 hover:bg-gray-50/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-[#E8F5E9] flex items-center justify-center flex-shrink-0">
                    {/* Hand with banknote icon */}
                    <svg
                      className="w-5 h-5 text-[#008755]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <rect x="7" y="6" width="14" height="8" rx="1.5" strokeWidth="1.5" />
                      <circle cx="14" cy="10" r="1.8" strokeWidth="1.5" />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        d="M3 12h3.5l2.5 3h7.5c.8 0 1.5-.7 1.5-1.5v-.5M3 12v3.5A1.5 1.5 0 004.5 17h2.5"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xs md:text-sm font-semibold text-heading font-body">
                      {t('text-cash-on-delivery')}
                    </h3>
                    <p className="text-[11px] md:text-xs text-black font-body mt-0.5">
                      {t('text-cod-desc')}
                    </p>
                  </div>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition ${
                    selectedPaymentProvider === 'pp_system_default'
                      ? 'border-[#008755]'
                      : 'border-gray-300'
                  }`}
                >
                  {selectedPaymentProvider === 'pp_system_default' && (
                    <div className="w-2 h-2 rounded-full bg-[#008755]" />
                  )}
                </div>
              </div>
            </div>

            {/* Pay Now Card */}
            <div
              onClick={() => setSelectedPaymentProvider('pp_ngenius_ngenius')}
              className={`border rounded-lg p-4 cursor-pointer flex flex-col gap-3 transition bg-white ${
                selectedPaymentProvider === 'pp_ngenius_ngenius'
                  ? 'border-[#008755]'
                  : 'border-gray-200 hover:bg-gray-50/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-[#E8F5E9] flex items-center justify-center flex-shrink-0">
                    {/* Card icon with lock */}
                    <svg
                      className="w-5 h-5 text-[#008755]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <rect x="3" y="5" width="18" height="13" rx="2" strokeWidth="1.5" />
                      <path d="M3 9h18" strokeWidth="1.5" />
                      <rect x="13" y="12" width="6" height="5" rx="1" strokeWidth="1.5" />
                      <path d="M15 12V10a1 1 0 012 0v2" strokeWidth="1.5" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xs md:text-sm font-semibold text-heading font-body">
                      {t('text-pay-online')}
                    </h3>
                    <p className="text-[11px] md:text-xs text-black font-body mt-0.5">
                      {t('text-pay-online-desc')}
                    </p>
                  </div>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition ${
                    selectedPaymentProvider === 'pp_ngenius_ngenius'
                      ? 'border-[#008755]'
                      : 'border-gray-300'
                  }`}
                >
                  {selectedPaymentProvider === 'pp_ngenius_ngenius' && (
                    <div className="w-2 h-2 rounded-full bg-[#008755]" />
                  )}
                </div>
              </div>
            </div>

            {/* CTA Button and Disclaimer */}
            <div className="pt-3 flex flex-col gap-3">
              <Button
                type="submit"
                className="w-full h-12 flex items-center justify-center gap-2 font-bold uppercase tracking-wider text-xs md:text-sm font-body bg-[#005844] hover:bg-[#008755] text-white rounded transition duration-200"
                loading={submitting}
                disabled={submitting || isEmpty}
              >
                <span>
                  {selectedPaymentProvider === 'pp_system_default'
                    ? t('text-place-order')
                    : t('text-pay-now')}
                </span>
                <svg className="w-5 h-5 ml-1 transform rtl:rotate-180" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default CheckoutForm;

