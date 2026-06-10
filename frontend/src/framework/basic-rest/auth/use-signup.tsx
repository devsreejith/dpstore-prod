import { useUI } from "@contexts/ui.context";
import http from "@framework/utils/http";
import { useMutation } from "@tanstack/react-query";
import Cookies from "js-cookie";

export interface SignUpInputType {
  email: string;
  password: string;
  name: string;
}
async function signUp(input: SignUpInputType) {
  const regRes = await http.post("/auth/customer/emailpass/register", {
    email: input.email,
    password: input.password,
  });
  const registrationToken = String(regRes?.data?.token ?? "").trim();
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

  Cookies.set("auth_token", loginToken);

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
  return useMutation({
    mutationFn: (input: SignUpInputType) => signUp(input),
    onSuccess: () => {
      authorize();
      closeModal();
    },
    onError: (data) => {
      console.log(data, "login error response");
    },
  });
};
