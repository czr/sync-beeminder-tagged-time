'use strict'

const moment = require('moment')

function sortAndFilterDatapoints(datapoints, since) {
  var filtered = datapoints.filter(datapoint => {
    return datapoint.comment.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  }).filter(datapoint => {
    var m = moment(datapoint.comment)
    return m.isSameOrAfter(since)
  })
  var sorted = filtered
  sorted.sort((a, b) => {
    if (a.comment < b.comment) {
      return -1
    }
    if (a.comment > b.comment) {
      return 1
    }
    return 0
  })
  return sorted
}

function sortEvents(events) {
  var sorted = events
  sorted.sort((a, b) => {
    if (a.startDate < b.startDate) {
      return -1
    }
    if (a.startDate > b.startDate) {
      return 1
    }
    return 0
  })
  return sorted
}

function eventDuration(event) {
  var startTime = moment(event.startDate)
  var endTime = moment(event.endDate)

  return moment.duration(endTime.diff(startTime)).asMinutes()
}

function calcSyncActions(events, datapoints) {
  events = events.slice(0)
  datapoints = datapoints.slice(0)

  var actions = {insert: [], delete: [], update: []}

  var currEvent = events.shift()
  var currDatapoint = datapoints.shift()

  var counter = 0;
  while (currEvent && currDatapoint) {
    if (currEvent.startDate.toISOString() === currDatapoint.comment) {
      if (eventDuration(currEvent) !== currDatapoint.value) {
        actions.update.push({
          id: currDatapoint.id,
          value: eventDuration(currEvent),
          comment: currDatapoint.comment,
        })
      }
      currEvent = events.shift()
      currDatapoint = datapoints.shift()
    }
    else if (currEvent.startDate.toISOString() > currDatapoint.comment) {
      actions.delete.push(currDatapoint.id)
      currDatapoint = datapoints.shift()
    }
    else if (currEvent.startDate.toISOString() < currDatapoint.comment) {
      actions.insert.push({
        comment: currEvent.startDate.toISOString(),
        value: eventDuration(currEvent),
        daystamp: moment(currEvent.startDate).format('YYYYMMDD'),
      })
      currEvent = events.shift()
    }
  }

  while (currEvent) {
    actions.insert.push({
      comment: currEvent.startDate.toISOString(),
      value: eventDuration(currEvent),
      daystamp: moment(currEvent.startDate).format('YYYYMMDD'),
    })
    currEvent = events.shift()
  }

  while (currDatapoint) {
    actions.delete.push(currDatapoint.id)
    currDatapoint = datapoints.shift()
  }

  return actions
}

function applyActions(actions, goal) {
  for (let insertDatapoint of actions.insert) {
    goal.createDatapoint(insertDatapoint)
  }

  for (let updateDatapoint of actions.update) {
    goal.updateDatapoint(updateDatapoint)
  }

  for (let deleteDatapoint of actions.delete) {
    goal.deleteDatapoint(deleteDatapoint)
  }
}

module.exports = { calcSyncActions, sortEvents, sortAndFilterDatapoints, applyActions };
