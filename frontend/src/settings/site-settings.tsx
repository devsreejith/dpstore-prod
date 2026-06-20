import { SAFlag } from '@components/icons/SAFlag';
import { USFlag } from '@components/icons/USFlag';
import { ThunderIcon } from '@components/icons/thunder-icon';

export const siteSettings = {
  name: 'Dubai Police Store',
  description: 'Merchandise Online Store',
  author: {
    name: 'Dubai Police Store',
    websiteUrl: 'https://dubaipolicestore.ae/',
    address: '',
  },
  logo: {
    url: '/assets/images/logo-v2.png',
    alt: 'Dubai Police Store',
    href: '/',
    width: 150,
    height: 51,
  },
  defaultLanguage: 'en',
  currencyCode: 'AED',
  site_header: {
    languageMenu: [
      {
        id: 'ar',
        name: 'عربى - AR',
        value: 'ar',
        icon: <SAFlag width="20px" height="15px" />,
      },
      {
        id: 'en',
        name: 'English - EN',
        value: 'en',
        icon: <USFlag width="20px" height="15px" />,
      },
    ],
    categoryMenu: [],
    pagesMenu: [
      {
        id: 1,
        path: '/search',
        label: 'menu-deals-today',
        icon: <ThunderIcon className="w-3 h-auto" />,
      },
      {
        id: 2,
        path: '/',
        label: 'menu-offers',
      },
      {
        id: 3,
        path: '/faq',
        label: 'menu-faq',
      },
      {
        id: 4,
        path: '/contact-us',
        label: 'menu-contact',
      },
    ],
  },
};
