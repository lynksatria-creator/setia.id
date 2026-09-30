# GitHub Actions Setup Guide

## Automatic Setup (Recommended)

### 1. Create GitHub Actions Workflow

Create file: `.github/workflows/deploy.yml`

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: ['main']
  pull_request:
    branches: ['main']
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: 'pages'
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18.x]

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'yarn'
          cache-dependency-path: 'frontend/yarn.lock'

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Install dependencies
        working-directory: ./frontend
        run: yarn install

      - name: Build frontend
        working-directory: ./frontend
        run: yarn build
        env:
          REACT_APP_API_URL: https://gibrig.entertainment.com/api
          CI: false

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './frontend/build'

  deploy:
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    needs: build
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}

    runs-on: ubuntu-latest

    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### 2. Add Craco Configuration

Create file: `frontend/craco.config.js`

```javascript
module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      webpackConfig.optimization = {
        ...webpackConfig.optimization,
        minimize: true,
        usedExports: true,
        sideEffects: false,
      };

      return webpackConfig;
    },
  },
};
```

### 3. Verify GitHub Pages Settings

Go to: https://github.com/satria-it/websitegibrig/settings/pages

Ensure:
- ✅ **Source**: Deploy from a branch
- ✅ **Branch**: main / root
- ✅ **Custom Domain**: gibrig.entertainment.com
- ✅ **Enforce HTTPS**: Checked

## Manual Deployment Commands

If automatic deployment doesn't work, use these commands:

```bash
# Navigate to frontend
cd frontend

# Install dependencies
yarn install

# Build for production
yarn build

# Test the build locally
npx serve -s build
```

## Troubleshooting GitHub Actions

### Build Failed?
- Check the Actions tab: https://github.com/satria-it/websitegibrig/actions
- Look for red X on the latest workflow run
- Click on the failed job to see detailed logs

### Common Issues:
1. **Permission denied**: Make sure you have admin access to the repo
2. **Build errors**: Check `yarn build` output locally first
3. **Deploy timeout**: Increase timeout in workflow (default is 10 mins)

## Environment Variables

### Production (.env.production)
- ✅ Already configured
- Points to: https://gibrig.entertainment.com/api

### Development (.env.development)
- ✅ Already configured
- Points to: http://localhost:5000/api

---

**All other files are ready!** Just add these 2 files and your deployment will be complete. 🚀
