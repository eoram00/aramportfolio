# ARAM Requests

Independent commission intake, with Discord or Google OAuth, a flat editorial form and owner management. No external packages. Run `npm start` from this folder (Node 22+); preview http://127.0.0.1:4180. Without environment configuration, reception is disabled. See SETUP-KO.md for setup.

Deploy `commission` as a separate Vercel project with Other framework and public output. Set environment values from .env.example in hosting secrets; never publish .env. Register /api/auth/discord/callback and /api/auth/google/callback with the respective providers. Only identify (Discord) and openid/email/profile (Google) are requested.

Requests become posts inside a configured Discord forum. The server rejects a forum whose permission overwrites expose it beyond the bot and configured owners (Discord Administrators retain access). Configure DISCORD_FORUM_ID rather than a category. No webhook or gateway process is required.

The forum thread name contains a signed owner hash, time and state. The starter message retains signed full metadata and the brief. Do not manually rename or delete request posts. Keep SESSION_SECRET stable. Active and archived posts are listed; metadata signature is checked before returning records. No temporary server-file database is used. This design is intended for low-volume intake and is subject to Discord quotas/rate limits. Concurrent submissions/state changes can race; a production system with stronger concurrency guarantees should use a transactional datastore.

Requesters see only their own requests. They can cancel pending requests. Configured Discord owners can accept, reject, cancel, and send messages through the management page linked in the post. Owner privilege never comes from a Google email address. Accounts are not automatically linked across providers.

Messages are persisted in Discord; the website shows the latest 100 website message embeds. Human messages typed directly into Discord are not relayed to the website. Replies are read in the website conversation. Personal DMs are not copied, which keeps request records in one managed forum post. There are no payments, uploads, or server-side reference URL fetching.

The portfolio CTA is configured through site/data/commission.json once a real independent site URL exists. Before that it links to the local preview only and stays hidden in production. See PORTFOLIO-INTEGRATION.md.

## Privacy and retention
See PRIVACY-OPERATIONS-KO.md. Privacy notices are published as a draft; login and intake stay disabled until privacy-settings.json is verified and CRON_SECRET is configured. Request records expire after 90 days, are blocked from access at expiry and deleted by daily authenticated cleanup. Each request can also be deleted by its owner or staff. Cancellation does not delete records.
