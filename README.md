# RGB Protocol Documentation

Technical documentation for RGB Protocol v0.12 - Smart contracts for Bitcoin and Lightning Network.

## About

This repository contains the official documentation for the RGB Protocol, hosted at [https://rgb-docs.github.io](https://rgb-docs.github.io).

RGB is a suite of protocols for scalable and confidential smart contracts on Bitcoin and the Lightning Network, utilizing client-side validation and Bitcoin's UTXO model.

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
├── guides/               # RGB20, RGB21, contracts, Lightning, development
└── technical-reference/  # API, CLI, interfaces, troubleshooting
```

## Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally with `npm start`
5. Submit a pull request

### Writing Guidelines

- Use clear, concise language
- Include code examples where appropriate
- Add links to related documentation
- Follow the existing structure and style

## Resources

- [RGB Protocol](https://rgb.tech)
- [RGB GitHub](https://github.com/RGB-WG)
- [rgbjs SDK](https://rgbjs.com)
- [RGB FAQ](https://www.rgbfaq.com)

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
