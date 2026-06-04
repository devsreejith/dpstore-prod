import Layout from "@components/layout/layout";
import OrderInformation from "@components/order/order-information";
import AccountLayout from "@components/my-account/account-layout";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { GetStaticProps } from "next";

export default function Order() {
	return (
		<AccountLayout requireAuth={false} wrapChildrenInCard={false}>
			<OrderInformation />
		</AccountLayout>
	);
}

Order.Layout = Layout;

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
