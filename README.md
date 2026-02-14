# gotenberg-client

Source is organized under `src/` with a small `index.ts` shim at the repo root for compatibility.

```text
src/
  client.ts
  gotenberg.ts
  index.ts
  request.ts
  types.ts
```

To install dependencies:

```bash
bun install
```

To run tests:

```bash
bun test
```

To publish to npm:

1. Configure npm Trusted Publishing (OIDC) on npm for this package, using this workflow file name: `.github/workflows/publish.yml`.
2. Default (recommended): bump version (`npm version patch`/`minor`/`major`) and push tag `v<version>`.
3. GitHub Actions runs:
   - tests (`bun test`)
   - build (`bun run build`)
   - publish (`npm publish --access public`) on CI using OIDC (`id-token: write`), no long-lived token required.
4. Manual release option:
   - Run workflow **Publish to npm** from GitHub UI with `workflow_dispatch`.
   - Set `confirm_publish` to `true` to allow the run.
   - Manual runs still require the version in `package.json` to be set as expected before publishing.

To format:

```bash
bun run format
```

This project was created using `bun init` in bun v1.2.17. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
