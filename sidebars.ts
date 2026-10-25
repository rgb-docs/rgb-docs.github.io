import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

// Every page says which RGB line it covers (front matter `rgb_line`): A = v0.12 (RGB-WG),
// B = v0.11 (RGB Protocol Association), or both. See docs/getting-started/two-rgbs.md.
const sidebars: SidebarsConfig = {
  mainSidebar: [
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: [
        'getting-started/introduction',
        'getting-started/two-rgbs',
        'getting-started/installation',
        'getting-started/quick-start',
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
        {
          type: 'category',
          label: 'Bitcoin Commitments',
          collapsed: true,
          items: [
            'core-concepts/bitcoin/deterministic-commitments',
            'core-concepts/bitcoin/tapret',
            'core-concepts/bitcoin/opret',
            'core-concepts/bitcoin/multi-protocol-commitments',
          ],
        },
        {
          type: 'category',
          label: 'State',
          collapsed: true,
          items: [
            'core-concepts/state/unified-state',
            'core-concepts/state/owned-state',
            'core-concepts/state/global-state',
          ],
        },
        {
          type: 'category',
          label: 'AluVM',
          collapsed: true,
          items: [
            'core-concepts/aluvm/overview',
            'core-concepts/aluvm/instruction-set',
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
          label: 'Contracts',
          collapsed: true,
          items: [
            'guides/contracts/schemas',
            'guides/contracts/genesis',
            'guides/contracts/state-transitions',
            'guides/contracts/bundles',
          ],
        },
        {
          type: 'category',
          label: 'Fungible Assets',
          collapsed: true,
          items: [
            'guides/rgb20/creating-tokens',
            'guides/rgb20/transferring-assets',
            'guides/rgb20/secondary-issuance',
            'guides/rgb25/overview',
          ],
        },
        {
          type: 'category',
          label: 'Unique Assets (UDA)',
          collapsed: true,
          items: [
            'guides/rgb21/creating-nfts',
            'guides/rgb21/metadata-attachments',
            'guides/rgb21/transferring-nfts',
          ],
        },
        {
          type: 'category',
          label: 'Lightning (v0.11)',
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
            'guides/development/rgb-on-blake',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      collapsed: true,
      items: [
        'technical-reference/cli-v011',
        'technical-reference/cli',
        'technical-reference/invoices',
        'technical-reference/consignments',
        'technical-reference/interfaces',
        'technical-reference/strict-types',
        'technical-reference/encodings',
        'technical-reference/ecosystem',
        'getting-started/whats-new-0-12',
        'guides/contracts/contractum',
        'technical-reference/troubleshooting',
        'technical-reference/faq',
        'technical-reference/glossary',
      ],
    },
  ],
};

export default sidebars;
