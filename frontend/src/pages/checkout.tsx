import Layout from "@components/layout/layout";
import CheckoutForm from "@components/checkout/checkout-form";
import CheckoutCard from "@components/checkout/checkout-card";
import AccountLayout from "@components/my-account/account-layout";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { GetStaticProps } from "next";

export default function CheckoutPage() {
  return (
    <AccountLayout requireAuth={true} wrapChildrenInCard={false}>
      <div className="px-0 mx-auto flex flex-col lg:flex-row w-full gap-6">
        <div className="w-full lg:w-3/5 flex h-full flex-col">
          <CheckoutForm />
        </div>
        <div className="w-full lg:w-2/5 flex flex-col h-full">
          <CheckoutCard />
        </div>
      </div>
    </AccountLayout>
  );
}

CheckoutPage.Layout = Layout;

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
