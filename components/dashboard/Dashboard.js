'use client';

import React from 'react';
import { AlertTriangle, ArrowUp, ArrowDown, PieChart } from 'lucide-react';

import { formatPeriodLabel } from '../../lib/financeUtils';

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

      {/* Gráfico simulado */}
      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
        <h3 className="text-lg font-semibold mb-4">Evolución Mensual</h3>
        <div className="h-48 sm:h-64 bg-gray-100 rounded flex items-center justify-center">
          <p className="text-gray-500 text-center px-4">[Aquí iría el gráfico de tendencias]</p>
        </div>
      </div>
    </div>
  );
}
