import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  // Basic site metadata
  title: 'RGB Protocol Docs',
  tagline: 'Smart Contracts for Bitcoin and Lightning Network',
  favicon: 'img/favicon.ico',

  // Deployment configuration
  url: 'https://rgb-docs.github.io',
  baseUrl: '/',
  organizationName: 'rgb-docs',
  projectName: 'rgb-docs.github.io',

  // Recommended settings
  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  // Future-proof
  future: {
    v4: true,
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/rgb-docs/rgb-docs.github.io/tree/main/',
          routeBasePath: '/',  // Docs at root, not /docs/
        },
        blog: false,  // Disable blog
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Social card for link previews
    image: 'img/rgb-social-card.png',

    // SEO metadata
    metadata: [
      {name: 'keywords', content: 'RGB, Bitcoin, Smart Contracts, Lightning Network, Client-side Validation, AluVM, RGB20, RGB21'},
      {name: 'description', content: 'Technical documentation for RGB Protocol v0.12 - Smart contracts for Bitcoin and Lightning Network with client-side validation'},
      {property: 'og:type', content: 'website'},
    ],

    // Color mode
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },

    // Optional announcement bar
    announcementBar: {
      id: 'v012_release',
      content: 'RGB v0.12 is now production-ready! <a href="/getting-started/introduction">Get Started</a>',
      backgroundColor: '#7C4DFF',
      textColor: '#fff',
      isCloseable: true,
    },

    // Navigation bar
    navbar: {
      title: 'RGB Protocol',
      logo: {
        alt: 'RGB Logo',
        src: 'img/logo.png',
        width: 32,
        height: 32,
      },
      items: [
        {
          to: '/getting-started/introduction',
          label: 'Getting Started',
          position: 'left',
        },
        {
          to: '/core-concepts/overview',
          label: 'Core Concepts',
          position: 'left',
        },
        {
          to: '/guides/overview',
          label: 'Guides',
          position: 'left',
        },
        {
          to: '/technical-reference/api',
          label: 'Reference',
          position: 'left',
        },
        {
          type: 'dropdown',
          label: 'Ecosystem',
          position: 'left',
          items: [
            {label: 'GitHub', href: 'https://github.com/RGB-WG'},
            {label: 'rgbjs', href: 'https://rgbjs.com'},
            {label: 'RGB.tech', href: 'https://rgb.tech'},
            {type: 'html', value: '<hr style="margin: 0.5rem 0;">'},
            {label: 'Community', href: 'https://rgb.tech/community'},
          ],
        },
        {
          href: 'https://github.com/rgb-docs/rgb-docs.github.io',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },

    // Footer
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Learn',
          items: [
            {label: 'Introduction', to: '/getting-started/introduction'},
            {label: 'Core Concepts', to: '/core-concepts/overview'},
            {label: 'Guides', to: '/guides/overview'},
          ],
        },
        {
          title: 'Community',
          items: [
            {label: 'GitHub', href: 'https://github.com/RGB-WG'},
            {label: 'Telegram', href: 'https://t.me/rgbtelegram'},
            {label: 'Twitter', href: 'https://twitter.com/rgb_protocol'},
          ],
        },
        {
          title: 'More',
          items: [
            {label: 'RGB.tech', href: 'https://rgb.tech'},
            {label: 'Releases', href: 'https://github.com/RGB-WG/rgb-core/releases'},
            {label: 'FAQ', href: 'https://www.rgbfaq.com'},
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} RGB Community. Built with Docusaurus.`,
    },

    // Code syntax highlighting
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json', 'typescript', 'rust', 'toml'],
    },

    // Table of contents depth
    tableOfContents: {
      minHeadingLevel: 2,
      maxHeadingLevel: 4,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
