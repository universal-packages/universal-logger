import { LocalFileTransport, LogLevel, Logger, TerminalTransport } from '../src'
import TestTransport from '../src/TestTransport'

jest.spyOn(console, 'log').mockImplementation(jest.fn())
jest.spyOn(console, 'warn').mockImplementation(jest.fn())

beforeEach((): void => {
  jest.clearAllMocks()
})

describe(Logger, (): void => {
  it('will log a log entry to all configured transports transports', async (): Promise<void> => {
    let logger = new Logger()
    await logger.prepare()

    logger.log({ level: 'INFO', title: 'This is a title' })
    expect(TestTransport.logHistory).toEqual([
      {
        environment: 'test',
        index: 1,
        level: 'INFO',
        timestamp: expect.any(Date),
        title: 'This is a title'
      }
    ])
    TestTransport.reset()

    const testTransport2 = { log: jest.fn() }

    logger = new Logger({ transports: [{ transport: 'test' }, { transport: testTransport2 }] })
    await logger.prepare()

    logger.log({ level: 'INFO', title: 'This is a second title' })

    await logger.waitForLoggingActivity()

    expect(TestTransport.logHistory).toEqual([
      {
        environment: 'test',
        index: 1,
        level: 'INFO',
        timestamp: expect.any(Date),
        title: 'This is a second title'
      }
    ])
    expect(testTransport2.log).toHaveBeenCalledTimes(1)
  })

  it('filters metadata keys if they are configured as sensitive', async (): Promise<void> => {
    const testTransport = { log: jest.fn() }
    let logger = new Logger({ transports: [{ transport: testTransport }], filterMetadataKeys: ['keyboard'] })
    await logger.prepare()

    logger.log({
      level: 'INFO',
      title: 'This is a title',
      metadata: { secret: 'my secret', password: 'my password', token: 'my token', keyboard: 'my keyboard', other: 'other' }
    })

    await logger.waitForLoggingActivity()

    expect(testTransport.log.mock.calls[0][0].metadata).toEqual({
      secret: '<filtered>',
      password: '<filtered>',
      token: '<filtered>',
      keyboard: '<filtered>',
      other: 'other'
    })
  })

  it('will not log if the log is silenced', async (): Promise<void> => {
    const testTransport = { log: jest.fn() }
    const logger = new Logger({ silence: true, transports: [{ transport: testTransport }] })
    await logger.prepare()

    logger.log({ level: 'INFO', title: 'This is a title' })
    expect(testTransport.log).toHaveBeenCalledTimes(0)

    logger.silence = false

    logger.log({ level: 'INFO', title: 'This is a title' })
    expect(testTransport.log).toHaveBeenCalledTimes(1)
  })

  it('will not log if the log entry level is not in the importance spectrum', async (): Promise<void> => {
    const levels = ['TRACE', 'DEBUG', 'QUERY', 'INFO', 'WARNING', 'ERROR', 'FATAL']

    for (let i = 0; i < levels.length; i++) {
      const currentLevel = levels[i] as LogLevel
      const testTransport = { log: jest.fn() }
      const logger = new Logger({ level: 'DEBUG', transports: [{ transport: testTransport }] })
      await logger.prepare()

      expect(logger.level).toEqual('DEBUG')

      logger.level = currentLevel

      for (let j = 0; j < levels.length; j++) {
        const currentLogLevel = levels[j] as LogLevel

        logger.log({ level: currentLogLevel, title: 'This is a title' }, { configured: true })
      }

      await logger.waitForLoggingActivity()

      for (let j = 0; j < levels.length; j++) {
        const currentLogLevel = levels[j] as LogLevel

        if (j >= i) {
          expect(testTransport.log).toHaveBeenCalledWith(
            {
              level: currentLogLevel,
              title: 'This is a title',
              timestamp: expect.anything(),
              index: expect.anything(),
              environment: 'test'
            },
            { configured: true }
          )
        } else {
          expect(testTransport.log).not.toHaveBeenCalledWith(
            {
              level: currentLogLevel,
              title: 'This is a title',
              timestamp: expect.anything(),
              index: expect.anything(),
              environment: 'test'
            },
            { configured: true }
          )
        }
      }
    }
  })

  it('console warns if no transport is there to log the entry', async (): Promise<void> => {
    const logger = new Logger({ transports: [] })
    await logger.prepare()

    logger.log({ level: 'INFO', title: 'This is a title' })

    await logger.waitForLoggingActivity()

    expect(console.warn).toHaveBeenCalledWith('WARNING: no transports configured in logger')
  })

  it('console log if no transport successfully logged an entry', async (): Promise<void> => {
    const errorTransport = {
      enabled: true,
      log: () => {
        throw 'Nop'
      }
    }
    const logger = new Logger({ transports: [{ transport: errorTransport }] })
    await logger.prepare()

    logger.log({ level: 'INFO', title: 'This is a title' })

    await logger.waitForLoggingActivity()

    expect(console.log).toHaveBeenCalledWith('Nop')
  })

  it('logs the error of another transport in all other transports if one files', async (): Promise<void> => {
    const testTransport = { log: jest.fn() }
    const errorTransport = {
      enabled: true,
      log: () => {
        throw 'Nop'
      }
    }
    const logger = new Logger({ transports: [{ transport: errorTransport }, { transport: testTransport }] })
    await logger.prepare()

    logger.log({ level: 'INFO', title: 'This is a title' })

    await logger.waitForLoggingActivity()

    expect(testTransport.log).toHaveBeenCalledWith({
      level: 'ERROR',
      title: `"Object" could't log because an error inside the transporter itself`,
      error: 'Nop',
      timestamp: expect.any(Date),
      index: 2,
      environment: 'test',
      category: 'logger-transports'
    })
  })

  it('will not log if the log entry level is not in the level group array', async (): Promise<void> => {
    const testTransport = { log: jest.fn() }
    const logger = new Logger({ level: ['INFO', 'FATAL'], transports: [{ transport: testTransport }] })
    await logger.prepare()

    logger.log({ level: 'INFO', title: 'This is a title' })
    expect(testTransport.log).toHaveBeenCalledTimes(1)

    await logger.waitForLoggingActivity()

    logger.log({ level: 'FATAL', title: 'This is a title' })
    expect(testTransport.log).toHaveBeenCalledTimes(2)

    await logger.waitForLoggingActivity()

    logger.log({ level: 'WARNING', title: 'This is a title' })
    expect(testTransport.log).toHaveBeenCalledTimes(2)
  })

  it('will pass an environment to the transports (NODE_ENV)', async (): Promise<void> => {
    const testTransport = { log: jest.fn() }
    const logger = new Logger({ level: ['INFO', 'FATAL'], transports: [{ transport: testTransport }] })
    await logger.prepare()

    logger.log({ level: 'INFO', title: 'This is a title' })
    expect(testTransport.log.mock.calls[0][0]).toMatchObject({ environment: 'test' })
  })

  it('Sets adapters from string', async (): Promise<void> => {
    const logger = new Logger({ transports: [{ transport: 'terminal' }, { transport: 'local-file' }] })
    await logger.prepare()

    expect(logger).toMatchObject({ transports: [expect.any(TerminalTransport), expect.any(LocalFileTransport)] })
  })

  it('Sets adapters from objects', async (): Promise<void> => {
    const transport = new TestTransport()
    const logger = new Logger({ transports: [{ transport }] })
    await logger.prepare()

    expect(logger).toMatchObject({ transports: [transport] })
  })

  it('Prepares and releases adapters if they require it at load time', async (): Promise<void> => {
    const transport = { prepare: jest.fn(), log: jest.fn(), release: jest.fn() }
    const logger = new Logger({ transports: [{ transport }] })
    await logger.prepare()

    expect(transport.prepare).toHaveBeenCalled()

    await logger.release()

    expect(transport.release).toHaveBeenCalled()
  })

  it('throws if a unknown transport is specified to be loaded', async (): Promise<void> => {
    const logger = new Logger({ transports: [{ transport: 'what?' }] })

    let error: Error

    try {
      await logger.prepare()
    } catch (e) {
      error = e
    }

    expect(error.message).toEqual('Unknown transport: what?')
  })
})
