import Layout from "@components/layout/layout";
import OrderInformation from "@components/order/order-information";
import Container from "@components/ui/container";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { GetStaticProps } from "next";

export default function Order() {
	return (
		<div className="bg-[#f1f3f6] min-h-screen py-6 lg:py-10">
			<Container>
				<OrderInformation />
			</Container>
		</div>
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
