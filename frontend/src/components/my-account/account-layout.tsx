import Container from "@components/ui/container";
import AccountNav from "@components/my-account/account-nav";
import Subscription from "@components/common/subscription";
import { useUI } from "@contexts/ui.context";
import { useEffect } from "react";
import Router from "next/router";
import { useQuery } from "@tanstack/react-query";
import http from "@framework/utils/http";

const AccountLayout: React.FunctionComponent<{
  children: React.ReactNode;
  requireAuth?: boolean;
  wrapChildrenInCard?: boolean;
  showSubscription?: boolean;
}> = ({ children, requireAuth = true, wrapChildrenInCard = false, showSubscription = false }) => {
  const { isAuthorized, checkingAuth } = useUI();

  useEffect(() => {
    if (checkingAuth) return;
    if (requireAuth && !isAuthorized) {
      Router.push(`/signin?redirect=${encodeURIComponent(Router.asPath)}`);
    }
  }, [isAuthorized, requireAuth, checkingAuth]);

  const customerQuery = useQuery({
    queryKey: ["store.customer.me.sidebar"],
    queryFn: async () => {
      const { data } = await http.get("/store/customers/me");
      return (data as any)?.customer ?? data;
    },
    enabled: isAuthorized === true,
    retry: false,
  });

  const customerName = (() => {
    const c: any = customerQuery.data;
    const first = String(c?.first_name ?? "").trim();
    const last = String(c?.last_name ?? "").trim();
    const full = `${first} ${last}`.trim();
    if (full) return full;
    const email = String(c?.email ?? "").trim();
    if (email) return email.split("@")[0] || email;
    return null;
  })();

	return (
		<>
			<div className="bg-[#f1f3f6]">
				<Container>
					<div className="py-6 lg:py-8 px-0 w-full">
						<div className="flex flex-col md:flex-row md:items-start w-full gap-4">
							<div className="hidden md:block">
								<AccountNav customerName={customerName} />
							</div>
							<div className="w-full md:flex-1 min-w-0">
								<div className="bg-white shadow-sm p-5 md:p-6 md:min-h-[450px] overflow-hidden">
									{children}
								</div>
							</div>
						</div>
					</div>

					{showSubscription && <Subscription />}
				</Container>
			</div>
		</>
	);
};

export default AccountLayout;
