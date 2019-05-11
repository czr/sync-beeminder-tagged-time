'use strict'

import moment from 'moment'

interface Event {
  startDate: Date
  endDate: Date
  summary: string
}

interface BeeminderDatapointExisting {
  id: string
  value: number
  timestamp: number
  daystamp: string
  comment: string
  updated_at: number
  requestid: string
}

interface BeeminderDatapointNew {
  value: number
  timestamp: number
  daystamp: string
  comment: string
  requestid: string
}

interface BeeminderGoal {
  datapoints (): Promise<Array<BeeminderDatapointExisting>>
  createDatapoint (datapoint: BeeminderDatapointNew): Promise<string>
  deleteDatapoint (id: string): Promise<any>
  updateDatapoint (datapoint: BeeminderDatapointExisting): Promise<any>
}

class ActionCreate {
  type: 'create'
  datapoint: BeeminderDatapointNew
}

class ActionUpdate {
  type: 'update'
  datapoint: BeeminderDatapointExisting
}

class ActionDelete {
  type: 'delete'
  datapoint: BeeminderDatapointExisting
}

function cmp (a: any, b: any): number {
  if (a < b) {
    return -1
  }
  if (a > b) {
    return 1
  }
  return 0
}

function eventDuration (event: Event): number {
  const startTime = moment(event.startDate)
  const endTime = moment(event.endDate)

  return moment.duration(endTime.diff(startTime)).asMinutes()
}

/** Synchroniser for Beeminder time-based goal and a set of events */
class BeeminderTimeSync {
  goal: BeeminderGoal
  events: Array<Event>
  startDate: moment.Moment
  /**
   * Create a BeeminderTimeSync instance.
   * @param {BeeminderGoal} goal - Goal to synchronise.
   * @param {Array<Event>} events - Array of events.
   * @param {moment.Moment} startDate - MomentJS date from which to synchronise.
   */
  constructor (goal: BeeminderGoal, events: Array<Event>, startDate: moment.Moment) {
    this.goal = goal
    this.events = events
    this.startDate = startDate
  }

  /**
   * Returns the events sorted by their startDate.
   * @return {Array<Event>} Events.
   */
  sortedEvents (): Array<Event> {
    const sorted = Array.from(this.events)
    sorted.sort((a, b) => cmp(a.startDate, b.startDate))
    return sorted
  }

  /**
   * Returns datapoints previously created by BeeminderTimeSync since startDate
   * sorted by corresponding event date.
   * @return {Promise<Array<BeeminderDatapoint>>} Array of datapoints.
   */
  async datapoints (): Promise<Array<BeeminderDatapointExisting>> {
    const allDatapoints: Array<BeeminderDatapointExisting> = await this.goal.datapoints()
    const since = this.startDate

    const filtered = allDatapoints.filter(datapoint => {
      return datapoint.comment.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    }).filter(datapoint => {
      const m = moment(datapoint.comment)
      return m.isSameOrAfter(since)
    })

    const sorted = Array.from(filtered)
    sorted.sort((a, b) => cmp(a.comment, b.comment))

    return sorted
  }

  /**
   * Calculates actions needed to bring goal datapoints into line with events.
   * @return {Promise} Actions as {insert: [...], delete: [...], update: [...]}.
   */
  async actions (): Promise<Array<ActionCreate | ActionUpdate | ActionDelete>> {
    const events = Array.from(this.sortedEvents())
    const datapoints = Array.from(await this.datapoints())

    const actions = []

    let currEvent = events.shift()
    let currDatapoint = datapoints.shift()

    let counter = 0
    while (currEvent && currDatapoint) {
      if (currEvent.startDate.toISOString() === currDatapoint.comment) {
        if (eventDuration(currEvent) !== currDatapoint.value) {
          actions.push({ type: 'update', datapoint: {
            id: currDatapoint.id,
            value: eventDuration(currEvent),
            comment: currDatapoint.comment,
          }})
        }
        currEvent = events.shift()
        currDatapoint = datapoints.shift()
      } else if (currEvent.startDate.toISOString() > currDatapoint.comment) {
        actions.push({ type: 'delete', datapoint: currDatapoint })
        currDatapoint = datapoints.shift()
      } else if (currEvent.startDate.toISOString() < currDatapoint.comment) {
        actions.push({ type: 'create', datapoint: {
          comment: currEvent.startDate.toISOString(),
          value: eventDuration(currEvent),
          daystamp: moment(currEvent.startDate).format('YYYYMMDD'),
        }})
        currEvent = events.shift()
      }
    }

    while (currEvent) {
      actions.push({ type: 'create', datapoint: {
        comment: currEvent.startDate.toISOString(),
        value: eventDuration(currEvent),
        daystamp: moment(currEvent.startDate).format('YYYYMMDD'),
      }})
      currEvent = events.shift()
    }

    while (currDatapoint) {
      actions.push({ type: 'delete', datapoint: currDatapoint })
      currDatapoint = datapoints.shift()
    }

    return actions
  }

  /**
   * Brings goal datapoints into line with events.
   * @return {Promise<void>} Container promise for all Beeminder API calls.
   */
  async apply (): Promise<any> {
    const actions = await this.actions()
    const goal = this.goal

    const promises = []

    for (let action of actions) {
      if (action.type === 'create') {
        promises.push(
          goal.createDatapoint(action.datapoint)
            .then((result) => {
              console.log('Created datapoint: ' + result)
            })
            .catch((error) => {
              console.log('Failed to create datapoint: ' + error)
            }),
        )
      }

      if (action.type === 'update') {
        promises.push(
          goal.updateDatapoint(action.datapoint)
            .then((result) => {
              console.log('Updated datapoint: ' + action.datapoint)
            })
            .catch((error) => {
              console.log('Failed to update datapoint: ' + error)
            }),
        )
      }

      if (action.type === 'delete') {
        promises.push(
          goal.deleteDatapoint(action.datapoint.id)
            .then((result) => {
              console.log('Deleted datapoint: ' + action.datapoint)
            })
            .catch((error) => {
              console.log('Failed to delete datapoint: ' + error)
            }),
        )
      }
    }

    return Promise.all(promises)
  }
}

export { BeeminderTimeSync }
