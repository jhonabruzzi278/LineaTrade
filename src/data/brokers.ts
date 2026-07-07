export type BrokerCategory = 'acciones' | 'forex' | 'cripto' | 'futuros' | 'otro'

export const brokerCategoryLabels: Record<BrokerCategory, string> = {
  acciones: 'Acciones',
  forex: 'Forex',
  cripto: 'Cripto',
  futuros: 'Futuros',
  otro: 'Otro',
}

export interface Broker {
  id: string
  name: string
  category: BrokerCategory
}

// Nota: FTX Exchange se excluyó a propósito (cesó operaciones en 2022).
export const popularBrokers: Broker[] = [
  { id: 'etrade', name: 'E*TRADE', category: 'acciones' },
  { id: 'interactive_brokers', name: 'Interactive Brokers', category: 'acciones' },
  { id: 'fidelity', name: 'Fidelity', category: 'acciones' },
  { id: 'robinhood', name: 'Robinhood', category: 'acciones' },
  { id: 'schwab_tda', name: 'Charles Schwab / TDA', category: 'acciones' },
  { id: 'mt4', name: 'MetaTrader 4 (MT4)', category: 'forex' },
  { id: 'tastytrade', name: 'Tastytrade/Tastyworks', category: 'acciones' },
  { id: 'das_trader', name: 'DAS Trader', category: 'acciones' },
  { id: 'tradestation', name: 'TradeStation', category: 'acciones' },
  { id: 'ninjatrader', name: 'NinjaTrader', category: 'futuros' },
  { id: 'tradovate', name: 'Tradovate', category: 'futuros' },
  { id: 'oanda', name: 'Oanda', category: 'forex' },
  { id: 'bitmex', name: 'BitMEX', category: 'cripto' },
  { id: 'binance', name: 'Binance', category: 'cripto' },
  { id: 'ctrader', name: 'cTrader', category: 'forex' },
  { id: 'jforex', name: 'JForex', category: 'forex' },
  { id: 'rithmic', name: 'Rithmic R Trader', category: 'futuros' },
  { id: 'sierra_chart', name: 'Sierra Chart', category: 'futuros' },
  { id: 'webull', name: 'Webull', category: 'acciones' },
  { id: 'coinbase', name: 'Coinbase', category: 'cripto' },
  { id: 'kraken', name: 'Kraken', category: 'cripto' },
  { id: 'tradezero', name: 'TradeZero', category: 'acciones' },
  { id: 'cobra_trading', name: 'Cobra Trading', category: 'acciones' },
  { id: 'tradingview', name: 'TradingView', category: 'otro' },
  { id: 'centerpoint', name: 'CenterPoint Securities', category: 'acciones' },
  { id: 'bybit', name: 'ByBit', category: 'cripto' },
  { id: 'propreports', name: 'PropReports', category: 'otro' },
  { id: 'cmc_markets', name: 'CMC Markets', category: 'forex' },
  { id: 'tradier', name: 'Tradier', category: 'acciones' },
  { id: 'kucoin', name: 'Kucoin', category: 'cripto' },
  { id: 'phemex', name: 'Phemex', category: 'cripto' },
  { id: 'bitget', name: 'Bitget', category: 'cripto' },
  { id: 'great_point_capital', name: 'Great Point Capital', category: 'futuros' },
  { id: 'cmeg', name: 'Capital Market Elite Groups (CMEG)', category: 'futuros' },
  { id: 'okx', name: 'OKX', category: 'cripto' },
  { id: 'topstepx', name: 'TopstepX', category: 'futuros' },
  { id: 'ocean_one', name: 'Ocean One Securities', category: 'acciones' },
]
