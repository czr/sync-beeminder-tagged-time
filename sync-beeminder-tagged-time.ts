'use strict'

import moment from 'moment'

interface Event {
  startDate: Date
  endDate: Date
  summary: string
}

interface BeeminderDatapoint {
  id: string
  value: number
  comment: string
  daystamp: string
}

interface BeeminderGoal {
  datapoints(): Promise<Array<BeeminderDatapoint>>
  createDatapoint(datapoint: BeeminderDatapoint): Promise<BeeminderDatapoint>
  deleteDatapoint(id: string): Promise<void>
  updateDatapoint(datapoint: BeeminderDatapoint): Promise<BeeminderDatapoint>
}

function cmp(a: any, b: any): number {
  if (a < b) {
    return -1
  }
  if (a > b) {
    return 1
  }
  return 0
}

function eventDuration(event: Event): number {
  var startTime = moment(event.startDate)
  var endTime = moment(event.endDate)

  return moment.duration(endTime.diff(startTime)).asMinutes()
}

/** Synchroniser for Beeminder time-based goal and a set of events */
class BeeminderTimeSync {
  goal: BeeminderGoal
  events: Array<Event>
  startDate: moment.Moment
  /**
   * Create a BeeminderTimeSync instance.
   * @param {goal} goal - Goal to synchronise.
   * @param {Array<Event>} events - Array of events.
   * @param {moment.Moment} startDate - MomentJS date from which to synchronise.
   */
  constructor(goal: BeeminderGoal, events: Array<Event>, startDate: moment.Moment) {
    this.goal = goal
    this.events = events
    this.startDate = startDate
  }

  /**
   * Returns the events sorted by their startDate.
   * @return {Array<Event>} Events.
   */
  sortedEvents(): Array<Event> {
    var sorted = Array.from(this.events)
    sorted.sort((a, b) => cmp(a.startDate, b.startDate))
    return sorted
  }

  /**
   * Returns datapoints previously created by BeeminderTimeSync since startDate
   * sorted by corresponding event date.
   * @return {Promise} Array of datapoints.
   */
  async datapoints(): Promise<Array<BeeminderDatapoint>> {
    var allDatapoints: Array<BeeminderDatapoint> = await this.goal.datapoints()
    var since = this.startDate

    var filtered = allDatapoints.filter(datapoint => {
      return datapoint.comment.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    }).filter(datapoint => {
      var m = moment(datapoint.comment)
      return m.isSameOrAfter(since)
    })

    var sorted = Array.from(filtered)
    sorted.sort((a, b) => cmp(a.comment, b.comment))

    return sorted
  }

  /**
   * Calculates actions needed to bring goal datapoints into line with events.
   * @return {Promise} Actions as {insert: [...], delete: [...], update: [...]}.
   */
  async actions() {
    var events = Array.from(this.sortedEvents())
    var datapoints = Array.from(await this.datapoints())

    var actions = {insert: [], delete: [], update: []}

    var currEvent = events.shift()
    var currDatapoint = datapoints.shift()

    var counter = 0
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

  /**
   * Brings goal datapoints into line with events.
   * @return {Promise} Container promise for all Beeminder API calls.
   */
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

export { BeeminderTimeSync }
