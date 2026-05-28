# Copilot instructions

## Commands
- `npm install`
- `npm run dev`
- `npm run build`
- `npm run preview`

## Architecture
- Astro project with file-based routing under `src/pages/`.
- Main page lives at `src/pages/index.astro`.
- Server API route at `src/pages/api/contributions/[username].ts` is intended to proxy `https://github.com/{username}.contribs` and return JSON for the UI.
- Server output is enabled via `astro.config.mjs` (`output: 'server'`) with the `@astrojs/node` adapter in standalone mode.

## Key conventions
- API routes use TypeScript and `APIRoute` from `astro`; keep `export const prerender = false` for server-only endpoints.
- The repo is ESM (`"type": "module"` in `package.json`), so use `import`/`export` syntax.
