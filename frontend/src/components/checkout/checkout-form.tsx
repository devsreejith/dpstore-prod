import Input from '@components/ui/input';
import TextArea from '@components/ui/text-area';
import Button from '@components/ui/button';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useCart } from '@contexts/cart/cart.context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import http from '@framework/utils/http';
import { useUI } from '@contexts/ui.context';
import Alert from '@components/ui/alert';
import { ROUTES } from '@utils/routes';
import { useRouter } from 'next/router';
import { IoTrashOutline, IoHomeOutline, IoBriefcaseOutline, IoPricetagOutline } from 'react-icons/io5';
import { formatPrice } from '@framework/product/use-price';

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
  const queryClient = useQueryClient();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [shippingOptionId, setShippingOptionId] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [selectedPaymentProvider, setSelectedPaymentProvider] = useState<'pp_system_default' | 'pp_ngenius_ngenius'>('pp_ngenius_ngenius');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CheckoutInputType>();

  const {
    register: registerNewAddress,
    handleSubmit: handleSubmitNewAddress,
    reset: resetNewAddress,
    watch: watchNewAddress,
    formState: { errors: newAddressErrors },
  } = useForm<AddressInput>({
    defaultValues: { country_code: 'ae', address_type: 'Home' },
  });

  const selectedAddressType = watchNewAddress('address_type') ?? 'Home';

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
      resetNewAddress({ country_code: 'ae', address_type: 'Home' } as any);
      setShowAddAddress(false);
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
        const email = String(input.email || customerQuery.data?.email || '').trim();
        const phone = String(input.phone || selectedAddress?.phone || customerQuery.data?.phone || '987654321').trim();
        if (!email) {
          throw new Error('Email address is required for checkout.');
        }
        const deliveryInstructions = String(input.note ?? '').trim();
        const shipping_address = {
          first_name: String(input.firstName || selectedAddress?.first_name || 'N/A').trim(),
          last_name: String(input.lastName || selectedAddress?.last_name || 'N/A').trim(),
          address_1: selectedAddress?.address_1 || 'N/A',
          address_2: deliveryInstructions || undefined,
          city: String(input.city || selectedAddress?.city || 'N/A').trim(),
          province: String(input.state || selectedAddress?.province || 'N/A').trim(),
          postal_code: String(input.zipCode || selectedAddress?.postal_code || '00000').trim(),
          phone: phone,
          country_code: 'ae',
        };
        const result = await placeOrder({
          email,
          shipping_address,
          billing_address: shipping_address,
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
    const city = String(a?.city ?? '').trim();
    const state = String(a?.province ?? '').trim();
    const zip = String(a?.postal_code ?? '').trim();
    if (first) setValue('firstName', first);
    if (last) setValue('lastName', last);
    if (phone) setValue('phone', phone);
    if (city) setValue('city', city);
    if (state) setValue('state', state);
    if (zip) setValue('zipCode', zip);
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
          <div className="flex items-center justify-between pb-2">
            <h2 className="text-sm md:text-base font-bold text-[#008755] uppercase tracking-wider font-body">
              {showAddAddress ? "ADD NEW ADDRESS" : "DELIVERY ADDRESS"}
            </h2>
            <button
              type="button"
              onClick={() => setShowAddAddress(!showAddAddress)}
              className="text-xs md:text-sm font-bold text-[#008755] hover:underline transition font-body"
            >
              {showAddAddress ? "← Back to address list" : "+ Add new address"}
            </button>
          </div>

          {showAddAddress ? (
            /* Form container */
            <div className="border border-gray-200 rounded-md p-5 bg-white shadow-sm">
              <form
                className="space-y-4"
                onSubmit={handleSubmitNewAddress((input) => createAddressMutation.mutate(input))}
                noValidate
              >
                {createAddressMutation.error ? (
                  <Alert message={String((createAddressMutation.error as any)?.message ?? 'Failed to save address')} />
                ) : null}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    labelKey="forms:label-first-name"
                    {...registerNewAddress('first_name', { required: 'forms:first-name-required' } as any)}
                    errorKey={(newAddressErrors as any)?.first_name?.message}
                    variant="solid"
                  />
                  <Input
                    labelKey="forms:label-last-name"
                    {...registerNewAddress('last_name', { required: 'forms:last-name-required' } as any)}
                    errorKey={(newAddressErrors as any)?.last_name?.message}
                    variant="solid"
                  />
                  <Input
                    labelKey="forms:label-phone"
                    inputMode="numeric"
                    {...registerNewAddress('phone', {
                      pattern: { value: PHONE_ONLY_REGEX, message: 'forms:phone-invalid' },
                    } as any)}
                    errorKey={(newAddressErrors as any)?.phone?.message}
                    variant="solid"
                  />
                  <Input
                    labelKey="forms:label-address"
                    {...registerNewAddress('address_1', { required: 'forms:address-required' } as any)}
                    errorKey={(newAddressErrors as any)?.address_1?.message}
                    variant="solid"
                  />
                  <Input
                    labelKey="Address Line 2"
                    {...registerNewAddress('address_2')}
                    errorKey={(newAddressErrors as any)?.address_2?.message}
                    variant="solid"
                  />
                  <Input
                    labelKey="forms:label-city"
                    {...registerNewAddress('city', { required: 'forms:city-required' } as any)}
                    errorKey={(newAddressErrors as any)?.city?.message}
                    variant="solid"
                  />
                  <div className="flex flex-col space-y-2">
                    <label className="text-heading font-semibold text-sm leading-none cursor-pointer">Emirate *</label>
                    <select
                      {...registerNewAddress('province', { required: 'forms:state-required' } as any)}
                      className="form-select py-2 px-4 w-full transition duration-150 ease-in-out border text-input text-13px lg:text-sm font-body rounded-md placeholder-body min-h-12 bg-white border-gray-300 focus:outline-none focus:border-heading h-11 md:h-12"
                    >
                      <option value="">Select Emirate</option>
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
                </div>

                <div className="mt-4 pb-2">
                  <label className="block text-sm font-bold text-heading font-body mb-1">Address Type</label>
                  <p className="text-sm text-body mb-3">Choose a label for this address</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className="cursor-pointer">
                      <input type="radio" value="Home" {...registerNewAddress("address_type")} className="sr-only" />
                      <div className={`flex items-center justify-between px-4 py-3 border rounded-md transition ${selectedAddressType === 'Home' ? 'border-[#008755] bg-[#F4F9F6]' : 'border-gray-200 bg-white'}`}>
                        <div className="flex items-center gap-3">
                          <IoHomeOutline className={`w-5 h-5 ${selectedAddressType === 'Home' ? 'text-[#008755]' : 'text-gray-500'}`} />
                          <span className="text-sm font-medium text-heading">Home</span>
                        </div>
                        <div className={`w-4 h-4 rounded-full border transition-all ${selectedAddressType === 'Home' ? 'border-[#008755] border-[4px] bg-white' : 'border-gray-300 bg-white'}`}></div>
                      </div>
                    </label>
                    <label className="cursor-pointer">
                      <input type="radio" value="Office" {...registerNewAddress("address_type")} className="sr-only" />
                      <div className={`flex items-center justify-between px-4 py-3 border rounded-md transition ${selectedAddressType === 'Office' ? 'border-[#008755] bg-[#F4F9F6]' : 'border-gray-200 bg-white'}`}>
                        <div className="flex items-center gap-3">
                          <IoBriefcaseOutline className={`w-5 h-5 ${selectedAddressType === 'Office' ? 'text-[#008755]' : 'text-gray-500'}`} />
                          <span className="text-sm font-medium text-heading">Office</span>
                        </div>
                        <div className={`w-4 h-4 rounded-full border transition-all ${selectedAddressType === 'Office' ? 'border-[#008755] border-[4px] bg-white' : 'border-gray-300 bg-white'}`}></div>
                      </div>
                    </label>
                    <label className="cursor-pointer">
                      <input type="radio" value="Other" {...registerNewAddress("address_type")} className="sr-only" />
                      <div className={`flex items-center justify-between px-4 py-3 border rounded-md transition ${selectedAddressType === 'Other' ? 'border-[#008755] bg-[#F4F9F6]' : 'border-gray-200 bg-white'}`}>
                        <div className="flex items-center gap-3">
                          <IoPricetagOutline className={`w-5 h-5 ${selectedAddressType === 'Other' ? 'text-[#008755]' : 'text-gray-500'}`} />
                          <span className="text-sm font-medium text-heading">Other</span>
                        </div>
                        <div className={`w-4 h-4 rounded-full border transition-all ${selectedAddressType === 'Other' ? 'border-[#008755] border-[4px] bg-white' : 'border-gray-300 bg-white'}`}></div>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="submit"
                    className="h-11 px-6 font-bold font-body text-xs uppercase"
                    loading={createAddressMutation.isPending}
                    disabled={createAddressMutation.isPending}
                  >
                    Save
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setShowAddAddress(false)}
                    className="h-11 px-6 bg-[#000000] hover:bg-gray-800 text-white font-semibold font-body rounded transition duration-150 text-xs uppercase"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            /* Address cards list */
            <div className="space-y-3">
              {addresses.length ? (
                addresses.map((a: any) => {
                  const id = String(a?.id ?? '');
                  const name = `${String(a?.first_name ?? '').trim()} ${String(a?.last_name ?? '').trim()}`.trim();
                  const cc = String(a?.country_code ?? '').toUpperCase();
                  const line = [a?.address_1, a?.address_2, a?.city, a?.province, a?.postal_code, cc]
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
                      className={`border rounded-lg p-5 cursor-pointer flex flex-col gap-4 relative transition ${
                        checked ? 'border-[#008755] bg-white shadow-sm' : 'border-gray-200 bg-white hover:bg-gray-50/20'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition ${
                          checked ? 'border-[#008755]' : 'border-gray-300'
                        }`}>
                          {checked && <div className="w-2.5 h-2.5 rounded-full bg-[#008755]" />}
                        </div>
                        <div className="min-w-0 flex-1 pr-8">
                          <div className="text-sm text-heading font-bold flex items-center gap-2 font-body">
                            <span>{name || 'Address'}</span>
                            <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide">
                              {a?.company || 'Saved'}
                            </span>
                          </div>
                          <div className="mt-1.5 text-xs md:text-sm text-gray-600 leading-relaxed font-body">{line || '-'}</div>
                          {a?.phone && <div className="mt-1.5 text-xs md:text-sm text-gray-600 font-normal font-body">{String(a.phone)}</div>}
                        </div>
                      </div>

                      {/* Delete inline button */}
                      <button
                        type="button"
                        className="absolute top-4 right-4 p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (!id) return;
                          if (typeof window !== 'undefined' && !window.confirm('Delete this address?')) return;
                          deleteAddressMutation.mutate(id);
                        }}
                        disabled={deleteAddressMutation.isPending}
                        aria-label="Delete address"
                      >
                        <IoTrashOutline className="text-lg" />
                      </button>

                      {/* Deliver Here Inline Action */}
                      {checked && (
                        <div className="pt-2 flex justify-start">
                          <button
                            type="button"
                            className="h-10 px-6 font-bold uppercase tracking-wider text-xs font-body bg-[#005844] hover:bg-[#008755] text-white rounded transition duration-200"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveStep(3);
                            }}
                          >
                            Deliver Here
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-sm text-body py-4 text-center">No saved addresses yet. Click "+ Add new address" to create one.</div>
              )}
            </div>
          )}
        </div>
      )}


      {/* STEP 3: SELECT PAYMENT METHOD */}
      {/* STEP 3: SELECT PAYMENT METHOD */}
      {activeStep === 3 && (
        <div className="flex flex-col gap-3">
          {/* Back button */}
          <button
            type="button"
            onClick={() => setActiveStep(2)}
            className="flex items-center gap-1.5 text-xs font-bold text-heading hover:opacity-80 transition font-body self-start"
          >
            <span className="text-sm">←</span> Back
          </button>

          {/* Heading */}
          <h2 className="text-sm md:text-base font-bold text-[#008755] uppercase tracking-wider font-body mt-1">
            Select Payment Method
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
                      Cash on Delivery
                    </h3>
                    <p className="text-[11px] md:text-xs text-gray-400 font-body mt-0.5">
                      Pay in cash when you receive your order.
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
                  <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                    {/* Card icon with lock */}
                    <svg
                      className="w-5 h-5 text-gray-600"
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
                      Pay Now
                    </h3>
                    <p className="text-[11px] md:text-xs text-gray-400 font-body mt-0.5">
                      Pay securely using your card or other available methods.
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
            <div className="pt-3 flex flex-col gap-2.5">
              <Button
                type="submit"
                className="w-full h-10 font-bold uppercase tracking-wider text-xs font-body bg-[#005844] hover:bg-[#008755] text-white rounded transition duration-200"
                loading={submitting}
                disabled={submitting || isEmpty}
              >
                {selectedPaymentProvider === 'pp_system_default'
                  ? 'Place Order'
                  : 'Continue to Payment'}
              </Button>
              <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-400 font-body">
                <svg
                  className="w-3.5 h-3.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Your payment information is secure and encrypted.</span>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default CheckoutForm;

