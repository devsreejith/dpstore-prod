import { DefaultSeo as NextDefaultSeo } from "next-seo";
import { siteSettings } from "@settings/site-settings";

export const DefaultSeo = () => {
  return (
    <NextDefaultSeo
      title={siteSettings.name}
      description={siteSettings.description}
      openGraph={{
        type: "website",
        locale: "en_IE",
        site_name: siteSettings.name,
      }}
      twitter={{
        handle: "@handle",
        site: "@site",
        cardType: "summary_large_image",
      }}
      additionalMetaTags={[
        {
          name: "viewport",
          content: "width=device-width, initial-scale=1 maximum-scale=1",
        },
        {
          name: "apple-mobile-web-app-capable",
          content: "yes",
        },
        {
          name: "theme-color",
          content: "#ffffff",
        },
      ]}
      additionalLinkTags={[
        {
          rel: "icon",
          href: "/fav.png",
          type: "image/png",
        },
        {
          rel: "apple-touch-icon",
          href: "/fav.png",
        },
        {
          rel: "manifest",
          href: "/manifest.json",
        },
      ]}
    />
  );
};
