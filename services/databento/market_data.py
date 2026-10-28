"""Worker seguro de Databento para el histórico CME de LineaTrade.

Usa la API HTTP oficial y solo la biblioteca estándar de Python. El flujo es
deliberadamente de dos pasos: cotizar y luego ejecutar. Nunca se descarga
información facturable por el mero hecho de invocar el script.
"""

from __future__ import annotations

import argparse
import base64
import csv
import io
import json
import os
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

BASE_URL = "https://hist.databento.com/v0"
DATASET = "GLBX.MDP3"
SCHEMA = "ohlcv-1m"
BATCH_SIZE = 500


@dataclass(frozen=True)
class Series:
    display_symbol: str
    selector_symbol: str
    description: str


SERIES = {
    "MNQ": Series("MNQ", "MNQ.v.0", "Micro E-mini Nasdaq-100"),
    "MES": Series("MES", "MES.v.0", "Micro E-mini S&P 500"),
}


def required_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Falta {name} en el entorno del worker.")
    return value


def databento_request(method: str, endpoint: str, params: dict[str, str]) -> bytes:
    api_key = required_env("DATABENTO_API_KEY")
    query = urlencode(params)
    url = f"{BASE_URL}/{endpoint}"
    body: bytes | None = None
    if method == "GET":
        url = f"{url}?{query}"
    else:
        body = query.encode("utf-8")
    authorization = base64.b64encode(f"{api_key}:".encode("ascii")).decode("ascii")
    request = Request(
        url,
        data=body,
        method=method,
        headers={"Authorization": f"Basic {authorization}", "Accept": "application/json"},
    )
    try:
        with urlopen(request, timeout=90) as response:
            return response.read()
    except HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")[:1000]
        raise RuntimeError(f"Databento respondió {error.code}: {detail}") from error
    except URLError as error:
        raise RuntimeError(f"No se pudo contactar Databento: {error.reason}") from error


def get_series(symbol: str) -> Series:
    try:
        return SERIES[symbol.upper()]
    except KeyError as exc:
        raise ValueError(f"Símbolo no soportado: {symbol}. Disponibles: {', '.join(SERIES)}.") from exc


def quote(series: Series, start: str, end: str) -> float:
    response = databento_request(
        "GET",
        "metadata.get_cost",
        {
            "dataset": DATASET,
            "symbols": series.selector_symbol,
            "stype_in": "continuous",
            "schema": SCHEMA,
            "start": start,
            "end": end,
        },
    )
    return float(response.decode("utf-8"))


def inspect() -> None:
    range_data = json.loads(
        databento_request("GET", "metadata.get_dataset_range", {"dataset": DATASET}).decode("utf-8")
    )
    schemas = json.loads(
        databento_request("GET", "metadata.list_schemas", {"dataset": DATASET}).decode("utf-8")
    )
    print(json.dumps({"dataset": DATASET, "schemas": schemas, "available": range_data}, indent=2))


def supabase_request(
    method: str,
    table: str,
    *,
    query: dict[str, str] | None = None,
    payload: Any | None = None,
    prefer: str = "return=representation",
) -> Any:
    url = f"{required_env('SUPABASE_URL').rstrip('/')}/rest/v1/{table}"
    if query:
        url = f"{url}?{urlencode(query)}"
    service_role = required_env("SUPABASE_SERVICE_ROLE_KEY")
    body = json.dumps(payload, default=str).encode("utf-8") if payload is not None else None
    request = Request(
        url,
        data=body,
        method=method,
        headers={
            "apikey": service_role,
            "Authorization": f"Bearer {service_role}",
            "Content-Type": "application/json",
            "Prefer": prefer,
        },
    )
    try:
        with urlopen(request, timeout=90) as response:
            raw = response.read()
            return json.loads(raw) if raw else None
    except HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")[:1000]
        raise RuntimeError(f"Supabase respondió {error.code}: {detail}") from error


def market_series_id(series: Series) -> str:
    rows = supabase_request(
        "GET",
        "market_data_series",
        query={
            "select": "id",
            "provider": "eq.databento",
            "dataset": f"eq.{DATASET}",
            "selector_symbol": f"eq.{series.selector_symbol}",
            "selector_type": "eq.continuous",
        },
    )
    if len(rows) != 1:
        raise RuntimeError("No se encontró la serie de mercado. Aplica primero la migración de Databento.")
    return rows[0]["id"]


