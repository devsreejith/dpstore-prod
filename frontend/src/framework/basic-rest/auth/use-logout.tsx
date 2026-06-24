import { useUI } from "@contexts/ui.context";
import http from "@framework/utils/http";
import Router from "next/router";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export interface LoginInputType {
  email: string;
  password: string;
  remember_me: boolean;
}

import Cookies from "js-cookie";

let isLoggingOutInProgress = false;

async function logout() {
  if (isLoggingOutInProgress) {
    return { ok: true };
  }

  const token = Cookies.get("auth_token");
  if (token) {
    isLoggingOutInProgress = true;
    http.delete("/auth/session")
      .catch(() => {})
      .finally(() => {
        isLoggingOutInProgress = false;
      });
  }
  Cookies.remove("auth_token", { path: "/" });
  Cookies.remove("auth_token");

  if (typeof window !== "undefined") {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.error("Error clearing storage on logout:", e);
    }
  }

  return { ok: true };
}

export const useLogoutMutation = () => {
  const { unauthorize } = useUI();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logout,
    onSuccess: (_data) => {
      unauthorize();
      queryClient.clear();
      Router.push("/");
    },
    onError: (data) => {
      console.error(data, "logout error response");
      unauthorize();
      queryClient.clear();
      Router.push("/");
    },
  });
};
