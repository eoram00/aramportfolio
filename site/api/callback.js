function getOrigin(req) {
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || "https";
  return `${proto}://${host}`;
}

function readCookie(req, name) {
  const cookieHeader = req.headers.cookie || "";
  const cookies = cookieHeader.split(";").map((part) => part.trim());
  const target = cookies.find((part) => part.startsWith(`${name}=`));
  return target ? decodeURIComponent(target.split("=").slice(1).join("=")) : "";
}

export default async function handler(req, res) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    res.status(500).send("Missing GitHub OAuth environment variables");
    return;
  }

  const { code, state } = req.query;
  const savedState = readCookie(req, "decap_oauth_state");

  if (!code || !state || state !== savedState) {
    res.status(400).send("Invalid OAuth state");
    return;
  }

  const origin = getOrigin(req);
  const redirectUri = `${origin}/callback`;

  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      state
    })
  });

  const tokenPayload = await tokenResponse.json();

  if (!tokenResponse.ok || tokenPayload.error || !tokenPayload.access_token) {
    const message = tokenPayload.error_description || tokenPayload.error || "OAuth token exchange failed";
    res.status(500).send(message);
    return;
  }

  const content = JSON.stringify({
    token: tokenPayload.access_token,
    provider: "github"
  });

  res.setHeader(
    "Set-Cookie",
    "decap_oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
  );
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(`<!doctype html>
<html lang="en">
  <body>
    <script>
      (function() {
        const message = 'authorization:github:success:${content}';
        if (window.opener) {
          window.opener.postMessage(message, window.location.origin);
        }
        window.close();
      })();
    </script>
  </body>
</html>`);
}
