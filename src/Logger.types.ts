export type LogLevel = 'FATAL' | 'ERROR' | 'WARNING' | 'QUERY' | 'INFO' | 'DEBUG' | 'TRACE'

export interface NamedTransports {
  [name: string]: TransportInterface
}
export interface LoggerOptions {
  level?: LogLevel | LogLevel[]
  silence?: boolean
  transports?: NamedTransports
}

export interface PartialLogEntry {
  category?: string
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
  environment: string
  timestamp: Date
  index: number
}

export interface TransportInterface {
  log(LogEntry: TransportLogEntry): void | Promise<void>
}
