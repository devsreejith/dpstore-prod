import { useUI } from "@contexts/ui.context";
import http from "@framework/utils/http";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Cookies from "js-cookie";
import { toast } from "react-toastify";

export interface SignUpInputType {
  email: string;
  password: string;
  name: string;
}

async function signUp(input: SignUpInputType) {
  let registrationToken = "";
  try {
    const regRes = await http.post("/auth/customer/emailpass/register", {
      email: input.email,
      password: input.password,
    });
    registrationToken = String(regRes?.data?.token ?? "").trim();
  } catch (err: any) {
    const msg = String(err?.response?.data?.message || err?.message || "").toLowerCase();
    if (msg.includes("already exists") || msg.includes("exists") || err?.response?.status === 409) {
      throw new Error("User Email Address Already Exists");
    }
    throw err;
  }

  if (!registrationToken) throw new Error("Signup failed");

  const name = String(input.name || "").trim();
  const [first, ...rest] = name.split(/\s+/).filter(Boolean);
  const first_name = first || "";
  const last_name = rest.join(" ");

  await http.post(
    "/store/customers",
    {
      email: input.email,
      first_name,
      last_name,
    },
    {
      headers: {
        Authorization: `Bearer ${registrationToken}`,
      },
    }
  );

  const loginRes = await http.post("/auth/customer/emailpass", {
    email: input.email,
    password: input.password,
  });
  const loginToken = String(loginRes?.data?.token ?? "").trim();
  if (!loginToken) throw new Error("Signup failed");

  Cookies.set("auth_token", loginToken, { path: "/" });

  await http.post(
    "/auth/session",
    {},
    {
      headers: {
        Authorization: `Bearer ${loginToken}`,
      },
    }
  );

  return { ok: true };
}

export const useSignUpMutation = () => {
  const { authorize, closeModal } = useUI();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SignUpInputType) => signUp(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store.customer'] });
      queryClient.invalidateQueries({ queryKey: ['store.orders'] });
      queryClient.invalidateQueries({ queryKey: ['store.order'] });
      queryClient.removeQueries({ queryKey: ['store.customer'] });
      queryClient.removeQueries({ queryKey: ['store.orders'] });
      queryClient.removeQueries({ queryKey: ['store.order'] });
      authorize();
      closeModal();
      toast.success("Registration successfully done");
    },
    onError: (data) => {
      console.log(data, "login error response");
    },
  });
};
