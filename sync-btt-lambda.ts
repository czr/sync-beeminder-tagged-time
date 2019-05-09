'use strict'

const beeminder = require('beeminder-js')
const tt = require('ical-tagged-time')
const moment = require('moment')

import * as sync from './sync-beeminder-tagged-time'

const beeminderUsername = process.env.BEEMINDER_USERNAME
const beeminderAuthToken = process.env.BEEMINDER_AUTH_TOKEN
const beeminderGoal = process.env.BEEMINDER_GOAL

const goal = new beeminder.Goal(
  beeminderUsername,
  beeminderAuthToken,
  beeminderGoal,
)

async function handler (event) {
  const since = moment().subtract(7, 'days').startOf('day')

  const tag = beeminderGoal

  const iCalStr = await tt.getICalStr(process.env.GOOGLE_CALENDAR_URL)
  const events = tt.taggedEvents(since, iCalStr)[tag] || []

  const syncer = new sync.BeeminderTimeSync(
    goal,
    events,
    since,
  )
  await syncer.apply()
}

module.exports = { handler }
