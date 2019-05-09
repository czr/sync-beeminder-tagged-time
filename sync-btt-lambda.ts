'use strict'

const axios = require('axios')
const beeminder = require('beeminder-js')
const itt = require('ical-tagged-time')
const moment = require('moment')

import * as sync from './sync-beeminder-tagged-time'

const googleCalendarUrl = process.env.GOOGLE_CALENDAR_URL

const beeminderUsername = process.env.BEEMINDER_USERNAME
const beeminderAuthToken = process.env.BEEMINDER_AUTH_TOKEN
const beeminderGoal = process.env.BEEMINDER_GOAL

const goal = new beeminder.Goal(
  beeminderUsername,
  beeminderAuthToken,
  beeminderGoal,
)

async function getICalStr (url) {
  const response = await axios.get(url)
  return response.data
}

async function handler (event) {
  const since = moment().subtract(7, 'days').startOf('day')

  const tag = beeminderGoal

  const taggedTime = new itt.TaggedTime(
    getICalStr(googleCalendarUrl),
    since,
  )
  const taggedEvents = await taggedTime.taggedEvents()

  const syncer = new sync.BeeminderTimeSync(
    goal,
    taggedEvents[tag] || [],
    since,
  )
  await syncer.apply()
}

module.exports = { handler }
