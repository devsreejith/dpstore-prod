import Input from "@components/ui/input";
import Loader from "@components/ui/loader";
import Button from "@components/ui/button";
import Alert from "@components/ui/alert";
import http from "@framework/utils/http";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { fadeInTop } from "@utils/motion/fade-in-top";
import { useMemo, useState, useEffect, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { IoPencilOutline, IoTrashOutline, IoEllipsisVertical, IoHomeOutline, IoBriefcaseOutline, IoPricetagOutline, IoMapOutline, IoCreateOutline, IoSaveOutline, IoCloseOutline, IoLocationOutline } from "react-icons/io5";
import { useTranslation } from "next-i18next";
import { PhoneInput } from "@components/ui/phone-input";
import { isValidPhoneNumber } from "libphonenumber-js";
import { GoogleMapPicker } from "@components/ui/google-map-picker";
import { parseAddress2, serializeAddress2, formatAddress2ForDisplay } from "@utils/address-helper";

type CustomerAddressInput = {
  first_name?: string;
  last_name?: string;
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

export default function CustomerAddresses() {
  const { t } = useTranslation('common');
  const queryClient = useQueryClient();
  const [addressError, setAddressError] = useState<string | null>(null);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState<boolean>(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    control,
    formState: { errors },
  } = useForm<CustomerAddressInput>({
    defaultValues: { country_code: "ae", address_1: "", address_type: "Home", apartment: "", building: "", floor: "", landmark: "", lat: "", lng: "" } as any,
  });

  const addressesQuery = useQuery({
    queryKey: ["store.customer.addresses"],
    queryFn: async () => {
      const { data } = await http.get("/store/customers/me/addresses", {
        params: { limit: 50 },
      });
      return {
        addresses: Array.isArray((data as any)?.addresses) ? (data as any).addresses : [],
      };
    },
  });

  const customerQuery = useQuery({
    queryKey: ["store.customer.me.address.prefill"],
    queryFn: async () => {
      const { data } = await http.get("/store/customers/me");
      return (data as any)?.customer ?? data;
    },
  });

  const selectedAddressType = watch("address_type");

  const addresses = useMemo(() => {
    return Array.isArray((addressesQuery.data as any)?.addresses) ? (addressesQuery.data as any).addresses : [];
  }, [addressesQuery.data]);

  // Pre-fill profile name and phone by default if the user has no saved addresses
  useEffect(() => {
    if (addressesQuery.isSuccess && addresses.length === 0 && customerQuery.data) {
      const c = customerQuery.data as any;
      if (c) {
        setValue("first_name", c.first_name || c.email || "");
        setValue("last_name", c.last_name || "");
        setValue("phone", c.phone || "");
      }
      setShowForm(true);
    }
  }, [addressesQuery.isSuccess, addresses.length, customerQuery.data, setValue]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    }
    if (openMenuId) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openMenuId]);

  const createAddressMutation = useMutation({
    mutationFn: async (input: CustomerAddressInput) => {
      setAddressError(null);
      const payload: any = {
        first_name: input.first_name || undefined,
        last_name: input.last_name || undefined,
        address_1: String(input.address_1 || "").trim(),
        address_2: input.address_2 || undefined,
        city: input.city || undefined,
        province: input.province || undefined,
        postal_code: input.postal_code || undefined,
        country_code: String(input.country_code || "ae").trim().toLowerCase(),
        phone: input.phone || undefined,
        company: input.address_type || "Home",
      };
      if (!payload.address_1) throw new Error("Address is required");
      const { data } = await http.post("/store/customers/me/addresses", payload);
      return data;
    },
    onSuccess: async () => {
      setEditingAddressId(null);
      reset({ country_code: "ae", address_1: "", address_type: "Home" } as any);
      setShowForm(false);
      await queryClient.invalidateQueries({ queryKey: ["store.customer.addresses"] });
    },
    onError: (e: any) => {
      setAddressError(String(e?.message ?? "Failed to save address"));
    },
  });

  const updateAddressMutation = useMutation({
    mutationFn: async (input: { id: string; data: CustomerAddressInput }) => {
      setAddressError(null);
      const payload: any = {
        first_name: input.data.first_name || undefined,
        last_name: input.data.last_name || undefined,
        address_1: String(input.data.address_1 || "").trim(),
        address_2: input.data.address_2 || undefined,
        city: input.data.city || undefined,
        province: input.data.province || undefined,
        postal_code: input.data.postal_code || undefined,
        country_code: String(input.data.country_code || "ae").trim().toLowerCase(),
        phone: input.data.phone || undefined,
        company: input.data.address_type || "Home",
      };
      if (!payload.address_1) throw new Error("Address is required");
      const { data } = await http.post(`/store/customers/me/addresses/${input.id}`, payload);
      return data;
    },
    onSuccess: async () => {
      setEditingAddressId(null);
      reset({ country_code: "ae", address_1: "", address_type: "Home" } as any);
      setShowForm(false);
      await queryClient.invalidateQueries({ queryKey: ["store.customer.addresses"] });
    },
    onError: (e: any) => {
      setAddressError(String(e?.message ?? "Failed to update address"));
    },
  });

  const deleteAddressMutation = useMutation({
    mutationFn: async (id: string) => {
      setAddressError(null);
      await http.delete(`/store/customers/me/addresses/${id}`);
      return { ok: true };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["store.customer.addresses"] });
    },
    onError: (e: any) => {
      setAddressError(String(e?.message ?? "Failed to delete address"));
    },
  });

  const onSubmitAddress = (input: CustomerAddressInput) => {
    const address_2 = serializeAddress2({
      apartment: input.apartment,
      building: input.building,
      floor: input.floor,
      landmark: input.landmark,
      lat: input.lat,
      lng: input.lng,
    });

    const payloadInput = {
      ...input,
      address_2,
    };

    if (editingAddressId) {
      updateAddressMutation.mutate({ id: editingAddressId, data: payloadInput });
      return;
    }
    createAddressMutation.mutate(payloadInput);
  };

  const startEditAddress = (a: any) => {
    setAddressError(null);
    setOpenMenuId(null);
    const id = String(a?.id ?? "").trim();
    if (!id) return;
    setEditingAddressId(id);
    const parsedExtra = parseAddress2(a?.address_2 ?? "");
    reset({
      first_name: a?.first_name ?? "",
      last_name: a?.last_name ?? "",
      address_1: a?.address_1 ?? "",
      address_2: a?.address_2 ?? "",
      city: a?.city ?? "",
      province: a?.province ?? "",
      postal_code: a?.postal_code ?? "",
      country_code: a?.country_code ?? "ae",
      phone: a?.phone ?? "",
      address_type: a?.company ?? "Home",
      apartment: parsedExtra.apartment,
      building: parsedExtra.building,
      floor: parsedExtra.floor,
      landmark: parsedExtra.landmark,
      lat: parsedExtra.lat,
      lng: parsedExtra.lng,
    } as any);
    setShowMapPicker(true);
    setShowForm(true);
  };

  const cancelEdit = () => {
    setAddressError(null);
    setEditingAddressId(null);
    reset({ country_code: "ae", address_1: "", address_type: "Home", apartment: "", building: "", floor: "", landmark: "", lat: "", lng: "" } as any);
    setShowMapPicker(true);
    setShowForm(false);
  };

  return (
    <motion.div
      initial="from"
      animate="to"
      exit="from"
      // @ts-ignore
      variants={fadeInTop(0.25)}
      className="w-full"
    >
      {/* Header */}
      <h2 className="text-xl md:text-2xl font-bold text-[#005844] mb-6 font-body">
        {t('text-manage-addresses')}
      </h2>

      {addressError ? <Alert message={addressError} /> : null}

      {/* Add New Address Button */}
      {!showForm && (
        <button
          type="button"
          onClick={() => {
            setEditingAddressId(null);
            setShowMapPicker(true);
            if (addresses.length === 0 && customerQuery.data) {
              const c = customerQuery.data as any;
              reset({
                country_code: "ae",
                address_1: "",
                first_name: c?.first_name || c?.email || "",
                last_name: c?.last_name || "",
                phone: c?.phone || "",
                address_type: "Home",
              } as any);
            } else {
              reset({ country_code: "ae", address_1: "", address_type: "Home" } as any);
            }
            setShowForm(true);
          }}
          className="w-full border border-dashed border-gray-300 rounded py-3.5 px-4 flex items-center gap-2.5 text-[#008755] font-semibold text-sm hover:bg-gray-50 transition cursor-pointer font-body mb-2"
        >
          <span className="text-lg leading-none">+</span>
          <span className="uppercase tracking-wide">{t('text-add-new-address-title')}</span>
        </button>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="border border-dashed border-gray-300 rounded p-5 mb-2 bg-white">
          <h3 className="text-sm font-semibold text-[#008755] uppercase tracking-wide mb-4 font-body">
            {editingAddressId ? t('text-edit-address') : t('text-add-new-address-title')}
          </h3>

          {showMapPicker ? (
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
                if (loc.province) setValue('province', loc.province, { shouldValidate: true, shouldDirty: true });
                if (loc.postalCode) setValue('postal_code', loc.postalCode, { shouldValidate: true, shouldDirty: true });
                if (loc.lat) setValue('lat', String(loc.lat));
                if (loc.lng) setValue('lng', String(loc.lng));
                setShowMapPicker(false);
              }}
              onCancel={cancelEdit}
            />
          ) : (
            <form onSubmit={handleSubmit(onSubmitAddress)} noValidate>
              {watch('lat') && watch('lng') && (
                <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded-md text-xs sm:text-sm flex items-center justify-between mb-4">
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

              <div className="flex flex-col space-y-4 sm:space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    labelKey="forms:label-first-name"
                    {...register("first_name", {
                      required: "forms:first-name-required",
                      pattern: {
                        value: /^[a-zA-Z\s\.\u0600-\u06FF\u00C0-\u017F]+$/,
                        message: "forms:first-name-invalid",
                      },
                    })}
                    variant="solid"
                    errorKey={errors.first_name?.message as any}
                  />
                  <Input
                    labelKey="forms:label-last-name"
                    {...register("last_name", {
                      required: "forms:last-name-required",
                      pattern: {
                        value: /^[a-zA-Z\s\.\u0600-\u06FF\u00C0-\u017F]+$/,
                        message: "forms:last-name-invalid",
                      },
                    })}
                    variant="solid"
                    errorKey={errors.last_name?.message as any}
                  />
                  <Controller
                    name="phone"
                    control={control}
                    rules={{
                      required: "forms:phone-required",
                      validate: (value) => {
                        if (!value) return "forms:phone-required";
                        return isValidPhoneNumber(value) || "forms:phone-invalid";
                      }
                    }}
                    render={({ field: { onChange, value } }) => (
                      <PhoneInput
                        labelKey="forms:label-phone"
                        value={value}
                        onChange={onChange}
                        errorKey={errors.phone?.message as any}
                        variant="solid"
                      />
                    )}
                  />
                  <Input
                    labelKey="forms:label-address"
                    {...register("address_1", { required: "forms:address-required" })}
                    variant="solid"
                    errorKey={errors.address_1?.message as any}
                  />
                  <Input
                    labelKey="text-building-name-number"
                    {...register("building")}
                    placeholderKey="placeholder-building"
                    variant="solid"
                  />
                  <Input
                    labelKey="forms:label-city"
                    {...register("city", { required: "forms:city-required" })}
                    variant="solid"
                    errorKey={errors.city?.message as any}
                  />
                  <div className="flex flex-col space-y-2">
                    <label className="text-heading font-semibold text-sm leading-none cursor-pointer">Emirate *</label>
                    <select
                      {...register("province", { required: "forms:state-required" })}
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
                    {errors.province && <p className="my-2 text-13px text-brandRed">{errors.province.message as any}</p>}
                  </div>
                  <Input
                    labelKey="forms:label-postcode"
                    inputMode="numeric"
                    {...register("postal_code", {
                      required: "forms:postcode-required",
                      pattern: { value: /^[0-9]{3,10}$/, message: "forms:postcode-invalid" },
                    })}
                    variant="solid"
                    errorKey={errors.postal_code?.message as any}
                  />
                  <Input
                    labelKey="text-landmark"
                    {...register("landmark")}
                    placeholderKey="placeholder-landmark"
                    variant="solid"
                  />
                </div>
                <input type="hidden" value="ae" {...register("country_code")} />
                <input type="hidden" {...register("lat")} />
                <input type="hidden" {...register("lng")} />
                <input type="hidden" {...register("apartment")} />
                <input type="hidden" {...register("floor")} />
                
                <div className="mt-6 pb-2">
                  <div className="mb-3">
                    <h4 className="text-sm md:text-base font-bold text-heading font-body leading-none">{t('text-address-type')}</h4>
                    <p className="text-xs text-body mt-1 leading-none">{t('text-choose-address-label')}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className="cursor-pointer">
                      <input type="radio" value="Home" {...register("address_type")} className="sr-only" />
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
                      <input type="radio" value="Office" {...register("address_type")} className="sr-only" />
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
                      <input type="radio" value="Other" {...register("address_type")} className="sr-only" />
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

                <div className="flex items-center gap-3 mt-6 border-t border-gray-100 pt-4">
                  <Button
                    type="submit"
                    loading={createAddressMutation.isPending || updateAddressMutation.isPending}
                    disabled={createAddressMutation.isPending || updateAddressMutation.isPending}
                    className="h-11 px-6 bg-[#005844] hover:bg-[#008755] text-white font-semibold font-body rounded transition duration-150 flex items-center gap-2 cursor-pointer text-xs md:text-sm uppercase tracking-wide"
                  >
                    <IoSaveOutline className="text-base" />
                    <span>{editingAddressId ? t('text-update') : t('text-save-address')}</span>
                  </Button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="h-11 px-6 bg-white border border-gray-200 text-[#005844] hover:bg-gray-50 hover:border-[#008755] font-semibold font-body rounded transition duration-150 flex items-center justify-center gap-2 cursor-pointer text-xs md:text-sm uppercase tracking-wide"
                  >
                    <IoCloseOutline className="text-lg" />
                    <span>{t('text-cancel')}</span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Address List */}
      <div className="mt-1">
        {addressesQuery.isLoading ? (
          <Loader size="medium" text="Loading..." />
        ) : (
          <div>
            {addresses.length ? (
              addresses.map((a: any) => {
                const id = String(a?.id ?? "");
                const name = `${String(a?.first_name ?? "").trim()} ${String(a?.last_name ?? "").trim()}`.trim();
                const cc = String(a?.country_code ?? "").toUpperCase();

                const line1 = [a?.address_1, formatAddress2ForDisplay(a?.address_2)].map((x) => String(x ?? "").trim()).filter(Boolean).join(", ");
                const line2 = [a?.city, a?.province, a?.postal_code].map((x) => String(x ?? "").trim()).filter(Boolean).join(", ");
                const line3 = a?.phone ? String(a?.phone).trim() : "";

                return (
                  <div
                    key={id}
                    className="py-5 border-b border-gray-200 last:border-b-0"
                  >
                    <div className="flex items-start justify-between">
                      {/* Address Content */}
                      <div className="flex-1 min-w-0">
                        {/* Name and Badge */}
                        <div className="flex items-center gap-3 mb-1.5">
                          <p className="text-sm font-bold text-[#005844] font-body mb-0">
                            {name || "Address"}
                          </p>
                          <span className="inline-block text-[10px] font-semibold tracking-wide text-[#008755] border border-[#008755] rounded px-2 py-0.5 uppercase font-body">
                            {a?.company || t('text-home-label').toUpperCase()}
                          </span>
                        </div>

                        {/* Address Lines */}
                        {line1 && <p className="text-sm text-gray-600 font-normal font-body leading-relaxed mb-0">{line1}</p>}
                        {line2 && <p className="text-sm text-gray-600 font-normal font-body leading-relaxed mb-0">{line2}</p>}
                        {line3 && <p className="text-sm text-gray-600 font-normal font-body leading-relaxed mb-0">{line3}</p>}
                      </div>

                      {/* Three-dot Menu */}
                      <div className="relative flex-shrink-0 ml-4" ref={openMenuId === id ? menuRef : null}>
                        <button
                          type="button"
                          onClick={() => setOpenMenuId(openMenuId === id ? null : id)}
                          className="w-8 h-8 flex items-center justify-center text-[#005844] hover:text-[#005844] hover:bg-gray-100 rounded-full transition cursor-pointer"
                          title="More options"
                        >
                          <IoEllipsisVertical className="w-5 h-5" />
                        </button>

                        {/* Dropdown Menu */}
                        {openMenuId === id && (
                          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-20 min-w-[140px] py-1">
                            <button
                              type="button"
                              onClick={() => startEditAddress(a)}
                              className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition font-body cursor-pointer"
                            >
                              <IoPencilOutline className="w-4 h-4 text-[#008755]" />
                              <span>{t('text-edit')}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (!id) return;
                                setOpenMenuId(null);
                                if (typeof window !== "undefined" && !window.confirm("Delete this address?")) return;
                                deleteAddressMutation.mutate(id);
                              }}
                              disabled={deleteAddressMutation.isPending}
                              className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition font-body cursor-pointer"
                            >
                              <IoTrashOutline className="w-4 h-4 text-red-500" />
                              <span>{t('text-delete')}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              !showForm && <div className="text-sm text-body py-6">{t('text-no-addresses')}</div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
