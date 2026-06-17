import http from "@framework/utils/http";
import { useMutation } from "@tanstack/react-query";

export interface UpdateUserType {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  phoneNumber?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  gender?: string;
}
async function updateUser(input: UpdateUserType) {
  const payload: any = {
    first_name: input.firstName ?? null,
    last_name: input.lastName ?? null,
    phone: input.phoneNumber ?? null,
    metadata: { gender: input.gender ?? null },
  };
  const { data } = await http.post("/store/customers/me", payload);
  return data?.customer ?? data;
}
export const useUpdateUserMutation = () => {
  return useMutation({
    mutationFn: (input: UpdateUserType) => updateUser(input),
    onSuccess: (data) => {
      console.log(data, "UpdateUser success response");
    },
    onError: (data) => {
      console.log(data, "UpdateUser error response");
    },
  });
};
