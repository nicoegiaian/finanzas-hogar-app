'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Loader2, AlertCircle } from 'lucide-react';

import { createIngreso, fetchIngresos } from '../../lib/supabaseClient';

const createInitialFormState = () => ({
  fecha: new Date().toISOString().split('T')[0],
  concepto: '',
  usuario: '',
  tipoMovimiento: '',
  tipoDeCambio: '',
  montoARS: '',
  montoUSD: '',
});

const parseAmount = (value) => {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  const amount = Number(value);
  return Number.isNaN(amount) ? null : amount;
};

const formatCurrency = (value, currency) => {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return '—';
  }

  return new Intl.NumberFormat(currency === 'ARS' ? 'es-AR' : 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const parseDateValue = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'string') {
    const parts = value.split('-').map((part) => Number.parseInt(part, 10));

    if (parts.length === 3 && parts.every((part) => Number.isInteger(part))) {
      const [year, month, day] = parts;
      const date = new Date(year, month - 1, day);

      if (!Number.isNaN(date.getTime())) {
        return date;
      }
    }
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value) => {
  const date = parseDateValue(value);

  if (!date) {
    return typeof value === 'string' && value.trim() ? value : '—';
  }

  return date.toLocaleDateString('es-AR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

const buildFallbackId = (record) => {
  const globalCrypto = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;

  if (globalCrypto && typeof globalCrypto.randomUUID === 'function') {
    return globalCrypto.randomUUID();
  }

  const base = [record.fecha, record.concepto, record.usuario].filter(Boolean).join('-');
  return `${base}-${Math.random().toString(36).slice(2, 10)}`;
};

const normalizeIngreso = (record) => ({
  id: record.id ?? record.uuid ?? buildFallbackId(record),
  fecha: record.fecha ?? '',
  concepto: record.concepto ?? '',
  usuario: record.usuario ?? '',
  tipoMovimiento: record.tipoMovimiento ?? record.tipo_movimiento ?? '',
  tipoDeCambio:
    record.tipoDeCambio ?? record.tipo_de_cambio ?? record.tipo_cambio ?? record.tipoCambio ?? '',
  montoARS: record.montoARS ?? record.monto_ars ?? null,
  montoUSD: record.montoUSD ?? record.monto_usd ?? null,
});

const sortByFechaDesc = (items) =>
  [...items].sort((a, b) => {
    const dateA = parseDateValue(a.fecha);
    const dateB = parseDateValue(b.fecha);

    if (!dateA && !dateB) {
      return 0;
    }

    if (!dateA) {
      return 1;
    }

    if (!dateB) {
      return -1;
    }

    return dateB.getTime() - dateA.getTime();
  });

const Ingresos = ({ onDataChanged }) => {
  const [ingresos, setIngresos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [formError, setFormError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(createInitialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadIngresos = async () => {
      setLoading(true);
      setLoadError(null);

      try {
        const data = await fetchIngresos();
        const normalized = Array.isArray(data) ? data.map(normalizeIngreso) : [];
        setIngresos(sortByFechaDesc(normalized));
      } catch (error) {
        console.error('Error al obtener los ingresos', error);
        setLoadError(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadIngresos();
  }, []);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const resetForm = () => {
    setFormData(createInitialFormState());
  };

  const handleCancel = () => {
    resetForm();
    setFormError(null);
    setShowForm(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        fecha: formData.fecha,
        concepto: formData.concepto.trim(),
        usuario: formData.usuario.trim(),
        tipo_movimiento: formData.tipoMovimiento.trim(),
        tipo_de_cambio: formData.tipoDeCambio.trim(),
        monto_ars: parseAmount(formData.montoARS),
        monto_usd: parseAmount(formData.montoUSD),
      };

      const newIngreso = await createIngreso(payload);
      const normalizedIngreso = normalizeIngreso(newIngreso);

      setIngresos((previous) => sortByFechaDesc([normalizedIngreso, ...previous]));
      if (typeof onDataChanged === 'function') {
        onDataChanged();
      }
      resetForm();
      setShowForm(false);
    } catch (error) {
      console.error('Error al crear un ingreso', error);
      setFormError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Ingresos</h1>
        <button
          type="button"
          onClick={() => {
            setShowForm(true);
            setFormError(null);
          }}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Agregar ingreso
        </button>
      </div>

      {loadError && (
        <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold">No pudimos cargar los ingresos</p>
            <p className="text-sm">{loadError}</p>
          </div>
        </div>
      )}

      {formError && (
        <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold">No pudimos guardar el ingreso</p>
            <p className="text-sm">{formError}</p>
          </div>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-lg shadow-lg border border-gray-200">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="fecha" className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha
                </label>
                <input
                  id="fecha"
                  name="fecha"
                  type="date"
                  value={formData.fecha}
                  onChange={handleInputChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div>
                <label htmlFor="concepto" className="block text-sm font-medium text-gray-700 mb-1">
                  Concepto
                </label>
                <input
                  id="concepto"
                  name="concepto"
                  type="text"
                  value={formData.concepto}
                  onChange={handleInputChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div>
                <label htmlFor="usuario" className="block text-sm font-medium text-gray-700 mb-1">
                  Usuario
                </label>
                <input
                  id="usuario"
                  name="usuario"
                  type="text"
                  value={formData.usuario}
                  onChange={handleInputChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div>
                <label htmlFor="tipoMovimiento" className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de movimiento
                </label>
                <input
                  id="tipoMovimiento"
                  name="tipoMovimiento"
                  type="text"
                  value={formData.tipoMovimiento}
                  onChange={handleInputChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Salario, Extra, Inversión, etc."
                />
              </div>

              <div>
                <label htmlFor="tipoDeCambio" className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de cambio
                </label>
                <input
                  id="tipoDeCambio"
                  name="tipoDeCambio"
                  type="text"
                  value={formData.tipoDeCambio}
                  onChange={handleInputChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Oficial, MEP, Blue, etc."
                />
              </div>

              <div>
                <label htmlFor="montoARS" className="block text-sm font-medium text-gray-700 mb-1">
                  Monto (ARS)
                </label>
                <input
                  id="montoARS"
                  name="montoARS"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.montoARS}
                  onChange={handleInputChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div>
                <label htmlFor="montoUSD" className="block text-sm font-medium text-gray-700 mb-1">
                  Monto (USD)
                </label>
                <input
                  id="montoUSD"
                  name="montoUSD"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.montoUSD}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Opcional"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Guardando
                  </>
                ) : (
                  'Guardar ingreso'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6 text-center text-gray-500 text-sm">Cargando ingresos...</div>
          ) : ingresos.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">
              {loadError ? 'No pudimos cargar los ingresos.' : 'Todavía no registraste ingresos.'}
            </div>
          ) : (
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Concepto
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo movimiento
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo de cambio
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monto ARS
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monto USD
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ingresos.map((ingreso) => (
                  <tr key={ingreso.id} className="hover:bg-gray-50">
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(ingreso.fecha)}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {ingreso.concepto || '—'}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {ingreso.usuario || '—'}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {ingreso.tipoMovimiento || '—'}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {ingreso.tipoDeCambio || '—'}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                      {formatCurrency(ingreso.montoARS, 'ARS')}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600">
                      {formatCurrency(ingreso.montoUSD, 'USD')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Ingresos;
