# Public repository hygiene

Status: publication rules for this project. These are practical checks, not a guarantee that every possible disclosure can be detected automatically.

## Repository boundary

Publish only files intentionally created for this project. Initialize fresh history in the game directory. Never import the surrounding workspace, personal notes, conversation transcripts, or unrelated project history.

Use repository-relative paths in public documentation and examples. Keep machine-specific installation locations, account information, private service URLs, tokens, environment dumps, raw tool output, and unreviewed diagnostics outside tracked files.

## Commit identity

Use the public GitHub account handle and its GitHub-provided noreply address as repository-local author and committer settings. Check the actual first commit metadata before pushing. This avoids adding a personal email from a global Git configuration. GitHub documents repository-specific commit email and its noreply option. [GitHub commit email guidance](https://docs.github.com/en/account-and-profile/how-tos/email-preferences/setting-your-commit-email-address).

A public repository still exposes its GitHub owner, commit identity, timestamps, and published content. A noreply address does not make the repository anonymous.

## Before every publication

1. Review the exact staged file list and diff. Stage an explicit set of project files.
2. Scan staged content and all new history for credentials, private keys, personal filesystem roots, private email addresses, internal URLs, and unexpectedly large/binary files.
3. Inspect image metadata and source asset metadata, including embedded project paths, creator fields, comments, and reference links.
4. Review filenames and prose manually; pattern matching alone cannot recognize all personal information.
5. Run a dedicated secret scanner when available. Add it to CI during implementation and pin the chosen tool/action version.
6. Build from a clean checkout and scan the generated public output as well as source. A build can inject local paths, source maps, environment variables, or debug output.
7. Confirm commit author/committer email and remote visibility before pushing.

The initial publication has no application build output. Its review covers planning text, the selected concept asset, and fresh Git history. The planning documents do not imply that future game builds have already passed these checks.

## Defaults

- Ignore credentials, local provider state, logs, caches, editor state, generated build output, and private notes via `.gitignore`.
- Treat any future browser-exposed environment value as public. The initial game should require no secret keys.
- Keep example environment files value-free unless a value is explicitly public and necessary.
- Use public, reviewed dependency registries and URLs; audit lockfiles for private registry references.
- Review author names, machine paths, and linked resources in editable art/audio source files before committing them.
- Keep production source maps and unreviewed telemetry disabled by default.
- Record asset provenance, attribution, and distribution permissions before publishing runtime media.

`.gitignore` does not protect files already tracked, and deleting a file in a later commit does not remove it from earlier history. If a credential is exposed, revoke or rotate it immediately and assess historical/cached copies. Avoid the disclosure in the first publication by auditing before any push.
