# Hosting recommendation

Status: deployment plan only. No host account, infrastructure, billing, or live deployment has been configured. Official documentation checked 2026-09-05; plan limits and prices must be rechecked before launch.

## Recommendation

Use **Vercel for the first release**, serving a static Vite build. The whole match, including the opponent, runs in the player's browser. Visitors play independent single-player sessions; they do not require a shared simulation server. Vercel documents Vite deployment and Git-based previews directly. [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite).

AWS also works, but the initial game does not require it. The simpler deployment lets the project spend effort on movement, destruction, and AI.

| Choice | What we would deploy | Main tradeoff |
| --- | --- | --- |
| Vercel — recommended | Static JavaScript, CSS, images, audio, and AI worker bundle | Straightforward Git previews and frontend delivery; check bandwidth and account-plan fit |
| AWS | Private S3 origin behind CloudFront, with HTTPS and managed certificates | More infrastructure configuration and operational choices; useful when AWS integration/control is already wanted |
| Another static host | The same generated static build with HTTPS and appropriate headers | Portable alternative if account access or pricing favors it |

AWS provides a documented private-S3/CloudFront static-site architecture using origin access control, HTTPS, and CloudFormation. This is the AWS path to use, rather than designing an application server for an entirely local game. [AWS secure static website guide](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/getting-started-secure-static-website-cloudformation-template.html).

## Access and costs

No hosting access is needed for local development. When a playable build is ready, connect the desired Vercel account/project through its normal authorization flow. A custom domain is optional. Do not put account credentials into repository files or chat.

Vercel's Hobby plan is for personal, non-commercial use. Choose an appropriate paid plan if the project or intended use does not qualify, and check current quotas before launch. Public availability does not imply unlimited free traffic. [Vercel Hobby plan](https://vercel.com/docs/plans/hobby).

The main hosting driver is asset transfer rather than per-match CPU. As a planning example, a 10 MB initial download across 10,000 cold sessions is about 100 GB of transfer before optional music/themes and overhead. Caching helps return visits; it does not remove first-download traffic. This example is arithmetic, not a price or capacity guarantee.

## Release configuration

- Commit dependency lockfiles and define a supported Node version when scaffolding begins.
- Build with the repository's production build command; deploy only its static output directory.
- Use hashed filenames and long-lived caching for immutable assets; allow the entry HTML to update promptly.
- Load optional themes and music after the core playable set; make optional failures recoverable.
- Keep worker scripts and assets on the same origin where practical.
- Configure and test a content security policy suitable for the actual bundle and worker setup; avoid speculative headers that break the game.
- Disable public production source maps unless deliberately reviewed. Audit generated text and media metadata before uploading.
- Record a rollback procedure and preserve an identifiable last-good release.
- Recheck the account's current quotas, budget controls, and notifications before a wider public launch.

The initial app can use a single entry URL and a sanitized seed parameter. If later UI routing adds distinct paths, test direct navigation and host fallback behavior explicitly.

## Application privacy

The planned game needs no login, database, analytics SDK, advertising tracker, or runtime AI API. Settings and saves stay in local browser storage. Hosting services will still handle ordinary HTTP request information under their own policies; this design is not a promise of zero infrastructure logging.

Keep player names out of shareable seeds and URLs. Local user-entered names must be displayed as text, not HTML. Do not publish uploaded save files, bug reports, or screenshots without reviewing their contents.

## What would change for multiplayer

Online multiplayer is a new scope: authoritative game sessions or a carefully specified synchronization model, lobbies, reconnects, abuse handling, and state validation. A static frontend host alone does not provide those systems. Avoid adding that complexity to a release whose stated goal is single-player against the computer.
