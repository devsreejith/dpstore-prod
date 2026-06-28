import Layout from "@components/layout/layout";
import Container from "@components/ui/container";
import Input from "@components/ui/input";
import Button from "@components/ui/button";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/router";
import http from "@framework/utils/http";
import Alert from "@components/ui/alert";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { GetStaticProps } from "next";
import { useTranslation } from "next-i18next";

interface TrackingFormInputs {
  orderId: string;
  email: string;
}

export default function OrderTrackingPage() {
  const { t } = useTranslation("common");
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TrackingFormInputs>();

  const onSubmit = async (data: TrackingFormInputs) => {
    setError(null);
    setSubmitting(true);
    try {
      const orderId = String(data.orderId || "").trim();
      const email = String(data.email || "").trim().toLowerCase();

      // Test query to make sure order exists and matches email
      await http.get(`/store/custom/orders/${orderId}`, {
        params: { email }
      });

      // Redirect to success/info page with parameters
      router.push(`/order?id=${orderId}&email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      const msg = String(err?.response?.data?.message || err?.message || t("text-order-not-found"));
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#f1f3f6] min-h-screen py-10 flex items-center justify-center">
      <Container className="max-w-[480px] w-full">
        <div className="bg-white rounded-xl shadow-md p-6 md:p-8 border border-gray-150 flex flex-col font-body">
          <div className="text-center mb-6">
            <h1 className="text-xl md:text-2xl font-bold text-[#005844] mb-2 font-body">
              {t("text-track-your-order")}
            </h1>
            <p className="text-xs md:text-sm text-gray-400 font-body">
              {t("text-track-order-desc")}
            </p>
          </div>

          {error && <Alert message={error} />}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <Input
              labelKey="text-order-id-label"
              placeholder={t("text-order-id-placeholder")}
              {...register("orderId", { required: t("text-order-id-required") })}
              errorKey={errors.orderId?.message}
              variant="solid"
            />

            <Input
              labelKey="forms:label-email-required"
              type="email"
              placeholder={t("forms:placeholder-email")}
              {...register("email", {
                required: t("forms:email-required"),
                pattern: {
                  value: /^\S+@\S+$/i,
                  message: t("forms:email-error"),
                },
              })}
              errorKey={errors.email?.message}
              variant="solid"
            />

            <Button
              type="submit"
              className="w-full h-12 bg-[#005844] hover:bg-[#008755] text-white font-bold uppercase tracking-wider text-xs md:text-sm transition duration-200 mt-4 rounded-lg flex items-center justify-center"
              loading={submitting}
              disabled={submitting}
            >
              {t("text-track-order-btn")}
            </Button>
          </form>
        </div>
      </Container>
    </div>
  );
}

OrderTrackingPage.Layout = Layout;

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale!, ["common", "forms", "menu", "footer"])),
    },
  };
};
