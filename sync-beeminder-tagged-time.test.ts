'use strict'

const moment = require('moment')

const sync = require('./sync-beeminder-tagged-time')

function createOkPromise(data) {
  return new Promise((ok, err) => { ok(data) })
}

function mockGoal(datapoints) {
  let okPromise = createOkPromise({})
  let datapointsPromise = createOkPromise(datapoints)
  return {
    datapoints: jest.fn().mockReturnValue(datapointsPromise),
    createDatapoint: jest.fn().mockReturnValue(okPromise),
    deleteDatapoint: jest.fn().mockReturnValue(okPromise),
    updateDatapoint: jest.fn().mockReturnValue(okPromise),
  }
}

test('sorted, filtered datapoints', async () => {
  var datapoints = [
    {"id":"1", "timestamp":1234567890, "daystamp":"20190223", "value":6, "comment":"2019-02-23T01:00:00.000Z", "updated_at":123, "requestid":"a"},
    {"id":"2", "timestamp":1234567890, "daystamp":"20190221", "value":7, "comment":"2019-02-21T01:00:00.000Z", "updated_at":123, "requestid":"b"},
    {"id":"3", "timestamp":1234567891, "daystamp":"20190222", "value":8, "comment":"2019-02-22T01:00:00.000Z", "updated_at":123, "requestid":"c"},
    {"id":"4", "timestamp":1234567891, "daystamp":"20190222", "value":9, "comment":"", "updated_at":123, "requestid":"d"},
    {"id":"5", "timestamp":1234567890, "daystamp":"20190220", "value":0, "comment":"2019-02-20T01:00:00.000Z", "updated_at":123, "requestid":"e"},
  ]

  const syncer = new sync.BeeminderTimeSync(
    mockGoal(datapoints),
    [],
    moment('2019-02-21'),
  )

  const result = await syncer.datapoints()

  expect(result).toMatchObject([
    {"id":"2", "timestamp":1234567890, "daystamp":"20190221", "value":7, "comment":"2019-02-21T01:00:00.000Z", "updated_at":123, "requestid":"b"},
    {"id":"3", "timestamp":1234567891, "daystamp":"20190222", "value":8, "comment":"2019-02-22T01:00:00.000Z", "updated_at":123, "requestid":"c"},
    {"id":"1", "timestamp":1234567890, "daystamp":"20190223", "value":6, "comment":"2019-02-23T01:00:00.000Z", "updated_at":123, "requestid":"a"},
  ])
})

test('sorted events', () => {
  var events = [
    {
      startDate: new Date('2019-02-21T01:00:00'),
      endDate: new Date('2019-02-21T02:00:00'),
      summary: 'One #music',
    },
    {
      startDate: new Date('2019-02-24T01:00:00'),
      endDate: new Date('2019-02-24T02:00:00'),
      summary: 'Three #music',
    },
    {
      startDate: new Date('2019-02-22T01:00:00'),
      endDate: new Date('2019-02-22T02:00:00'),
      summary: 'Two #music',
    },
  ]

  const syncer = new sync.BeeminderTimeSync(
    mockGoal([]),
    events,
    moment('2019-01-01'),
  )
  var sorted = syncer.sortedEvents()

  expect(sorted).toMatchObject([
    {
      startDate: new Date('2019-02-21T01:00:00'),
      endDate: new Date('2019-02-21T02:00:00'),
      summary: 'One #music',
    },
    {
      startDate: new Date('2019-02-22T01:00:00'),
      endDate: new Date('2019-02-22T02:00:00'),
      summary: 'Two #music',
    },
    {
      startDate: new Date('2019-02-24T01:00:00'),
      endDate: new Date('2019-02-24T02:00:00'),
      summary: 'Three #music',
    },
  ])
})