def normalise_rows(csv_bytes: bytes, market_series: str, import_id: str, series: Series) -> list[dict[str, Any]]:
    reader = csv.DictReader(io.StringIO(csv_bytes.decode("utf-8")))
    rows: list[dict[str, Any]] = []
    for row in reader:
        timestamp = row.get("ts_event") or row.get("ts_recv")
        instrument_id = row.get("instrument_id")
        if not timestamp or not instrument_id:
            raise RuntimeError("Databento no devolvió ts_event/instrument_id para una vela.")
        rows.append(
            {
                "series_id": market_series,
                "ts": timestamp,
                "instrument_id": int(instrument_id),
                "source_symbol": row.get("symbol") or series.selector_symbol,
                "open": str(Decimal(row["open"])),
                "high": str(Decimal(row["high"])),
                "low": str(Decimal(row["low"])),
                "close": str(Decimal(row["close"])),
                "volume": int(Decimal(row["volume"])),
                "ingest_id": import_id,
            }
        )
    return rows


def import_bars(symbol: str, start: str, end: str, max_cost: float, execute: bool) -> None:
    series = get_series(symbol)
    estimated_cost = quote(series, start, end)
    print(f"{series.display_symbol} {start} → {end}: US${estimated_cost:.6f} estimados")
    if estimated_cost > max_cost:
        raise RuntimeError(f"El costo estimado excede el tope de US${max_cost:.2f}.")
    if not execute:
        print("Cotización completada. Añade --execute para autorizar la descarga.")
        return

    market_series = market_series_id(series)
    import_rows = supabase_request(
        "POST",
        "market_data_imports",
        payload={
            "series_id": market_series,
            "schema_name": SCHEMA,
            "requested_from": start,
            "requested_to": end,
            "quoted_cost_usd": estimated_cost,
            "status": "running",
        },
    )
    import_id = import_rows[0]["id"]
    try:
        data = databento_request(
            "POST",
            "timeseries.get_range",
            {
                "dataset": DATASET,
                "symbols": series.selector_symbol,
                "stype_in": "continuous",
                "stype_out": "instrument_id",
                "schema": SCHEMA,
                "start": start,
                "end": end,
                "encoding": "csv",
                "pretty_px": "true",
                "pretty_ts": "true",
            },
        )
        rows = normalise_rows(data, market_series, import_id, series)
        for offset in range(0, len(rows), BATCH_SIZE):
            supabase_request(
                "POST",
                "market_data_bars_1m",
                query={"on_conflict": "series_id,ts"},
                payload=rows[offset : offset + BATCH_SIZE],
                prefer="resolution=merge-duplicates,return=minimal",
            )
        supabase_request(
            "PATCH",
            "market_data_imports",
            query={"id": f"eq.{import_id}"},
            payload={"status": "completed", "rows_written": len(rows), "completed_at": datetime.now(timezone.utc).isoformat()},
        )
        print(f"Importación completada: {len(rows)} velas.")
    except Exception as exc:
        supabase_request(
            "PATCH",
            "market_data_imports",
            query={"id": f"eq.{import_id}"},
            payload={"status": "failed", "error_message": str(exc)[:2000], "completed_at": datetime.now(timezone.utc).isoformat()},
        )
        raise


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Ingesta Databento de MNQ y MES para LineaTrade")
    subcommands = parser.add_subparsers(dest="command", required=True)
    subcommands.add_parser("inspect", help="Comprueba dataset y esquemas sin descargar datos.")
    quote_parser = subcommands.add_parser("quote", help="Cotiza una descarga sin consumir créditos.")
    import_parser = subcommands.add_parser("import", help="Cotiza e importa velas de un minuto.")
    for command in (quote_parser, import_parser):
        command.add_argument("--symbol", required=True, choices=sorted(SERIES))
        command.add_argument("--start", required=True, help="Inicio UTC, por ejemplo 2026-01-05")
        command.add_argument("--end", required=True, help="Fin UTC exclusivo, por ejemplo 2026-01-06")
    import_parser.add_argument("--max-cost", type=float, default=2.0, help="Tope de gasto en USD.")
    import_parser.add_argument("--execute", action="store_true", help="Autoriza la descarga facturable.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.command == "inspect":
        inspect()
    elif args.command == "quote":
        print(f"US${quote(get_series(args.symbol), args.start, args.end):.6f}")
    else:
        import_bars(args.symbol, args.start, args.end, args.max_cost, args.execute)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (RuntimeError, ValueError) as error:
        print(f"Error: {error}", file=sys.stderr)
        raise SystemExit(1) from error
