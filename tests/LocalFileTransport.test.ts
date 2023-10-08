import { Measurement } from '@universal-packages/time-measurer'
import fs from 'fs'

import { LocalFileTransport } from '../src'

beforeAll((): void => {
  Date.prototype.toLocaleTimeString = (): string => 'date'
  Date.prototype.toJSON = (): string => 'date'
  process.stdout.columns = 60
})

describe(LocalFileTransport, (): void => {
  it('appends the logs in the file', async (): Promise<void> => {
    const appendMock = jest.fn()
    const transport = new LocalFileTransport()

    fs.appendFileSync = appendMock

    const error = new Error('error')
    error.stack = '\nerror here\nerror there\n' as any
    error.cause = new Error('error')

    const error2 = new Error('error')
    error2.stack = undefined
    error2.cause = new Error('error')

    const metadata = { this: { is: { meta: 'data' } } }
    const largeMetadata = { this: { is: { meta: { this: { is: { meta: { this: { is: { meta: 'data' } } } } } } } } }

    transport.log({ level: 'TRACE', metadata, title: 'title', timestamp: new Date(), index: 1, environment: 'test' })
    transport.log({ level: 'DEBUG', metadata: largeMetadata, title: 'title', message: 'with message', timestamp: new Date(), index: 10, environment: 'test' })
    transport.log({ level: 'INFO', title: 'title', measurement: new Measurement(12340000n), metadata: { test: true }, timestamp: new Date(), index: 100, environment: 'test' })
    transport.log({ level: 'QUERY', title: 'title', measurement: 100, timestamp: new Date(), index: 200, environment: 'test' })
    transport.log({ level: 'WARNING', title: 'title', measurement: 'formated', timestamp: new Date(), index: 1000, environment: 'test' })
    transport.log({ level: 'ERROR', title: 'title', error, timestamp: new Date(), index: 2000, environment: 'test' })
    transport.log({ level: 'ERROR', title: 'title', error: error2, timestamp: new Date(), index: 2001, environment: 'test' })
    transport.log({ level: 'FATAL', title: 'title', timestamp: new Date(), index: 10000, environment: 'test' })

    expect(appendMock.mock.calls).toEqual([
      [
        expect.stringMatching(/logs\/test.log/g),
        "001 | TRACE | date \ntitle\n⚑ { this: { is: { meta: 'data' } } }}\n---------------------------------------------------------------------------------------------------\n"
      ],
      [
        expect.stringMatching(/logs\/test.log/g),
        '010 | DEBUG | date \ntitle\nwith message\n⚑ {\n  this: {\n    is: {\n      meta: {\n        this: {\n          is: {\n            meta: [Object]\n          }\n        }\n      }\n    }\n  }\n}\n---------------------------------------------------------------------------------------------------\n'
      ],
      [
        expect.stringMatching(/logs\/test.log/g),
        '100 | INFO | 12.34ms | date \ntitle\n⚑ { test: true }}\n---------------------------------------------------------------------------------------------------\n'
      ],
      [
        expect.stringMatching(/logs\/test.log/g),
        '200 | QUERY | 100 | date \ntitle\n---------------------------------------------------------------------------------------------------\n'
      ],
      [
        expect.stringMatching(/logs\/test.log/g),
        '1000 | WARNING | formated | date \ntitle\n---------------------------------------------------------------------------------------------------\n'
      ],
      [
        expect.stringMatching(/logs\/test.log/g),
        '2000 | ERROR | date \ntitle\nerror\nError: error}\nerror here\nerror there\n---------------------------------------------------------------------------------------------------\n'
      ],
      [
        expect.stringMatching(/logs\/test.log/g),
        '2001 | ERROR | date \ntitle\nerror\nError: error}\n---------------------------------------------------------------------------------------------------\n'
      ],
      [
        expect.stringMatching(/logs\/test.log/g),
        '10000 | FATAL | date \ntitle\n---------------------------------------------------------------------------------------------------\n'
      ]
    ])

    transport.enabled = false
    transport.log({ level: 'TRACE', metadata, title: 'title', timestamp: new Date(), index: 1, environment: 'test' })

    expect(appendMock).toHaveBeenCalledTimes(8)
  })

  it('appends the logs in the file as json lines', async (): Promise<void> => {
    const appendMock = jest.fn()
    const transport = new LocalFileTransport({ asJson: true })

    fs.appendFileSync = appendMock

    const error = new Error('error')
    error.stack = '\nerror here\nerror there\n' as any
    error.cause = new Error('error')

    const error2 = new Error('error')
    error2.stack = undefined
    error2.cause = new Error('error')

    const metadata = { this: { is: { meta: 'data' } } }
    const largeMetadata = { this: { is: { meta: { this: { is: { meta: { this: { is: { meta: 'data' } } } } } } } } }

    transport.log({ level: 'TRACE', metadata, title: 'title', timestamp: new Date(), index: 1, environment: 'test' })
    transport.log({ level: 'DEBUG', metadata: largeMetadata, title: 'title', message: 'with message', timestamp: new Date(), index: 10, environment: 'test' })
    transport.log({ level: 'INFO', title: 'title', metadata: { test: true }, timestamp: new Date(), index: 100, environment: 'test' })
    transport.log({ level: 'QUERY', title: 'title', measurement: 100, timestamp: new Date(), index: 200, environment: 'test' })
    transport.log({ level: 'WARNING', title: 'title', measurement: 'formatted', timestamp: new Date(), index: 1000, environment: 'test' })
    transport.log({ level: 'ERROR', title: 'title', error, timestamp: new Date(), index: 2000, environment: 'test' })
    transport.log({ level: 'ERROR', title: 'title', error: error2, timestamp: new Date(), index: 2001, environment: 'test' })
    transport.log({ level: 'FATAL', title: 'title', timestamp: new Date(), index: 10000, environment: 'test' })

    expect(appendMock.mock.calls).toEqual([
      [
        expect.stringMatching(/logs\/test.log/g),
        '{"level":"TRACE","metadata":{"this":{"is":{"meta":"data"}}},"title":"title","timestamp":"date","index":1,"environment":"test"}\n'
      ],
      [
        expect.stringMatching(/logs\/test.log/g),
        '{"level":"DEBUG","metadata":{"this":{"is":{"meta":{"this":{"is":{"meta":{"this":{"is":{"meta":"data"}}}}}}}}},"title":"title","message":"with message","timestamp":"date","index":10,"environment":"test"}\n'
      ],
      [expect.stringMatching(/logs\/test.log/g), '{"level":"INFO","title":"title","metadata":{"test":true},"timestamp":"date","index":100,"environment":"test"}\n'],
      [expect.stringMatching(/logs\/test.log/g), '{"level":"QUERY","title":"title","measurement":100,"timestamp":"date","index":200,"environment":"test"}\n'],
      [expect.stringMatching(/logs\/test.log/g), '{"level":"WARNING","title":"title","measurement":"formatted","timestamp":"date","index":1000,"environment":"test"}\n'],
      [expect.stringMatching(/logs\/test.log/g), '{"level":"ERROR","title":"title","error":{"cause":{}},"timestamp":"date","index":2000,"environment":"test"}\n'],
      [expect.stringMatching(/logs\/test.log/g), '{"level":"ERROR","title":"title","error":{"cause":{}},"timestamp":"date","index":2001,"environment":"test"}\n'],
      [expect.stringMatching(/logs\/test.log/g), '{"level":"FATAL","title":"title","timestamp":"date","index":10000,"environment":"test"}\n']
    ])
  })

  it('prints the formatted logs with a category', async (): Promise<void> => {
    const appendMock = jest.fn()
    const transport = new LocalFileTransport()

    fs.appendFileSync = appendMock

    const error = new Error('error')
    error.stack = '\nerror here\nerror there\n' as any

    const error2 = new Error('error')
    error2.stack = undefined

    transport.log({ category: 'Cat', level: 'TRACE', title: 'title', timestamp: new Date(), index: 1, environment: 'test' })
    transport.log({ category: 'Cat', level: 'DEBUG', title: 'title', message: 'with message', timestamp: new Date(), index: 10, environment: 'test' })
    transport.log({ category: 'Cat', level: 'INFO', title: 'title', metadata: { test: true }, timestamp: new Date(), index: 100, environment: 'test' })
    transport.log({ category: 'Cat', level: 'QUERY', title: 'title', measurement: 100, timestamp: new Date(), index: 200, environment: 'test' })
    transport.log({ category: 'Cat', level: 'WARNING', title: 'title', measurement: 'formated', timestamp: new Date(), index: 1000, environment: 'test' })
    transport.log({ category: 'Cat', level: 'ERROR', title: 'title', error, timestamp: new Date(), index: 2000, environment: 'test' })
    transport.log({ category: 'Cat', level: 'ERROR', title: 'title', error: error2, timestamp: new Date(), index: 2001, environment: 'test' })
    transport.log({ category: 'Cat', level: 'FATAL', title: 'title', timestamp: new Date(), index: 10000, environment: 'test' })

    expect(appendMock.mock.calls).toEqual([
      [
        expect.stringMatching(/logs\/test.log/g),
        '001 | TRACE | Cat | date \ntitle\n---------------------------------------------------------------------------------------------------\n'
      ],
      [
        expect.stringMatching(/logs\/test.log/g),
        '010 | DEBUG | Cat | date \ntitle\nwith message\n---------------------------------------------------------------------------------------------------\n'
      ],
      [
        expect.stringMatching(/logs\/test.log/g),
        '100 | INFO | Cat | date \ntitle\n⚑ { test: true }}\n---------------------------------------------------------------------------------------------------\n'
      ],
      [
        expect.stringMatching(/logs\/test.log/g),
        '200 | QUERY | Cat | 100 | date \ntitle\n---------------------------------------------------------------------------------------------------\n'
      ],
      [
        expect.stringMatching(/logs\/test.log/g),
        '1000 | WARNING | Cat | formated | date \ntitle\n---------------------------------------------------------------------------------------------------\n'
      ],
      [
        expect.stringMatching(/logs\/test.log/g),
        '2000 | ERROR | Cat | date \ntitle\nerror\nerror here\nerror there\n---------------------------------------------------------------------------------------------------\n'
      ],
      [
        expect.stringMatching(/logs\/test.log/g),
        '2001 | ERROR | Cat | date \ntitle\nerror\n---------------------------------------------------------------------------------------------------\n'
      ],
      [
        expect.stringMatching(/logs\/test.log/g),
        '10000 | FATAL | Cat | date \ntitle\n---------------------------------------------------------------------------------------------------\n'
      ]
    ])
  })
})
