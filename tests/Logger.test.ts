import { Logger, LogLevel } from '../src'

jest.spyOn(console, 'log').mockImplementation(jest.fn())
jest.spyOn(console, 'warn').mockImplementation(jest.fn())

beforeEach((): void => {
  jest.clearAllMocks()
})

describe('Logger', (): void => {
  it('will publish a log entry to all configured trasports transports', async (): Promise<void> => {
    const testTransport = { enabled: true, log: jest.fn() }
    let logger = new Logger({ transports: { testTransport } })

    logger.publish('INFO', 'This is a tilte')
    expect(testTransport.log).toHaveBeenCalledTimes(1)

    const testTransport2 = { enabled: true, log: jest.fn() }

    logger = new Logger({ transports: { testTransport, testTransport2 } })
    logger.publish({ level: 'INFO', title: 'This is a tilte' })

    await logger.await()

    expect(testTransport.log).toHaveBeenCalledTimes(2)
    expect(testTransport2.log).toHaveBeenCalledTimes(1)
  })

  it('will not publish if the log is silenced', async (): Promise<void> => {
    const testTransport = { enabled: true, log: jest.fn() }
    const logger = new Logger({ silence: true, transports: { testTransport } })

    logger.publish({ level: 'INFO', title: 'This is a tilte' })
    expect(testTransport.log).toHaveBeenCalledTimes(0)

    logger.silence = false

    logger.publish({ level: 'INFO', title: 'This is a tilte' })
    expect(testTransport.log).toHaveBeenCalledTimes(1)
  })

  it('will not publish if the log enrtry level is not in the importance spectrum', async (): Promise<void> => {
    const levels = ['TRACE', 'DEBUG', 'INFO', 'QUERY', 'WARNING', 'ERROR', 'FATAL']

    for (let i = 0; i < levels.length; i++) {
      const currentLevel = levels[i] as LogLevel
      const testTransport = { enabled: true, log: jest.fn() }
      const logger = new Logger({ level: 'DEBUG', transports: { testTransport } })

      expect(logger.level).toEqual('DEBUG')

      logger.level = currentLevel

      for (let j = 0; j < levels.length; j++) {
        const currentLogLevel = levels[j] as LogLevel

        logger.publish({ level: currentLogLevel, title: 'This is a tilte' })
      }

      await logger.await()

      for (let j = 0; j < levels.length; j++) {
        const currentLogLevel = levels[j] as LogLevel

        if (j >= i) {
          expect(testTransport.log).toHaveBeenCalledWith({
            level: currentLogLevel,
            title: 'This is a tilte',
            timestamp: expect.anything(),
            index: expect.anything(),
            environment: 'test'
          })
        } else {
          expect(testTransport.log).not.toHaveBeenCalledWith({
            level: currentLogLevel,
            title: 'This is a tilte',
            timestamp: expect.anything(),
            index: expect.anything(),
            environment: 'test'
          })
        }
      }
    }
  })

  it('console war if no transport is there to log the entry', async (): Promise<void> => {
    const logger = new Logger({ transports: {} })

    logger.publish({ level: 'INFO', title: 'This is a tilte' })

    await logger.await()

    expect(console.warn).toHaveBeenCalledWith('WARNING: no transports configured in logger')
  })

  it('console log if no transport successully loggged an entry', async (): Promise<void> => {
    const errorTransport = {
      enabled: true,
      log: () => {
        throw 'Nop'
      }
    }
    const originalLog = console.log
    const logger = new Logger({ transports: { errorTransport } })

    logger.publish({ level: 'INFO', title: 'This is a tilte' })

    await logger.await()

    expect(console.log).toHaveBeenCalledWith('Nop')

    console.log = originalLog
  })

  it('logs the error of another transport in all other transports if one files', async (): Promise<void> => {
    const testTransport = { enabled: true, log: jest.fn() }
    const errorTransport = {
      enabled: true,
      log: () => {
        throw 'Nop'
      }
    }
    const logger = new Logger({ transports: { errorTransport, testTransport } })

    logger.publish({ level: 'INFO', title: 'This is a tilte' })

    await logger.await()

    expect(testTransport.log).toHaveBeenCalledWith({
      level: 'ERROR',
      title: `"errorTransport" could't log beacuse an error inside the trasporter itself`,
      error: 'Nop',
      timestamp: expect.any(Date),
      index: 2,
      environment: 'test',
      category: 'logger-transports'
    })
  })

  it('will not publish if the log enrtry level is not in the level group array', async (): Promise<void> => {
    const testTransport = { enabled: true, log: jest.fn() }
    const logger = new Logger({ level: ['INFO', 'FATAL'], transports: { testTransport } })

    logger.publish({ level: 'INFO', title: 'This is a tilte' })
    expect(testTransport.log).toHaveBeenCalledTimes(1)

    await logger.await()

    logger.publish({ level: 'FATAL', title: 'This is a tilte' })
    expect(testTransport.log).toHaveBeenCalledTimes(2)

    await logger.await()

    logger.publish({ level: 'WARNING', title: 'This is a tilte' })
    expect(testTransport.log).toHaveBeenCalledTimes(2)
  })

  it('will pass an environment to the transports (NODE_ENV)', async (): Promise<void> => {
    const testTransport = { enabled: true, log: jest.fn() }
    const logger = new Logger({ level: ['INFO', 'FATAL'], transports: { testTransport } })

    logger.publish({ level: 'INFO', title: 'This is a tilte' })
    expect(testTransport.log.mock.calls[0][0]).toMatchObject({ environment: 'test' })
  })

  it('can set transports on the fly', async (): Promise<void> => {
    const testTransport = { enabled: true, log: jest.fn() }
    const newTransport = { enabled: true, log: jest.fn() }
    let logger = new Logger({ transports: { testTransport } })

    logger.addTransport('testTransport', testTransport)

    await logger.await()

    expect(testTransport.log).toHaveBeenCalledWith({
      environment: 'test',
      index: 1,
      level: 'WARNING',
      message: undefined,
      timestamp: expect.any(Date),
      title: 'One "testTransport" transport was already set in transports'
    })

    logger.addTransport('newTransport', newTransport)

    logger.publish({ level: 'INFO', title: 'This is a tilte' })

    await logger.await()

    expect(testTransport.log).toHaveBeenCalledTimes(2)
    expect(newTransport.log).toHaveBeenCalledTimes(1)
  })

  it('can get transports by name', async (): Promise<void> => {
    const testTransport = { enabled: true, log: jest.fn() }
    let logger = new Logger({ transports: { testTransport } })

    expect(logger.getTransport('testTransport')).toEqual(testTransport)
  })

  it('can remove a transport', async (): Promise<void> => {
    const testTransport = { enabled: true, log: jest.fn() }
    let logger = new Logger({ transports: { testTransport } })

    logger.removeTransport('testTransport')

    expect(logger.getTransport('testTransport')).toEqual(undefined)
  })
})
