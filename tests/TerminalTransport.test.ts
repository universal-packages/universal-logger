import stripAnsi from 'strip-ansi'

import { CategoryColor, TerminalTransport } from '../src'

beforeAll((): void => {
  Date.prototype.toLocaleTimeString = (): string => 'date'
  process.stdout.columns = 60
})

describe('TerminalTransport', (): void => {
  it('clears the terminal af first log', async (): Promise<void> => {
    const writeMock = jest.fn()
    const transport = new TerminalTransport({ clear: true, withHeader: true })

    process.stdout.write = ((line: string): void => {
      writeMock(stripAnsi(line))
    }) as any

    transport.log({ level: 'TRACE', title: 'title', timestamp: new Date(), index: 1, environment: 'test' })

    expect(writeMock.mock.calls).toEqual([[''], ['\n'], [' 001 TRACE   test   date \ntitle\n'], ['\n']])

    transport.log({ level: 'TRACE', title: 'title', timestamp: new Date(), index: 35, environment: 'test' })

    expect(writeMock.mock.calls).toEqual([[''], ['\n'], [' 001 TRACE   test   date \ntitle\n'], ['\n'], [' 035 TRACE   test   date \ntitle\n'], ['\n']])
  })

  it('prints the formated logs', async (): Promise<void> => {
    const writeMock = jest.fn()
    const transport = new TerminalTransport({ withHeader: true })

    process.stdout.write = ((line: string): void => {
      writeMock(stripAnsi(line))
    }) as any

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
    transport.log({ level: 'WARNING', title: 'title', measurement: 'formated', timestamp: new Date(), index: 1000, environment: 'test' })
    transport.log({ level: 'ERROR', title: 'title', error, timestamp: new Date(), index: 2000, environment: 'test' })
    transport.log({ level: 'ERROR', title: 'title', error: error2, timestamp: new Date(), index: 2001, environment: 'test' })
    transport.log({ level: 'FATAL', title: 'title', timestamp: new Date(), index: 10000, environment: 'test' })

    expect(writeMock.mock.calls).toEqual([
      [" 001 TRACE   test   date \ntitle\n⚑ { this: { is: { meta: 'data' } } }\n"],
      ['\n'],
      [
        ' 010 DEBUG   test   date \ntitle\nwith message\n⚑ {\n  this: {\n    is: {\n      meta: {\n        this: {\n          is: {\n            meta: [Object]\n          }\n        }\n      }\n    }\n  }\n}\n'
      ],
      ['\n'],
      [' 100 INFO   test   date \ntitle\n⚑ { test: true }\n'],
      ['\n'],
      [' 200 QUERY   test   100   date \ntitle\n'],
      ['\n'],
      [' 1000 WARNING   test   formated   date \ntitle\n'],
      ['\n'],
      [' 2000 ERROR   test   date \ntitle\nerror\nError: error}\nerror here\nerror there\n'],
      ['\n'],
      [' 2001 ERROR   test   date \ntitle\nerror\nError: error}\n'],
      ['\n'],
      [' 10000 FATAL   test   date \ntitle\n'],
      ['\n']
    ])

    transport.enabled = false
    transport.log({ level: 'TRACE', metadata, title: 'title', timestamp: new Date(), index: 1, environment: 'test' })

    expect(writeMock).toHaveBeenCalledTimes(16)
  })

  it('prints the formated logs with a category', async (): Promise<void> => {
    const writeMock = jest.fn()
    const transport = new TerminalTransport({ withHeader: true })

    process.stdout.write = ((line: string): void => {
      writeMock(stripAnsi(line))
    }) as any

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

    expect(writeMock.mock.calls).toEqual([
      [' 001 TRACE   Cat   test   date \ntitle\n'],
      ['\n'],
      [' 010 DEBUG   Cat   test   date \ntitle\nwith message\n'],
      ['\n'],
      [' 100 INFO   Cat   test   date \ntitle\n⚑ { test: true }\n'],
      ['\n'],
      [' 200 QUERY   Cat   test   100   date \ntitle\n'],
      ['\n'],
      [' 1000 WARNING   Cat   test   formated   date \ntitle\n'],
      ['\n'],
      [' 2000 ERROR   Cat   test   date \ntitle\nerror\nerror here\nerror there\n'],
      ['\n'],
      [' 2001 ERROR   Cat   test   date \ntitle\nerror\n'],
      ['\n'],
      [' 10000 FATAL   Cat   test   date \ntitle\n'],
      ['\n']
    ])
  })

  it('uses all category colors', async (): Promise<void> => {
    const writeMock = jest.fn()

    process.stdout.write = ((line: string): void => {
      writeMock(stripAnsi(line))
    }) as any

    const colors: CategoryColor[] = ['AQUA', 'BLACK', 'BLUE', 'DARK', 'GRAY', 'GREEN', 'KIWI', 'PURPLE', 'RED', 'YELLOW']

    for (let i = 0; i < colors.length; i++) {
      const transport = new TerminalTransport({ categoryColors: { Cat: colors[i] }, withHeader: true })

      transport.log({ category: 'Cat', level: 'TRACE', title: 'title', timestamp: new Date(), index: 1, environment: 'test' })
    }

    expect(writeMock.mock.calls).toEqual([
      [' 001 TRACE   Cat   test   date \ntitle\n'],
      ['\n'],
      [' 001 TRACE   Cat   test   date \ntitle\n'],
      ['\n'],
      [' 001 TRACE   Cat   test   date \ntitle\n'],
      ['\n'],
      [' 001 TRACE   Cat   test   date \ntitle\n'],
      ['\n'],
      [' 001 TRACE   Cat   test   date \ntitle\n'],
      ['\n'],
      [' 001 TRACE   Cat   test   date \ntitle\n'],
      ['\n'],
      [' 001 TRACE   Cat   test   date \ntitle\n'],
      ['\n'],
      [' 001 TRACE   Cat   test   date \ntitle\n'],
      ['\n'],
      [' 001 TRACE   Cat   test   date \ntitle\n'],
      ['\n'],
      [' 001 TRACE   Cat   test   date \ntitle\n'],
      ['\n']
    ])
  })
})
