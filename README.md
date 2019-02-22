# sync-beeminder-tagged-time

Updates a Beeminder goal with hashtagged calendar entries

## deployment

```bash
npm run deploy
npm run redeploy
```

The initial deployment needs an `env-music.json` that looks like this:

```json
{
    "GOOGLE_CALENDAR_URL": "SECRET",
    "BEEMINDER_USERNAME": "username",
    "BEEMINDER_GOAL": "goalname",
    "BEEMINDER_AUTH_TOKEN": "SECRET"
}

```
