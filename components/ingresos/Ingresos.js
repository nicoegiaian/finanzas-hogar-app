'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Loader2, AlertCircle, Pencil, Check, X, Trash2 } from 'lucide-react';

import { createIngreso, deleteIngreso, fetchIngresos, updateIngreso } from '../../lib/supabaseClient';
import {
  formatPeriodLabel,
  getCurrentPeriod,
  normalizePeriod,
  sortPeriodsDesc,
  // AÑADIR/ACTUALIZAR:
  getPreviousPeriod,
  adjustDateForCopy,
} from '../../lib/financeUtils';

const createInitialFormState = () => ({
  fecha: new Date().toISOString().split('T')[0],
  concepto: '',
  usuario: '',
  tipoMovimiento: '',
  tipoDeCambio: '',
  montoARS: '',
  montoUSD: '',
});

const createInitialEditingState = () => ({
  fecha: '',
  concepto: '',
  tipoMovimiento: '',
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

const formatDateForInput = (value) => {
  const date = parseDateValue(value);
  return date ? date.toISOString().split('T')[0] : '';
};

const buildFallbackId = (record) => {
  const globalCrypto = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;

  if (globalCrypto && typeof globalCrypto.randomUUID === 'function') {
    return globalCrypto.randomUUID();
  }

  const base = [record.fecha, record.concepto, record.usuario].filter(Boolean).join('-');
  return `${base}-${Math.random().toString(36).slice(2, 10)}`;
};

const IDENTIFIER_FIELDS = [
  'id',
  'Id',
  'ID',
  'uuid',
  'Uuid',
  'UUID',
  'ingreso_id',
  'ingresoId',
  'IngresoId',
  'IngresoID',
  'ingreso_uuid',
  'ingresoUuid',
  'IngresoUuid',
  'IngresoUUID',
];

const getIdentifierValue = (record, field) => {
  if (!record || typeof record !== 'object' || !field) {
    return null;
  }

  const value = record[field];

  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  }

  return value;
};

const resolveRecordIdentifier = (record) => {
  for (const field of IDENTIFIER_FIELDS) {
    const value = getIdentifierValue(record, field);

    if (value !== null) {
      return { field, value };
    }
  }

  return { field: null, value: null };
};

const normalizeIngreso = (record) => {
  const { field, value } = resolveRecordIdentifier(record);

  const identifierCandidates = IDENTIFIER_FIELDS.map((field) => getIdentifierValue(record, field));
  const normalizedId = identifierCandidates.find((value) => value !== null) ?? buildFallbackId(record);

  return {
    id: normalizedId,
    databaseId: value,
    databaseIdField: field,
    fecha: record.fecha ?? '',
    concepto: record.concepto ?? '',
    usuario: record.usuario ?? '',
    tipoMovimiento: record.tipoMovimiento ?? record.tipo_movimiento ?? '',
    tipoDeCambio:
      record.tipoDeCambio ?? record.tipo_de_cambio ?? record.tipo_cambio ?? record.tipoCambio ?? '',
    montoARS: record.montoARS ?? record.monto_ars ?? null,
    montoUSD: record.montoUSD ?? record.monto_usd ?? null,
  };
};

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

const getNextPeriod = (period) => {
  const normalized = normalizePeriod(period);

  if (!normalized) {
    return null;
  }

  const [yearString, monthString] = normalized.split('-');
  const year = Number.parseInt(yearString, 10);
  const month = Number.parseInt(monthString, 10);

  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    return null;
  }

  const referenceDate = new Date(year, month - 1, 1);
  referenceDate.setMonth(referenceDate.getMonth() + 1);

  return normalizePeriod(referenceDate);
};

const buildDateForPeriod = (period, referenceDate) => {
  const normalized = normalizePeriod(period);

  if (!normalized) {
    return null;
  }

  const [yearString, monthString] = normalized.split('-');
  const year = Number.parseInt(yearString, 10);
  const month = Number.parseInt(monthString, 10);

  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    return null;
  }

  const parsedReference = parseDateValue(referenceDate);
  const desiredDay = parsedReference ? parsedReference.getDate() : 1;
  const lastDayOfMonth = new Date(year, month, 0).getDate();
  const safeDay = Math.min(Math.max(desiredDay, 1), lastDayOfMonth);

  const targetDate = new Date(year, month - 1, safeDay);
  return targetDate.toISOString().split('T')[0];
};

