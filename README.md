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
2.  Check if the log entry is inside the configured log level threshold
3.  To ensure every log is dispatched after the other we use a buffer dispatcher that awaits until the transport finishes processing the log entry and then continue with the next one.

By default a logger transports are a `TerminalTransport` and a `LocalFileTransport`.

```js
import { Logger } from '@universal-packages/logger'

const logger = new Logger({ transports: ['terminal', 'local-file'] })

logger.log({ level: 'INFO', title: 'We are online' })

// > 001 INFO 7:43:05 PM
// > We are online
```

### Options

- **`level`** `LogLevel | LogLevel[]`
  If you specify a level here the logger will only log entries with the same level of importance and below, or you can specify an array of levels, it will only log entries in those levels.

  The level of importance if the following, with 0 for the most important

  0. `FATAL`
  1. `ERROR`
  2. `WARNING`
  3. `INFO`
  4. `QUERY`
  5. `DEBUG`
  6. `TRACE`

  For example if you specify `WARNING` as level the logger will only log entries with level `WARNING`, `ERROR` and `FATAL`

  You can also specify an array of levels in case you want an arbitrary group of log entries to be logged, for example if you specify `['INFO', 'QUERY']`, only those kind of log entries will be processed.

- **`silence`** `boolean`
  Set this as true if you want the logger to not process any log entries.

- **`transports`** `(string | Object)[]`
  List of transports to pass entries to, a selection of all available transports than can be loaded.

  ```js
  import { LocalFileTransport, TerminalTransport } from '@universal-packages/logger'

  const logger = new Logger({ transports: [{ transport: 'terminal', transportOptions: { clear: true } }] })
  ```

- **`filterMetadataKeys`** `String[]` `default: ['secret', 'password', 'token']`
  Before passing metadata to transports it will filter the value of these keys in the metadata object to `<filtered>`

### Instance methods

##### **`log(entry: Object, [configuration: Object])`**

Passes a log entry to the transports to be processed.

##### **`waitForLoggingActivity()`**

Returns a promise that resolves when all log entries have been processed by the transports.

##### entry

All the information and level that an event carries to be logged.

- **`level`** `'FATAL' | 'ERROR' | 'WARNING' | 'INFO' | 'QUERY' | 'DEBUG' | 'TRACE'`
  Log level to which this log entry belongs.

- **`title`** `string`
  A quick and concise description of the event to be logged.

- **`message`** `string`
  Additional information about the event.

- **`error`** `Error`
  If this is an `ERROR` level log entry you can pass the error object here.

- **`category`** `string`
  Useful to categorize logs apart from others, will be passed to all log entries.

- **`measurement`** ` number | string | Measurement`
  A number representing a measurement made for the event commonly in milliseconds,formatted string or a [Measurement](https://github.com/universal-packages/universal-time-measurer#measurement) object.

- **`metadata`** `{}`
  Additional information related to the event, an object with related data.

- **`tags`** `string[]`
  Additional information related to the event, an array of tags to classify even further this event.

##### configuration

Any additional configuration to be passed to the transports about the log entry. For example to tell the Terminal transport to use a category color.

```js
logger.log({ level: 'INFO', title: 'We are online', category: 'SOCKET' }, { categoryColor: 'GREEN' })
```

### Getters

#### **`dispatcher`**

A reference to the internal buffer dispatcher that will process the log entries.

## Transport

To create a transport that suits your requirements you just need to implement new classes and use them as the following:

```js
import MyTransport from './MyTransport'

const logger = new Logger({ transports: [{ transport: new MyTransport() }] })
```

The log method of the transport will be called with `TransportLogEntry` object.

```js
export default class MyTransport {
  constructor(options) {
    // Options passed through the adapters sub system
  }

  prepare() {
    // Initialize any connection using options
  }

  release() {
    // Release any resources or close any connection
  }

  log(entry, configuration) {
    // Process the log entry
  }
}
```

### TransportLogEntry

An object containing all the log entry information to be transported to your fancy log system, extending from [LogEntry](#entry)

- **`environment`** `Date`
  Teh environment the app is running `NODE_ENV`

- **`timestamp`** `Date`
  A date representing the moment a log entry is logged.

- **`index`** `number`
  The number of log entries that have been logged since the logger started logging.

### TransportInterface

If you are using TypeScript just implement the `TransportInterface` in your class to ensure the right implementation.

```ts
import { TransportInterface } from '@universal-packages/logger'

export default class MyEngine implements TransportInterface {}
```

## TerminalTransport

This logger provided terminal printing transport.

```js
import { Logger, TerminalTransport } from '@universal-packages/logger'

const transport = new TerminalTransport()
const logger = new Logger({ transports: { terminal: transport } })

logger.log({ level: 'INFO', title: 'We are online' })

// > 001 INFO 7:43:05 PM
// > We are online
```

### Options

- **`clear`** `boolean`
  If true the terminal screen will be cleared before the first log entry is printed.

- **`categoryColor`** `'BLACK' | 'RED' | 'YELLOW' | 'PURPLE' | 'BLUE' | 'GRAY' | 'DARK' | 'GREEN' | 'AQUA' | 'KIWI'`
  Color scheme to use when printing the logger category

## LocalFileTransport

This logger provided file appending transport, the usual `logs/environment.log` with all logs in it, the environment file name selected from the [TransportLogEntry](#transportlogentry).

```js
import { LocalFileTransport, Logger } from '@universal-packages/logger'

const transport = new LocalFileTransport()
const logger = new Logger({ transport })

logger.log({ level: 'INFO', title: 'We are online' })

// *** In file logs/environment.log
// > 001 INFO 7:43:05 PM
// > We are online
```

### Options

- **`asJson`** `boolean`
  If true lines in the file will only be the serialized [TransportLogEntry](#transportlogentry).

- **`logsLocation`** `string`
  By default logs will be created in `./logs` but this can be changed here.

## Typescript

This library is developed in TypeScript and shipped fully typed.

## Contributing

The development of this library happens in the open on GitHub, and we are grateful to the community for contributing bugfixes and improvements. Read below to learn how you can take part in improving this library.

- [Code of Conduct](./CODE_OF_CONDUCT.md)
- [Contributing Guide](./CONTRIBUTING.md)

### License

[MIT licensed](./LICENSE).
