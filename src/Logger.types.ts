import { Measurement } from '@universal-packages/time-measurer'

export type LogLevel = 'FATAL' | 'ERROR' | 'WARNING' | 'QUERY' | 'INFO' | 'DEBUG' | 'TRACE'

export interface NamedTransports {
  [name: string]: TransportInterface
}
export interface LoggerOptions {
  level?: LogLevel | LogLevel[]
  silence?: boolean
  transports?: NamedTransports
  filterMetadataKeys?: string[]
}

export interface PartialLogEntry {
  error?: Error
  measurement?: number | string | Measurement
  metadata?: Record<string, any>
  tags?: string[]
}

export interface LogEntry extends PartialLogEntry {
  category?: string
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
  enabled: boolean
  log(LogEntry: TransportLogEntry): void | Promise<void>
}
