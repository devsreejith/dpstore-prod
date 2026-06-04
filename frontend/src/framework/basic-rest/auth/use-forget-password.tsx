import http from "@framework/utils/http";
import { useMutation } from "@tanstack/react-query";

export interface ForgetPasswordType {
  email: string;
}
async function forgetPassword(input: ForgetPasswordType) {
  const redirect_url =
    typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined;
  await http.post("/auth/customer/emailpass/reset-password", {
    identifier: input.email,
    metadata: redirect_url ? { redirect_url } : undefined,
  });
  return { ok: true };
}
export const useForgetPasswordMutation = () => {
  return useMutation({
    mutationFn: (input: ForgetPasswordType) => forgetPassword(input),
    onError: (data) => {
      console.log(data, "forget password error response");
    },
  });
};
