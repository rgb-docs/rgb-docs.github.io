# Deployment Guide - RGB Documentation

## GitHub Organization Setup

The RGB documentation is configured to deploy to the root of the `rgb-docs` GitHub organization.

### Repository Configuration

- **Organization**: `rgb-docs`
- **Repository**: `rgb-docs.github.io`
- **URL**: https://rgb-docs.github.io
- **Branch**: `main`

## GitHub Repository Setup

### 1. Create the Organization (if it doesn't exist)

1. Go to https://github.com/organizations/plan
2. Create a new organization named `rgb-docs`

### 2. Create the GitHub Pages Repository

1. In the `rgb-docs` organization, create a new repository
2. Name it **exactly**: `rgb-docs.github.io`
3. Make it **public**
4. Do **not** initialize with README (we already have one)

### 3. Push the Code

From this directory:

```bash
# Remove old git remote (if any)
git remote remove origin 2>/dev/null

# Add new remote
git remote add origin git@github.com:rgb-docs/rgb-docs.github.io.git

# Create and push to main branch
git branch -M main
git add .
git commit -m "Initial RGB v0.12 documentation"
git push -u origin main
```

### 4. Enable GitHub Pages

1. Go to repository Settings → Pages
2. Under "Build and deployment":
   - Source: **GitHub Actions**
   - (The workflow will automatically deploy on push to main)

### 5. Wait for Deployment

The GitHub Actions workflow will:
1. Trigger on push to `main`
2. Build the Docusaurus site
3. Deploy to GitHub Pages
4. Site will be live at: https://rgb-docs.github.io

## Configuration Details

### URLs and Paths

- **Production URL**: https://rgb-docs.github.io
- **Base URL**: `/` (root of domain)
- **Edit Links**: Point to `rgb-docs/rgb-docs.github.io` on `main` branch

### GitHub Actions Workflow

Located at: `.github/workflows/deploy.yml`

Triggers on:
- Push to `main` branch
- Manual workflow dispatch

Permissions required:
- `contents: read`
- `pages: write`
- `id-token: write`

## Local Development

The base URL is set to `/` for production. For local development:

```bash
# Development server (auto-reloads on changes)
npm start
# Opens http://localhost:3000/

# Production build (test before deploying)
npm run build

# Serve production build locally
npm run serve
# Opens http://localhost:3000/
```

## Verification

After deployment, verify:

1. **Homepage**: https://rgb-docs.github.io
2. **Getting Started**: https://rgb-docs.github.io/getting-started/introduction
3. **Core Concepts**: https://rgb-docs.github.io/core-concepts/overview
4. **Guides**: https://rgb-docs.github.io/guides/overview
5. **Reference**: https://rgb-docs.github.io/technical-reference/api

## Troubleshooting

### Site shows 404

- Check repository name is exactly `rgb-docs.github.io`
- Verify GitHub Pages is enabled in Settings
- Check GitHub Actions workflow completed successfully
- Wait 5-10 minutes after first deployment

### Links are broken

- Ensure `baseUrl: '/'` in `docusaurus.config.ts`
- All internal links should start with `/` not `/docs/`
- Rebuild and redeploy

### Workflow fails

- Check `package.json` has all dependencies
- Verify Node.js version (should be 20)
- Check workflow logs in Actions tab

## Custom Domain (Optional)

To use a custom domain like `docs.rgb.tech`:

1. Add `CNAME` file to `static/` directory with your domain
2. Configure DNS with GitHub Pages IP addresses
3. Update `url` in `docusaurus.config.ts`
4. Enable custom domain in repository Settings → Pages

## Updates and Maintenance

To update the documentation:

```bash
# Make changes to docs
git add .
git commit -m "Update documentation"
git push origin main

# GitHub Actions will automatically deploy
```

---

**Current Status**: ✅ Configured and ready for deployment
**Last Updated**: January 17, 2026
