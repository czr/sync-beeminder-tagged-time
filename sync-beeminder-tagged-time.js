'use strict'

const moment = require('moment')

function eventDuration(event) {
  var startTime = moment(event.startDate)
  var endTime = moment(event.endDate)

  return moment.duration(endTime.diff(startTime)).asMinutes()
}


class BeeminderTimeSync {
  constructor(goal, events, startDate) {
    this.goal = goal
    this.events = events
    this.startDate = startDate
  }

  sortedEvents() {
    var sorted = this.events
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

  async datapoints() {
    var allDatapoints = await this.goal.datapoints()
    var since = this.startDate

    var filtered = allDatapoints.filter(datapoint => {
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

  async actions() {
    var events = this.sortedEvents().slice(0)
    var datapoints = await this.datapoints()
    var datapoints = datapoints.slice(0)

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

  async apply() {
    var actions = await this.actions()
    var goal = this.goal

    var promises = []

    for (let insertDatapoint of actions.insert) {
      promises.push(
        goal.createDatapoint(insertDatapoint)
          .then((result) => {
            console.log('Created datapoint: ' + result)
          })
          .catch((error) => {
            console.log('Failed to create datapoint: ' + error)
          })
      )
    }

    for (let updateDatapoint of actions.update) {
      promises.push(
        goal.updateDatapoint(updateDatapoint)
          .then((result) => {
            console.log('Updated datapoint: ' + updateDatapoint)
          })
          .catch((error) => {
            console.log('Failed to update datapoint: ' + error)
          })
      )
    }

    for (let deleteDatapoint of actions.delete) {
      promises.push(
        goal.deleteDatapoint(deleteDatapoint)
          .then((result) => {
            console.log('Deleted datapoint: ' + deleteDatapoint)
          })
          .catch((error) => {
            console.log('Failed to delete datapoint: ' + error)
          })
      )
    }

    return Promise.all(promises)
  }
}

module.exports = { BeeminderTimeSync };
