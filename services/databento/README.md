# Ingesta Databento: CME MNQ y MES

Este servicio Python es el único consumidor de `DATABENTO_API_KEY`. El frontend
no recibe la clave ni consulta las tablas de mercado directamente.

## Alcance inicial

- Dataset: `GLBX.MDP3`.
- Series: `MNQ.v.0` y `MES.v.0` con simetría `continuous` y rollover por volumen.
- Esquema de descarga: `ohlcv-1m`.
- Destino: `market_data_series`, `market_data_imports` y `market_data_bars_1m`.

MNQ y MES son futuros CME. Las opciones sobre futuros se incorporarán como
`future_option` después de validar el selector de producto, strikes y vencimientos;
no se deben mezclar sus primas con las velas del futuro subyacente.

## Instalación local

```powershell
cd C:\Trabajos\lineatrader\services\databento
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Define `DATABENTO_API_KEY` en el entorno de usuario o en el proceso actual.
Para escribir en Supabase, el worker también requiere `SUPABASE_URL` y
`SUPABASE_SERVICE_ROLE_KEY`. Nunca publiques estas tres variables como `VITE_*`.

## Validar sin gastar créditos

```powershell
python market_data.py inspect
python market_data.py quote --symbol MNQ --start 2026-01-05 --end 2026-01-06
```

`inspect` solo consulta metadatos. `quote` usa `metadata.get_cost`; tampoco descarga
datos. Ejecuta ambos antes de cada importación.

## Importar una sesión

```powershell
python market_data.py import --symbol MNQ --start 2026-01-05 --end 2026-01-06 --max-cost 2 --execute
```

Sin `--execute`, el comando se detiene después de mostrar la cotización. Si el costo
estimado supera `--max-cost`, tampoco descarga. Las filas se escriben por lotes y la
misma vela puede importarse otra vez sin duplicarse.

## Operación recomendada

1. Importar primero una sesión de mercado de MNQ y MES.
2. Comparar las velas contra el portal de Databento y validar rollover.
3. Importar semanas, luego meses, siempre con cotización previa.
4. Mantener `ohlcv-1m` en Postgres. Guardar ticks, MBO o MBP en archivos DBN/Parquet
   fuera de Supabase y procesarlos por lotes cuando hagan falta.
