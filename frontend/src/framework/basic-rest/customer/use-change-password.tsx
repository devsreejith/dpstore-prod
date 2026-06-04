import http from "@framework/utils/http";
import { useMutation } from "@tanstack/react-query";

export interface ChangePasswordInputType {
  newPassword: string;
  oldPassword: string;
  confirmNewPassword?: string;
}
async function changePassword(_input: ChangePasswordInputType) {
  const { data } = await http.get("/store/customers/me");
  const email = String(data?.customer?.email ?? data?.email ?? "").trim();
  if (!email) throw new Error("Missing customer email");
  const oldPassword = String(_input?.oldPassword ?? "").trim();
  const newPassword = String(_input?.newPassword ?? "").trim();
  if (!oldPassword || !newPassword) throw new Error("Missing password");

  try {
    const loginRes = await http.post("/auth/customer/emailpass", {
      email,
      password: oldPassword,
    });
    const token = String(loginRes?.data?.token ?? "").trim();
    if (!token) throw new Error("Invalid credentials");

    const updateRes = await http.post(
      "/auth/customer/emailpass/update",
      { email, password: newPassword },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const success = updateRes?.data?.success === true;
    if (!success) throw new Error("Password update failed");
    return { ok: true, mode: "updated" as const };
  } catch (_e) {
    const redirect_url =
      typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined;
    await http.post("/auth/customer/emailpass/reset-password", {
      identifier: email,
      metadata: redirect_url ? { redirect_url } : undefined,
    });
    return { ok: true, mode: "reset" as const };
  }
}
export const useChangePasswordMutation = () => {
  return useMutation({
    mutationFn: (input: ChangePasswordInputType) => changePassword(input),
    onSuccess: (data) => {
      console.log(data, "ChangePassword success response");
    },
    onError: (data) => {
      console.log(data, "ChangePassword error response");
    },
  });
};
