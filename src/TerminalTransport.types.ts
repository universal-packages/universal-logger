export type CategoryColor = 'BLACK' | 'RED' | 'YELLOW' | 'PURPLE' | 'BLUE' | 'GRAY' | 'DARK' | 'GREEN' | 'AQUA' | 'KIWI' | 'ORANGE'

export interface TerminalTransportOptions {
  clear?: boolean
  withHeader?: boolean
}

export interface TerminalTransportLogConfiguration {
  categoryColor?: CategoryColor
}
