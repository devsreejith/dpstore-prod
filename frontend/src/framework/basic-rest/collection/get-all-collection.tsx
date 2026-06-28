import { CollectionsQueryOptionsType, Collection } from "@framework/types";
import http from "@framework/utils/http";
import { API_ENDPOINTS } from "@framework/utils/api-endpoints";
import { useQuery } from "@tanstack/react-query";

export const fetchCollections = async () => {
	const { data } = await http.get(API_ENDPOINTS.COLLECTIONS);
	
	const mappedCollections = (data?.collections ?? []).map((c: any) => ({
		id: c.id,
		name: c.title,
		slug: c.handle,
		metadata: c.metadata,
	}));

	return { collections: { data: mappedCollections as Collection[] } };
};
export const useCollectionsQuery = (options: CollectionsQueryOptionsType) => {
	return useQuery<{ collections: { data: Collection[] } }, Error>({
		queryKey: [API_ENDPOINTS.COLLECTIONS, options],
		queryFn: fetchCollections
	});
};
