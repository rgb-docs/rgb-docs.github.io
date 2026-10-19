# RGB Documentation

Community documentation for RGB, client-side-validated smart contracts on Bitcoin, hosted at [https://rgb-docs.github.io](https://rgb-docs.github.io).

Since 2025 there have been two incompatible RGB implementations, and this site covers both. Every page says which one it applies to (see [Two RGB lines](https://rgb-docs.github.io/getting-started/two-rgbs)):

| | Pinned version | Upstream |
|---|---|---|
| **Line A: RGB v0.12** (LNP/BP Standards Association) | `rgb-wallet` 0.12.0-rc.3 | [RGB-WG](https://github.com/RGB-WG), [rgb.tech](https://rgb.tech) |
| **Line B: RGB v0.11** (RGB Protocol Association) | `rgb-cmd` 0.11.1 | [rgb-protocol](https://github.com/rgb-protocol), [RGB-Tools](https://github.com/RGB-Tools), [rgb.info](https://rgb.info) |

This is not an official publication of either project.

## Development

This documentation is built with [Docusaurus 3](https://docusaurus.io/).

### Prerequisites

- Node.js v18 or higher
- npm or yarn

### Installation

```bash
npm install
```

### Local Development

```bash
npm start
```

This command starts a local development server and opens a browser window. Most changes are reflected live without having to restart the server.

### Build

```bash
npm run build
```

This command generates static content into the `build` directory.

### Deployment

The site automatically deploys to GitHub Pages when changes are pushed to the `main` branch.

## Documentation Structure

```
docs/
├── getting-started/      # Installation, quick start, what's new
├── core-concepts/        # Client-side validation, seals, AluVM, state management
├── guides/               # contracts, fungible assets, UDA, CFA, Lightning (v0.11), development
└── technical-reference/  # CLI (both lines), invoices, encodings, ecosystem, troubleshooting
```

## Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally with `npm start`
5. Submit a pull request

### Writing Guidelines

- Every page has `rgb_line: A | B | both`, `verified_with` and `last_update` front matter.
- Where the lines differ, use `<Tabs groupId="rgb-line">`. Mark shell fences with `line=A` or `line=B`.
- Verify every command, crate and package against the pinned release, not against `main`. Run the snippet gate before you open a PR:

  ```bash
  node scripts/check-snippets.mjs
  ```

  It checks `rgb` commands against the pinned CLIs' help trees (`scripts/cli-help/`), and install targets and crates against `scripts/install-allowlist.json`.
- `node scripts/release-watch.mjs` reports newer releases of either line. A new stable means bump `scripts/rgb-lines.json` and regenerate `scripts/cli-help/`.
- Date and source every version, status or ecosystem claim. Don't use numbers you can't source.

## Resources

- v0.12 line: [rgb.tech](https://rgb.tech), [RGB-WG on GitHub](https://github.com/RGB-WG)
- v0.11 line: [rgb.info](https://rgb.info), [docs.rgb.info](https://docs.rgb.info), [rgb-protocol on GitHub](https://github.com/rgb-protocol), [RGB-Tools on GitHub](https://github.com/RGB-Tools)

## License

[![CC BY-SA 4.0](https://img.shields.io/badge/License-CC%20BY--SA%204.0-lightgrey.svg)](http://creativecommons.org/licenses/by-sa/4.0/)

This documentation is licensed under a [Creative Commons Attribution-ShareAlike 4.0 International License](http://creativecommons.org/licenses/by-sa/4.0/).

**You are free to:**
- Share and redistribute in any medium or format
- Adapt, remix, and build upon the material

**Under these terms:**
- **Attribution** — Give appropriate credit and link to the license
- **ShareAlike** — Distribute derivatives under the same CC BY-SA 4.0 license

See [LICENSE](LICENSE) file for full details.

## Support

- [GitHub Issues](https://github.com/rgb-docs/rgb-docs.github.io/issues)
- [Telegram Community](https://t.me/rgbtelegram)
- [RGB FAQ](https://www.rgbfaq.com)