describe('calculate sync actions', () => {
  test('no data', async () => {
    var events = []

    const syncer = new sync.BeeminderTimeSync(
      mockGoal([]),
      events,
      moment('2019-01-01'),
    )

    var actions = await syncer.actions()

    expect(actions).toEqual({insert: [], delete: [], update: []})
  })

  test('one event', async () => {
    var events = [
      {
        startDate: new Date('2019-02-21T01:00:00'),
        endDate: new Date('2019-02-21T02:00:00'),
        summary: 'One #music',
      }
    ]
    const syncer = new sync.BeeminderTimeSync(
      mockGoal([]),
      events,
      moment('2019-01-01'),
    )

    var actions = await syncer.actions()

    expect(actions).toEqual({
      insert: [
        {
          comment: '2019-02-21T01:00:00.000Z',
          value: 60,
          daystamp: '20190221',
        },
      ],
      delete: [],
      update: [],
    })
  })

  test('one datapoint', async () => {
    var events = []
    var datapoints = [
      {
        id: 101,
        comment: '2019-02-21T01:00:00.000Z',
        value: 60,
      },
    ]

    const syncer = new sync.BeeminderTimeSync(
      mockGoal(datapoints),
      events,
      moment('2019-01-01'),
    )

    var actions = await syncer.actions()

    expect(actions).toEqual({
      insert: [],
      delete: [
        101,
      ],
      update: [],
    })
  })

  test('update', async () => {
    var events = [
      {
        startDate: new Date('2019-02-21T01:00:00'),
        endDate: new Date('2019-02-21T02:00:00'),
        summary: 'One #music',
      }
    ]
    var datapoints = [
      {
        id: 101,
        comment: '2019-02-21T01:00:00.000Z',
        value: 30,
      },
    ]

    const syncer = new sync.BeeminderTimeSync(
      mockGoal(datapoints),
      events,
      moment('2019-01-01'),
    )

    var actions = await syncer.actions()

    expect(actions).toEqual({
      insert: [],
      delete: [],
      update: [
        {
          id: 101,
          comment: '2019-02-21T01:00:00.000Z',
          value: 60,
        }
      ],
    })
  })
})

describe('apply', () => {
  test('no actions', async () => {
    var goal = mockGoal([])
    var actions = {insert: [], update: [], delete: []}

    const syncer = new sync.BeeminderTimeSync(
      goal,
      [],
      moment('2019-01-01'),
    )
    syncer.actions = () => createOkPromise(actions)

    await syncer.apply()

    expect(goal.datapoints).not.toHaveBeenCalled()
    expect(goal.createDatapoint).not.toHaveBeenCalled()
    expect(goal.deleteDatapoint).not.toHaveBeenCalled()
    expect(goal.updateDatapoint).not.toHaveBeenCalled()
  })

  test('insert', async () => {
    var goal = mockGoal([])
    var actions = {
      insert: [
        {
          comment: '2019-02-21T01:00:00.000Z',
          value: 60,
        },
      ],
      update: [],
      delete: [],
    }

    const syncer = new sync.BeeminderTimeSync(
      goal,
      [],
      moment('2019-01-01'),
    )
    syncer.actions = () => createOkPromise(actions)

    await syncer.apply()

    expect(goal.datapoints).not.toHaveBeenCalled()
    expect(goal.createDatapoint).toHaveBeenCalledWith(
      {
        comment: '2019-02-21T01:00:00.000Z',
        value: 60,
      }
    )
    expect(goal.deleteDatapoint).not.toHaveBeenCalled()
    expect(goal.updateDatapoint).not.toHaveBeenCalled()
  })

  test('update', async () => {
    var goal = mockGoal([])
    var actions = {
      insert: [],
      update: [
        {
          id: 101,
          comment: '2019-02-21T01:00:00.000Z',
          value: 60,
        },
      ],
      delete: [],
    }

    const syncer = new sync.BeeminderTimeSync(
      goal,
      [],
      moment('2019-01-01'),
    )
    syncer.actions = () => createOkPromise(actions)

    await syncer.apply()

    expect(goal.datapoints).not.toHaveBeenCalled()
    expect(goal.createDatapoint).not.toHaveBeenCalled()
    expect(goal.updateDatapoint).toHaveBeenCalledWith(
      {
        id: 101,
        comment: '2019-02-21T01:00:00.000Z',
        value: 60,
      }
    )
    expect(goal.deleteDatapoint).not.toHaveBeenCalled()
  })

  test('insert', async () => {
    var goal = mockGoal([])
    var actions = {
      insert: [],
      update: [],
      delete: [101],
    }

    const syncer = new sync.BeeminderTimeSync(
      goal,
      [],
      moment('2019-01-01'),
    )
    syncer.actions = () => createOkPromise(actions)

    await syncer.apply()

    expect(goal.datapoints).not.toHaveBeenCalled()
    expect(goal.createDatapoint).not.toHaveBeenCalled()
    expect(goal.updateDatapoint).not.toHaveBeenCalled()
    expect(goal.deleteDatapoint).toHaveBeenCalledWith(101)
  })
})
