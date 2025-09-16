'use client';

import React from 'react';
import { AlertTriangle, ArrowUp, ArrowDown, PieChart } from 'lucide-react';

export default function Dashboard({
  selectedMonth,
  setSelectedMonth,
  totalIngresos,
  totalGastos,
  ahorroActual,
  ahorroObjetivo,
  formatMoney,
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Dashboard Financiero</h1>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="bg-white border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="2024-03">Marzo 2024</option>
          <option value="2024-02">Febrero 2024</option>
          <option value="2024-01">Enero 2024</option>
        </select>
      </div>

      {/* Alertas */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2 flex-shrink-0" />
          <p className="text-yellow-700 text-sm sm:text-base">
            Estás {ahorroActual < ahorroObjetivo ? 'por debajo de' : 'cumpliendo'} tu meta de ahorro del 20%
          </p>
        </div>
      </div>

      {/* Cards principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-gray-600 text-sm">Ingresos del mes</p>
              <p className="text-xl sm:text-2xl font-bold text-green-600 truncate">{formatMoney(totalIngresos)}</p>
            </div>
            <ArrowUp className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 flex-shrink-0" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-gray-600 text-sm">Gastos del mes</p>
              <p className="text-xl sm:text-2xl font-bold text-red-600 truncate">{formatMoney(totalGastos)}</p>
            </div>
            <ArrowDown className="h-6 w-6 sm:h-8 sm:w-8 text-red-500 flex-shrink-0" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 border-l-4 border-blue-500 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-gray-600 text-sm">Ahorro actual</p>
              <p className="text-xl sm:text-2xl font-bold text-blue-600 truncate">{formatMoney(ahorroActual)}</p>
              <p className="text-xs sm:text-sm text-gray-500">Meta: {formatMoney(ahorroObjetivo)}</p>
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
