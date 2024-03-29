import ansiEscapes from 'ansi-escapes'
import chalk from 'chalk'
import stripAnsi from 'strip-ansi'
import util from 'util'

import { LogLevel, TransportInterface, TransportLogEntry } from './Logger.types'
import { CategoryColor, TerminalTransportLogConfiguration, TerminalTransportOptions } from './TerminalTransport.types'

export default class TerminalTransport implements TransportInterface {
  public readonly options: TerminalTransportOptions

  public constructor(options?: TerminalTransportOptions) {
    this.options = { clear: false, withHeader: false, ...options }
  }

  public async log(logEntry: TransportLogEntry, configuration?: TerminalTransportLogConfiguration): Promise<void> {
    if (this.options.clear && logEntry.index === 1) {
      process.stdout.write(ansiEscapes.clearTerminal)
      process.stdout.write(`\n`)
    }

    let toAppend = ''

    if (this.options.withHeader) {
      const tagsFormat = chalk.bgRgb(30, 30, 30).bold.rgb(240, 240, 240)
      const categoryTag = logEntry.category ? ` ${this.getCategoryColor(configuration?.categoryColor)(` ${logEntry.category} `)}` : ''
      const environmentTag = ` ${tagsFormat(` ${logEntry.environment} `)}`
      const measurementTag = logEntry.measurement ? ` ${tagsFormat(` ${logEntry.measurement.toString()} `)}` : ''
      const timestampTag = ` ${tagsFormat(` ${logEntry.timestamp.toLocaleTimeString()} `)}`

      toAppend = `${this.getLevelBackgroundChalk(logEntry.level)(
        ` ${this.pad(logEntry.index)} ${logEntry.level} `
      )}${categoryTag}${environmentTag}${measurementTag}${timestampTag}\n`
    }

    if (logEntry.title) toAppend = toAppend + `${this.getLevelTextChalk(logEntry.level).bold(`${logEntry.title}`)}\n`
    if (logEntry.message) toAppend = toAppend + `${this.getLevelTextChalk(logEntry.level)(logEntry.message)}\n`
    if (logEntry.error) toAppend = toAppend + this.printError(logEntry.error)
    if (logEntry.metadata) toAppend = toAppend + this.printMetadata(logEntry.metadata)

    process.stdout.write(toAppend)
    if (this.options.withHeader) process.stdout.write('\n')
  }

  private pad(number: number): string {
    if (number < 10) {
      return `00${number}`
    } else if (number < 100) {
      return `0${number}`
    }

    return `${number}`
  }

  private getCategoryColor(color: CategoryColor): chalk.Chalk {
    switch (color) {
      case 'BLACK':
        return chalk.bgRgb(0, 0, 0).bold.rgb(220, 220, 220)
      case 'RED':
        return chalk.bgRgb(160, 0, 0).bold.rgb(255, 220, 200)
      case 'YELLOW':
        return chalk.bgRgb(160, 160, 0).bold.rgb(255, 255, 255)
      case 'PURPLE':
        return chalk.bgRgb(160, 0, 220).bold.rgb(250, 220, 255)
      case 'BLUE':
        return chalk.bgRgb(0, 150, 220).bold.rgb(200, 240, 255)
      case 'AQUA':
        return chalk.bgRgb(30, 210, 210).bold.rgb(200, 240, 255)
      case 'DARK':
        return chalk.bgRgb(50, 50, 50).bold.rgb(240, 240, 240)
      case 'GREEN':
        return chalk.bgRgb(0, 150, 0).bold.rgb(200, 240, 200)
      case 'KIWI':
        return chalk.bgRgb(20, 220, 20).bold.rgb(200, 240, 200)
      case 'ORANGE':
        chalk.bgRgb(230, 100, 0).bold.rgb(240, 200, 255)
      case 'GRAY':
      default:
        return chalk.bgRgb(240, 240, 240).bold.rgb(40, 40, 40)
    }
  }

  private getLevelBackgroundChalk(level: LogLevel): chalk.Chalk {
    switch (level) {
      case 'FATAL':
        return chalk.bgRgb(0, 0, 0).bold.rgb(180, 0, 0)
      case 'ERROR':
        return chalk.bgRgb(56, 0, 0).bold.rgb(252, 220, 180)
      case 'WARNING':
        return chalk.bgRgb(61, 60, 1).bold.rgb(255, 251, 0)
      case 'QUERY':
        return chalk.bgRgb(48, 0, 99).bold.rgb(135, 180, 255)
      case 'INFO':
        return chalk.bgRgb(0, 127, 156).bold.rgb(180, 210, 255)
      case 'DEBUG':
        return chalk.bgRgb(40, 40, 40).bold.rgb(220, 220, 220)
      case 'TRACE':
        return chalk.bgRgb(220, 220, 220).bold.rgb(40, 40, 40)
    }
  }

  private getLevelTextChalk(level: LogLevel): chalk.Chalk {
    switch (level) {
      case 'FATAL':
        return chalk.rgb(180, 0, 0)
      case 'ERROR':
        return chalk.rgb(180, 0, 0)
      case 'WARNING':
        return chalk.rgb(255, 251, 0)
      case 'QUERY':
        return chalk.rgb(100, 0, 255)
      case 'INFO':
        return chalk.rgb(0, 180, 255)
      case 'DEBUG':
        return chalk.rgb(255, 255, 255)
      case 'TRACE':
        return chalk.rgb(190, 190, 190)
    }
  }

  private printError(error: Error): string {
    let output = ''

    if (error instanceof Error) {
      if (error.stack) {
        const lines = error.stack.split('\n')

        output = `${this.getLevelTextChalk('ERROR')(error.message)}\n`
        if (error.cause) output = output + `${error.cause}}\n`

        for (let i = 1; i < lines.length - 1; i++) {
          output = output + `${lines[i]}\n`
        }
      } else {
        output = output + `${this.getLevelTextChalk('ERROR')(error.message)}\n`
        if (error.cause) output = output + `${error.cause}}\n`
      }
    } else {
      output = `${this.getLevelTextChalk('ERROR')(error)}\n`
    }

    return output
  }

  private printMetadata(metadata: Record<string, any>): string {
    const metadataString = util.inspect(metadata, { depth: 5, colors: true, compact: true })

    if (stripAnsi(metadataString).length > process.stdout.columns || metadataString.includes('\n')) {
      let output = ''
      const lines = util.inspect(metadata, { depth: 5, colors: true, compact: false }).split('\n')

      output = output + '⚑ {\n'

      for (let i = 1; i < lines.length - 1; i++) {
        output = output + `${lines[i]}\n`
      }

      output = output + '}\n'

      return output
    } else {
      return `⚑ ${metadataString}\n`
    }
  }
}
