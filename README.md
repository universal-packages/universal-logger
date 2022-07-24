# Logger

[![npm version](https://badge.fury.io/js/@universal-packages%2Flogger.svg)](https://www.npmjs.com/package/@universal-packages/logger)
[![Testing](https://github.com/universal-packages/universal-logger/actions/workflows/testing.yml/badge.svg)](https://github.com/universal-packages/universal-logger/actions/workflows/testing.yml)
[![codecov](https://codecov.io/gh/universal-packages/universal-logger/branch/main/graph/badge.svg?token=CXPJSN8IGL)](https://codecov.io/gh/universal-packages/universal-logger)

Log app activity using different transports.

## Install

```shell
npm install @universal-packages/logger
```

## Logger

A logger object job is to be an interface for what the user wants to log and pass that information through all configured transports. It will apply the following rules before passing the log entry to the transports.

It will apply the following rules before passing the log entry to the transports:

1.  Checks if the logger is not silent if it is it will not do anything with the log entry
2.  Check if the log entry is inside the configured log level thrshold
3.  To ensure every log is dispatched after the other we use a buffer dispatcher that awaits until the transport finishes processing the log entry and then continue with the nexts one.

By default a logger transports are a `TerminalTransport` and a `LocalFileTransport`.

```js
import Logger from '@universal-packages/logger'

const logger = new Logger()

logger.publish('INFO', 'We are online')
logger.publish({ level: 'INFO', title: 'We are online' })

// > 001 INFO 7:43:05 PM
// > We are online
```

### LogEntry

All the information and level that an event carries to be logged.

```js
logger.publish({ ...logEntry })
logger.publish('<level>', '<title>', 'message', { ...rest })
```

- **`level`** `'FATAL' | 'ERROR' | 'WARNING' | 'QUERY' | 'INFO' | 'DEBUG' | 'TRACE'`
  Log level to which this log entry belongs.

- **`title`** `string`
  A quick and concise descritpion of the event to be logged.

- **`message`** `string`
  Additional information about the event.

- **`error`** `Error`
  If this is an `ERROR` level log entry you can pass the error object here.

- **`category`** `string`
  Useful to categorize logs apart from others, will be passed to all log entries.

- **`measurement`** ` number | string`
  A number representing a measurement made for the event commonly in milliseconds or a formated string. The user can store any number here and the transport can do anything with it.

- **`metadata`** `{}`
  Additional information related to the event, an object with related data.

- **`tags`** `string[]`
  Additional information related to the event, an array of tags to clasify even further this event.

## Options

- **`level`** `LogLevel | LogLevel[]`
  If you specify a level here the logger will only publish log entries with the same level of importance and below, or you can specify an array of levels and only publish log entries in those levels.

  The level of importance if the following, with 0 for the most important

  0. `FATAL`
  1. `ERROR`
  2. `WARNING`
  3. `QUERY`
  4. `INFO`
  5. `DEBUG`
  6. `TRACE`

  For example if you specify `WARNING` as level the logger will only publish log entries with level `WARNING`, `ERROR` and `FATAL`

  You can also specify an array of levels in case you want an arbitrary group of log entries to be logged, for example if you especify `['INFO', 'QUERY']`, only those kind of log entries will be published.

- **`silence`** `boolean`
  Set this as true if you want the logger to not publish any log entry form the begining.

- **`transport`** `TransportInterface | TransportInterface[]`
  Transport or group of transports to publish to.

## Custom transports

A transport is no more than an object that implements a `log` function that takes a single `TransportLogEntry` as argument

### TransportLogEntry

An object containing all the logentry information to be transported to your fancy log system, extending from [LogEntry](#logentry)

- **`environment`** `Date`
  Teh environment the app is running `NODE_ENV`

- **`timestamp`** `Date`
  A date representing the moment a log entry is published.

- **`index`** `number`
  The number of log entries that have been published since the logger started publishing.

### addTransport()

Adds a new transport to also be cosidered when publishing an entry.

```js
logger.addTransport('new-transport', transport)
```

### getTransport()

Gets a named transport so we can manipulate its behaviour

```js
const trasnport = logger.getTransport('terminal')

transport.setCategoryColor('SQL', 'YELLOW')
```

### removeTransport()

Removes a transport to avoid publish to it.

```js
logger.removeTransport('transport')
```

### TransportInterface

For typescript users this is the interface a Transport implements, to ensure the log method is implemented.

```typescript
import { TransportInterface, LogEntry } from '../logger'

export default class CustomTransport implements TransportInterface {
  public enabled = true // Required, use it to enable or disable logging by transport
  public log(entry: TransportLogEntry): void {
    if (!this.enabled) return
    console.log(JSON.stringify(entry))
  }
}
```

## TerminalTransport

This logger provided terminal printing transport.

```js
import Logger, { TerminalTransport } from '@universal-packages/logger'

const transport = new TerminalTransport()
const logger = new Logger({ transports: { terminal: transport } })

logger.publish('INFO', 'We are online')
logger.publish({ level: 'INFO', title: 'We are online' })

// > 001 INFO 7:43:05 PM
// > We are online
```

## Options

- **`clear`** `boolean`
  If true the terminal screen will be cleared before the first log entry is printed

- **`categoryColor`** `'BLACK' | 'RED' | 'YELLOW' | 'PURPLE' | 'BLUE' | 'GRAY' | 'DARK' | 'GREEN' | 'AQUA' | 'KIWI'`
  Color scheme to use when printing the logger category

## LocalFileTransport

This logger provided file appending transport, the usual `logs/environment.log` with all logs in it, the environment file name selected from the [TransportLogEntry](#transportlogentry).

```js
import Logger, { LocalFileTransport } from '@universal-packages/logger'

const transport = new LocalFileTransport()
const logger = new Logger({ transport })

logger.publish('INFO', 'We are online')
logger.publish({ level: 'INFO', title: 'We are online' })

// *** In file logs/environment.log
// > 001 INFO 7:43:05 PM
// > We are online
```

## Options

- **`asJson`** `boolean`
  If true lines in the file will only be the serialized [TransportLogEntry](#transportlogentry).

- **`logsLocation`** `string`
  By default logs will be created in `./logs` but this can be changed here.

## Typescript

This library is developed in TypeScript and shipped fully typed.

## Contributing

The development of this library in the open on GitHub, and we are grateful to the community for contributing bugfixes and improvements. Read below to learn how you can take part in improving this library.

- [Code of Conduct](./CODE_OF_CONDUCT.md)
- [Contributing Guide](./CONTRIBUTING.md)

### License

[MIT licensed](./LICENSE).
