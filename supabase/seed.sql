-- Catálogo global de instrumentos (created_by = null).
-- Set inicial razonable para desarrollo local: forex majors, top cripto, acciones comunes.
insert into public.instruments (symbol, name, market, pip_value, contract_size, currency, is_custom) values
  ('EURUSD', 'Euro / US Dollar', 'forex', 0.0001, 100000, 'USD', false),
  ('GBPUSD', 'British Pound / US Dollar', 'forex', 0.0001, 100000, 'USD', false),
  ('USDJPY', 'US Dollar / Japanese Yen', 'forex', 0.01, 100000, 'JPY', false),
  ('USDCHF', 'US Dollar / Swiss Franc', 'forex', 0.0001, 100000, 'CHF', false),
  ('AUDUSD', 'Australian Dollar / US Dollar', 'forex', 0.0001, 100000, 'USD', false),
  ('USDCAD', 'US Dollar / Canadian Dollar', 'forex', 0.0001, 100000, 'CAD', false),
  ('NZDUSD', 'New Zealand Dollar / US Dollar', 'forex', 0.0001, 100000, 'USD', false),

  ('BTCUSD', 'Bitcoin', 'crypto', null, 1, 'USD', false),
  ('ETHUSD', 'Ethereum', 'crypto', null, 1, 'USD', false),
  ('SOLUSD', 'Solana', 'crypto', null, 1, 'USD', false),
  ('BNBUSD', 'BNB', 'crypto', null, 1, 'USD', false),
  ('XRPUSD', 'XRP', 'crypto', null, 1, 'USD', false),

  ('AAPL', 'Apple Inc.', 'stock', null, 1, 'USD', false),
  ('MSFT', 'Microsoft Corp.', 'stock', null, 1, 'USD', false),
  ('TSLA', 'Tesla Inc.', 'stock', null, 1, 'USD', false),
  ('NVDA', 'NVIDIA Corp.', 'stock', null, 1, 'USD', false),
  ('AMZN', 'Amazon.com Inc.', 'stock', null, 1, 'USD', false),

  ('SPX500', 'S&P 500 Index', 'index', null, 1, 'USD', false),
  ('NAS100', 'Nasdaq 100 Index', 'index', null, 1, 'USD', false),

  ('ES', 'E-mini S&P 500 Futures', 'futures', null, 50, 'USD', false),
  ('NQ', 'E-mini Nasdaq 100 Futures', 'futures', null, 20, 'USD', false)
on conflict (symbol, market, created_by) do nothing;
