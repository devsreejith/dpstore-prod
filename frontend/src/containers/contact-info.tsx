import { FC } from "react";
import { IoLocationSharp, IoMail, IoCallSharp, IoLogoWhatsapp, IoBusiness } from "react-icons/io5";
import Link from "@components/ui/link";
import { useTranslation } from "next-i18next";

import cn from "classnames";

const data = [
  {
    id: 1,
    slug: "/",
    icon: <IoLocationSharp />,
    name: "text-address",
    description: "text-address-details",
  },
  {
    id: 2,
    slug: "/",
    icon: <IoMail />,
    name: "text-email",
    description: "text-email-details",
  },
  {
    id: 3,
    slug: "/",
    icon: <IoCallSharp />,
    name: "text-phone",
    description: "text-phone-details",
  },
];
interface Props {
  className?: string;
}
const ContactInfoBlock: FC<Props> = ({ className }) => {
  const { t } = useTranslation("common");
  return (
    <div className={cn("mb-6 lg:mb-0 lg:p-6 bg-gray-50 rounded-lg border border-gray-200 flex flex-col h-full", className)}>
      <div className="flex items-center gap-3 pb-3 mb-3">
        <div className="flex items-center justify-center w-11 h-11 rounded-full bg-heading text-white text-xl flex-shrink-0">
          <IoBusiness />
        </div>
        <div className="flex flex-col">
          <h4 className="text-xl font-bold text-heading">
            {t("text-contact-info-title")}
          </h4>
          <div className="w-12 h-0.5 bg-heading mt-1" />
        </div>
      </div>
      <p className="text-sm text-body leading-relaxed mb-4">
        {t("text-contact-info-desc")}
      </p>
      <div className="space-y-3">
        {data?.map((item: any) => (
          <div
            key={`contact--key${item.id}`}
            className="flex items-start p-3.5 bg-white border border-gray-200 rounded-lg shadow-sm"
          >
            <div className="flex flex-shrink-0 justify-center items-center rounded-full bg-heading text-white w-10 h-10">
              {item.icon}
            </div>
            <div className="flex flex-col ltr:pl-3.5 rtl:pr-3.5 w-full">
              <h5 className="text-sm font-bold text-heading mb-0.5">
                {t(`${item.name}`)}
              </h5>
              <Link href={item.slug} className="text-sm text-body hover:text-heading transition-colors">
                {t(`${item.description}`)}
              </Link>
            </div>
          </div>
        ))}
      </div>
      <div className="relative flex items-center justify-center mt-7 mb-0 mt-auto">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-3 mt-5 bg-gray-50 text-heading text-sm font-medium">
            {t("text-connect-with-us")}
          </span>
        </div>
      </div>
      <div className="flex justify-center pb-1">
        <a
          href="https://wa.me/971556002110"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center w-12 h-12 border border-gray-200 text-[#25D366] rounded-full bg-white hover:bg-gray-50 transition-all shadow-sm hover:shadow-md transform hover:-translate-y-0.5 active:translate-y-0"
          title="Chat on WhatsApp"
        >
          <IoLogoWhatsapp className="text-3xl" />
        </a>
      </div>
    </div>
  );
};

export default ContactInfoBlock;
