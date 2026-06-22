import Input from "@components/ui/input";
import Loader from "@components/ui/loader";
import Button from "@components/ui/button";
import Alert from "@components/ui/alert";
import http from "@framework/utils/http";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { fadeInTop } from "@utils/motion/fade-in-top";
import { useMemo, useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { IoPencilOutline, IoTrashOutline, IoEllipsisVertical, IoHomeOutline, IoBriefcaseOutline, IoPricetagOutline } from "react-icons/io5";

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
};

export default function CustomerAddresses() {
  const queryClient = useQueryClient();
  const [addressError, setAddressError] = useState<string | null>(null);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<CustomerAddressInput>({
    defaultValues: { country_code: "ae", address_1: "", address_type: "Home" } as any,
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
    if (editingAddressId) {
      updateAddressMutation.mutate({ id: editingAddressId, data: input });
      return;
    }
    createAddressMutation.mutate(input);
  };

  const startEditAddress = (a: any) => {
    setAddressError(null);
    setOpenMenuId(null);
    const id = String(a?.id ?? "").trim();
    if (!id) return;
    setEditingAddressId(id);
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
    } as any);
    setShowForm(true);
  };

  const cancelEdit = () => {
    setAddressError(null);
    setEditingAddressId(null);
    reset({ country_code: "ae", address_1: "", address_type: "Home" } as any);
    setShowForm(false);
  };

  return (
    <motion.div
      layout
      initial="from"
      animate="to"
      exit="from"
      // @ts-ignore
      variants={fadeInTop(0.25)}
      className="w-full"
    >
      {/* Header */}
      <h2 className="text-xl md:text-2xl font-bold text-[#005844] mb-6 font-body">
        Manage Addresses
      </h2>

      {addressError ? <Alert message={addressError} /> : null}

      {/* Add New Address Button */}
      {!showForm && (
        <button
          type="button"
          onClick={() => {
            setEditingAddressId(null);
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
          <span className="uppercase tracking-wide">Add a New Address</span>
        </button>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="border border-dashed border-gray-300 rounded p-5 mb-2">
          <h3 className="text-sm font-semibold text-[#008755] uppercase tracking-wide mb-4 font-body">
            {editingAddressId ? "Edit Address" : "Add a New Address"}
          </h3>
          <form onSubmit={handleSubmit(onSubmitAddress)} noValidate>
            <div className="flex flex-col space-y-4 sm:space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  labelKey="forms:label-first-name"
                  {...register("first_name", { required: "forms:first-name-required" })}
                  variant="solid"
                  errorKey={errors.first_name?.message as any}
                />
                <Input
                  labelKey="forms:label-last-name"
                  {...register("last_name", { required: "forms:last-name-required" })}
                  variant="solid"
                  errorKey={errors.last_name?.message as any}
                />
                <Input
                  type="tel"
                  labelKey="forms:label-phone"
                  inputMode="numeric"
                  {...register("phone", {
                    required: "forms:phone-required",
                    pattern: { value: /^[0-9]{6,15}$/, message: "forms:phone-invalid" },
                  })}
                  variant="solid"
                  errorKey={errors.phone?.message as any}
                />
                <Input
                  labelKey="forms:label-address"
                  {...register("address_1", { required: "forms:address-required" })}
                  variant="solid"
                  errorKey={errors.address_1?.message as any}
                />
                <Input labelKey="Address Line 2" {...register("address_2")} variant="solid" />
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
              </div>
              <input type="hidden" value="ae" {...register("country_code")} />
              
              <div className="mt-4 pb-2">
                <label className="block text-sm font-bold text-heading font-body mb-1">Address Type</label>
                <p className="text-sm text-body mb-3">Choose a label for this address</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="cursor-pointer">
                    <input type="radio" value="Home" {...register("address_type")} className="sr-only" />
                    <div className={`flex items-center justify-between px-4 py-3 border rounded-md transition ${selectedAddressType === 'Home' ? 'border-[#008755] bg-[#F4F9F6]' : 'border-gray-200 bg-white'}`}>
                      <div className="flex items-center gap-3">
                        <IoHomeOutline className={`w-5 h-5 ${selectedAddressType === 'Home' ? 'text-[#008755]' : 'text-gray-500'}`} />
                        <span className="text-sm font-medium text-heading">Home</span>
                      </div>
                      <div className={`w-4 h-4 rounded-full border transition-all ${selectedAddressType === 'Home' ? 'border-[#008755] border-[4px] bg-white' : 'border-gray-300 bg-white'}`}></div>
                    </div>
                  </label>
                  <label className="cursor-pointer">
                    <input type="radio" value="Office" {...register("address_type")} className="sr-only" />
                    <div className={`flex items-center justify-between px-4 py-3 border rounded-md transition ${selectedAddressType === 'Office' ? 'border-[#008755] bg-[#F4F9F6]' : 'border-gray-200 bg-white'}`}>
                      <div className="flex items-center gap-3">
                        <IoBriefcaseOutline className={`w-5 h-5 ${selectedAddressType === 'Office' ? 'text-[#008755]' : 'text-gray-500'}`} />
                        <span className="text-sm font-medium text-heading">Office</span>
                      </div>
                      <div className={`w-4 h-4 rounded-full border transition-all ${selectedAddressType === 'Office' ? 'border-[#008755] border-[4px] bg-white' : 'border-gray-300 bg-white'}`}></div>
                    </div>
                  </label>
                  <label className="cursor-pointer">
                    <input type="radio" value="Other" {...register("address_type")} className="sr-only" />
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

              <div className="flex items-center gap-3 mt-4">
                <Button
                  type="submit"
                  loading={createAddressMutation.isPending || updateAddressMutation.isPending}
                  disabled={createAddressMutation.isPending || updateAddressMutation.isPending}
                  className="h-11 px-8 bg-[#005844] hover:bg-[#008755] text-white font-semibold font-body rounded transition duration-150 sm:w-auto"
                >
                  {editingAddressId ? "Update" : "Save"}
                </Button>
                <Button
                  type="button"
                  onClick={cancelEdit}
                  className="h-11 px-8 bg-[#000000] hover:bg-gray-800 text-white font-semibold font-body rounded transition duration-150 sm:w-auto"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </form>
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

                const line1 = [a?.address_1, a?.address_2].map((x) => String(x ?? "").trim()).filter(Boolean).join(", ");
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
                            {a?.company || "HOME"}
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
                              <span>Edit</span>
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
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              !showForm && <div className="text-sm text-body py-6">No saved addresses yet.</div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
