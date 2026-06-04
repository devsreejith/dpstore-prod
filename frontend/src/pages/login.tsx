import Container from '@components/ui/container';
import Layout from '@components/layout/layout';
import LoginForm from '@components/auth/login-form';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { GetStaticProps } from 'next';

export default function LoginPage() {
  return (
    <>
      <Container>
        <div className="py-16 lg:py-20">
          <LoginForm />
        </div>
      </Container>
    </>
  );
}

LoginPage.Layout = Layout;

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale!, ['common', 'forms', 'menu', 'footer'])),
    },
  };
};
