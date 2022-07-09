import BufferDispatcher from '@universal-packages/buffer-dispatcher'
import { TerminalTransport } from '.'
import LocalFileTransport from './LocalFileTransport'
import { LogEntry, LoggerOptions, TransportInterface, TransportLogEntry, LogLevel, PartialLogEntry } from './Logger.types'

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

  private readonly options: LoggerOptions
  private readonly bufferDispatcher: BufferDispatcher<TransportLogEntry>
  private currentIndex = 0

  private readonly LOG_LEVELS_SCALE: { [level in LogLevel]: number } = { FATAL: 0, ERROR: 1, WARNING: 2, INFO: 3, QUERY: 4, DEBUG: 5, TRACE: 6 }

  public constructor(options?: LoggerOptions) {
    this.options = { level: 'TRACE', silence: false, transport: [new TerminalTransport(), new LocalFileTransport()], ...options }

    this.silence = this.options.silence

    this.bufferDispatcher = new BufferDispatcher<TransportLogEntry>(this.processEntry.bind(this))
  }

  /** Returns the buffer dispatcher promise so you can await untill all logs have been processed */
  public async await(): Promise<void> {
    return this.bufferDispatcher.await()
  }

  /** Sends a new log entry to the transports. */
  public publish(entry: LogEntry): void
  public publish(level: LogLevel, title?: string, message?: string, restOfEntry?: PartialLogEntry): void
  public publish(levelOrEntry: LogLevel | LogEntry, title?: string, message?: string, restOfEntry?: PartialLogEntry): void {
    const finalEntry: LogEntry = typeof levelOrEntry === 'string' ? { level: levelOrEntry, title, message, ...restOfEntry } : levelOrEntry

    if (this.canBeLogged(finalEntry)) {
      const transportLogEntry: TransportLogEntry = { ...finalEntry, timestamp: new Date(), index: ++this.currentIndex, environment: process.env['NODE_ENV'] }

      if (this.options.category) transportLogEntry.category = this.options.category

      this.bufferDispatcher.append(transportLogEntry)
    }
  }

  /** Called by buffer dispatcher when ready to process the next entry. */
  private async processEntry(logEntry: TransportLogEntry): Promise<void> {
    let transports: TransportInterface[] = []

    transports = transports.concat(this.options.transport)

    for (let i = 0; i < transports.length; i++) {
      const currentTransport = transports[i]

      await currentTransport.log(logEntry)
    }
  }

  /** Checks if the log entry can be logged depending on the configured level or if silenced. */
  private canBeLogged(logEntry: LogEntry): boolean {
    if (this.silence) return false

    if (typeof this.options.level === 'string') {
      const optionsLevelScale = this.LOG_LEVELS_SCALE[this.options.level]
      const entryLevelScale = this.LOG_LEVELS_SCALE[logEntry.level]

      return optionsLevelScale >= entryLevelScale
    } else {
      return this.options.level.includes(logEntry.level)
    }
  }
}
