import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  mainSidebar: [
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: [
        'getting-started/introduction',
        'getting-started/installation',
        'getting-started/quick-start',
        'getting-started/whats-new-0-12',
      ],
    },
    {
      type: 'category',
      label: 'Core Concepts',
      collapsed: true,
      items: [
        'core-concepts/overview',
        'core-concepts/client-side-validation',
        'core-concepts/single-use-seals',
        'core-concepts/prism-computing',
        {
          type: 'category',
          label: 'AluVM',
          collapsed: true,
          items: [
            'core-concepts/aluvm/overview',
            'core-concepts/aluvm/instruction-set',
            'core-concepts/aluvm/memory-model',
          ],
        },
        {
          type: 'category',
          label: 'State Management',
          collapsed: true,
          items: [
            'core-concepts/state/unified-state',
            'core-concepts/state/owned-state',
            'core-concepts/state/global-state',
          ],
        },
        {
          type: 'category',
          label: 'Bitcoin Integration',
          collapsed: true,
          items: [
            'core-concepts/bitcoin/deterministic-commitments',
            'core-concepts/bitcoin/tapret',
            'core-concepts/bitcoin/opret',
            'core-concepts/bitcoin/multi-protocol-commitments',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Guides',
      collapsed: true,
      items: [
        'guides/overview',
        {
          type: 'category',
          label: 'RGB20 (Fungible Assets)',
          collapsed: true,
          items: [
            'guides/rgb20/creating-tokens',
            'guides/rgb20/transferring-assets',
            'guides/rgb20/secondary-issuance',
          ],
        },
        {
          type: 'category',
          label: 'RGB21 (NFTs)',
          collapsed: true,
          items: [
            'guides/rgb21/creating-nfts',
            'guides/rgb21/metadata-attachments',
            'guides/rgb21/transferring-nfts',
          ],
        },
        {
          type: 'category',
          label: 'Smart Contracts',
          collapsed: true,
          items: [
            'guides/contracts/schemas',
            'guides/contracts/contractum',
            'guides/contracts/genesis',
            'guides/contracts/state-transitions',
          ],
        },
        {
          type: 'category',
          label: 'Lightning Network',
          collapsed: true,
          items: [
            'guides/lightning/overview',
            'guides/lightning/asset-channels',
            'guides/lightning/routing',
          ],
        },
        {
          type: 'category',
          label: 'Development',
          collapsed: true,
          items: [
            'guides/development/rust-sdk',
            'guides/development/rgbjs',
            'guides/development/wallet-integration',
            'guides/development/testing',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Technical Reference',
      collapsed: true,
      items: [
        'technical-reference/api',
        'technical-reference/cli',
        'technical-reference/interfaces',
        'technical-reference/consignments',
        'technical-reference/invoices',
        'technical-reference/payment-scripts',
        'technical-reference/strict-types',
        'technical-reference/troubleshooting',
        'technical-reference/faq',
        'technical-reference/glossary',
      ],
    },
  ],
};

export default sidebars;
