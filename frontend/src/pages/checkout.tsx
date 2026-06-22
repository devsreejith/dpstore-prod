import Layout from "@components/layout/layout";
import CheckoutForm from "@components/checkout/checkout-form";
import CheckoutCard from "@components/checkout/checkout-card";
import AccountLayout from "@components/my-account/account-layout";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { GetStaticProps } from "next";
import { useState } from "react";
import Link from "@components/ui/link";
import { IoArrowBackOutline, IoCheckmarkCircle } from "react-icons/io5";

export default function CheckoutPage() {
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(2);

  const steps = [
    { num: 1, label: "Cart" },
    { num: 2, label: "Delivery Address" },
    { num: 3, label: "Payment" },
    { num: 4, label: "Order Placed" },
  ];

  return (
    <AccountLayout requireAuth={true} wrapChildrenInCard={false}>
      {/* Main Content */}
      <div className="px-0 mx-auto flex flex-col lg:flex-row w-full gap-6 items-start">
        <div className="w-full lg:w-3/5 flex flex-col">
          {/* Back Button */}
          {activeStep === 3 ? (
            <button 
              onClick={() => setActiveStep(2)} 
              className="inline-flex items-center text-sm font-semibold text-[#005844] hover:text-[#008755] transition gap-2 mb-4 font-body"
            >
              <IoArrowBackOutline className="text-base" /> Back
            </button>
          ) : (
            <Link 
              href="/cart" 
              className="inline-flex items-center text-sm font-semibold text-[#005844] hover:text-[#008755] transition gap-2 mb-4 font-body"
            >
              <IoArrowBackOutline className="text-base" /> Back
            </Link>
          )}

          {/* Checkout Title */}
          <h1 className="text-xl md:text-2xl font-bold text-[#005844] font-body mb-6 text-left">
            Checkout
          </h1>

          {/* Progress Stepper */}
          <div className="flex items-center mb-10 w-full max-w-xl">
            {steps.map((step, idx) => {
              const isCompleted = step.num < activeStep || step.num === 1;
              const isActive = step.num === activeStep;
              return (
                <div key={step.num} className="flex items-center" style={{ flex: idx < steps.length - 1 ? 1 : 'none' }}>
                  <div className="flex flex-col items-center relative w-8">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all relative z-10 ${
                        isCompleted
                          ? 'bg-[#005844] text-white'
                          : isActive
                            ? 'bg-[#005844] text-white'
                            : 'bg-white border-2 border-gray-300 text-gray-400'
                      }`}
                    >
                      {isCompleted && !isActive ? (
                        <IoCheckmarkCircle className="text-lg" />
                      ) : (
                        step.num
                      )}
                    </div>
                    <span className={`absolute top-10 text-[10px] md:text-xs font-semibold text-center whitespace-nowrap ${
                      isCompleted || isActive ? 'text-[#005844]' : 'text-gray-400'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                  {idx < steps.length - 1 && (
                    <div
                      className="h-0.5 flex-1 z-0"
                      style={{
                        backgroundColor: step.num < activeStep ? '#005844' : '#E5E7EB',
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <CheckoutForm
            activeStep={activeStep}
            setActiveStep={setActiveStep}
            selectedAddress={selectedAddress}
            setSelectedAddress={setSelectedAddress}
          />
        </div>
        <div className="w-full lg:w-2/5 flex flex-col lg:sticky lg:top-4">
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
