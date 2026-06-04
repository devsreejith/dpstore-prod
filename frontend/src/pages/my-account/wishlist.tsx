import Layout from "@components/layout/layout";
import AccountLayout from "@components/my-account/account-layout";
import WishlistPlaceholder from "@components/my-account/wishlist-placeholder";
import { GetStaticProps } from "next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";

export default function WishlistPage() {
  return (
    <AccountLayout>
      <WishlistPlaceholder />
    </AccountLayout>
  );
}

WishlistPage.Layout = Layout;

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale!, ["common", "forms", "menu", "footer"])),
    },
  };
};

