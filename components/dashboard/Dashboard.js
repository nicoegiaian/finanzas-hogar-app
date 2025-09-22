'use client';

import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowUp, ArrowDown, PieChart } from 'lucide-react';

import {
  calculateGastoARS,
  formatPeriodLabel,
  normalizePeriod,
  sortPeriodsDesc,
} from '../../lib/financeUtils';
import GastosBreakdownChart from './GastosBreakdownChart';

const USER_FIELD_CANDIDATES = ['usuario', 'user', 'miembro', 'responsable', 'integrante'];
const TYPE_FIELD_CANDIDATES = [
  'tipodemovimiento',
  'tipomovimiento',
  'tipo_movimiento',
  'tipomov',
  'tipo',
  'categoria',
];

const DEFAULT_USER_LABEL = 'Sin usuario';
const DEFAULT_TYPE_LABEL = 'Sin tipo';

const buildNormalizedFieldMap = (record) => {
  const map = new Map();

  if (!record || typeof record !== 'object') {
    return map;
  }

  Object.entries(record).forEach(([key, value]) => {
    if (typeof key === 'string') {
      map.set(key.toLowerCase(), value);
    }
  });

  return map;
};

const getValueFromMap = (map, candidates) => {
  if (!(map instanceof Map) || !Array.isArray(candidates)) {
    return null;
  }

  for (const candidate of candidates) {
    const normalizedCandidate = typeof candidate === 'string' ? candidate.toLowerCase() : '';

    if (!normalizedCandidate) {
      continue;
    }

    if (map.has(normalizedCandidate)) {
      const value = map.get(normalizedCandidate);

      if (value !== null && value !== undefined) {
        return value;
      }
    }
  }

  return null;
};

const normalizeCategoryLabel = (value, fallbackLabel) => {
  if (value === null || value === undefined) {
    return fallbackLabel;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed !== '' ? trimmed : fallbackLabel;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toString();
  }

  if (typeof value === 'boolean') {
    return value ? 'Sí' : 'No';
  }

  try {
    const stringValue = String(value);
    const trimmed = stringValue.trim();
    return trimmed !== '' ? trimmed : fallbackLabel;
  } catch (error) {
    return fallbackLabel;
  }
};

const buildMonthlyGastosBreakdown = (gastos = []) => {
  const monthMap = new Map();

  if (!Array.isArray(gastos)) {
    return [];
  }

  gastos.forEach((gasto) => {
    if (!gasto || typeof gasto !== 'object') {
      return;
    }

    const period = normalizePeriod(gasto?.fecha ?? gasto?.periodo ?? gasto?.mes);

    if (!period) {
      return;
    }

    const amount = Number(calculateGastoARS(gasto));

    if (!Number.isFinite(amount) || amount === 0) {
      return;
    }

    const safeAmount = Math.abs(amount);

    if (!monthMap.has(period)) {
      monthMap.set(period, {
        period,
        label: formatPeriodLabel(period),
        total: 0,
        byUsuario: new Map(),
        byTipo: new Map(),
      });
    }

    const monthEntry = monthMap.get(period);
    monthEntry.total += safeAmount;

    const fieldMap = buildNormalizedFieldMap(gasto);
    const rawUser = getValueFromMap(fieldMap, USER_FIELD_CANDIDATES);
    const rawType = getValueFromMap(fieldMap, TYPE_FIELD_CANDIDATES);
    const userLabel = normalizeCategoryLabel(rawUser, DEFAULT_USER_LABEL);
    const typeLabel = normalizeCategoryLabel(rawType, DEFAULT_TYPE_LABEL);

    monthEntry.byUsuario.set(userLabel, (monthEntry.byUsuario.get(userLabel) ?? 0) + safeAmount);
    monthEntry.byTipo.set(typeLabel, (monthEntry.byTipo.get(typeLabel) ?? 0) + safeAmount);
  });

  const sortedPeriods = sortPeriodsDesc([...monthMap.keys()]).reverse();

  return sortedPeriods.map((period) => {
    const entry = monthMap.get(period);

    return {
      period,
      label: entry?.label ?? formatPeriodLabel(period),
      total: entry?.total ?? 0,
      byUsuario: Object.fromEntries(entry?.byUsuario ?? []),
      byTipo: Object.fromEntries(entry?.byTipo ?? []),
    };
  });
};

export default function Dashboard({
  selectedMonth,
  setSelectedMonth,
  monthOptions = [],
  totalIngresos,
  totalGastos,
  ahorroDelMes,
  ahorroHistorico,
  ahorroActual,
  ahorroObjetivo,
  metaAhorro,
  formatMoney,
  isLoading = false,
  error = null,
  onRefresh,
  gastos = [],
}) {
  const renderAmount = (value) => {
    if (isLoading) {
      return 'Cargando...';
    }

    return formatMoney(value ?? 0);
  };

  const metaAhorroPercent = Math.round((metaAhorro ?? 0) * 100);
  const selectOptions = Array.from(
    new Set([...(Array.isArray(monthOptions) ? monthOptions : []), selectedMonth].filter(Boolean)),
  );
  const isMeetingGoal = ahorroActual >= ahorroObjetivo;
  const [gastosBreakdownMode, setGastosBreakdownMode] = useState('usuario');
  const gastosBreakdownData = useMemo(
    () => buildMonthlyGastosBreakdown(gastos),
    [gastos],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Dashboard Financiero</h1>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <select
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
            className="bg-white border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {selectOptions.map((option) => (
              <option key={option} value={option}>
                {formatPeriodLabel(option)}
              </option>
            ))}
          </select>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
            >
              {isLoading ? 'Actualizando...' : 'Actualizar'}
            </button>
          )}
        </div>
      </div>

      {/* Alertas */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2 flex-shrink-0" />
          <p className="text-yellow-700 text-sm sm:text-base">
            {isLoading
              ? 'Actualizando métricas de ahorro...'
              : `Estás ${isMeetingGoal ? 'cumpliendo' : 'por debajo de'} tu meta de ahorro del ${metaAhorroPercent}%`}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold">No pudimos actualizar los datos</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Cards principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-gray-600 text-sm">Ingresos del mes</p>
              <p className="text-xl sm:text-2xl font-bold text-green-600 truncate">{renderAmount(totalIngresos)}</p>
            </div>
            <ArrowUp className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 flex-shrink-0" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-gray-600 text-sm">Gastos del mes</p>
              <p className="text-xl sm:text-2xl font-bold text-red-600 truncate">{renderAmount(totalGastos)}</p>
            </div>
            <ArrowDown className="h-6 w-6 sm:h-8 sm:w-8 text-red-500 flex-shrink-0" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 border-l-4 border-blue-500 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <div className="min-w-0 space-y-1">
              <p className="text-gray-600 text-sm">Ahorro actual</p>
              <p className="text-xl sm:text-2xl font-bold text-blue-600 truncate">{renderAmount(ahorroActual)}</p>
              <p className="text-xs sm:text-sm text-gray-500">Meta: {renderAmount(ahorroObjetivo)}</p>
              {!isLoading && (
                <p className="text-xs sm:text-sm text-gray-500">
                  Ahorro del mes: {formatMoney(ahorroDelMes)} · Ahorro previo: {formatMoney(ahorroHistorico)}
                </p>
              )}
            </div>
            <PieChart className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 flex-shrink-0" />
          </div>
        </div>
      </div>

      <GastosBreakdownChart
        data={gastosBreakdownData}
        mode={gastosBreakdownMode}
        onModeChange={setGastosBreakdownMode}
        formatMoney={formatMoney}
        isLoading={isLoading}
      />
    </div>
  );
}
