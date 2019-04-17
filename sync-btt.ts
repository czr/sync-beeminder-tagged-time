#!/usr/bin/env node

'use strict'

require("dotenv-json")()

const beeminder = require('beeminder-js')
const tt = require('ical-tagged-time')
const minimist = require('minimist')
const moment = require('moment')

import * as sync from './sync-beeminder-tagged-time'

var beeminder_username = process.env.BEEMINDER_USERNAME
var beeminder_auth_token = process.env.BEEMINDER_AUTH_TOKEN
var beeminder_goal = process.env.BEEMINDER_GOAL

var goal = beeminder.goal(
  beeminder_username,
  beeminder_auth_token,
  beeminder_goal,
)

var opts = minimist(process.argv.slice(2))
var apply = opts.apply

async function synchronise(apply) {
  var since = moment().subtract(7, 'days').startOf('day')

  var tag = beeminder_goal

  var iCalStr = await tt.getICalStr(process.env.GOOGLE_CALENDAR_URL)
  var events = tt.taggedEvents(since, iCalStr)[tag] || []

  const syncer = new sync.BeeminderTimeSync(
    goal,
    events,
    since,
  )
  if (apply) {
    await syncer.apply()
  }
  else {
    const actions = await syncer.actions()
    console.log(actions)
  }
}

synchronise(apply)
.catch(error => {
  console.log('Failed to synchronise Beeminder with calendar')
  console.log(error)
})
