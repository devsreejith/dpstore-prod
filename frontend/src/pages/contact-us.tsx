import Container from '@components/ui/container';
import Layout from '@components/layout/layout';
import PageHeader from '@components/ui/page-header';
import ContactForm from '@components/common/form/contact-form';
import ContactInfoBlock from '@containers/contact-info';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { GetStaticProps } from 'next';

export default function ContactUsPage() {
  const { t } = useTranslation('common');
  return (
    <>
      <PageHeader pageHeader="text-page-contact-us" image="/assets/images/contact-header.webp" />
      <Container>
        <div className="my-14 lg:my-16 xl:my-20 px-0 pb-2 lg: xl:max-w-screen-xl mx-auto flex flex-col md:flex-row items-stretch w-full">
          <div className="md:w-full lg:w-2/5 2xl:w-2/6 flex flex-col">
            <ContactInfoBlock className="w-full h-full" />
          </div>
          <div className="md:w-full lg:w-3/5 2xl:w-4/6 flex ltr:md:ml-7 rtl:md:mr-7 flex-col ltr:lg:pl-7 rtl:lg:pr-7">
            <div className="flex pb-7 md:pb-9 mt-7 md:-mt-1.5">
              <h4 className="text-2xl 2xl:text-3xl font-bold text-heading">
                {t('text-get-in-touch')}
              </h4>
            </div>
            <ContactForm />
          </div>
        </div>
        <div className="mb-14 lg:mb-16 xl:mb-20 lg:xl:max-w-screen-xl mx-auto w-full">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3607.7734878252772!2d55.354856675057256!3d25.278204128415346!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5f5cf541e65ddf%3A0x4176d876366fffeb!2sDubai%20Police%20General%20HeadQuarters%20-%20Main%20Entrance%20(Gate%201)!5e0!3m2!1sen!2sin!4v1781175856528!5m2!1sen!2sin"
            width="100%"
            height="450"
            style={{ border: 0 }}
            allowFullScreen={true}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="rounded-md shadow-sm w-full"
          ></iframe>
        </div>
      </Container>
    </>
  );
}

ContactUsPage.Layout = Layout;

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale!, [
        'common',
        'forms',
        'menu',
        'footer',
      ])),
    },
  };
};
