'use client';

import React, { useMemo, useState } from 'react';
import {
  calculateIngresoARS,
  calculateGastoARS,
  normalizePeriod,
  sortPeriodsDesc,
  formatPeriodLabel,
} from '../../lib/financeUtils';

const CHART_HEIGHT = 200;

const DEFAULT_FORMATTER = (value) => {
  const numericValue = Number(value);
  const safeValue = Number.isFinite(numericValue) ? numericValue : 0;
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(safeValue);
};

function fmtShort(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '$0';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${Math.round(n)}`;
}

function getUsuario(record) {
  const raw = record?.usuario ?? record?.user ?? record?.miembro ?? '';
  return typeof raw === 'string' ? raw.trim() : '';
}

function getDistinctUsers(ingresos, gastos) {
  const set = new Set();
  [...ingresos, ...gastos].forEach((r) => {
    const u = getUsuario(r);
    if (u) set.add(u);
  });
  return Array.from(set).sort();
}

function getPeriod(record) {
  return normalizePeriod(record?.fecha ?? record?.periodo ?? record?.mes);
}

function buildChartData(ingresos, gastos, selectedUser) {
  const periodSet = new Set();
  [...ingresos, ...gastos].forEach((r) => {
    const p = getPeriod(r);
    if (p) periodSet.add(p);
  });

  const last6 = sortPeriodsDesc(Array.from(periodSet)).slice(0, 6).reverse();

  return last6.map((period) => {
    const filterFn = (r) => {
      if (getPeriod(r) !== period) return false;
      if (selectedUser === 'Todos') return true;
      return getUsuario(r) === selectedUser;
    };

    const ingreso = ingresos
      .filter(filterFn)
      .reduce((sum, r) => sum + calculateIngresoARS(r), 0);

    const gasto = gastos
      .filter(filterFn)
      .reduce((sum, r) => sum + calculateGastoARS(r), 0);

    return {
      period,
      label: formatPeriodLabel(period),
      ingreso,
      gasto,
      resultante: ingreso - gasto,
    };
  });
}

function buildYMarks(maxValue) {
  if (!maxValue) return [0];
  const steps = 4;
  const rawStep = maxValue / steps;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep || 1));
  const normalized = rawStep / magnitude;
  let nice;
  if (normalized <= 1) nice = 1;
  else if (normalized <= 2) nice = 2;
  else if (normalized <= 5) nice = 5;
  else nice = 10;
  const step = nice * magnitude;
  let top = step * steps;
  if (top < maxValue) top += step;
  const marks = [];
  for (let v = 0; v <= top + step / 2; v += step) marks.push(Math.round(v));
  return marks;
}

export default function IngresosGastosChart({
  ingresos = [],
  gastos = [],
  formatMoney = DEFAULT_FORMATTER,
  isLoading = false,
}) {
  const [selectedUser, setSelectedUser] = useState('Todos');

  const users = useMemo(() => getDistinctUsers(ingresos, gastos), [ingresos, gastos]);

  const chartData = useMemo(
    () => buildChartData(ingresos, gastos, selectedUser),
    [ingresos, gastos, selectedUser],
  );

  const maxValue = useMemo(
    () => Math.max(...chartData.flatMap((d) => [d.ingreso, d.gasto]), 1),
    [chartData],
  );

  const yMarks = useMemo(() => buildYMarks(maxValue), [maxValue]);
  const topValue = yMarks[yMarks.length - 1] || maxValue;

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
        <div className="h-64 flex items-center justify-center text-gray-500 text-sm">
          Cargando datos...
        </div>
      </div>
    );
  }

  if (!chartData.length) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
        <div className="h-64 flex items-center justify-center text-gray-500 text-sm">
          No hay datos para mostrar.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Ingresos vs Gastos</h3>
          <p className="text-sm text-gray-500">Últimos 6 meses</p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="igc-user-filter" className="text-sm text-gray-600">
            Ver:
          </label>
          <select
            id="igc-user-filter"
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="Todos">Todos</option>
            {users.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-4 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="h-3 w-3 rounded-sm bg-green-500 flex-shrink-0" />
          Ingresos
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="h-3 w-3 rounded-sm bg-red-500 flex-shrink-0" />
          Gastos
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="h-3 w-4 rounded-full border-2 border-blue-400 bg-blue-50 flex-shrink-0" />
          Resultante
        </div>
      </div>

      {/* Gráfico */}
      <div className="flex gap-1">
        {/* Eje Y */}
        <div
          className="relative flex-shrink-0 pr-2"
          style={{ width: '52px', height: `${CHART_HEIGHT}px` }}
        >
          {yMarks.map((mark) => (
            <span
              key={mark}
              className="absolute right-2 text-[10px] text-gray-400 leading-none -translate-y-1/2"
              style={{ bottom: `${(mark / topValue) * 100}%` }}
            >
              {fmtShort(mark)}
            </span>
          ))}
        </div>

        {/* Área de barras */}
        <div className="flex-1 flex flex-col">
          {/* Barras con grilla */}
          <div
            className="relative w-full flex gap-2 items-end"
            style={{ height: `${CHART_HEIGHT}px` }}
          >
            {/* Grid lines */}
            {yMarks.map((mark) => (
              <div
                key={mark}
                className="absolute w-full border-t border-dashed border-gray-100 pointer-events-none"
                style={{ bottom: `${(mark / topValue) * 100}%` }}
              />
            ))}

            {/* Columnas por mes */}
            {chartData.map((month) => {
              const iH = topValue > 0
                ? Math.max((month.ingreso / topValue) * CHART_HEIGHT, month.ingreso > 0 ? 4 : 0)
                : 0;
              const gH = topValue > 0
                ? Math.max((month.gasto / topValue) * CHART_HEIGHT, month.gasto > 0 ? 4 : 0)
                : 0;

              return (
                <div
                  key={month.period}
                  className="flex-1 flex gap-1 items-end"
                >
                  {/* Barra ingreso */}
                  <div className="flex-1 flex flex-col items-center justify-end gap-0.5">
                    <span className="text-[9px] font-semibold text-green-700 leading-none">
                      {fmtShort(month.ingreso)}
                    </span>
                    <div
                      className="w-full rounded-t-md bg-green-500"
                      style={{ height: `${iH}px` }}
                      title={`Ingresos ${month.label}: ${formatMoney(month.ingreso)}`}
                    />
                  </div>
                  {/* Barra gasto */}
                  <div className="flex-1 flex flex-col items-center justify-end gap-0.5">
                    <span className="text-[9px] font-semibold text-red-700 leading-none">
                      {fmtShort(month.gasto)}
                    </span>
                    <div
                      className="w-full rounded-t-md bg-red-500"
                      style={{ height: `${gH}px` }}
                      title={`Gastos ${month.label}: ${formatMoney(month.gasto)}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Labels y chips de resultante */}
          <div className="flex gap-2 mt-2">
            {chartData.map((month) => {
              const isPositive = month.resultante >= 0;
              return (
                <div
                  key={month.period}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <span className="text-[11px] font-semibold text-gray-600 text-center leading-tight">
                    {month.label}
                  </span>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap ${
                      isPositive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                    title={`Resultante: ${formatMoney(month.resultante)}`}
                  >
                    {isPositive ? '+' : ''}
                    {fmtShort(month.resultante)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}