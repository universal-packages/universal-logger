import BufferDispatcher from '@universal-packages/buffer-dispatcher'
import { TerminalTransport } from '.'
import LocalFileTransport from './LocalFileTransport'
import { LogEntry, LoggerOptions, TransportInterface, TransportLogEntry, LogLevel, PartialLogEntry, NamedTransports } from './Logger.types'

/**
 *
 * A logger object job is to be an interface for what the user wants to log and pass
 * that information through all configured transports. It will apply the following rules
 * before passing the log entry to the transports:
 *
 * 1. Checks if the logger is not silent if it is it will not do anything with the log entry
 * 2. Check if the log entry is inside the configured log level thrshold
 * 3. To ensure every log is dispatched after the other we use a buffer dispatcher that
 * awaits until the transport finishes processing the log entry and then continue with the nexts one.
 *
 */
export default class Logger {
  public silence: boolean
  public level: LogLevel | LogLevel[]

  private readonly options: LoggerOptions
  private readonly bufferDispatcher: BufferDispatcher<TransportLogEntry>
  private readonly transports: NamedTransports
  private transportKeys: string[]
  private currentIndex = 0

  private readonly LOG_LEVELS_SCALE: { [level in LogLevel]: number } = { FATAL: 0, ERROR: 1, WARNING: 2, INFO: 3, QUERY: 4, DEBUG: 5, TRACE: 6 }

  public constructor(options?: LoggerOptions) {
    this.options = { level: 'TRACE', silence: false, transports: { terminal: new TerminalTransport(), localFile: new LocalFileTransport() }, ...options }

    this.silence = this.options.silence
    this.level = this.options.level
    this.transports = this.options.transports
    this.transportKeys = Object.keys(this.transports)

    this.bufferDispatcher = new BufferDispatcher<TransportLogEntry>(this.processEntry.bind(this))
  }

  /** Appends a new transport to the transports map */
  public addTransport(name: string, transport: TransportInterface): void {
    if (this.transports[name]) this.publish('WARNING', `One "${name}" transport was already set in transports`)

    this.transports[name] = transport
    this.transportKeys = Object.keys(this.transports)
  }

  /** Gets a named transport  */
  public getTransport<T = TransportInterface>(name: string): T {
    return this.transports[name] as unknown as T
  }

  /** Returns the buffer dispatcher promise so you can await untill all logs have been processed */
  public async await(): Promise<void> {
    return this.bufferDispatcher.await()
  }

  /** Sends a new log entry to the transports. */
  public publish(entry: LogEntry): void
  public publish(level: LogLevel, title?: string, message?: string, category?: string, restOfEntry?: PartialLogEntry): void
  public publish(levelOrEntry: LogLevel | LogEntry, title?: string, message?: string, category?: string, restOfEntry?: PartialLogEntry): void {
    const finalEntry: LogEntry = typeof levelOrEntry === 'string' ? { category, level: levelOrEntry, title, message, ...restOfEntry } : levelOrEntry

    if (this.canBeLogged(finalEntry)) {
      const transportLogEntry: TransportLogEntry = {
        ...finalEntry,
        timestamp: new Date(),
        index: ++this.currentIndex,
        environment: process.env['NODE_ENV']
      }

      this.bufferDispatcher.append(transportLogEntry)
    }
  }

  /** Called by buffer dispatcher when ready to process the next entry. */
  private async processEntry(logEntry: TransportLogEntry): Promise<void> {
    if (this.transportKeys.length === 0) console.warn('WARNING: no transports configured in logger')
    const errorredTransports: { [transport: string]: Error } = {}
    let withErrors = false
    const successfulTransports: TransportInterface[] = []

    for (let i = 0; i < this.transportKeys.length; i++) {
      const currentTransportKey = this.transportKeys[i]
      const currentTransport = this.transports[currentTransportKey]

      try {
        await currentTransport.log(logEntry)

        successfulTransports.push(currentTransport)
      } catch (error) {
        withErrors = true
        process.stdout.write(error.toString())
        errorredTransports[currentTransportKey] = error
      }
    }

    if (withErrors) {
      const errorKeys = Object.keys(errorredTransports)

      if (successfulTransports.length === 0) {
        for (let j = 0; j < errorKeys.length; j++) {
          const currentErrorKey = errorKeys[j]
          const currentError = errorredTransports[currentErrorKey]

          console.log(currentError)
        }
      } else {
        for (let i = 0; i < successfulTransports.length; i++) {
          const currentTransport = successfulTransports[i]

          for (let j = 0; j < errorKeys.length; j++) {
            const currentErrorKey = errorKeys[j]
            const currentError = errorredTransports[currentErrorKey]

            await currentTransport.log({
              level: 'ERROR',
              title: `"${currentErrorKey}" could't log beacuse an error inside the trasporter itself`,
              error: currentError,
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

  /** Checks if the log entry can be logged depending on the configured level or if silenced. */
  private canBeLogged(logEntry: LogEntry): boolean {
    if (this.silence) return false

    if (typeof this.level === 'string') {
      const optionsLevelScale = this.LOG_LEVELS_SCALE[this.level]
      const entryLevelScale = this.LOG_LEVELS_SCALE[logEntry.level]

      return optionsLevelScale >= entryLevelScale
    } else {
      return this.level.includes(logEntry.level)
    }
  }
}
