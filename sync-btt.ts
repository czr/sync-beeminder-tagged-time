#!/usr/bin/env node

'use strict'

require('dotenv-json')()

const beeminder = require('beeminder-js')
const tt = require('ical-tagged-time')
const minimist = require('minimist')
const moment = require('moment')

import * as sync from './sync-beeminder-tagged-time'

const beeminderUsername = process.env.BEEMINDER_USERNAME
const beeminderAuthToken = process.env.BEEMINDER_AUTH_TOKEN
const beeminderGoal = process.env.BEEMINDER_GOAL

const goal = beeminder.goal(
  beeminderUsername,
  beeminderAuthToken,
  beeminderGoal,
)

const opts = minimist(process.argv.slice(2))
const apply = opts.apply

async function synchronise (apply) {
  const since = moment().subtract(7, 'days').startOf('day')

  const tag = beeminderGoal

  const iCalStr = await tt.getICalStr(process.env.GOOGLE_CALENDAR_URL)
  const events = tt.taggedEvents(since, iCalStr)[tag] || []

  const syncer = new sync.BeeminderTimeSync(
    goal,
    events,
    since,
  )
  if (apply) {
    await syncer.apply()
  } else {
    const actions = await syncer.actions()
    console.log(actions)
  }
}

synchronise(apply)
.catch(error => {
  console.log('Failed to synchronise Beeminder with calendar')
  console.log(error)
})
