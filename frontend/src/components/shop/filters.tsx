import { CategoryFilter } from "./category-filter";
import { FilteredItem } from "./filtered-item";
import { PriceFilter } from "./price-filter";
import { useRouter } from "next/router";
import isEmpty from "lodash/isEmpty";
import { useTranslation } from "next-i18next";

export const ShopFilters: React.FC = () => {
	const router = useRouter();
	const { pathname, query } = router;
	const { t } = useTranslation("common");
	return (
		<div className="pt-1">
			<div className="block border-b border-gray-300 pb-7 mb-7">
				<div className="flex items-center justify-between mb-2.5">
					<h2 className="font-semibold text-heading text-xl md:text-2xl">
						{t("text-filters")}
					</h2>
					<button
						className="flex-shrink text-xs mt-0.5 transition duration-150 ease-in focus:outline-none hover:text-heading"
						aria-label="Clear All"
						onClick={() => {
							router.push(pathname);
						}}
					>
						{t("text-clear-all")}
					</button>
				</div>
				<div className="flex flex-wrap -m-1.5 pt-2">
					{!isEmpty(query) &&
						Object.keys(query)
							.filter((k) => ["category", "price"].includes(k))
							.map((k) => {
								const val = query[k];
								const valString = typeof val === "string" ? val : Array.isArray(val) ? val.join(",") : "";
								return valString.split(",").filter(Boolean).map((v, idx) => (
									<FilteredItem
										itemKey={k}
										itemValue={v}
										key={`${k}-${v}-${idx}`}
									/>
								));
							})}
				</div>
			</div>

			<CategoryFilter />
			<PriceFilter />
		</div>
	);
};
