import { gatherAdapters } from '@universal-packages/adapter-resolver'
import { BufferDispatcher } from '@universal-packages/buffer-dispatcher'
import { mapObject } from '@universal-packages/object-mapper'

import LocalFileTransport from './LocalFileTransport'
import { LogBufferEntry, LogEntry, LogLevel, LoggerOptions, TransportInterface, TransportInterfaceClass, TransportLogEntry } from './Logger.types'
import TerminalTransport from './TerminalTransport'
import TestTransport from './TestTransport'

const LOG_LEVELS_SCALE: { [level in LogLevel]: number } = { FATAL: 0, ERROR: 1, WARNING: 2, INFO: 3, QUERY: 4, DEBUG: 5, TRACE: 6 }
const ON_TEST = process.env.NODE_ENV === 'test'

export default class Logger {
  public readonly options: LoggerOptions
  public level: LogLevel | LogLevel[]
  public silence: boolean

  public get dispatcher(): BufferDispatcher<LogBufferEntry> {
    return this.bufferDispatcher
  }

  private readonly bufferDispatcher: BufferDispatcher<LogBufferEntry>
  private readonly transports: TransportInterface[] = []
  private currentIndex = 0

  public constructor(options?: LoggerOptions) {
    this.options = {
      level: 'TRACE',
      silence: false,
      transports: ON_TEST ? [{ transport: 'test' }] : [{ transport: 'terminal' }, { transport: 'local-file' }],
      ...options,
      filterMetadataKeys: ['password', 'secret', 'token', ...(options?.filterMetadataKeys || [])]
        .filter((value: string, index: number, self: string[]): boolean => self.indexOf(value) === index)
        .map((value: string): string => value.toLowerCase())
    }

    this.silence = this.options.silence
    this.level = this.options.level

    this.bufferDispatcher = new BufferDispatcher<LogBufferEntry>({ entryDispatcher: this.processEntry.bind(this) })
  }

  public async prepare(): Promise<void> {
    await this.loadTransports()
  }

  public async release(): Promise<void> {
    for (let i = 0; i < this.transports.length; i++) {
      const currentTransport = this.transports[i]

      if (currentTransport.release) await currentTransport.release()
    }
  }

  public log(entry: LogEntry, configuration?: Record<string, any>): void {
    if (this.canBeLogged(entry)) {
      const transportLogEntry: TransportLogEntry = {
        ...entry,
        timestamp: new Date(),
        index: ++this.currentIndex,
        environment: process.env['NODE_ENV']
      }

      if (transportLogEntry.metadata) {
        this.filterMetadata(transportLogEntry.metadata)
      }

      this.bufferDispatcher.push({ entry: transportLogEntry, configuration })
    }
  }

  public async waitForLoggingActivity(): Promise<void> {
    if (this.dispatcher.busy) await this.bufferDispatcher.waitFor('idle')
  }

  private async processEntry(logBufferEntry: LogBufferEntry): Promise<void> {
    if (this.transports.length === 0) console.warn('WARNING: no transports configured in logger')
    const transportErrors: { name: string; error: Error }[] = []
    let withErrors = false

    const successfulTransports: TransportInterface[] = []

    for (let i = 0; i < this.transports.length; i++) {
      const currentTransport = this.transports[i]

      try {
        await currentTransport.log(logBufferEntry.entry, logBufferEntry.configuration)

        successfulTransports.push(currentTransport)
      } catch (error) {
        withErrors = true

        transportErrors.push({ name: currentTransport.constructor.name, error })
      }
    }

    if (withErrors) {
      if (successfulTransports.length === 0) {
        for (let i = 0; i < transportErrors.length; i++) {
          const currentError = transportErrors[i]

          console.log(currentError.error)
        }
      } else {
        for (let i = 0; i < successfulTransports.length; i++) {
          const currentTransport = successfulTransports[i]

          for (let j = 0; j < transportErrors.length; j++) {
            const currentError = transportErrors[j]

            await currentTransport.log({
              level: 'ERROR',
              title: `"${currentError.name}" could't log because an error inside the transporter itself`,
              error: currentError.error,
              timestamp: new Date(),
              index: ++this.currentIndex,
              environment: process.env['NODE_ENV'],
              category: 'logger-transports'
            })
          }
        }
      }
    }
  }

  private canBeLogged(logEntry: LogEntry): boolean {
    if (this.silence) return false

    if (typeof this.level === 'string') {
      const optionsLevelScale = LOG_LEVELS_SCALE[this.level]
      const entryLevelScale = LOG_LEVELS_SCALE[logEntry.level]

      return optionsLevelScale >= entryLevelScale
    } else {
      return this.level.includes(logEntry.level)
    }
  }

  private filterMetadata(metadata: Record<string, any>): void {
    mapObject(metadata, null, (value: any, key: string): any => {
      if (this.options.filterMetadataKeys.includes(key) || this.options.filterMetadataKeys.includes(key.toLowerCase())) return '<filtered>'
      return value
    })
  }

  private async loadTransports(): Promise<void> {
    const knownAdapters = { terminal: TerminalTransport, 'local-file': LocalFileTransport, test: TestTransport, ...this.options.includeTransportAdapters }
    const gatheredAdapters = gatherAdapters({ domain: 'logger', type: 'transport' })
    const finalAdapters = { ...knownAdapters, ...gatheredAdapters }
    const transportsKeys = Object.keys(this.options.transports)

    for (let i = 0; i < transportsKeys.length; i++) {
      const currentTransportOrTransportName = this.options.transports[i]
      const transportNameOrTransport = typeof currentTransportOrTransportName === 'string' ? currentTransportOrTransportName : currentTransportOrTransportName.transport
      const transportOptions = typeof currentTransportOrTransportName === 'string' ? undefined : currentTransportOrTransportName.transportOptions

      if (typeof transportNameOrTransport === 'string') {
        const GatheredAdapter: TransportInterfaceClass = finalAdapters[transportNameOrTransport]

        if (GatheredAdapter) {
          const transport = new GatheredAdapter(transportOptions)

          if (transport.prepare) await transport.prepare()

          this.transports.push(transport)
        } else {
          throw new Error(`Unknown transport: ${transportNameOrTransport}`)
        }
      } else {
        if (transportNameOrTransport.prepare) await transportNameOrTransport.prepare()

        this.transports.push(transportNameOrTransport)
      }
    }
  }
}
