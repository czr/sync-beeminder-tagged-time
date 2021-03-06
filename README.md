# sync-beeminder-tagged-time

Updates a Beeminder goal with hashtagged calendar entries.

Given a Beeminder goal counting minutes spent on a task, sync-beeminder-tagged-time can update it from Google Calendar (or any other web-accessible iCal calendar) events marked with a hashtagged with the goal name.

## Deployment to AWS Lambda

### Initial deployment


The initial deployment needs an `goalname.env.json` that looks like this:

```json
{
    "GOOGLE_CALENDAR_URL": "SECRET",
    "BEEMINDER_USERNAME": "username",
    "BEEMINDER_GOAL": "goalname",
    "BEEMINDER_AUTH_TOKEN": "SECRET"
}
```

The `GOOGLE_CALENDAR_URL` is the secret iCal link that you can get from your Google Calendar's settings and sharing page. The `BEEMINDER_AUTH_TOKEN` can be got from [Beeminder's API](http://api.beeminder.com/#personal-authentication-token).

And then run:

```bash
npm run build && ./node_modules/.bin/claudia --profile claudia create \
  --region eu-west-1 \
  --handler lib/sync-btt-lambda.handler \
  --name sync-beeminder-time-tracking-goalname \
  --role sync-beeminder-time-tracking-role \
  --runtime nodejs12.x --timeout 60 \
  --set-env-from-json goalname.env.json \
  --config goalname.claudia.json
```

The `role` and `name` can be named however you like. You'll also want to adjust the `region` appropriately.

### Redeploying after changes

```bash
npm run redeploy -- --config goalname.claudia.json
```

## Running locally

Set up `.env.json` as described above and run:

```bash
npm run build
./sync-btt.js
```

## License

This project is licensed under the terms of the MIT license.
