import { SAFlag } from '@components/icons/SAFlag';
import { USFlag } from '@components/icons/USFlag';
import Nike from 'public/assets/images/brands/megamenu/nike.png';
import Dior from 'public/assets/images/brands/megamenu/dior.png';
import Gucci from 'public/assets/images/brands/megamenu/gucci.png';
import Gucci1 from 'public/assets/images/brands/megamenu/gucci1.png';
import Puma from 'public/assets/images/brands/megamenu/puma.png';
import Levis from 'public/assets/images/brands/megamenu/levis.png';
import Banner1 from 'public/assets/images/banner/megamenu/banner-1.png';
import Banner2 from 'public/assets/images/banner/megamenu/banner-2.png';

import { ThunderIcon } from '@components/icons/thunder-icon';
import { WomenIcon } from '@components/icons/women-icon';
import { MenIcon } from '@components/icons/men-icon';
import { WatchIcon } from '@components/icons/watch-icon';
import { WalletIcon } from '@components/icons/wallet-icon';
import { BagIcon } from '@components/icons/bag-icon';
import { JewelryIcon } from '@components/icons/jewelry-icon';
import { SunglassIcon } from '@components/icons/sunglass-icon';
import { SneakerIcon } from '@components/icons/sneaker-icon';

export const siteSettings = {
  name: 'Dubai Police',
  description: 'Online Store',
  author: {
    name: 'Dubai Police',
    websiteUrl: 'https://ecommerce.lsapps.in/',
    address: '',
  },
  logo: {
    url: '/assets/images/logo-v2.png',
    alt: 'Dubai Police Online Store',
    href: '/',
    width: 150,
    height: 51,
  },
  defaultLanguage: 'en',
  currencyCode: 'AED',
  site_header: {
    menu: [
      {
        id: 1,
        path: '/',
        label: 'Home',
      },
      {
        id: 2,
        path: '/search?q=uniform',
        label: 'Uniform',
        columns: [
          {
            id: 1,
            columnItems: [
              {
                id: 1,
                path: '/search?q=kids-uniform',
                label: 'Kids Uniform',
              },
              {
                id: 2,
                path: '/search?q=mens-uniform',
                label: 'Men\'s Uniform',
              },
              {
                id: 3,
                path: '/search?q=womens-uniform',
                label: 'Women\'s Uniform',
              },
              {
                id: 4,
                path: '/search?q=tactical-gear',
                label: 'Tactical Gear',
              },
              {
                id: 5,
                path: '/search?q=duty-belts',
                label: 'Duty Belts',
              },
            ],
          },
          {
            id: 2,
            columnItems: [
              {
                id: 1,
                path: '/search?q=police-caps',
                label: 'Police Caps',
              },
              {
                id: 2,
                path: '/search?q=badges-patches',
                label: 'Badges & Patches',
              },
              {
                id: 3,
                path: '/search?q=footwear',
                label: 'Footwear',
              },
              {
                id: 4,
                path: '/search?q=high-visibility',
                label: 'High-Visibility Vests',
              },
              {
                id: 5,
                path: '/search?q=raincoats',
                label: 'Raincoats',
              },
            ],
          },
          {
            id: 3,
            columnItems: [
              {
                id: 1,
                path: '/search?q=winter-jackets',
                label: 'Winter Jackets',
              },
              {
                id: 2,
                path: '/search?q=formal-wear',
                label: 'Formal Wear',
              },
              {
                id: 3,
                path: '/search?q=training-apparel',
                label: 'Training Apparel',
              },
              {
                id: 4,
                path: '/search?q=protective-gear',
                label: 'Protective Gear',
              },
              {
                id: 5,
                path: '/search?q=uniform-accessories',
                label: 'Uniform Accessories',
              },
            ],
          },
        ],
      },
      {
        id: 3,
        path: '/search?q=toys',
        label: 'Toys',
        columns: [
          {
            id: 1,
            columnItems: [
              {
                id: 1,
                path: '/search?q=police-car-models',
                label: 'Police Car Models',
              },
              {
                id: 2,
                path: '/search?q=rescue-helicopters',
                label: 'Rescue Helicopters',
              },
              {
                id: 3,
                path: '/search?q=motorcycle-toys',
                label: 'Motorcycle Toys',
              },
              {
                id: 4,
                path: '/search?q=action-figures',
                label: 'Action Figures',
              },
              {
                id: 5,
                path: '/search?q=building-sets',
                label: 'Building Sets',
              },
            ],
          },
          {
            id: 2,
            columnItems: [
              {
                id: 1,
                path: '/search?q=remote-control-cars',
                label: 'Remote Control Cars',
              },
              {
                id: 2,
                path: '/search?q=plush-toys',
                label: 'Plush Toys',
              },
              {
                id: 3,
                path: '/search?q=puzzles',
                label: 'Puzzles',
              },
              {
                id: 4,
                path: '/search?q=board-games',
                label: 'Board Games',
              },
              {
                id: 5,
                path: '/search?q=educational-kits',
                label: 'Educational Kits',
              },
            ],
          },
          {
            id: 3,
            columnItems: [
              {
                id: 1,
                path: '/search?q=miniature-stations',
                label: 'Miniature Stations',
              },
              {
                id: 2,
                path: '/search?q=play-tents',
                label: 'Play Tents',
              },
              {
                id: 3,
                path: '/search?q=drone-toys',
                label: 'Drone Toys',
              },
              {
                id: 4,
                path: '/search?q=outdoor-play',
                label: 'Outdoor Play',
              },
              {
                id: 5,
                path: '/search?q=toy-accessories',
                label: 'Toy Accessories',
              },
            ],
          },
        ],
      },
      {
        id: 4,
        path: '/search?q=stationary',
        label: 'Stationary',
        columns: [
          {
            id: 1,
            columnItems: [
              {
                id: 1,
                path: '/search?q=official-notebooks',
                label: 'Official Notebooks',
              },
              {
                id: 2,
                path: '/search?q=branded-pens',
                label: 'Branded Pens',
              },
              {
                id: 3,
                path: '/search?q=desk-organizers',
                label: 'Desk Organizers',
              },
              {
                id: 4,
                path: '/search?q=file-folders',
                label: 'File Folders',
              },
              {
                id: 5,
                path: '/search?q=document-wallets',
                label: 'Document Wallets',
              },
            ],
          },
          {
            id: 2,
            columnItems: [
              {
                id: 1,
                path: '/search?q=calendars',
                label: 'Calendars',
              },
              {
                id: 2,
                path: '/search?q=diaries',
                label: 'Diaries',
              },
              {
                id: 3,
                path: '/search?q=sticky-notes',
                label: 'Sticky Notes',
              },
              {
                id: 4,
                path: '/search?q=pencil-cases',
                label: 'Pencil Cases',
              },
              {
                id: 5,
                path: '/search?q=erasers-sharpeners',
                label: 'Erasers & Sharpeners',
              },
            ],
          },
          {
            id: 3,
            columnItems: [
              {
                id: 1,
                path: '/search?q=rulers',
                label: 'Rulers',
              },
              {
                id: 2,
                path: '/search?q=clipboards',
                label: 'Clipboards',
              },
              {
                id: 3,
                path: '/search?q=calculators',
                label: 'Calculators',
              },
              {
                id: 4,
                path: '/search?q=marking-pens',
                label: 'Marking Pens',
              },
              {
                id: 5,
                path: '/search?q=stationary-kits',
                label: 'Stationary Kits',
              },
            ],
          },
        ],
      },
      {
        id: 5,
        path: '/search?q=souvenir',
        label: 'Souvenir',
        columns: [
          {
            id: 1,
            columnItems: [
              {
                id: 1,
                path: '/search?q=keychains',
                label: 'Keychains',
              },
              {
                id: 2,
                path: '/search?q=coffee-mugs',
                label: 'Coffee Mugs',
              },
              {
                id: 3,
                path: '/search?q=water-bottles',
                label: 'Water Bottles',
              },
              {
                id: 4,
                path: '/search?q=commemorative-coins',
                label: 'Commemorative Coins',
              },
              {
                id: 5,
                path: '/search?q=photo-frames',
                label: 'Photo Frames',
              },
            ],
          },
          {
            id: 2,
            columnItems: [
              {
                id: 1,
                path: '/search?q=wall-clocks',
                label: 'Wall Clocks',
              },
              {
                id: 2,
                path: '/search?q=magnets',
                label: 'Magnets',
              },
              {
                id: 3,
                path: '/search?q=tote-bags',
                label: 'Tote Bags',
              },
              {
                id: 4,
                path: '/search?q=t-shirts-souvenir',
                label: 'T-shirts',
              },
              {
                id: 5,
                path: '/search?q=caps-hats',
                label: 'Caps & Hats',
              },
            ],
          },
          {
            id: 3,
            columnItems: [
              {
                id: 1,
                path: '/search?q=umbrellas',
                label: 'Umbrellas',
              },
              {
                id: 2,
                path: '/search?q=tech-accessories',
                label: 'Tech Accessories',
              },
              {
                id: 3,
                path: '/search?q=souvenir-sets',
                label: 'Souvenir Sets',
              },
              {
                id: 4,
                path: '/search?q=limited-edition',
                label: 'Limited Edition',
              },
              {
                id: 5,
                path: '/search?q=gift-cards',
                label: 'Gift Cards',
              },
            ],
          },
        ],
      },
      {
        id: 6,
        path: '/search',
        label: 'menu-search',
      },
      {
        id: 7,
        path: '/',
        label: 'menu-pages',
        subMenu: [
          {
            id: 1,
            path: '/',
            label: 'menu-users',
            subMenu: [
              {
                id: 1,
                path: '/my-account',
                label: 'menu-my-account',
              },
              {
                id: 2,
                path: '/signin',
                label: 'menu-sign-in',
              },
              {
                id: 3,
                path: '/signup',
                label: 'menu-sign-up',
              },
              {
                id: 4,
                path: '/forget-password',
                label: 'menu-forget-password',
              },
            ],
          },
          {
            id: 2,
            path: '/faq',
            label: 'menu-faq',
          },
          {
            id: 3,
            path: '/privacy',
            label: 'menu-privacy-policy',
          },
          {
            id: 4,
            path: '/terms',
            label: 'menu-terms-condition',
          },
          {
            id: 5,
            path: '/contact-us',
            label: 'menu-contact-us',
          },
          {
            id: 6,
            path: '/checkout',
            label: 'menu-checkout',
          },
          {
            id: 7,
            path: '/collections/mens-collection',
            label: 'menu-collection',
          },
          {
            id: 8,
            path: '/category/man',
            label: 'menu-category',
          },
          {
            id: 9,
            path: '/order',
            label: 'menu-order',
          },
          {
            id: 10,
            path: '/404',
            label: 'menu-404',
          },
        ],
      },
    ],
    mobileMenu: [
      {
        id: 1,
        path: '/',
        label: 'Home',
      },
      {
        id: 2,
        path: '/search?q=uniform',
        label: 'Uniform',
        subMenu: [
          { id: 1, path: '/search?q=kids-uniform', label: 'Kids Uniform' },
          { id: 2, path: '/search?q=mens-uniform', label: 'Men\'s Uniform' },
          { id: 3, path: '/search?q=womens-uniform', label: 'Women\'s Uniform' },
          { id: 4, path: '/search?q=tactical-gear', label: 'Tactical Gear' },
          { id: 5, path: '/search?q=duty-belts', label: 'Duty Belts' },
          { id: 6, path: '/search?q=police-caps', label: 'Police Caps' },
          { id: 7, path: '/search?q=badges-patches', label: 'Badges & Patches' },
          { id: 8, path: '/search?q=footwear', label: 'Footwear' },
          { id: 9, path: '/search?q=high-visibility', label: 'High-Visibility Vests' },
          { id: 10, path: '/search?q=raincoats', label: 'Raincoats' },
          { id: 11, path: '/search?q=winter-jackets', label: 'Winter Jackets' },
          { id: 12, path: '/search?q=formal-wear', label: 'Formal Wear' },
          { id: 13, path: '/search?q=training-apparel', label: 'Training Apparel' },
        ],
      },
      {
        id: 3,
        path: '/search?q=toys',
        label: 'Toys',
        subMenu: [
          { id: 1, path: '/search?q=police-car-models', label: 'Police Car Models' },
          { id: 2, path: '/search?q=rescue-helicopters', label: 'Rescue Helicopters' },
          { id: 3, path: '/search?q=motorcycle-toys', label: 'Motorcycle Toys' },
          { id: 4, path: '/search?q=action-figures', label: 'Action Figures' },
          { id: 5, path: '/search?q=building-sets', label: 'Building Sets' },
          { id: 6, path: '/search?q=remote-control-cars', label: 'Remote Control Cars' },
          { id: 7, path: '/search?q=plush-toys', label: 'Plush Toys' },
          { id: 8, path: '/search?q=puzzles', label: 'Puzzles' },
          { id: 9, path: '/search?q=board-games', label: 'Board Games' },
          { id: 10, path: '/search?q=educational-kits', label: 'Educational Kits' },
          { id: 11, path: '/search?q=miniature-stations', label: 'Miniature Stations' },
          { id: 12, path: '/search?q=play-tents', label: 'Play Tents' },
        ],
      },
      {
        id: 4,
        path: '/search?q=stationary',
        label: 'Stationary',
        subMenu: [
          { id: 1, path: '/search?q=official-notebooks', label: 'Official Notebooks' },
          { id: 2, path: '/search?q=branded-pens', label: 'Branded Pens' },
          { id: 3, path: '/search?q=desk-organizers', label: 'Desk Organizers' },
          { id: 4, path: '/search?q=file-folders', label: 'File Folders' },
          { id: 5, path: '/search?q=document-wallets', label: 'Document Wallets' },
          { id: 6, path: '/search?q=calendars', label: 'Calendars' },
          { id: 7, path: '/search?q=diaries', label: 'Diaries' },
          { id: 8, path: '/search?q=sticky-notes', label: 'Sticky Notes' },
          { id: 9, path: '/search?q=pencil-cases', label: 'Pencil Cases' },
          { id: 10, path: '/search?q=erasers-sharpeners', label: 'Erasers & Sharpeners' },
          { id: 11, path: '/search?q=rulers', label: 'Rulers' },
          { id: 12, path: '/search?q=clipboards', label: 'Clipboards' },
        ],
      },
      {
        id: 5,
        path: '/search?q=souvenir',
        label: 'Souvenir',
        subMenu: [
          { id: 1, path: '/search?q=keychains', label: 'Keychains' },
          { id: 2, path: '/search?q=coffee-mugs', label: 'Coffee Mugs' },
          { id: 3, path: '/search?q=water-bottles', label: 'Water Bottles' },
          { id: 4, path: '/search?q=commemorative-coins', label: 'Commemorative Coins' },
          { id: 5, path: '/search?q=photo-frames', label: 'Photo Frames' },
          { id: 6, path: '/search?q=wall-clocks', label: 'Wall Clocks' },
          { id: 7, path: '/search?q=magnets', label: 'Magnets' },
          { id: 8, path: '/search?q=tote-bags', label: 'Tote Bags' },
          { id: 9, path: '/search?q=t-shirts-souvenir', label: 'T-shirts' },
          { id: 10, path: '/search?q=caps-hats', label: 'Caps & Hats' },
          { id: 11, path: '/search?q=umbrellas', label: 'Umbrellas' },
          { id: 12, path: '/search?q=tech-accessories', label: 'Tech Accessories' },
        ],
      },
      {
        id: 6,
        path: '/search',
        label: 'menu-search',
      },
      {
        id: 7,
        path: '/',
        label: 'menu-pages',
        subMenu: [
          {
            id: 1,
            path: '/',
            label: 'menu-users',
            subMenu: [
              {
                id: 1,
                path: '/my-account',
                label: 'menu-my-account',
              },
              {
                id: 2,
                path: '/signin',
                label: 'menu-sign-in',
              },
              {
                id: 3,
                path: '/signup',
                label: 'menu-sign-up',
              },
              {
                id: 4,
                path: '/forget-password',
                label: 'menu-forget-password',
              },
            ],
          },
          {
            id: 2,
            path: '/faq',
            label: 'menu-faq',
          },
          {
            id: 3,
            path: '/privacy',
            label: 'menu-privacy-policy',
          },
          {
            id: 4,
            path: '/terms',
            label: 'menu-terms-condition',
          },
          {
            id: 5,
            path: '/contact-us',
            label: 'menu-contact-us',
          },
          {
            id: 6,
            path: '/checkout',
            label: 'menu-checkout',
          },
          {
            id: 7,
            path: '/collections/mens-collection',
            label: 'menu-collection',
          },
          {
            id: 8,
            path: '/category/man',
            label: 'menu-category',
          },
          {
            id: 9,
            path: '/order',
            label: 'menu-order',
          },
          {
            id: 10,
            path: '/404',
            label: 'menu-404',
          },
        ],
      },
    ],
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
    categoryMenu: [
      {
        id: 1,
        path: '/',
        label: 'menu-womens-fashion',
        icon: <WomenIcon />,
        columns: [
          {
            id: 1,
            columnItems: [
              {
                id: 1,
                path: '/search?q=top-wear',
                label: 'menu-top-wear',
                columnItemItems: [
                  {
                    id: 1,
                    path: '/search?q=t-shit-shirtrt',
                    label: 'menu-t-shirt',
                  },
                  {
                    id: 2,
                    path: '/search?q=casual-shirts',
                    label: 'menu-casual-shirts',
                  },
                  {
                    id: 3,
                    path: '/search?q=formal-shirts',
                    label: 'menu-formal-shirts',
                  },
                  {
                    id: 4,
                    path: '/search?q=blazwers-coats',
                    label: 'menu-blazwers-coats',
                  },
                  {
                    id: 5,
                    path: '/search?q=suits',
                    label: 'menu-suits',
                  },
                  {
                    id: 6,
                    path: '/search?q=jackets',
                    label: 'menu-jackets',
                  },
                ],
              },
              {
                id: 2,
                path: '/search?q=belt-scarves',
                label: 'menu-belt-scarves',
              },
              {
                id: 3,
                path: '/search?q=watches-wearables',
                label: 'menu-watches-wearables',
              },
            ],
          },
          {
            id: 2,
            columnItems: [
              {
                id: 1,
                path: '/search?q=western-wear',
                label: 'menu-western-wear',
                columnItemItems: [
                  {
                    id: 1,
                    path: '/search?q=dresses',
                    label: 'menu-dresses',
                  },
                  {
                    id: 2,
                    path: '/search?q=jumpsuits',
                    label: 'menu-jumpsuits',
                  },
                  {
                    id: 3,
                    path: '/search?q=tops-t-shirt',
                    label: 'menu-tops-shirts',
                  },
                  {
                    id: 4,
                    path: '/search?q=shorts-skirts',
                    label: 'menu-shorts-skirts',
                  },
                  {
                    id: 5,
                    path: '/search?q=shurgs',
                    label: 'menu-shurgs',
                  },
                  {
                    id: 6,
                    path: '/search?q=blazers',
                    label: 'menu-blazers',
                  },
                ],
              },
              {
                id: 2,
                path: '/search?q=plus-size',
                label: 'menu-plus-size',
              },
              {
                id: 3,
                path: '/search?q=sunglasses-frames',
                label: 'menu-sunglasses-frames',
              },
            ],
          },
          {
            id: 3,
            columnItems: [
              {
                id: 1,
                path: '/search?q=footwear',
                label: 'menu-footwear',
                columnItemItems: [
                  {
                    id: 1,
                    path: '/search?q=flats',
                    label: 'menu-flats',
                  },
                  {
                    id: 2,
                    path: '/search?q=casual-shoes',
                    label: 'menu-casual-shoes',
                  },
                  {
                    id: 3,
                    path: '/search?q=heels',
                    label: 'menu-heels',
                  },
                  {
                    id: 4,
                    path: '/search?q=boots',
                    label: 'menu-boots',
                  },
                ],
              },
              {
                id: 2,
                path: '/search?q=sports-active-wear',
                label: 'menu-sports-active-wear',
                columnItemItems: [
                  {
                    id: 1,
                    path: '/search?q=clothing',
                    label: 'menu-clothing',
                  },
                  {
                    id: 2,
                    path: '/search?q=footwear',
                    label: 'menu-footwear',
                  },
                  {
                    id: 3,
                    path: '/search?q=sports-accessories',
                    label: 'menu-sports-accessories',
                  },
                ],
              },
            ],
          },
        ],
        
        banners: [
          {
            id: 1,
            path: '/search?q=winter',
            label: 'winter',
            image: Banner1,
          },
          {
            id: 2,
            path: '/search?q=summer',
            label: 'summer',
            image: Banner2,
          },
        ],
      },
      {
        id: 2,
        path: '/',
        label: 'menu-mens-fashion',
        icon: <MenIcon />,
        columns: [
          {
            id: 1,
            columnItems: [
              {
                id: 1,
                path: '/search?q=top-wear',
                label: 'menu-top-wear',
                columnItemItems: [
                  {
                    id: 1,
                    path: '/search?q=t-shit-shirtrt',
                    label: 'menu-t-shirt',
                  },
                  {
                    id: 2,
                    path: '/search?q=casual-shirts',
                    label: 'menu-casual-shirts',
                  },
                  {
                    id: 3,
                    path: '/search?q=formal-shirts',
                    label: 'menu-formal-shirts',
                  },
                  {
                    id: 4,
                    path: '/search?q=blazwers-coats',
                    label: 'menu-blazwers-coats',
                  },
                  {
                    id: 5,
                    path: '/search?q=suits',
                    label: 'menu-suits',
                  },
                  {
                    id: 6,
                    path: '/search?q=jackets',
                    label: 'menu-jackets',
                  },
                ],
              },
              {
                id: 2,
                path: '/search?q=belt-scarves',
                label: 'menu-belt-scarves',
              },
              {
                id: 3,
                path: '/search?q=watches-wearables',
                label: 'menu-watches-wearables',
              },
            ],
          },
          {
            id: 2,
            columnItems: [
              {
                id: 1,
                path: '/search?q=western-wear',
                label: 'menu-western-wear',
                columnItemItems: [
                  {
                    id: 1,
                    path: '/search?q=dresses',
                    label: 'menu-dresses',
                  },
                  {
                    id: 2,
                    path: '/search?q=jumpsuits',
                    label: 'menu-jumpsuits',
                  },
                  {
                    id: 3,
                    path: '/search?q=tops-t-shirt',
                    label: 'menu-tops-shirts',
                  },
                  {
                    id: 4,
                    path: '/search?q=shorts-skirts',
                    label: 'menu-shorts-skirts',
                  },
                  {
                    id: 5,
                    path: '/search?q=shurgs',
                    label: 'menu-shurgs',
                  },
                  {
                    id: 6,
                    path: '/search?q=blazers',
                    label: 'menu-blazers',
                  },
                ],
              },
              {
                id: 2,
                path: '/search?q=plus-size',
                label: 'menu-plus-size',
              },
              {
                id: 3,
                path: '/search?q=sunglasses-frames',
                label: 'menu-sunglasses-frames',
              },
            ],
          },
          {
            id: 3,
            columnItems: [
              {
                id: 1,
                path: '/search?q=footwear',
                label: 'menu-footwear',
                columnItemItems: [
                  {
                    id: 1,
                    path: '/search?q=flats',
                    label: 'menu-flats',
                  },
                  {
                    id: 2,
                    path: '/search?q=casual-shoes',
                    label: 'menu-casual-shoes',
                  },
                  {
                    id: 3,
                    path: '/search?q=heels',
                    label: 'menu-heels',
                  },
                  {
                    id: 4,
                    path: '/search?q=boots',
                    label: 'menu-boots',
                  },
                ],
              },
              {
                id: 2,
                path: '/search?q=sports-active-wear',
                label: 'menu-sports-active-wear',
                columnItemItems: [
                  {
                    id: 1,
                    path: '/search?q=clothing',
                    label: 'menu-clothing',
                  },
                  {
                    id: 2,
                    path: '/search?q=footwear',
                    label: 'menu-footwear',
                  },
                  {
                    id: 3,
                    path: '/search?q=sports-accessories',
                    label: 'menu-sports-accessories',
                  },
                ],
              },
            ],
          },
        ],
        
        banners: [
          {
            id: 1,
            path: '/search?q=winter',
            label: 'winter',
            image: Banner1,
          },
          {
            id: 2,
            path: '/search?q=summer',
            label: 'summer',
            image: Banner2,
          },
        ],
      },
      {
        id: 3,
        path: '/',
        label: 'menu-watches',
        icon: <WatchIcon />,
        columns: [
          {
            id: 1,
            columnItems: [
              {
                id: 1,
                path: '/search?q=top-wear',
                label: 'menu-top-wear',
                columnItemItems: [
                  {
                    id: 1,
                    path: '/search?q=t-shit-shirtrt',
                    label: 'menu-t-shirt',
                  },
                  {
                    id: 2,
                    path: '/search?q=casual-shirts',
                    label: 'menu-casual-shirts',
                  },
                  {
                    id: 3,
                    path: '/search?q=formal-shirts',
                    label: 'menu-formal-shirts',
                  },
                  {
                    id: 4,
                    path: '/search?q=blazwers-coats',
                    label: 'menu-blazwers-coats',
                  },
                  {
                    id: 5,
                    path: '/search?q=suits',
                    label: 'menu-suits',
                  },
                  {
                    id: 6,
                    path: '/search?q=jackets',
                    label: 'menu-jackets',
                  },
                ],
              },
              {
                id: 2,
                path: '/search?q=belt-scarves',
                label: 'menu-belt-scarves',
              },
              {
                id: 3,
                path: '/search?q=watches-wearables',
                label: 'menu-watches-wearables',
              },
            ],
          },
          {
            id: 2,
            columnItems: [
              {
                id: 1,
                path: '/search?q=western-wear',
                label: 'menu-western-wear',
                columnItemItems: [
                  {
                    id: 1,
                    path: '/search?q=dresses',
                    label: 'menu-dresses',
                  },
                  {
                    id: 2,
                    path: '/search?q=jumpsuits',
                    label: 'menu-jumpsuits',
                  },
                  {
                    id: 3,
                    path: '/search?q=tops-t-shirt',
                    label: 'menu-tops-shirts',
                  },
                  {
                    id: 4,
                    path: '/search?q=shorts-skirts',
                    label: 'menu-shorts-skirts',
                  },
                  {
                    id: 5,
                    path: '/search?q=shurgs',
                    label: 'menu-shurgs',
                  },
                  {
                    id: 6,
                    path: '/search?q=blazers',
                    label: 'menu-blazers',
                  },
                ],
              },
              {
                id: 2,
                path: '/search?q=plus-size',
                label: 'menu-plus-size',
              },
              {
                id: 3,
                path: '/search?q=sunglasses-frames',
                label: 'menu-sunglasses-frames',
              },
            ],
          },
          {
            id: 3,
            columnItems: [
              {
                id: 1,
                path: '/search?q=footwear',
                label: 'menu-footwear',
                columnItemItems: [
                  {
                    id: 1,
                    path: '/search?q=flats',
                    label: 'menu-flats',
                  },
                  {
                    id: 2,
                    path: '/search?q=casual-shoes',
                    label: 'menu-casual-shoes',
                  },
                  {
                    id: 3,
                    path: '/search?q=heels',
                    label: 'menu-heels',
                  },
                  {
                    id: 4,
                    path: '/search?q=boots',
                    label: 'menu-boots',
                  },
                ],
              },
              {
                id: 2,
                path: '/search?q=sports-active-wear',
                label: 'menu-sports-active-wear',
                columnItemItems: [
                  {
                    id: 1,
                    path: '/search?q=clothing',
                    label: 'menu-clothing',
                  },
                  {
                    id: 2,
                    path: '/search?q=footwear',
                    label: 'menu-footwear',
                  },
                  {
                    id: 3,
                    path: '/search?q=sports-accessories',
                    label: 'menu-sports-accessories',
                  },
                ],
              },
            ],
          },
        ],
        
        banners: [
          {
            id: 1,
            path: '/search?q=winter',
            label: 'winter',
            image: Banner1,
          },
          {
            id: 2,
            path: '/search?q=summer',
            label: 'summer',
            image: Banner2,
          },
        ],
      },
      {
        id: 4,
        path: '/',
        label: 'menu-wallets',
        icon: <WalletIcon />,
        columns: [
          {
            id: 1,
            columnItems: [
              {
                id: 1,
                path: '/search?q=top-wear',
                label: 'menu-top-wear',
                columnItemItems: [
                  {
                    id: 1,
                    path: '/search?q=t-shit-shirtrt',
                    label: 'menu-t-shirt',
                  },
                  {
                    id: 2,
                    path: '/search?q=casual-shirts',
                    label: 'menu-casual-shirts',
                  },
                  {
                    id: 3,
                    path: '/search?q=formal-shirts',
                    label: 'menu-formal-shirts',
                  },
                  {
                    id: 4,
                    path: '/search?q=blazwers-coats',
                    label: 'menu-blazwers-coats',
                  },
                  {
                    id: 5,
                    path: '/search?q=suits',
                    label: 'menu-suits',
                  },
                  {
                    id: 6,
                    path: '/search?q=jackets',
                    label: 'menu-jackets',
                  },
                ],
              },
              {
                id: 2,
                path: '/search?q=belt-scarves',
                label: 'menu-belt-scarves',
              },
              {
                id: 3,
                path: '/search?q=watches-wearables',
                label: 'menu-watches-wearables',
              },
            ],
          },
          {
            id: 2,
            columnItems: [
              {
                id: 1,
                path: '/search?q=western-wear',
                label: 'menu-western-wear',
                columnItemItems: [
                  {
                    id: 1,
                    path: '/search?q=dresses',
                    label: 'menu-dresses',
                  },
                  {
                    id: 2,
                    path: '/search?q=jumpsuits',
                    label: 'menu-jumpsuits',
                  },
                  {
                    id: 3,
                    path: '/search?q=tops-t-shirt',
                    label: 'menu-tops-shirts',
                  },
                  {
                    id: 4,
                    path: '/search?q=shorts-skirts',
                    label: 'menu-shorts-skirts',
                  },
                  {
                    id: 5,
                    path: '/search?q=shurgs',
                    label: 'menu-shurgs',
                  },
                  {
                    id: 6,
                    path: '/search?q=blazers',
                    label: 'menu-blazers',
                  },
                ],
              },
              {
                id: 2,
                path: '/search?q=plus-size',
                label: 'menu-plus-size',
              },
              {
                id: 3,
                path: '/search?q=sunglasses-frames',
                label: 'menu-sunglasses-frames',
              },
            ],
          },
          {
            id: 3,
            columnItems: [
              {
                id: 1,
                path: '/search?q=footwear',
                label: 'menu-footwear',
                columnItemItems: [
                  {
                    id: 1,
                    path: '/search?q=flats',
                    label: 'menu-flats',
                  },
                  {
                    id: 2,
                    path: '/search?q=casual-shoes',
                    label: 'menu-casual-shoes',
                  },
                  {
                    id: 3,
                    path: '/search?q=heels',
                    label: 'menu-heels',
                  },
                  {
                    id: 4,
                    path: '/search?q=boots',
                    label: 'menu-boots',
                  },
                ],
              },
              {
                id: 2,
                path: '/search?q=sports-active-wear',
                label: 'menu-sports-active-wear',
                columnItemItems: [
                  {
                    id: 1,
                    path: '/search?q=clothing',
                    label: 'menu-clothing',
                  },
                  {
                    id: 2,
                    path: '/search?q=footwear',
                    label: 'menu-footwear',
                  },
                  {
                    id: 3,
                    path: '/search?q=sports-accessories',
                    label: 'menu-sports-accessories',
                  },
                ],
              },
            ],
          },
        ],
        
        banners: [
          {
            id: 1,
            path: '/search?q=winter',
            label: 'winter',
            image: Banner1,
          },
          {
            id: 2,
            path: '/search?q=summer',
            label: 'summer',
            image: Banner2,
          },
        ],
      },
      {
        id: 5,
        path: '/',
        label: 'menu-bags',
        icon: <BagIcon />,
        columns: [
          {
            id: 1,
            columnItems: [
              {
                id: 1,
                path: '/search?q=top-wear',
                label: 'menu-top-wear',
                columnItemItems: [
                  {
                    id: 1,
                    path: '/search?q=t-shit-shirtrt',
                    label: 'menu-t-shirt',
                  },
                  {
                    id: 2,
                    path: '/search?q=casual-shirts',
                    label: 'menu-casual-shirts',
                  },
                  {
                    id: 3,
                    path: '/search?q=formal-shirts',
                    label: 'menu-formal-shirts',
                  },
                  {
                    id: 4,
                    path: '/search?q=blazwers-coats',
                    label: 'menu-blazwers-coats',
                  },
                  {
                    id: 5,
                    path: '/search?q=suits',
                    label: 'menu-suits',
                  },
                  {
                    id: 6,
                    path: '/search?q=jackets',
                    label: 'menu-jackets',
                  },
                ],
              },
              {
                id: 2,
                path: '/search?q=belt-scarves',
                label: 'menu-belt-scarves',
              },
              {
                id: 3,
                path: '/search?q=watches-wearables',
                label: 'menu-watches-wearables',
              },
            ],
          },
          {
            id: 2,
            columnItems: [
              {
                id: 1,
                path: '/search?q=western-wear',
                label: 'menu-western-wear',
                columnItemItems: [
                  {
                    id: 1,
                    path: '/search?q=dresses',
                    label: 'menu-dresses',
                  },
                  {
                    id: 2,
                    path: '/search?q=jumpsuits',
                    label: 'menu-jumpsuits',
                  },
                  {
                    id: 3,
                    path: '/search?q=tops-t-shirt',
                    label: 'menu-tops-shirts',
                  },
                  {
                    id: 4,
                    path: '/search?q=shorts-skirts',
                    label: 'menu-shorts-skirts',
                  },
                  {
                    id: 5,
                    path: '/search?q=shurgs',
                    label: 'menu-shurgs',
                  },
                  {
                    id: 6,
                    path: '/search?q=blazers',
                    label: 'menu-blazers',
                  },
                ],
              },
              {
                id: 2,
                path: '/search?q=plus-size',
                label: 'menu-plus-size',
              },
              {
                id: 3,
                path: '/search?q=sunglasses-frames',
                label: 'menu-sunglasses-frames',
              },
            ],
          },
          {
            id: 3,
            columnItems: [
              {
                id: 1,
                path: '/search?q=footwear',
                label: 'menu-footwear',
                columnItemItems: [
                  {
                    id: 1,
                    path: '/search?q=flats',
                    label: 'menu-flats',
                  },
                  {
                    id: 2,
                    path: '/search?q=casual-shoes',
                    label: 'menu-casual-shoes',
                  },
                  {
                    id: 3,
                    path: '/search?q=heels',
                    label: 'menu-heels',
                  },
                  {
                    id: 4,
                    path: '/search?q=boots',
                    label: 'menu-boots',
                  },
                ],
              },
              {
                id: 2,
                path: '/search?q=sports-active-wear',
                label: 'menu-sports-active-wear',
                columnItemItems: [
                  {
                    id: 1,
                    path: '/search?q=clothing',
                    label: 'menu-clothing',
                  },
                  {
                    id: 2,
                    path: '/search?q=footwear',
                    label: 'menu-footwear',
                  },
                  {
                    id: 3,
                    path: '/search?q=sports-accessories',
                    label: 'menu-sports-accessories',
                  },
                ],
              },
            ],
          },
        ],
        
        banners: [
          {
            id: 1,
            path: '/search?q=winter',
            label: 'winter',
            image: Banner1,
          },
          {
            id: 2,
            path: '/search?q=summer',
            label: 'summer',
            image: Banner2,
          },
        ],
      },
      {
        id: 6,
        path: '/',
        label: 'menu-jewelry',
        icon: <JewelryIcon />,
        columns: [
          {
            id: 1,
            columnItems: [
              {
                id: 1,
                path: '/search?q=top-wear',
                label: 'menu-top-wear',
                columnItemItems: [
                  {
                    id: 1,
                    path: '/search?q=t-shit-shirtrt',
                    label: 'menu-t-shirt',
                  },
                  {
                    id: 2,
                    path: '/search?q=casual-shirts',
                    label: 'menu-casual-shirts',
                  },
                  {
                    id: 3,
                    path: '/search?q=formal-shirts',
                    label: 'menu-formal-shirts',
                  },
                  {
                    id: 4,
                    path: '/search?q=blazwers-coats',
                    label: 'menu-blazwers-coats',
                  },
                  {
                    id: 5,
                    path: '/search?q=suits',
                    label: 'menu-suits',
                  },
                  {
                    id: 6,
                    path: '/search?q=jackets',
                    label: 'menu-jackets',
                  },
                ],
              },
              {
                id: 2,
                path: '/search?q=belt-scarves',
                label: 'menu-belt-scarves',
              },
              {
                id: 3,
                path: '/search?q=watches-wearables',
                label: 'menu-watches-wearables',
              },
            ],
          },
          {
            id: 2,
            columnItems: [
              {
                id: 1,
                path: '/search?q=western-wear',
                label: 'menu-western-wear',
                columnItemItems: [
                  {
                    id: 1,
                    path: '/search?q=dresses',
                    label: 'menu-dresses',
                  },
                  {
                    id: 2,
                    path: '/search?q=jumpsuits',
                    label: 'menu-jumpsuits',
                  },
                  {
                    id: 3,
                    path: '/search?q=tops-t-shirt',
                    label: 'menu-tops-shirts',
                  },
                  {
                    id: 4,
                    path: '/search?q=shorts-skirts',
                    label: 'menu-shorts-skirts',
                  },
                  {
                    id: 5,
                    path: '/search?q=shurgs',
                    label: 'menu-shurgs',
                  },
                  {
                    id: 6,
                    path: '/search?q=blazers',
                    label: 'menu-blazers',
                  },
                ],
              },
              {
                id: 2,
                path: '/search?q=plus-size',
                label: 'menu-plus-size',
              },
              {
                id: 3,
                path: '/search?q=sunglasses-frames',
                label: 'menu-sunglasses-frames',
              },
            ],
          },
          {
            id: 3,
            columnItems: [
              {
                id: 1,
                path: '/search?q=footwear',
                label: 'menu-footwear',
                columnItemItems: [
                  {
                    id: 1,
                    path: '/search?q=flats',
                    label: 'menu-flats',
                  },
                  {
                    id: 2,
                    path: '/search?q=casual-shoes',
                    label: 'menu-casual-shoes',
                  },
                  {
                    id: 3,
                    path: '/search?q=heels',
                    label: 'menu-heels',
                  },
                  {
                    id: 4,
                    path: '/search?q=boots',
                    label: 'menu-boots',
                  },
                ],
              },
              {
                id: 2,
                path: '/search?q=sports-active-wear',
                label: 'menu-sports-active-wear',
                columnItemItems: [
                  {
                    id: 1,
                    path: '/search?q=clothing',
                    label: 'menu-clothing',
                  },
                  {
                    id: 2,
                    path: '/search?q=footwear',
                    label: 'menu-footwear',
                  },
                  {
                    id: 3,
                    path: '/search?q=sports-accessories',
                    label: 'menu-sports-accessories',
                  },
                ],
              },
            ],
          },
        ],
        
        banners: [
          {
            id: 1,
            path: '/search?q=winter',
            label: 'winter',
            image: Banner1,
          },
          {
            id: 2,
            path: '/search?q=summer',
            label: 'summer',
            image: Banner2,
          },
        ],
      },
      {
        id: 7,
        path: '/',
        label: 'menu-sunglasses',
        icon: <SunglassIcon />,
        columns: [
          {
            id: 1,
            columnItems: [
              {
                id: 1,
                path: '/search?q=top-wear',
                label: 'menu-top-wear',
                columnItemItems: [
                  {
                    id: 1,
                    path: '/search?q=t-shit-shirtrt',
                    label: 'menu-t-shirt',
                  },
                  {
                    id: 2,
                    path: '/search?q=casual-shirts',
                    label: 'menu-casual-shirts',
                  },
                  {
                    id: 3,
                    path: '/search?q=formal-shirts',
                    label: 'menu-formal-shirts',
                  },
                  {
                    id: 4,
                    path: '/search?q=blazwers-coats',
                    label: 'menu-blazwers-coats',
                  },
                  {
                    id: 5,
                    path: '/search?q=suits',
                    label: 'menu-suits',
                  },
                  {
                    id: 6,
                    path: '/search?q=jackets',
                    label: 'menu-jackets',
                  },
                ],
              },
              {
                id: 2,
                path: '/search?q=belt-scarves',
                label: 'menu-belt-scarves',
              },
              {
                id: 3,
                path: '/search?q=watches-wearables',
                label: 'menu-watches-wearables',
              },
            ],
          },
          {
            id: 2,
            columnItems: [
              {
                id: 1,
                path: '/search?q=western-wear',
                label: 'menu-western-wear',
                columnItemItems: [
                  {
                    id: 1,
                    path: '/search?q=dresses',
                    label: 'menu-dresses',
                  },
                  {
                    id: 2,
                    path: '/search?q=jumpsuits',
                    label: 'menu-jumpsuits',
                  },
                  {
                    id: 3,
                    path: '/search?q=tops-t-shirt',
                    label: 'menu-tops-shirts',
                  },
                  {
                    id: 4,
                    path: '/search?q=shorts-skirts',
                    label: 'menu-shorts-skirts',
                  },
                  {
                    id: 5,
                    path: '/search?q=shurgs',
                    label: 'menu-shurgs',
                  },
                  {
                    id: 6,
                    path: '/search?q=blazers',
                    label: 'menu-blazers',
                  },
                ],
              },
              {
                id: 2,
                path: '/search?q=plus-size',
                label: 'menu-plus-size',
              },
              {
                id: 3,
                path: '/search?q=sunglasses-frames',
                label: 'menu-sunglasses-frames',
              },
            ],
          },
          {
            id: 3,
            columnItems: [
              {
                id: 1,
                path: '/search?q=footwear',
                label: 'menu-footwear',
                columnItemItems: [
                  {
                    id: 1,
                    path: '/search?q=flats',
                    label: 'menu-flats',
                  },
                  {
                    id: 2,
                    path: '/search?q=casual-shoes',
                    label: 'menu-casual-shoes',
                  },
                  {
                    id: 3,
                    path: '/search?q=heels',
                    label: 'menu-heels',
                  },
                  {
                    id: 4,
                    path: '/search?q=boots',
                    label: 'menu-boots',
                  },
                ],
              },
              {
                id: 2,
                path: '/search?q=sports-active-wear',
                label: 'menu-sports-active-wear',
                columnItemItems: [
                  {
                    id: 1,
                    path: '/search?q=clothing',
                    label: 'menu-clothing',
                  },
                  {
                    id: 2,
                    path: '/search?q=footwear',
                    label: 'menu-footwear',
                  },
                  {
                    id: 3,
                    path: '/search?q=sports-accessories',
                    label: 'menu-sports-accessories',
                  },
                ],
              },
            ],
          },
        ],
        
        banners: [
          {
            id: 1,
            path: '/search?q=winter',
            label: 'winter',
            image: Banner1,
          },
          {
            id: 2,
            path: '/search?q=summer',
            label: 'summer',
            image: Banner2,
          },
        ],
      },
      {
        id: 8,
        path: '/',
        label: 'menu-sneakers',
        icon: <SneakerIcon />,
        columns: [
          {
            id: 1,
            columnItems: [
              {
                id: 1,
                path: '/search?q=top-wear',
                label: 'menu-top-wear',
                columnItemItems: [
                  {
                    id: 1,
                    path: '/search?q=t-shit-shirtrt',
                    label: 'menu-t-shirt',
                  },
                  {
                    id: 2,
                    path: '/search?q=casual-shirts',
                    label: 'menu-casual-shirts',
                  },
                  {
                    id: 3,
                    path: '/search?q=formal-shirts',
                    label: 'menu-formal-shirts',
                  },
                  {
                    id: 4,
                    path: '/search?q=blazwers-coats',
                    label: 'menu-blazwers-coats',
                  },
                  {
                    id: 5,
                    path: '/search?q=suits',
                    label: 'menu-suits',
                  },
                  {
                    id: 6,
                    path: '/search?q=jackets',
                    label: 'menu-jackets',
                  },
                ],
              },
              {
                id: 2,
                path: '/search?q=belt-scarves',
                label: 'menu-belt-scarves',
              },
              {
                id: 3,
                path: '/search?q=watches-wearables',
                label: 'menu-watches-wearables',
              },
            ],
          },
          {
            id: 2,
            columnItems: [
              {
                id: 1,
                path: '/search?q=western-wear',
                label: 'menu-western-wear',
                columnItemItems: [
                  {
                    id: 1,
                    path: '/search?q=dresses',
                    label: 'menu-dresses',
                  },
                  {
                    id: 2,
                    path: '/search?q=jumpsuits',
                    label: 'menu-jumpsuits',
                  },
                  {
                    id: 3,
                    path: '/search?q=tops-t-shirt',
                    label: 'menu-tops-shirts',
                  },
                  {
                    id: 4,
                    path: '/search?q=shorts-skirts',
                    label: 'menu-shorts-skirts',
                  },
                  {
                    id: 5,
                    path: '/search?q=shurgs',
                    label: 'menu-shurgs',
                  },
                  {
                    id: 6,
                    path: '/search?q=blazers',
                    label: 'menu-blazers',
                  },
                ],
              },
              {
                id: 2,
                path: '/search?q=plus-size',
                label: 'menu-plus-size',
              },
              {
                id: 3,
                path: '/search?q=sunglasses-frames',
                label: 'menu-sunglasses-frames',
              },
            ],
          },
          {
            id: 3,
            columnItems: [
              {
                id: 1,
                path: '/search?q=footwear',
                label: 'menu-footwear',
                columnItemItems: [
                  {
                    id: 1,
                    path: '/search?q=flats',
                    label: 'menu-flats',
                  },
                  {
                    id: 2,
                    path: '/search?q=casual-shoes',
                    label: 'menu-casual-shoes',
                  },
                  {
                    id: 3,
                    path: '/search?q=heels',
                    label: 'menu-heels',
                  },
                  {
                    id: 4,
                    path: '/search?q=boots',
                    label: 'menu-boots',
                  },
                ],
              },
              {
                id: 2,
                path: '/search?q=sports-active-wear',
                label: 'menu-sports-active-wear',
                columnItemItems: [
                  {
                    id: 1,
                    path: '/search?q=clothing',
                    label: 'menu-clothing',
                  },
                  {
                    id: 2,
                    path: '/search?q=footwear',
                    label: 'menu-footwear',
                  },
                  {
                    id: 3,
                    path: '/search?q=sports-accessories',
                    label: 'menu-sports-accessories',
                  },
                ],
              },
            ],
          },
        ],
        
        banners: [
          {
            id: 1,
            path: '/search?q=winter',
            label: 'winter',
            image: Banner1,
          },
          {
            id: 2,
            path: '/search?q=summer',
            label: 'summer',
            image: Banner2,
          },
        ],
      },
    ],
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
