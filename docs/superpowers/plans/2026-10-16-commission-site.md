# ARAM commission site implementation plan

User goal: a separate request site, linked from the portfolio, that creates a private Discord channel per application, mentions the configured owner, and supports accept/reject/cancel/contact.

1. Build an independent sky blue and ink request UI: application form, Discord identity, own requests, request conversation and staff actions. Avoid invented prices or promises.
2. Implement OAuth with signed state and HttpOnly session cookies. Validate CSRF, actor ownership, field lengths and request state changes on the server.
3. Store each request in a private Discord channel; keep its owner/status in a signed topic and details/messages as bot embeds. No browser bot token and no ephemeral server-file database. Only configured staff and the bot get channel access.
4. Implement request status updates and bidirectional website messages. Discord's management link opens the authorized request view. DM failure must not discard a stored message.
5. Provide environment template, bot permission/setup instructions, a local Node entry point, and a separate Vercel project configuration.
6. Add the portfolio call-to-action after a real application URL exists. Validate permissions/state transitions using mocked Discord responses; deployment cannot receive real applications before credentials and server permissions are configured.

Credentials must be entered as hosting secrets, never in source or chat. No channel content is exposed until its authenticated requester or configured staff is authorized.
