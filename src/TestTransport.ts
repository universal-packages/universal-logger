import { TransportInterface, TransportLogEntry } from './Logger.types'

export default class TestTransport implements TransportInterface {
  public static readonly logHistory: TransportLogEntry[] = []

  public static reset() {
    TestTransport.logHistory.length = 0
  }

  public async log(logEntry: TransportLogEntry): Promise<void> {
    TestTransport.logHistory.push(logEntry)
  }
}