const getTrimmedValue = (value, fallback = '') =>
  typeof value === 'string' ? value.trim() : fallback;

const Ingresos = ({ onDataChanged, selectedMonth, onMonthChange, monthOptions = [] }) => {
  const [ingresos, setIngresos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [formError, setFormError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(createInitialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [editingIngresoId, setEditingIngresoId] = useState(null);
  const [editingIngresoValues, setEditingIngresoValues] = useState(() => createInitialEditingState());
  const [isUpdatingIngreso, setIsUpdatingIngreso] = useState(false);
  const [deletingIngresoId, setDeletingIngresoId] = useState(null);

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

  useEffect(() => {
    if (!toastMessage) {
      return undefined;
    }

    const timeoutId = setTimeout(() => setToastMessage(null), 4000);
    return () => clearTimeout(timeoutId);
  }, [toastMessage]);


  const filteredIngresos = useMemo(() => {
    const normalized = normalizePeriod(selectedMonth);

    if (!normalized) {
      return ingresos;
    }

    return ingresos.filter((ingreso) => {
      const period = normalizePeriod(ingreso?.fecha ?? ingreso?.periodo ?? ingreso?.mes);
      return period === normalized;
    });
  }, [ingresos, selectedMonth]); // Ahora depende del prop selectedMonth

  const handleMonthChange = (event) => {
    // Llama a la función del componente padre para cambiar el mes
    onMonthChange(event.target.value);
  };

  // nicoegiaian/finanzas-hogar-app/finanzas-hogar-app-32c82672b0e069102ffacbfef6de2de734a85cfe/components/ingresos/Ingresos.js (Alrededor de la línea 101)

// Ingresos.js (alrededor de la línea 101)

const handleCopyPreviousMonth = async () => {
  // 1. Definir periodos:
  // targetPeriod es el mes seleccionado (Ej: Dic 2025)
  const targetPeriod = selectedMonth; 
  // sourcePeriod es el mes anterior (Ej: Nov 2025)
  const sourcePeriod = getPreviousPeriod(targetPeriod); 
  
  // 2. Validaciones de destino
  if (!targetPeriod) {
      setToastMessage('Seleccioná un periodo válido de destino.');
      return;
  }

  // Comprobar si el mes de destino (el seleccionado) ya tiene movimientos
  const isTargetEmpty = filteredIngresos.length === 0;

  if (!isTargetEmpty) {
      setToastMessage(`El mes de ${formatPeriodLabel(targetPeriod)} ya tiene ${filteredIngresos.length} registros. Solo se permite copiar en meses vacíos.`);
      return;
  }

  // 3. Obtener los ingresos del mes anterior (sourcePeriod)
  const sourceIngresos = ingresos.filter(
      (ingreso) => normalizePeriod(ingreso?.fecha ?? ingreso?.periodo ?? ingreso?.mes) === normalizePeriod(sourcePeriod)
  );

  if (sourceIngresos.length === 0) {
      // Mensaje de error CORRECTO para cuando el mes anterior está vacío
      setToastMessage(`No se encontraron ingresos en el mes anterior: ${formatPeriodLabel(sourcePeriod)}.`);
      return;
  }

  if (!window.confirm(`Se copiarán ${sourceIngresos.length} ingresos de ${formatPeriodLabel(sourcePeriod)} a ${formatPeriodLabel(targetPeriod)}, ajustando las fechas +1 mes. ¿Estás seguro?`)) {
      return;
  }

  setIsCopying(true);
  setFormError(null);

  try {
      const createdIngresos = await Promise.all(
          sourceIngresos.map(async (ingreso) => {
              // Aumenta la fecha en 1 mes
              const newFecha = adjustDateForCopy(ingreso.fecha, 1);
              
              const montoARS = parseAmount(ingreso?.montoARS ?? ingreso?.monto_ars);
              const montoUSD = parseAmount(ingreso?.montoUSD ?? ingreso?.monto_usd);

              const payload = {
                  fecha: newFecha,
                  concepto: getTrimmedValue(ingreso?.concepto),
                  usuario: getTrimmedValue(ingreso?.usuario),
                  tipo_movimiento: getTrimmedValue(ingreso?.tipoMovimiento ?? ingreso?.tipo_movimiento),
                  tipo_de_cambio: getTrimmedValue(ingreso?.tipoDeCambio ?? ingreso?.tipo_de_cambio),
                  monto_ars: montoARS ?? 0,
                  monto_usd: montoUSD,
              };

              // Enviamos el payload SIN el ID, para que Supabase cree un nuevo registro
              const newIngreso = await createIngreso(payload);
              return normalizeIngreso(newIngreso);
          }),
      );

      setIngresos((previous) => sortByFechaDesc([...createdIngresos, ...previous]));

      if (typeof onDataChanged === 'function') {
          onDataChanged(); // Forzamos recarga de todos los datos
      }
      
      setToastMessage(
          createdIngresos.length === 1
              ? 'Se copió 1 ingreso al mes seleccionado.'
              : `Se copiaron ${createdIngresos.length} ingresos al mes seleccionado.`,
      );
  } catch (error) {
      console.error('Error al copiar ingresos:', error);
      setToastMessage(error?.message ?? 'No pudimos copiar los ingresos al mes seleccionado.');
  } finally {
      setIsCopying(false);
  }
};

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

  const handleStartEditingIngreso = (ingreso) => {
    if (!ingreso) {
      return;
    }

    setEditingIngresoId(ingreso.id);
    setEditingIngresoValues({
      fecha: formatDateForInput(ingreso.fecha) || '',
      concepto: ingreso.concepto ?? '',
      tipoMovimiento: ingreso.tipoMovimiento ?? '',
      montoARS: ingreso.montoARS ?? '',
      montoUSD: ingreso.montoUSD ?? '',
    });
  };

  const handleEditIngresoChange = (field, value) => {
    setEditingIngresoValues((previous) => ({ ...previous, [field]: value }));
  };

  const handleCancelEditingIngreso = () => {
    if (isUpdatingIngreso) {
      return;
    }

    setEditingIngresoId(null);
    setEditingIngresoValues(createInitialEditingState());
  };

  const handleSaveEditingIngreso = async () => {
    if (!editingIngresoId) {
      return;
    }

    if (!editingIngresoValues.fecha) {
      setToastMessage('Seleccioná una fecha válida para el ingreso.');
      return;
    }

    const ingresoToEdit = ingresos.find((item) => item.id === editingIngresoId);

    if (!ingresoToEdit) {
      setToastMessage('No encontramos el ingreso que querés editar.');
      handleCancelEditingIngreso();
      return;
    }

    setIsUpdatingIngreso(true);

    try {
      const payload = {
        fecha: editingIngresoValues.fecha,
        concepto: getTrimmedValue(editingIngresoValues.concepto),
        tipo_movimiento: getTrimmedValue(editingIngresoValues.tipoMovimiento),
        monto_ars: parseAmount(editingIngresoValues.montoARS),
        monto_usd: parseAmount(editingIngresoValues.montoUSD),
      };

      const updatedIngreso = await updateIngreso(ingresoToEdit, payload);
      const normalizedIngreso = normalizeIngreso(updatedIngreso);

      setIngresos((previous) =>
        sortByFechaDesc(
          previous.map((item) => (item.id === editingIngresoId ? normalizedIngreso : item)),
        ),
      );

      if (typeof onDataChanged === 'function') {
        onDataChanged();
      }

      setToastMessage('Ingreso actualizado correctamente.');
      setEditingIngresoId(null);
      setEditingIngresoValues(createInitialEditingState());
    } catch (error) {
      console.error('Error al actualizar el ingreso', error);
      setToastMessage(error?.message ?? 'No pudimos actualizar el ingreso.');
    } finally {
      setIsUpdatingIngreso(false);
    }
  };

  const handleDeleteIngreso = async (ingreso) => {
    if (!ingreso || deletingIngresoId) {
      return;
    }

    const confirmed = window.confirm('¿Querés borrar este ingreso?');

    if (!confirmed) {
      return;
    }

    setDeletingIngresoId(ingreso.id);

    try {
      await deleteIngreso(ingreso);
      setIngresos((previous) => previous.filter((item) => item.id !== ingreso.id));

      if (typeof onDataChanged === 'function') {
        onDataChanged();
      }

      if (editingIngresoId === ingreso.id) {
        setEditingIngresoId(null);
        setEditingIngresoValues(createInitialEditingState());
      }

      setToastMessage('Ingreso eliminado correctamente.');
    } catch (error) {
      console.error('Error al eliminar el ingreso', error);
      setToastMessage(error?.message ?? 'No pudimos borrar el ingreso.');
    } finally {
      setDeletingIngresoId(null);
    }
  };

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm">
          {toastMessage}
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Ingresos</h1>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <select
            value={selectedMonth ?? ''}
            onChange={handleMonthChange}
            className="bg-white border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
          >
            {monthOptions.map((option) => (
              <option key={option} value={option}>
                {formatPeriodLabel(option)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleCopyPreviousMonth}
            disabled={isCopying || loading || !selectedMonth}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isCopying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Copiando...
              </>
            ) : (
              'Copiar mes anterior'
            )}
          </button>
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
          ) : filteredIngresos.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">
              {loadError ? 'No pudimos cargar los ingresos.' : 'No registraste ingresos en el periodo seleccionado.'}
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
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredIngresos.map((ingreso) => (
                  <tr key={ingreso.id} className="hover:bg-gray-50">
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {editingIngresoId === ingreso.id ? (
                        <input
                          type="date"
                          value={editingIngresoValues.fecha}
                          onChange={(event) => handleEditIngresoChange('fecha', event.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                      ) : (
                        formatDate(ingreso.fecha)
                      )}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {editingIngresoId === ingreso.id ? (
                        <input
                          type="text"
                          value={editingIngresoValues.concepto}
                          onChange={(event) => handleEditIngresoChange('concepto', event.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          placeholder="Concepto"
                        />
                      ) : (
                        ingreso.concepto || '—'
                      )}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {ingreso.usuario || '—'}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {editingIngresoId === ingreso.id ? (
                        <input
                          type="text"
                          value={editingIngresoValues.tipoMovimiento}
                          onChange={(event) => handleEditIngresoChange('tipoMovimiento', event.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          placeholder="Tipo de movimiento"
                        />
                      ) : (
                        ingreso.tipoMovimiento || '—'
                      )}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {ingreso.tipoDeCambio || '—'}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                      {editingIngresoId === ingreso.id ? (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editingIngresoValues.montoARS}
                          onChange={(event) => handleEditIngresoChange('montoARS', event.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                      ) : (
                        formatCurrency(ingreso.montoARS, 'ARS')
                      )}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600">
                      {editingIngresoId === ingreso.id ? (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editingIngresoValues.montoUSD}
                          onChange={(event) => handleEditIngresoChange('montoUSD', event.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          placeholder="Opcional"
                        />
                      ) : (
                        formatCurrency(ingreso.montoUSD, 'USD')
                      )}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {editingIngresoId === ingreso.id ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleSaveEditingIngreso}
                            disabled={isUpdatingIngreso}
                            className="inline-flex items-center justify-center rounded-lg bg-green-500 px-3 py-1 text-white hover:bg-green-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {isUpdatingIngreso ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEditingIngreso}
                            disabled={isUpdatingIngreso}
                            className="inline-flex items-center justify-center rounded-lg bg-gray-200 px-3 py-1 text-gray-700 hover:bg-gray-300 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleStartEditingIngreso(ingreso)}
                            className="inline-flex items-center justify-center rounded-lg bg-gray-100 px-3 py-1 text-gray-700 hover:bg-gray-200 transition-colors"
                            title="Editar ingreso"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteIngreso(ingreso)}
                            disabled={deletingIngresoId === ingreso.id}
                            className="inline-flex items-center justify-center rounded-lg bg-red-100 px-3 py-1 text-red-600 hover:bg-red-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                            title="Eliminar ingreso"
                          >
                            {deletingIngresoId === ingreso.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      )}
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
