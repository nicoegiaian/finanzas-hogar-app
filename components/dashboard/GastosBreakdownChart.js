'use client';

import React, { useMemo } from 'react';

const MODE_CONFIG = {
  usuario: {
    key: 'byUsuario',
    label: 'usuario',
    title: 'por usuario',
  },
  tipo: {
    key: 'byTipo',
    label: 'tipo',
    title: 'por tipo',
  },
};

const COLOR_PALETTE = [
  '#2563eb',
  '#10b981',
  '#f97316',
  '#ef4444',
  '#8b5cf6',
  '#14b8a6',
  '#f59e0b',
  '#6366f1',
  '#ec4899',
  '#0ea5e9',
  '#22c55e',
  '#eab308',
  '#a855f7',
];

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

function useCategoryColors(categories) {
  return useMemo(() => {
    if (!Array.isArray(categories)) {
      return {};
    }

    return categories.reduce((colorMap, category, index) => {
      const paletteIndex = index % COLOR_PALETTE.length;
      colorMap[category] = COLOR_PALETTE[paletteIndex];
      return colorMap;
    }, {});
  }, [categories]);
}

function formatAxisValue(formatMoney, value) {
  if (!value) {
    return formatMoney(0);
  }

  return formatMoney(value);
}

export default function GastosBreakdownChart({
  data = [],
  mode = 'usuario',
  onModeChange,
  formatMoney = DEFAULT_FORMATTER,
  isLoading = false,
}) {
  const modeConfig = MODE_CONFIG[mode] ?? MODE_CONFIG.usuario;
  const breakdownKey = modeConfig.key;

  const chartMonths = useMemo(() => {
    if (!Array.isArray(data)) {
      return [];
    }

    return data.map((month) => ({
      ...month,
      breakdown: month?.[breakdownKey] ?? {},
    }));
  }, [data, breakdownKey]);

  const allCategories = useMemo(() => {
    const categorySet = new Set();

    chartMonths.forEach((month) => {
      const breakdown = month.breakdown;

      if (!breakdown || typeof breakdown !== 'object') {
        return;
      }

      Object.keys(breakdown).forEach((category) => {
        categorySet.add(category);
      });
    });

    return Array.from(categorySet);
  }, [chartMonths]);

  const categoryColors = useCategoryColors(allCategories);

  const maxValue = useMemo(() => {
    return chartMonths.reduce((globalMax, month) => {
      const breakdown = month?.breakdown ?? {};

      if (!breakdown || typeof breakdown !== 'object') {
        return globalMax;
      }

      const monthMax = Object.values(breakdown).reduce((monthMaxValue, rawValue) => {
        const numericValue = Number(rawValue);

        if (!Number.isFinite(numericValue) || numericValue <= 0) {
          return monthMaxValue;
        }

        return numericValue > monthMaxValue ? numericValue : monthMaxValue;
      }, 0);

      return monthMax > globalMax ? monthMax : globalMax;
    }, 0);
  }, [chartMonths]);

  const axisMarks = useMemo(() => {
    if (!maxValue) {
      return [];
    }

    const steps = 4;
    const rawStep = maxValue / steps;
    const magnitude = 10 ** Math.floor(Math.log10(rawStep || 1));
    const normalized = rawStep / magnitude;
    let niceNormalized;

    if (normalized <= 1) {
      niceNormalized = 1;
    } else if (normalized <= 2) {
      niceNormalized = 2;
    } else if (normalized <= 5) {
      niceNormalized = 5;
    } else {
      niceNormalized = 10;
    }

    const stepValue = niceNormalized * magnitude;
    let topValue = stepValue * steps;

    if (topValue < maxValue) {
      topValue += stepValue;
    }

    const marks = [];

    for (let value = 0; value <= topValue + stepValue / 2; value += stepValue) {
      marks.push(Math.round(value));
    }

    return marks;
  }, [maxValue]);

  const renderLegend = () => {
    if (allCategories.length === 0) {
      return null;
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-600">
        {allCategories.map((category) => (
          <div key={category} className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-sm"
              style={{ backgroundColor: categoryColors[category] }}
              aria-hidden
            />
            <span className="truncate" title={category}>
              {category}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const renderChart = () => {
    if (isLoading) {
      return (
        <div className="h-64 flex items-center justify-center text-gray-500 text-sm">
          Cargando datos de gastos...
        </div>
      );
    }

    if (!chartMonths.length || maxValue <= 0) {
      return (
        <div className="h-64 flex items-center justify-center text-gray-500 text-sm text-center px-6">
          No hay datos de gastos para mostrar en este periodo.
        </div>
      );
    }

    return (
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 overflow-x-auto pb-2">
          <div className="min-w-full relative h-72">
            <div className="absolute inset-x-12 inset-y-6 flex flex-col justify-between pointer-events-none">
              {axisMarks.map((mark) => (
                <div key={`grid-${mark}`} className="border-t border-dashed border-gray-200" />
              ))}
            </div>
            <div className="absolute inset-y-6 left-0 flex flex-col justify-between text-xs text-gray-400 pr-3">
              {axisMarks
                .slice()
                .reverse()
                .map((mark) => (
                  <span key={`label-${mark}`} className="leading-none">
                    {formatAxisValue(formatMoney, mark)}
                  </span>
                ))}
            </div>
            <div className="relative h-full flex items-end gap-6 pl-12 pr-4 pb-8 pt-6">
              {chartMonths.map((month) => {
                const segments = allCategories
                  .map((category) => ({
                    category,
                    value: Number(month.breakdown?.[category] ?? 0),
                  }))
                  .filter(({ value }) => value > 0);

                return (
                  <div key={month.period} className="min-w-[4.5rem] flex-1">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-full flex-1 flex items-end">
                        <div className="w-full h-full flex items-end gap-2 rounded-lg bg-gray-50 px-2 pt-2">
                          {segments.map(({ category, value }) => {
                            const heightPercent = maxValue > 0 ? (value / maxValue) * 100 : 0;
                            const minHeight = value > 0 && heightPercent < 6 ? '8px' : undefined;

                            return (
                              <div
                                key={`${month.period}-${category}`}
                                className="flex-1 flex items-end justify-center rounded-t-md text-[10px] font-semibold text-white"
                                style={{
                                  backgroundColor: categoryColors[category],
                                  height: `${heightPercent}%`,
                                  minHeight,
                                }}
                                title={`${category}: ${formatMoney(value)}`}
                                aria-label={`${category}: ${formatMoney(value)}`}
                              >
                                {heightPercent > 18 && (
                                  <span className="px-1 drop-shadow-sm">{formatMoney(value)}</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <div className="text-sm font-medium text-gray-700 text-center whitespace-nowrap">
                        {month.label}
                      </div>
                      <div className="text-xs text-gray-500">{formatMoney(month.total)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="w-full lg:w-64 flex-shrink-0 space-y-3">
          <h4 className="text-sm font-semibold text-gray-700">Leyenda</h4>
          {renderLegend()}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Distribución de Gastos Mensuales</h3>
          <p className="text-sm text-gray-500">
            Visualización {modeConfig.title} de los montos cargados en la tabla de gastos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="gastos-breakdown-mode" className="text-sm text-gray-600">
            Ver
          </label>
          <select
            id="gastos-breakdown-mode"
            value={mode}
            onChange={(event) => onModeChange?.(event.target.value)}
            className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="usuario">Por usuario</option>
            <option value="tipo">Por tipo</option>
          </select>
        </div>
      </div>
      <div className="mt-6">{renderChart()}</div>
    </div>
  );
}
