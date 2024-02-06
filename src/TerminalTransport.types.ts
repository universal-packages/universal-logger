export type CategoryColor = 'BLACK' | 'RED' | 'YELLOW' | 'PURPLE' | 'BLUE' | 'GRAY' | 'DARK' | 'GREEN' | 'AQUA' | 'KIWI' | 'ORANGE'

export interface NamedCategoryColors {
  [category: string]: CategoryColor
}

export interface TerminalTransportOptions {
  clear?: boolean
  categoryColors?: NamedCategoryColors
  withHeader?: boolean
}
