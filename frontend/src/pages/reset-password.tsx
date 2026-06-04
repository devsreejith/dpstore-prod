import Container from "@components/ui/container";
import Layout from "@components/layout/layout";
import Subscription from "@components/common/subscription";
import PageHeader from "@components/ui/page-header";
import Button from "@components/ui/button";
import Input from "@components/ui/input";
import http from "@framework/utils/http";
import { useRouter } from "next/router";
import { useState } from "react";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { GetStaticProps } from "next";

export default function ResetPasswordPage() {
  const router = useRouter();
  const tokenFromQuery =
    typeof router.query?.token === "string" ? router.query.token : "";
  const [token, setToken] = useState(tokenFromQuery);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const t = String(token || "").trim();
      if (!t) throw new Error("Missing token");
      if (!String(password || "").trim().length) throw new Error("Missing password");
      await http.post(
        "/auth/customer/emailpass/update",
        { password },
        { headers: { Authorization: `Bearer ${t}` } }
      );
      setDone(true);
      setTimeout(() => {
        router.push("/signin");
      }, 500);
    } catch (e: any) {
      setError(String(e?.response?.data?.message ?? e?.message ?? "Reset failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader pageHeader="Reset Password" />
      <Container>
        <div className="py-16 lg:py-20 max-w-md mx-auto">
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <Input
              labelKey="Token"
              name="token"
              variant="solid"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            <Input
              labelKey="New Password"
              name="password"
              type="password"
              variant="solid"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {done ? <p className="text-sm text-green-600">Password updated</p> : null}
            <Button type="submit" loading={loading} disabled={loading} className="w-full">
              Update Password
            </Button>
          </form>
        </div>
        <Subscription />
      </Container>
    </>
  );
}

ResetPasswordPage.Layout = Layout;

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale!, ["common", "forms", "menu", "footer"])),
    },
  };
};
