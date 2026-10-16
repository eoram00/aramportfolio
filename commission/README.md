# Separate ARAM commission site

Deploy this `commission` directory as its own Vercel project (Node 22+). Keep the existing portfolio project rooted at `site`. No packages are required.

## Discord setup

1. Create an application at https://discord.com/developers/applications and add a bot.
2. In your Discord server, create a category for requests. Enable Developer Mode and copy the server ID, category ID and your own user ID.
3. Install the bot in this server with View Channels, Manage Channels, Send Messages, Embed Links and Read Message History. Do not grant Administrator. The application creates private channels with an explicit deny for everyone and allows only the bot and configured owner IDs. Server administrators can also access them through Discord's permission model.
4. Add your new site's exact `https://YOUR-SITE/api/auth/callback` address to OAuth2 Redirects. Login requests only the `identify` scope.
5. Set the values from `.env.example` in the new Vercel project's environment settings. The client secret, bot token and session secret are secrets: never put them in Git or chat. `DISCORD_OWNER_IDS` is one or more numeric owner IDs separated by commas. Keep SESSION_SECRET stable: it signs sessions AND request channel metadata.
6. Deploy/redeploy and confirm the setup banner disappears. Use two accounts to check requester/owner separation before sharing the application link.

## Local preview

Run `npm start` in this directory. The site opens at http://127.0.0.1:4180. Without credentials the form can be explored but reception is disabled. Copy `.env.example` to `.env` for local configuration; `.env` is ignored by Git. Register the local callback separately if testing OAuth locally.

## What users can do

- Requester: apply after Discord login, view only their own requests, send messages, cancel while pending.
- Configured owner: see all requests, accept/reject/cancel, send messages. Open the management link posted in each Discord channel to access these controls.
- The bot attempts DM notifications for owner replies and status changes. The canonical status and messages remain available on the website when DMs are blocked. Discord channel conversation is retained, and the website shows the latest 100 website message embeds. Direct human messages typed inside Discord are not relayed to the website.

## Storage and operational limits

Discord private channels are the datastore. Request ownership and status are signed in the channel topic; the original application is kept as a referenced bot message. Deleting channels/messages loses those records, and rotating SESSION_SECRET makes old metadata unreadable. Back up before changing these. Do not manually edit signed topics.

Two pending/accepted requests per user are allowed. This is a lightweight low-volume intake, not a distributed booking or payment system. Simultaneous submissions across server instances can race, so review duplicate requests. Discord channel/category quotas and rate limits still apply; archive/retention policy must be agreed before a public launch. No uploads or payment collection are implemented. Reference links are plain text and are never fetched by the server.

The portfolio CTA must point to the real new project URL after that URL has been created. Do not link to a guessed hostname. An `apply-link.patch` integration snippet is supplied in PORTFOLIO-INTEGRATION.md.
