import path from 'path'
import fs from 'fs'
import util from 'util'
import { ensureFile, ensureDirectory } from '@universal-packages/fs-utils'
import { LocalFileTransportOptions } from './LocalFileTransport.types'
import { TransportLogEntry, TransportInterface } from './Logger.types'

/** This transport will append all log entries into a local log file */
export default class LocalFileTransport implements TransportInterface {
  public readonly options: LocalFileTransportOptions
  public enabled = true

  public constructor(options?: LocalFileTransportOptions) {
    this.options = { location: './logs', asJson: false, ...options }
    ensureDirectory(this.options.location)
  }

  /** Prints a log entry in ther terminal gracefuly */
  public async log(logEntry: TransportLogEntry): Promise<void> {
    if (!this.enabled) return
    const location = path.resolve(this.options.location, `${logEntry.environment}.log`)
    ensureFile(location)

    if (this.options.asJson) {
      fs.appendFileSync(location, `${JSON.stringify(logEntry)}\n`)
    } else {
      const categoryTag = logEntry.category ? `${` | ${logEntry.category}`}` : ''
      const measurementTag = logEntry.measurement ? ` | ${logEntry.measurement}` : ''
      const timestamTag = ` | ${logEntry.timestamp.toLocaleTimeString()} `

      let toAppend = `${this.pad(logEntry.index)} | ${logEntry.level}${categoryTag}${measurementTag}${timestamTag}\n`

      if (logEntry.title) toAppend = toAppend + `${`${logEntry.title}`}\n`
      if (logEntry.message) toAppend = toAppend + `${logEntry.message}\n`
      if (logEntry.error) toAppend = toAppend + this.printError(logEntry.error)
      if (logEntry.metadata) toAppend = toAppend + this.printMetadata(logEntry.metadata)

      fs.appendFileSync(location, `${toAppend}---------------------------------------------------------------------------------------------------\n`)
    }
  }

  /** Quik pad number */
  private pad(number: number): string {
    if (number < 10) {
      return `00${number}`
    } else if (number < 100) {
      return `0${number}`
    }

    return `${number}`
  }

  private printError(error: Error): string {
    let output = ''

    if (error.stack) {
      const lines = error.stack.split('\n')

      output = `${error.message}\n`
      if (error.cause) output = output + `${error.cause}}\n`

      for (let i = 1; i < lines.length - 1; i++) {
        output = output + `${lines[i]}\n`
      }
    } else {
      output = output + `${error.message}\n`
      if (error.cause) output = output + `${error.cause}}\n`
    }

    return output
  }

  private printMetadata(metadata: Record<string, any>): string {
    const metadataString = util.inspect(metadata, { depth: 5, colors: false, compact: true })

    if (metadataString.length > process.stdout.columns) {
      let output = ''
      const lines = util.inspect(metadata, { depth: 5, colors: false, compact: false }).split('\n')

      output = output + '⚑ {\n'

      for (let i = 1; i < lines.length - 1; i++) {
        output = output + `${lines[i]}\n`
      }

      output = output + '}\n'

      return output
    } else {
      return `⚑ ${metadataString}}\n`
    }
  }
}
