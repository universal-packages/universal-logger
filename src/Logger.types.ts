export type LogLevel = 'FATAL' | 'ERROR' | 'WARNING' | 'QUERY' | 'INFO' | 'DEBUG' | 'TRACE'

export interface LoggerOptions {
  level?: LogLevel | LogLevel[]
  category?: string
  silence?: boolean
  transport?: TransportInterface | TransportInterface[]
}

export interface PartialLogEntry {
  error?: Error
  environment?: string
  measurement?: number | string
  metadata?: Record<string, any>
  tags?: string[]
}

export interface LogEntry extends PartialLogEntry {
  level: LogLevel
  title?: string
  message?: string
}

export interface TransportLogEntry extends LogEntry {
  environment?: string
  timestamp: Date
  index: number
  category?: string
}

export interface TransportInterface {
  log(LogEntry: TransportLogEntry): void | Promise<void>
}
