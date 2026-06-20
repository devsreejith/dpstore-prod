import { useUI } from '@contexts/ui.context';
import http from '@framework/utils/http';
import { useMutation } from '@tanstack/react-query';
import Cookies from 'js-cookie';

export interface LoginInputType {
  email: string;
  password: string;
  remember_me: boolean;
}
async function login(input: LoginInputType) {
  const res = await http.post('/auth/customer/emailpass', {
    email: input.email,
    password: input.password,
  });
  const token = String(res?.data?.token ?? '').trim();
  if (!token) throw new Error('Login failed');
  
  Cookies.set('auth_token', token, { path: '/' });
  
  await http.post(
    '/auth/session',
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return { ok: true };
}

export const useLoginMutation = () => {
  const { authorize, closeModal } = useUI();
  return useMutation({
    mutationFn: (input: LoginInputType) => login(input),
    onSuccess: () => {
      authorize();
      closeModal();
    },
    onError: (data) => {
      console.log(data, 'login error response');
    },
  });
};
