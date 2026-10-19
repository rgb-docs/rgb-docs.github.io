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
  onBrokenLinks: 'throw',
  onBrokenAnchors: 'throw',

  // Future-proof
  future: {
    v4: true,
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  // Mermaid support
  themes: ['@docusaurus/theme-mermaid'],
  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'throw',
    },
  },

  // Head tags for additional SEO and OGP
  headTags: [
    // Canonical URL
    {
      tagName: 'link',
      attributes: {
        rel: 'canonical',
        href: 'https://rgb-docs.github.io',
      },
    },
    // JSON-LD Schema for better SEO
    {
      tagName: 'script',
      attributes: {
        type: 'application/ld+json',
      },
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'TechArticle',
        headline: 'RGB Protocol Documentation',
        description: 'Complete technical documentation for RGB Protocol v0.12 - Smart contracts for Bitcoin and Lightning Network',
        author: {
          '@type': 'Organization',
          name: 'RGB Docs community',
          url: 'https://github.com/rgb-docs',
        },
        publisher: {
          '@type': 'Organization',
          name: 'RGB Docs community',
          logo: {
            '@type': 'ImageObject',
            url: 'https://rgb-docs.github.io/img/logo.png',
          },
        },
        url: 'https://rgb-docs.github.io',
        image: 'https://rgb-docs.github.io/img/rgb-social-card.png',
        keywords: 'RGB, Bitcoin, Smart Contracts, Lightning Network, Client-side Validation, AluVM',
        inLanguage: 'en',
      }),
    },
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/rgb-docs/rgb-docs.github.io/tree/main/',
          routeBasePath: '/',  // Docs at root, not /docs/
          showLastUpdateTime: true,
        },
        blog: false,  // Disable blog
        theme: {
          customCss: './src/css/custom.css',
        },
        sitemap: {
          changefreq: 'weekly',
          priority: 0.5,
          ignorePatterns: ['/tags/**'],
          filename: 'sitemap.xml',
        },
        gtag: {
          trackingID: 'G-XXXXXXXXXX', // Replace with actual Google Analytics ID if needed
          anonymizeIP: true,
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Social card for link previews
    image: 'img/rgb-social-card.png',

    // SEO metadata
    metadata: [
      // General SEO
      {name: 'keywords', content: 'RGB, Bitcoin, Smart Contracts, Lightning Network, Client-side Validation, AluVM, RGB20, RGB21, RGB25, Tapret, NFT, DeFi'},
      {name: 'description', content: 'Technical documentation for RGB Protocol v0.12 - Smart contracts for Bitcoin and Lightning Network with client-side validation'},
      {name: 'author', content: 'RGB Docs community'},

      // Open Graph Protocol
      {property: 'og:type', content: 'website'},
      {property: 'og:site_name', content: 'RGB Protocol Documentation'},
      {property: 'og:title', content: 'RGB Protocol Docs - Smart Contracts for Bitcoin'},
      {property: 'og:description', content: 'Complete technical documentation for RGB v0.12: client-side validation, AluVM virtual machine, RGB20/RGB21 tokens, Bitcoin commitments, and Lightning Network integration.'},
      {property: 'og:image', content: 'https://rgb-docs.github.io/img/rgb-social-card.png'},
      {property: 'og:image:width', content: '1200'},
      {property: 'og:image:height', content: '630'},
      {property: 'og:image:alt', content: 'RGB Protocol - Smart Contracts for Bitcoin and Lightning Network'},
      {property: 'og:url', content: 'https://rgb-docs.github.io'},
      {property: 'og:locale', content: 'en_US'},

      // Twitter Card
      {name: 'twitter:card', content: 'summary_large_image'},
      {name: 'twitter:site', content: '@RGB_Protocol'},
      {name: 'twitter:title', content: 'RGB Protocol Docs - Smart Contracts for Bitcoin'},
      {name: 'twitter:description', content: 'Complete technical documentation for RGB v0.12: client-side validation, AluVM, RGB20/RGB21 tokens, and Lightning integration.'},
      {name: 'twitter:image', content: 'https://rgb-docs.github.io/img/rgb-social-card.png'},
      {name: 'twitter:image:alt', content: 'RGB Protocol Documentation'},

      // Additional SEO
      {name: 'robots', content: 'index, follow'},
      {name: 'googlebot', content: 'index, follow'},
      {name: 'theme-color', content: '#7C4DFF'},
      {name: 'apple-mobile-web-app-capable', content: 'yes'},
      {name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent'},
    ],

    // Color mode
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },

    // Optional announcement bar
    announcementBar: {
      id: 'rewrite_2026_10',
      content: 'These docs are being rewritten for the two RGB lines: v0.12 (RGB-WG, release candidate 0.12.0-rc.3) and v0.11 (RGB Protocol Association, 0.11.1). Many pages predate the split. Check every command against rgb --help before using real funds.',
      backgroundColor: '#B45309',
      textColor: '#fff',
      isCloseable: false,
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
          to: '/technical-reference/cli',
          label: 'Reference',
          position: 'left',
        },
        {
          to: '/playground',
          label: '🎮 Playground',
          position: 'left',
        },
        {
          type: 'dropdown',
          label: 'Ecosystem',
          position: 'left',
          items: [
            {label: 'Ecosystem overview', to: '/technical-reference/ecosystem'},
            {type: 'html', value: '<hr style="margin: 0.5rem 0;">'},
            {label: 'v0.12: rgb.tech', href: 'https://rgb.tech'},
            {label: 'v0.12: RGB-WG on GitHub', href: 'https://github.com/RGB-WG'},
            {type: 'html', value: '<hr style="margin: 0.5rem 0;">'},
            {label: 'v0.11: rgb.info', href: 'https://rgb.info'},
            {label: 'v0.11: rgb-protocol on GitHub', href: 'https://github.com/rgb-protocol'},
            {label: 'v0.11: RGB-Tools on GitHub', href: 'https://github.com/RGB-Tools'},
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
      copyright: `Copyright © ${new Date().getFullYear()} RGB Community. Licensed under <a href="http://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a>.`,
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
