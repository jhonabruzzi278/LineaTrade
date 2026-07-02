-- El formulario de Nuevo Trade (src/components/trade/TechnicalEntryPanel.tsx) ofrece
-- "Opciones" y "CFD" como mercado, pero el enum original solo tenía forex/crypto/stock/
-- index/futures. Se completa aquí en vez de recortar la UI, ya que ambos son mercados
-- reales que un trader retail puede operar.
alter type instrument_market add value if not exists 'options';
alter type instrument_market add value if not exists 'cfd';
