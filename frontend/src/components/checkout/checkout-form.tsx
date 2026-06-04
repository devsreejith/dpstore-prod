import Input from '@components/ui/input';
import TextArea from '@components/ui/text-area';
import Button from '@components/ui/button';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useCart } from '@contexts/cart/cart.context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import http from '@framework/utils/http';
import { useUI } from '@contexts/ui.context';
import Alert from '@components/ui/alert';
import { ROUTES } from '@utils/routes';
import { useRouter } from 'next/router';
import { IoTrashOutline } from 'react-icons/io5';
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
};

const PHONE_ONLY_REGEX = /^[0-9]{6,15}$/;
const POSTAL_ONLY_REGEX = /^[0-9]{3,10}$/;

const CheckoutForm: React.FC = () => {
  const { placeOrder, isEmpty, cartId, items } = useCart();
  const { isAuthorized } = useUI();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [shippingOptionId, setShippingOptionId] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(2);

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
    formState: { errors: newAddressErrors },
  } = useForm<AddressInput>({
    defaultValues: { country_code: 'ae' },
  });

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
      resetNewAddress({ country_code: 'ae' } as any);
      setShowAddAddress(false);
      await queryClient.invalidateQueries({ queryKey: ['store.customer.addresses.checkout'] });
      // Transition to Step 3 after saving new address
      setActiveStep(3);
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
        const deliveryInstructions = String(input.note ?? '').trim();
        const shipping_address = {
          first_name: input.firstName,
          last_name: input.lastName,
          address_1: selectedAddress?.address_1 || 'N/A',
          address_2: deliveryInstructions || undefined,
          city: input.city || undefined,
          province: input.state || undefined,
          postal_code: input.zipCode || undefined,
          phone: input.phone,
          country_code: 'ae',
        };
        const result = await placeOrder({
          email: input.email,
          shipping_address,
          billing_address: shipping_address,
          shipping_option_id: shippingOptionId || undefined,
        });
        if (result?.type === 'order' && result?.order?.id) {
          router.push(`/my-account/orders/${result.order.id}`);
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

  useEffect(() => {
    if (showAddAddress) return;
    const defaultAddress =
      addresses.find((a: any) => a?.is_default_shipping) ||
      addresses?.[0] ||
      null;
    if (!defaultAddress) return;
    const defaultId = String(defaultAddress.id || '');
    if (!defaultId) return;
    setSelectedAddressId((prev) => {
      if (prev) return prev;
      setSelectedAddress(defaultAddress);
      applyAddressToForm(defaultAddress);
      return defaultId;
    });
  }, [addresses, showAddAddress]);

  const applyAddressToForm = (a: any) => {
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
  };

  return (
    <div className="flex flex-col gap-4">
      {/* STEP 1: LOGIN */}
      <div className="border border-gray-200 rounded-md overflow-hidden bg-white shadow-sm">
        <div className="flex items-center justify-between bg-gray-50 px-5 py-4 border-b border-gray-150">
          <div className="flex items-center gap-3">
            <span className="bg-gray-200 text-gray-700 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs">
              1
            </span>
            <h3 className="font-bold text-sm md:text-base text-gray-500 uppercase tracking-wider">
              LOGIN
            </h3>
            {activeStep > 1 && (
              <span className="text-emerald-600 font-bold text-xs flex items-center gap-1">
                ✓
              </span>
            )}
          </div>
          {activeStep > 1 && (
            <button
              type="button"
              onClick={() => setActiveStep(1)}
              className="text-xs font-bold text-[#C7844B] uppercase hover:underline"
            >
              Change
            </button>
          )}
        </div>
        {activeStep === 1 ? (
          <div className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="text-sm font-semibold text-heading font-body">
                {customerQuery.data?.first_name} {customerQuery.data?.last_name}
              </div>
              <div className="text-xs text-gray-500 mt-1 font-body">{customerQuery.data?.email}</div>
            </div>
            <Button
              type="button"
              className="h-10 px-5 text-xs font-bold font-body"
              onClick={() => setActiveStep(2)}
            >
              Continue Checkout
            </Button>
          </div>
        ) : (
          <div className="px-5 py-3 text-xs md:text-sm font-semibold text-heading flex gap-6">
            <span>
              {customerQuery.data?.first_name} {customerQuery.data?.last_name}
            </span>
            <span className="text-gray-400 font-normal">{customerQuery.data?.email}</span>
          </div>
        )}
      </div>

      {/* STEP 2: DELIVERY ADDRESS */}
      <div className="border border-gray-200 rounded-md overflow-hidden bg-white shadow-sm">
        <div className="flex items-center justify-between bg-gray-50 px-5 py-4 border-b border-gray-150">
          <div className="flex items-center gap-3">
            <span className="bg-gray-200 text-gray-700 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs">
              2
            </span>
            <h3 className="font-bold text-sm md:text-base text-gray-500 uppercase tracking-wider">
              DELIVERY ADDRESS
            </h3>
            {activeStep > 2 && (
              <span className="text-emerald-600 font-bold text-xs flex items-center gap-1">
                ✓
              </span>
            )}
          </div>
          {activeStep > 2 && (
            <button
              type="button"
              onClick={() => setActiveStep(2)}
              className="text-xs font-bold text-[#C7844B] uppercase hover:underline"
            >
              Change
            </button>
          )}
        </div>

        {activeStep === 2 ? (
          <div className="p-5 space-y-4">
            {/* Search Placeholder & Add New Toggle */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between pb-3 border-b border-gray-100">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search by area, street name, PIN code..."
                  className="w-full h-10 pl-9 pr-4 text-xs md:text-sm rounded border border-gray-300 focus:outline-none focus:border-heading bg-gray-50 cursor-not-allowed font-body"
                  disabled
                />
                <span className="absolute left-3 top-2.5 text-gray-400 text-sm">🔍</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddAddress(!showAddAddress)}
                className="text-xs md:text-sm font-bold text-[#C7844B] hover:text-amber-800 transition whitespace-nowrap self-end sm:self-auto font-body"
              >
                {showAddAddress ? "← Back to address list" : "+ Add new address"}
              </button>
            </div>

            {showAddAddress ? (
              /* Inline form for new address creation */
              <form
                className="space-y-4 pt-2"
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
                  <Input
                    labelKey="forms:label-state"
                    {...registerNewAddress('province', { required: 'forms:state-required' } as any)}
                    errorKey={(newAddressErrors as any)?.province?.message}
                    variant="solid"
                  />
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

                <div className="flex gap-3">
                  <Button
                    type="submit"
                    className="h-11 px-6 font-bold font-body text-xs uppercase"
                    loading={createAddressMutation.isPending}
                    disabled={createAddressMutation.isPending}
                  >
                    Save and Deliver Here
                  </Button>
                  <Button
                    type="button"
                    variant="smoke"
                    className="h-11 px-6 !bg-white !text-black border border-gray-300 font-bold font-body text-xs uppercase"
                    onClick={() => setShowAddAddress(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              /* Inline Address radio selector cards */
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
                        className={`border rounded-md p-4 cursor-pointer flex flex-col gap-3 relative transition ${
                          checked ? 'border-heading bg-gray-50/50 shadow-sm' : 'border-gray-200 bg-white hover:bg-gray-50/20'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            name="checkout_shipping_address"
                            className="form-radio w-5 h-5 mt-1 border border-gray-300 text-heading rounded-full cursor-pointer focus:ring-0"
                            value={id}
                            checked={checked}
                            onChange={() => {}}
                          />
                          <div className="min-w-0 flex-1 pr-8">
                            <div className="text-sm text-heading font-bold flex items-center gap-2 font-body">
                              <span>{name || 'Address'}</span>
                              <span className="text-[10px] bg-gray-150 text-gray-600 px-1.5 py-0.5 rounded font-normal uppercase tracking-wide">
                                {a?.is_default_shipping ? 'Default' : 'Saved'}
                              </span>
                            </div>
                            <div className="mt-1.5 text-xs md:text-sm text-body leading-relaxed">{line || '-'}</div>
                            {a?.phone && <div className="mt-1.5 text-xs md:text-sm text-body font-semibold">{String(a.phone)}</div>}
                          </div>
                        </div>

                        {/* Delete inline button */}
                        <button
                          type="button"
                          className="absolute top-3 right-3 p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
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
                          <div className="pt-3 border-t border-gray-100 flex justify-start">
                            <Button
                              type="button"
                              className="h-10 px-6 font-bold uppercase tracking-wider text-xs font-body"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveStep(3);
                              }}
                            >
                              Deliver Here
                            </Button>
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
        ) : (
          /* Collapsed Step 2 address summary information */
          <div className="px-5 py-3 text-xs md:text-sm font-semibold text-heading flex justify-between items-center">
            <div className="min-w-0 flex-1">
              {selectedAddress ? (
                <div>
                  <span className="font-bold mr-2">
                    {selectedAddress.first_name} {selectedAddress.last_name}
                  </span>
                  <span className="text-gray-500 font-normal">
                    {[selectedAddress.address_1, selectedAddress.city, selectedAddress.province].filter(Boolean).join(', ')}
                  </span>
                </div>
              ) : (
                <span className="text-gray-400 font-normal">No address selected</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* STEP 3: ORDER SUMMARY */}
      <div className="border border-gray-200 rounded-md overflow-hidden bg-white shadow-sm">
        <div className="flex items-center justify-between bg-gray-50 px-5 py-4 border-b border-gray-150">
          <div className="flex items-center gap-3">
            <span className="bg-gray-200 text-gray-700 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs">
              3
            </span>
            <h3 className="font-bold text-sm md:text-base text-gray-500 uppercase tracking-wider">
              ORDER SUMMARY
            </h3>
          </div>
        </div>

        {activeStep === 3 && (
          <div className="p-5 space-y-6">
            {/* List of checkout items with thumbnails */}
            <div className="space-y-4">
              {items && items.length ? (
                items.map((item) => {
                  const itemPrice = (() => {
                    const amount = item.price;
                    const currencyCode = "AED";
                    return formatPrice({ amount, currencyCode, locale: 'en' });
                  })();
                  return (
                    <div key={item.id} className="flex gap-4 items-center justify-between pb-4 border-b border-gray-100 last:border-b-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded border border-gray-200 overflow-hidden bg-white flex items-center justify-center p-1 shadow-sm">
                          <img
                            src={item.image || "/assets/placeholder/order-product.svg"}
                            alt={item.name}
                            className="object-contain max-h-full max-w-full"
                          />
                        </div>
                        <div className="min-w-0">
                          <span className="text-sm font-semibold text-heading line-clamp-1 leading-normal font-body">{item.name}</span>
                          <span className="text-xs text-gray-400 mt-0.5 block font-body">Qty: {item.quantity}</span>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-heading font-body">{itemPrice}</span>
                    </div>
                  );
                })
              ) : (
                <p className="text-red-500 py-2">Your cart is empty.</p>
              )}
            </div>

            {/* Hidden Input mapping form bindings */}
            <form
              id="checkout-shipping-form"
              onSubmit={handleSubmit(onSubmit)}
              className="w-full flex flex-col gap-5 pt-4 border-t border-gray-100"
              noValidate
            >
              {formError ? <Alert message={formError} /> : null}

              {/* Hidden controls representing the saved shipping parameters */}
              <div className="hidden">
                <input {...register('firstName')} />
                <input {...register('lastName')} />
                <input {...register('phone')} />
                <input {...register('email')} />
                <input {...register('city')} />
                <input {...register('state')} />
                <input {...register('zipCode')} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  type="email"
                  labelKey="Confirmation Email Address"
                  {...register('email', {
                    required: 'forms:email-required',
                    pattern: {
                      value:
                        /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
                      message: 'forms:email-error',
                    },
                  })}
                  errorKey={errors.email?.message}
                  variant="solid"
                />
                <Input
                  type="tel"
                  labelKey="Contact Phone Number"
                  inputMode="numeric"
                  {...register('phone', {
                    required: 'forms:phone-required',
                    pattern: { value: PHONE_ONLY_REGEX, message: 'forms:phone-invalid' },
                  })}
                  errorKey={errors.phone?.message}
                  variant="solid"
                />
              </div>

              <TextArea
                labelKey="Add Delivery Instructions / Order Notes"
                {...register('note')}
                placeholderKey="e.g. leave at front door, call before delivery..."
                className="relative"
              />

              {shippingOptions.length ? (
                <div className="flex flex-col gap-2.5">
                  <span className="text-sm font-semibold text-heading font-body">Shipping Method</span>
                  <div className="border rounded-md p-4 border-heading bg-gray-50 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-bold text-heading font-body">Standard Shipping</span>
                      <span className="text-xs text-gray-500 block mt-0.5 font-body">Estimated Delivery: 7–20 Days</span>
                    </div>
                    <span className="text-sm font-bold text-heading font-body">AED 0</span>
                  </div>
                </div>
              ) : null}

              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full md:w-auto md:px-8 h-12 uppercase font-bold tracking-wider font-body bg-[#C7844B] hover:bg-amber-800 text-white"
                  loading={submitting}
                  disabled={submitting || isEmpty}
                >
                  Place Order
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default CheckoutForm;

