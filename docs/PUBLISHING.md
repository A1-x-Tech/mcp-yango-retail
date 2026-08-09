# Publishing and listing the server

How to cut a release and get into the MCP catalogs so the server is discoverable from
Claude, Cursor, LobeHub and others. The canonical source is the **official MCP registry**
(`registry.modelcontextprotocol.io`).

## Version synchronization (important)

The version lives in **three places and must match byte-for-byte**:

- `package.json` → `version`;
- `server.json` → root `version`;
- `server.json` → `packages[0].version`.

And `mcpName` in `package.json` must equal `name` in `server.json`
(`io.github.A1-x-Tech/mcp-yango-retail`). Pre-publish check — all three must print the
same `X.Y.Z`:

```bash
grep -n '"version"' package.json server.json
```

> ⚠️ `mcp-publisher` publishes the **root** `server.json.version`. If you bump npm +
> `packages[0].version` but leave the root one stale, `npm publish` succeeds (it reads
> `package.json`) while `mcp-publisher publish` fails with a misleading
> `400 cannot publish duplicate version` — it re-publishes the old root version.

## Release (all channels in one pass)

Publishing to npm alone silently drifts from the other channels: `git push --follow-tags`
pushes the tag but does **not** create a GitHub Release, and the registry is immutable per
version (even a metadata fix requires a bump).

1. Bump `version` in the three places (see above) and update `CHANGELOG.md`
   (move `[Unreleased]` into a dated section).
2. `npm publish` — runs `typecheck` + `test` + `build` (via `prepublishOnly` / `prepare`).
3. `git commit`, `git tag -a vX.Y.Z -m vX.Y.Z`, `git push origin main --follow-tags`.
4. **GitHub Release:** `gh release create vX.Y.Z --title vX.Y.Z --generate-notes --verify-tag`.
5. **Official MCP registry:**

```bash
brew install mcp-publisher                            # or a binary from modelcontextprotocol/registry releases
mcp-publisher logout                                  # login on top of a live token won't reissue it
mcp-publisher login github --token "$(gh auth token)" # NOT a bare `login github` — see below
mcp-publisher publish                                 # from the repo root (where server.json lives)
```

> ⚠️ **Log in with a token, not the device flow.** `mcp-publisher login github` without
> `--token` authorizes the registry's OAuth app, and an organization with an "Only
> approved applications can access data" policy is invisible to that app — the registry
> gets an empty org list and answers `403 Forbidden: You have permission to publish:
> io.github.<personal-login>/*`. The `gh` token already has the `read:org` scope and sees
> the organization.
>
> You can recognize it by the 403 text itself: it lists the available namespaces. If only
> the **personal** `io.github.<login>/*` is there and no organization — the login method
> is the problem. Check org visibility with
> `curl -s https://api.github.com/users/<login>/orgs` — it should show `A1-x-Tech`.

### What the registry checks

- **Namespace** — the `io.github.A1-x-Tech/*` name is confirmed by logging in with a
  GitHub account that has access to the `A1-x-Tech` organization.
- **npm package ownership** — the published `package.json` must carry an `mcpName` equal
  to `name` from `server.json`. The package with that `mcpName` must already be on npm.

## LobeHub

1. Open [lobehub.com/mcp](https://lobehub.com/mcp) → **Submit MCP**.
2. Provide the repository URL `https://github.com/A1-x-Tech/mcp-yango-retail`. LobeHub
   pulls the README, tool list and the install config (`npx -y mcp-yango-retail`) itself.

## Registry pitfalls (learned 2026-08-09)

- Token login does **not** require public org membership: `mcp-publisher login github
  --token "$(gh auth token)"` worked with hidden membership. The public-membership note
  above matters only for the device flow.
- The registry JWT is short-lived (expires in about an hour): after a pause, run
  `mcp-publisher logout && mcp-publisher login github --token "$(gh auth token)"` before
  `publish`, or you get 401 "token is expired".
- The namespace is **case-sensitive** and must match the GitHub organization name
  letter-for-letter: `io.github.A1-x-Tech/...`, not `io.github.a1-x-tech/...` — otherwise
  a 403 listing the available namespaces.
- `mcpName` is checked against the already **published** npm tarball (character by
  character): a case typo is fixed only by an npm patch release; editing the repo is not
  enough.
- The root `description` in `server.json` must be ≤100 characters, or validation fails
  with a 422.
