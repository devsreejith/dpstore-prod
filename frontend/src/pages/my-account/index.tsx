import { useEffect } from "react";
import { useRouter } from "next/router";
import Layout from "@components/layout/layout";
import { ROUTES } from "@utils/routes";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { GetStaticProps } from "next";

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(ROUTES.ACCOUNT_DETAILS);
  }, [router]);

  return null;
}

DashboardPage.Layout = Layout;

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale!, [
        "common",
        "forms",
        "menu",
        "footer",
      ])),
    },
  };
};
