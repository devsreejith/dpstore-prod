import Layout from "@components/layout/layout";
import AccountLayout from "@components/my-account/account-layout";
import Link from "@components/ui/link";
import { ROUTES } from "@utils/routes";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { GetStaticProps } from "next";

export default function DashboardPage() {
  return (
    <AccountLayout>
      <h2 className="text-xl md:text-2xl font-bold text-heading mb-4 font-body">Dashboard</h2>
      <p className="text-sm text-body font-body leading-relaxed font-normal">
        from your account dashboard you can view your{" "}
        <Link href={ROUTES.ORDERS} className="font-semibold underline text-heading hover:text-black">
          recent orders
        </Link>
        , manage your{" "}
        <Link href={ROUTES.ACCOUNT_DETAILS} className="font-semibold underline text-heading hover:text-black">
          account details
        </Link>{" "}
        and{" "}
        <Link href={ROUTES.CHANGE_PASSWORD} className="font-semibold underline text-heading hover:text-black">
          change your password
        </Link>
        .
      </p>
    </AccountLayout>
  );
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
