import { useQuery } from "@tanstack/react-query";

export const fetchBrands = async () => {
  return {
    brands: []
  };
};

export const useBrandsQuery = (options: any) => {
  return useQuery<any, Error>({
    queryKey: ["brands", options],
    queryFn: fetchBrands,
  });
};
