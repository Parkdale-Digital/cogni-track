# CogniTrack Documentation Site

This directory hosts the Docusaurus project that powers the CogniTrack documentation experience.

## Getting started

```bash
npm install --prefix docs-site
npm run docs
```

The first command installs dependencies inside the `docs-site` workspace. The second command starts the local development server.

## Available scripts

- `npm run docs` — start the dev server with hot reloading.
- `npm run docs:build` — create a production-ready static bundle in `docs-site/build`.
- `npm run docs:serve` — serve the locally built bundle for spot checks.

Design tokens live in `../src/styles/tokens.css` and are imported into both the Next.js app and the docs theme so the experiences stay visually aligned.
