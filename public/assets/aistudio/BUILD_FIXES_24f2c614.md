# Hostinger build fixes

Changes made to this project:

1. `src/app/api/admin/rescrape/route.ts`: removed a duplicate `if (!isAdultGroup) {` that left the `change_image` branch unbalanced and caused the parser to fail at the later `catch` clause.
2. Next.js configuration: retained `next.config.js` as the single configuration file and removed the conflicting `next.config.ts`. The existing detailed routes, headers, image settings, and webpack options remain in `next.config.js`.
3. TypeScript build setting: kept `ignoreBuildErrors: true`, which was already present in the removed config. This is a deployment workaround, not a replacement for fixing the project's TypeScript diagnostics.
4. Production start command: changed `npm start` to `next start -H 0.0.0.0`, because the previous command invoked a root `server.js` file that is not present in the archive.

## Validation

- The corrected route was parsed with the globally installed TypeScript compiler API with no syntax diagnostics.
- `next.config.js` passed `node --check`; `package.json` parsed as valid JSON.
- A full `npm ci` / `next build` could not be completed in the audit environment because access to `registry.npmjs.org` failed (`EAI_AGAIN`). The deployment build must still be confirmed in Hostinger after dependencies install.

## Hostinger steps

1. Upload/deploy this project.
2. Set required production environment variables in Hostinger's environment-variable settings. Do not rely on a local `.env` file for production secrets.
3. Run `npm ci` (or Hostinger's dependency-install step), then `npm run build`.
4. Set the start command to `npm start`.

`ignoreBuildErrors: true` allows Next.js to skip its TypeScript build gate while unrelated type issues remain. It does not bypass syntax errors, missing module errors, or other Webpack failures. Re-enable type checking after those issues are fixed.
