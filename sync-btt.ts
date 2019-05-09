#!/usr/bin/env node

'use strict'

require('dotenv-json')()

const axios = require('axios')
const beeminder = require('beeminder-js')
const itt = require('ical-tagged-time')
const minimist = require('minimist')
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

const opts = minimist(process.argv.slice(2))
const apply = opts.apply

async function getICalStr (url) {
  const response = await axios.get(url)
  return response.data
}

async function synchronise (apply) {
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
