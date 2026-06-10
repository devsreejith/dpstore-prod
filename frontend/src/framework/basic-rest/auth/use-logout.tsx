import { useUI } from "@contexts/ui.context";
import http from "@framework/utils/http";
import Router from "next/router";
import { useMutation } from "@tanstack/react-query";

export interface LoginInputType {
  email: string;
  password: string;
  remember_me: boolean;
}

import Cookies from "js-cookie";

async function logout() {
  await http.delete("/auth/session");
  Cookies.remove("auth_token");
  return { ok: true };
}

export const useLogoutMutation = () => {
  const { unauthorize } = useUI();
  return useMutation({
    mutationFn: logout,
    onSuccess: (_data) => {
      unauthorize();
      Router.push("/");
    },
    onError: (data) => {
      console.error(data, "logout error response");
      unauthorize();
      Router.push("/");
    },
  });
};
