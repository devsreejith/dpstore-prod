import Input from "@components/ui/input";
import Button from "@components/ui/button";
import Alert from "@components/ui/alert";
import http from "@framework/utils/http";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { fadeInTop } from "@utils/motion/fade-in-top";
import { useMemo, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { IoPencilOutline, IoTrashOutline, IoLocationOutline } from "react-icons/io5";

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
};

export default function CustomerAddresses() {
  const queryClient = useQueryClient();
  const [addressError, setAddressError] = useState<string | null>(null);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CustomerAddressInput>({
    defaultValues: { country_code: "ae", address_1: "" } as any,
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
      };
      if (!payload.address_1) throw new Error("Address is required");
      const { data } = await http.post("/store/customers/me/addresses", payload);
      return data;
    },
    onSuccess: async () => {
      setEditingAddressId(null);
      reset({ country_code: "ae", address_1: "" } as any);
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
      };
      if (!payload.address_1) throw new Error("Address is required");
      const { data } = await http.post(`/store/customers/me/addresses/${input.id}`, payload);
      return data;
    },
    onSuccess: async () => {
      setEditingAddressId(null);
      reset({ country_code: "ae", address_1: "" } as any);
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
    const id = String(a?.id ?? "").trim();
    if (!id) return;
    setEditingAddressId(id);
    setValue("first_name", a?.first_name ?? "");
    setValue("last_name", a?.last_name ?? "");
    setValue("address_1", a?.address_1 ?? "");
    setValue("address_2", a?.address_2 ?? "");
    setValue("city", a?.city ?? "");
    setValue("province", a?.province ?? "");
    setValue("postal_code", a?.postal_code ?? "");
    setValue("country_code", a?.country_code ?? "ae");
    setValue("phone", a?.phone ?? "");
    setShowForm(true);
  };

  const cancelEdit = () => {
    setAddressError(null);
    setEditingAddressId(null);
    reset({ country_code: "ae", address_1: "" } as any);
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-heading font-body">Addresses</h2>
          <p className="mt-1 text-sm text-body">Manage your saved shipping and billing addresses.</p>
        </div>
        {!showForm && (
          <Button
            type="button"
            onClick={() => {
              setEditingAddressId(null);
              // Prefill profile values on fresh add address if empty list
              if (addresses.length === 0 && customerQuery.data) {
                const c = customerQuery.data as any;
                reset({
                  country_code: "ae",
                  address_1: "",
                  first_name: c?.first_name || c?.email || "",
                  last_name: c?.last_name || "",
                  phone: c?.phone || "",
                } as any);
              } else {
                reset({ country_code: "ae", address_1: "" } as any);
              }
              setShowForm(true);
            }}
            className="h-11 px-5 bg-[#212121] hover:bg-gray-800 text-white font-semibold text-sm font-body rounded transition duration-150 flex items-center justify-center gap-1.5"
          >
            <span className="text-base font-light">+</span> Add Address
          </Button>
        )}
      </div>

      <div className="mt-6">
        {addressError ? <Alert message={addressError} /> : null}

        {addressesQuery.isLoading ? (
          <div className="text-sm text-body">Loading...</div>
        ) : (
          <div className="space-y-4">
            {addresses.length ? (
              addresses.map((a: any, index: number) => {
                const id = String(a?.id ?? "");
                const name = `${String(a?.first_name ?? "").trim()} ${String(a?.last_name ?? "").trim()}`.trim();
                const cc = String(a?.country_code ?? "").toUpperCase();
                
                const line1 = [a?.address_1, a?.address_2].map((x) => String(x ?? "").trim()).filter(Boolean).join(", ");
                const line2 = [a?.city, a?.province, a?.postal_code].map((x) => String(x ?? "").trim()).filter(Boolean).join(", ");
                const line3 = [cc, a?.phone].map((x) => String(x ?? "").trim()).filter(Boolean).join(" ");
                
                const isDefault = a.id === customerQuery.data?.billing_address_id || index === 0;

                return (
                  <div
                    key={id}
                    className="border border-gray-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-5 bg-white"
                  >
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="w-12 h-12 flex-shrink-0 bg-gray-50 flex items-center justify-center rounded-lg border border-gray-100">
                        <IoLocationOutline className="text-xl text-[#212121]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-[#212121] text-base leading-tight mb-1">
                          {name || "Address"}
                        </h4>
                        <p className="text-sm text-gray-500 font-normal font-body leading-relaxed">{line1}</p>
                        <p className="text-sm text-gray-500 font-normal font-body leading-relaxed">{line2}</p>
                        <p className="text-sm text-gray-500 font-normal font-body leading-relaxed">{line3}</p>
                        {isDefault && (
                          <div className="mt-3 inline-flex items-center gap-1 bg-[#e6f4ea] text-[#137333] px-2.5 py-0.5 rounded-md text-xs font-semibold font-body">
                            <span>✓</span> Default
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-5 self-stretch justify-end">
                      <div className="hidden sm:block w-[1px] bg-gray-200 self-stretch my-1" />
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => startEditAddress(a)}
                          className="w-16 h-16 flex flex-col items-center justify-center gap-1 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition duration-150"
                          title="Edit Address"
                        >
                          <IoPencilOutline className="text-xl text-[#212121]" />
                          <span className="text-[11px] text-gray-500 font-semibold font-body">Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!id) return;
                            if (typeof window !== "undefined" && !window.confirm("Delete this address?")) return;
                            deleteAddressMutation.mutate(id);
                          }}
                          disabled={deleteAddressMutation.isPending}
                          className="w-16 h-16 flex flex-col items-center justify-center gap-1 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition duration-150"
                          title="Delete Address"
                        >
                          <IoTrashOutline className="text-xl text-red-500" />
                          <span className="text-[11px] text-red-500 font-semibold font-body">Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-sm text-body">No saved addresses yet.</div>
            )}
          </div>
        )}
      </div>

      {showForm && (
        <div className="mt-8 border-t border-gray-150 pt-8">
          <h3 className="text-base font-semibold text-heading mb-4">{editingAddressId ? "Edit Address" : "Add Address"}</h3>
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
                <Input
                  labelKey="forms:label-state"
                  {...register("province", { required: "forms:state-required" })}
                  variant="solid"
                  errorKey={errors.province?.message as any}
                />
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
              <div className="flex items-center gap-3">
                <Button
                  type="submit"
                  loading={createAddressMutation.isPending || updateAddressMutation.isPending}
                  disabled={createAddressMutation.isPending || updateAddressMutation.isPending}
                  className="h-11 px-6 bg-[#212121] hover:bg-gray-600 text-white font-semibold font-body rounded transition duration-150 w-full sm:w-auto"
                >
                  {editingAddressId ? "Update" : "Add"}
                </Button>
                <Button
                  type="button"
                  onClick={cancelEdit}
                  className="h-11 px-6 bg-gray-200 text-heading hover:bg-gray-300 font-semibold font-body rounded transition duration-150 w-full sm:w-auto"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </form>
        </div>
      )}
    </motion.div>
  );
}
