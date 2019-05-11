'use strict'

import moment from 'moment'

import * as sync from './sync-beeminder-tagged-time'

function createOkPromise (data: Array<sync.Action>): Promise<Array<sync.Action>>
function createOkPromise (data: any): Promise<any>
function createOkPromise (data) {
  return new Promise((ok, err) => { ok(data) })
}

function mockGoal (datapoints) {
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
  const datapoints = [
    {
      'id': '1',
      'timestamp': 1234567890,
      'daystamp': '20190223',
      'value': 6,
      'comment': '2019-02-23T01:00:00.000Z',
      'updated_at': 123,
      'requestid': 'a',
    },
    {
      'id': '2',
      'timestamp': 1234567890,
      'daystamp': '20190221',
      'value': 7,
      'comment': '2019-02-21T01:00:00.000Z',
      'updated_at': 123,
      'requestid': 'b',
    },
    {
      'id': '3',
      'timestamp': 1234567891,
      'daystamp': '20190222',
      'value': 8,
      'comment': '2019-02-22T01:00:00.000Z',
      'updated_at': 123,
      'requestid': 'c',
    },
    {
      'id': '4',
      'timestamp': 1234567891,
      'daystamp': '20190222',
      'value': 9,
      'comment': '',
      'updated_at': 123,
      'requestid': 'd',
    },
    {
      'id': '5',
      'timestamp': 1234567890,
      'daystamp': '20190220',
      'value': 0,
      'comment': '2019-02-20T01:00:00.000Z',
      'updated_at': 123,
      'requestid': 'e',
    },
  ]

  const syncer = new sync.BeeminderTimeSync(
    mockGoal(datapoints),
    [],
    moment('2019-02-21'),
  )

  const result = await syncer.datapoints()

  expect(result).toMatchObject([
    {
      'id': '2',
      'timestamp': 1234567890,
      'daystamp': '20190221',
      'value': 7,
      'comment': '2019-02-21T01:00:00.000Z',
      'updated_at': 123,
      'requestid': 'b',
    },
    {
      'id': '3',
      'timestamp': 1234567891,
      'daystamp': '20190222',
      'value': 8,
      'comment': '2019-02-22T01:00:00.000Z',
      'updated_at': 123,
      'requestid': 'c',
    },
    {
      'id': '1',
      'timestamp': 1234567890,
      'daystamp': '20190223',
      'value': 6,
      'comment': '2019-02-23T01:00:00.000Z',
      'updated_at': 123,
      'requestid': 'a',
    },
  ])
})

test('sorted events', () => {
  const events = [
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
  const sorted = syncer.sortedEvents()

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
    const events = []

    const syncer = new sync.BeeminderTimeSync(
      mockGoal([]),
      events,
      moment('2019-01-01'),
    )

    const actions = await syncer.actions()

    expect(actions).toEqual([])
  })

  test('one event', async () => {
    const events = [
      {
        startDate: new Date('2019-02-21T01:00:00'),
        endDate: new Date('2019-02-21T02:00:00'),
        summary: 'One #music',
      },
    ]
    const syncer = new sync.BeeminderTimeSync(
      mockGoal([]),
      events,
      moment('2019-01-01'),
    )

    const actions = await syncer.actions()

    expect(actions).toEqual([
      {
        type: 'create',
        datapoint: {
          comment: '2019-02-21T01:00:00.000Z',
          value: 60,
          daystamp: '20190221',
        },
      },
    ])
  })

  test('one datapoint', async () => {
    const events = []
    const datapoints = [
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

    const actions = await syncer.actions()

    expect(actions).toEqual([
      {
        type: 'delete',
        datapoint: {
          id: 101,
          comment: '2019-02-21T01:00:00.000Z',
          value: 60,
        },
      },
    ])
  })

  test('update', async () => {
    const events = [
      {
        startDate: new Date('2019-02-21T01:00:00'),
        endDate: new Date('2019-02-21T02:00:00'),
        summary: 'One #music',
      },
    ]
    const datapoints = [
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

    const actions = await syncer.actions()

    expect(actions).toEqual([
      {
        type: 'update',
        datapoint: {
          id: 101,
          comment: '2019-02-21T01:00:00.000Z',
          value: 60,
        },
      },
    ])
  })
})

describe('apply', () => {
  test('no actions', async () => {
    const goal = mockGoal([])
    const actions = []

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
    const goal = mockGoal([])
    const actions = [
      {
        type: 'create',
        datapoint: {
          comment: '2019-02-21T01:00:00.000Z',
          value: 60,
        },
      },
    ]

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
      },
    )
    expect(goal.deleteDatapoint).not.toHaveBeenCalled()
    expect(goal.updateDatapoint).not.toHaveBeenCalled()
  })

  test('update', async () => {
    const goal = mockGoal([])
    const actions = [
      {
        type: 'update',
        datapoint: {
          id: 101,
          comment: '2019-02-21T01:00:00.000Z',
          value: 60,
        },
      },
    ]

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
      },
    )
    expect(goal.deleteDatapoint).not.toHaveBeenCalled()
  })

  test('insert', async () => {
    const goal = mockGoal([])
    const actions = [
      {
        type: 'delete',
        datapoint: {
          id: 101,
          comment: 'dummy',
        },
      },
    ]

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
