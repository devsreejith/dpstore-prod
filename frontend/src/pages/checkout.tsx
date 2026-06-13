import Layout from "@components/layout/layout";
import CheckoutForm from "@components/checkout/checkout-form";
import CheckoutCard from "@components/checkout/checkout-card";
import AccountLayout from "@components/my-account/account-layout";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { GetStaticProps } from "next";
import { useState } from "react";

export default function CheckoutPage() {
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(2);

  return (
    <AccountLayout requireAuth={true} wrapChildrenInCard={false}>
      <div className="px-0 mx-auto flex flex-col lg:flex-row w-full gap-6">
        <div className="w-full lg:w-3/5 flex h-full flex-col">
          <CheckoutForm
            activeStep={activeStep}
            setActiveStep={setActiveStep}
            selectedAddress={selectedAddress}
            setSelectedAddress={setSelectedAddress}
          />
        </div>
        <div className="w-full lg:w-2/5 flex flex-col h-full">
          <CheckoutCard
            activeStep={activeStep}
            setActiveStep={setActiveStep}
            selectedAddress={selectedAddress}
          />
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
