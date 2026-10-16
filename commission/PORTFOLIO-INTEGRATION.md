# Portfolio connection

The portfolio includes a matching `작업 신청하기` button. Set `site/data/commission.json` to the new site's real public URL and publish that file to make the button visible in production:

{"url":"https://YOUR-ACTUAL-PROJECT.vercel.app/"}

Until then, local preview points to http://127.0.0.1:4180 and the production button stays hidden so visitors are not sent to an unconfigured or guessed address. Existing contact methods stay available.
