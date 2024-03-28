import { Measurement } from '@universal-packages/time-measurer'

export type LogLevel = 'FATAL' | 'ERROR' | 'WARNING' | 'QUERY' | 'INFO' | 'DEBUG' | 'TRACE'

export interface LoggerOptions {
  filterMetadataKeys?: string[]
  includeTransportAdapters?: Record<string, TransportInterfaceClass>
  level?: LogLevel | LogLevel[]
  silence?: boolean
  transports?: (string | TransportEntry)[]
}

export interface LogEntry {
  category?: string
  error?: Error
  level: LogLevel
  title?: string
  measurement?: number | string | Measurement
  message?: string
  metadata?: Record<string, any>
  tags?: string[]
}

export interface LogBufferEntry {
  entry: TransportLogEntry
  configuration?: Record<string, any>
}

export interface TransportLogEntry extends LogEntry {
  environment: string
  timestamp: Date
  index: number
}

export interface TransportEntry {
  transport: string | TransportInterface
  transportOptions?: any
}

export interface TransportInterface {
  prepare?: () => void | Promise<void>
  release?: () => void | Promise<void>
  log(LogEntry: TransportLogEntry, configuration?: Record<string, any>): void | Promise<void>
}

export interface TransportInterfaceClass {
  new (options?: Record<string, any>): TransportInterface
}
