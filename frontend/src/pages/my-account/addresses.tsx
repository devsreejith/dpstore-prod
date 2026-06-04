import Layout from "@components/layout/layout";
import AccountLayout from "@components/my-account/account-layout";
import CustomerAddresses from "@components/my-account/customer-addresses";
import { GetStaticProps } from "next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";

export default function AddressesPage() {
  return (
    <AccountLayout>
      <CustomerAddresses />
    </AccountLayout>
  );
}

AddressesPage.Layout = Layout;

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale!, ["common", "forms", "menu", "footer"])),
    },
  };
};

