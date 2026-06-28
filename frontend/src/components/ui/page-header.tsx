import { useTranslation } from "next-i18next";
import Link from "@components/ui/link";
import Container from "@components/ui/container";

interface HeaderProps {
  pageSubHeader?: string;
  pageHeader: string;
  image?: string;
  description?: string;
  showBreadcrumbs?: boolean;
}

const PageHeader: React.FC<HeaderProps> = ({
  pageSubHeader = "text-page-explore",
  pageHeader = "text-page-header",
  image = "/assets/images/page-header.webp",
  description,
  showBreadcrumbs = false,
}) => {
  const { t } = useTranslation("common");

  if (showBreadcrumbs) {
    return (
      <div
        className="relative w-full overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: `url(${image})` }}
      >
        <div className="absolute inset-0 bg-[#005844]/40" />
        <Container>
          <div className="py-10 md:py-16 xl:py-20 w-full relative z-10 flex flex-col justify-center min-h-[250px] md:min-h-[300px]">
            {/* Breadcrumb */}
            <div className="flex items-center text-xs md:text-sm text-gray-200 mb-4 font-body gap-2">
              <Link href="/" className="hover:text-white transition">
                {t("breadcrumb-home")}
              </Link>
              <span className="opacity-70">&rsaquo;</span>
              <span className="text-white capitalize">
                {t(pageHeader)}
              </span>
            </div>

            {/* Title */}
            <h2 className="capitalize text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 font-body">
              {t(pageHeader)}
            </h2>

            {/* Description */}
            {description && (
              <p className="text-gray-200 text-xs md:text-sm max-w-xl font-body leading-relaxed">
                {t(description)}
              </p>
            )}
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div
      className="flex justify-center p-6 md:p-10 2xl:p-8 relative bg-no-repeat bg-center bg-cover"
      style={{
        backgroundImage: `url(${image})`,
      }}
    >
      <div className="absolute top-0 ltr:left-0 rtl:right-0 bg-black w-full h-full opacity-50 transition-opacity duration-500 group-hover:opacity-80" />
      <div className="w-full flex items-center justify-center relative z-10 py-10 md:py-14 lg:py-20 xl:py-24 2xl:py-32">
        <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-white text-center">
          <span className="font-satisfy block font-normal mb-3">
            {t(`${pageSubHeader}`)}
          </span>
          {t(`${pageHeader}`)}
        </h2>
      </div>
    </div>
  );
};

export default PageHeader;
