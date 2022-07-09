import Logger, { LogLevel } from '../src'

describe('Logger', (): void => {
  it('will publish a log entry to all configured trasports transports', async (): Promise<void> => {
    const testTransport = { log: jest.fn().mockResolvedValue(0) }
    let logger = new Logger({ transport: testTransport })

    logger.publish('INFO', 'This is a tilte')
    expect(testTransport.log).toHaveBeenCalledTimes(1)

    const testTransport2 = { log: jest.fn().mockResolvedValue(0) }

    logger = new Logger({ transport: [testTransport, testTransport2] })
    logger.publish({ level: 'INFO', title: 'This is a tilte' })

    await logger.await()

    expect(testTransport.log).toHaveBeenCalledTimes(2)
    expect(testTransport2.log).toHaveBeenCalledTimes(1)
  })

  it('will not publish if the log is silenced', async (): Promise<void> => {
    const testTransport = { log: jest.fn().mockResolvedValue(0) }
    const logger = new Logger({ silence: true, transport: testTransport })

    logger.publish({ level: 'INFO', title: 'This is a tilte' })
    expect(testTransport.log).toHaveBeenCalledTimes(0)

    logger.silence = false

    logger.publish({ level: 'INFO', title: 'This is a tilte' })
    expect(testTransport.log).toHaveBeenCalledTimes(1)
  })

  it('will not publish if the log enrtry level is not in the importance spectrum', async (): Promise<void> => {
    const levels = ['TRACE', 'DEBUG', 'QUERY', 'INFO', 'WARNING', 'ERROR', 'FATAL']

    for (let i = 0; i < levels.length; i++) {
      const currentLevel = levels[i] as LogLevel
      const testTransport = { log: jest.fn().mockResolvedValue(0) }
      const logger = new Logger({ level: currentLevel, transport: testTransport })

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

  it('will not publish if the log enrtry level is not in the level group array', async (): Promise<void> => {
    const testTransport = { log: jest.fn().mockResolvedValue(0) }
    const logger = new Logger({ level: ['INFO', 'FATAL'], transport: testTransport })

    logger.publish({ level: 'INFO', title: 'This is a tilte' })
    expect(testTransport.log).toHaveBeenCalledTimes(1)

    await logger.await()

    logger.publish({ level: 'FATAL', title: 'This is a tilte' })
    expect(testTransport.log).toHaveBeenCalledTimes(2)

    await logger.await()

    logger.publish({ level: 'WARNING', title: 'This is a tilte' })
    expect(testTransport.log).toHaveBeenCalledTimes(2)
  })

  it('will pass a category to the transports', async (): Promise<void> => {
    const testTransport = { log: jest.fn().mockResolvedValue(0) }
    const logger = new Logger({ level: ['INFO', 'FATAL'], transport: testTransport, category: 'Cat' })

    logger.publish({ level: 'INFO', title: 'This is a tilte' })
    expect(testTransport.log.mock.calls[0][0]).toMatchObject({ category: 'Cat' })
  })

  it('will pass an environment to the transports (NODE_ENV)', async (): Promise<void> => {
    const testTransport = { log: jest.fn().mockResolvedValue(0) }
    const logger = new Logger({ level: ['INFO', 'FATAL'], transport: testTransport, category: 'Cat' })

    logger.publish({ level: 'INFO', title: 'This is a tilte' })
    expect(testTransport.log.mock.calls[0][0]).toMatchObject({ category: 'Cat', environment: 'test' })
  })
})
