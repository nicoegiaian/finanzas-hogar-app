// nicoegiaian/finanzas-hogar-app/finanzas-hogar-app-32c82672b0e069102ffacbfef6de2de734a85cfe/components/inversiones/Inversiones.js

'use client';

import React, { useState, useMemo } from 'react';
import { Plus, Loader2, AlertCircle, Pencil, Check, X, Trash2 } from 'lucide-react';

import { createActivo, deleteActivo, updateActivo } from '../../lib/supabaseClient';
import { formatDateForInput } from '../../lib/financeUtils';

// Opciones fijas para la UI de activos
const TIPOS_ACTIVO = [
  'Efectivo ARS',
  'Efectivo USD',
  'Dólar en Cuenta',
  'Acción',
  'CEDEAR',
  'Fondo Común de Inversión (FCI)',
  'Obligación Negociable (ON)',
  'Título Público',
  'Crypto',
  'Otro',
];

const USUARIOS = ['Yo', 'Ella', 'Común'];

const createInitialFormState = () => ({
  usuario: USUARIOS[0],
  tipoActivo: TIPOS_ACTIVO[0],
  nombre: '', // NUEVO CAMPO: Nombre/Descripción del activo
  cantidad: '',
  ticker: '',
  moneda: 'ARS',
  fechaAdquisicion: new Date().toISOString().split('T')[0],
});

const createInitialEditingState = () => ({
  usuario: '',
  tipoActivo: '',
  nombre: '', // NUEVO CAMPO
  cantidad: '',
  ticker: '',
  moneda: '',
  fechaAdquisicion: '',
});

const parseAmount = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
};

const needsTicker = (tipoActivo) => {
  return [
    'Acción',
    'CEDEAR',
    'Fondo Común de Inversión (FCI)',
    'Obligación Negociable (ON)',
    'Título Público',
    'Crypto',
  ].includes(tipoActivo);
};

// Componente principal: Módulo de Gestión de Activos
const Inversiones = ({ onDataChanged, activos = [], patrimonioNeto, formatMoney }) => {
  const [loadError, setLoadError] = useState(null);
  const [formError, setFormError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(createInitialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [editingActivoId, setEditingActivoId] = useState(null);
  const [editingActivoValues, setEditingActivoValues] = useState(() => createInitialEditingState());
  const [isUpdatingActivo, setIsUpdatingActivo] = useState(false);
  const [deletingActivoId, setDeletingActivoId] = useState(null);

  // Ordenar los activos por fecha de adquisición descendente
  const sortedActivos = useMemo(() => {
    return [...activos].sort((a, b) => {
      const dateA = new Date(a.fecha_adquisicion || '2000-01-01').getTime();
      const dateB = new Date(b.fecha_adquisicion || '2000-01-01').getTime();
      return dateB - dateA;
    });
  }, [activos]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    let newFormData = { ...formData, [name]: value };

    // Lógica para actualizar moneda y ticker al cambiar tipoActivo
    if (name === 'tipoActivo') {
      const isMonetary = ['Efectivo ARS', 'Dólar en Cuenta', 'Efectivo USD'].includes(value);

      if (value === 'Efectivo USD') {
        newFormData.moneda = 'USD';
        newFormData.ticker = '';
      } else if (value === 'Efectivo ARS') {
        newFormData.moneda = 'ARS';
        newFormData.ticker = '';
      } else if (needsTicker(value)) {
        newFormData.moneda = 'TICKER_IN_USE'; // Marca temporal para que el backend use el ticker
      } else if (isMonetary) {
        newFormData.moneda = 'ARS';
        newFormData.ticker = '';
      }
    } else if (name === 'ticker' && needsTicker(newFormData.tipoActivo)) {
        newFormData.moneda = value.toUpperCase(); // La moneda se convierte al ticker
    }

    setFormData(newFormData);
  };

  const resetForm = () => {
    setFormData(createInitialFormState());
    setFormError(null);
  };

  const handleCancel = () => {
    resetForm();
    setShowForm(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        usuario: formData.usuario,
        tipo_activo: formData.tipoActivo,
        nombre: formData.nombre?.trim() || null, // PUNTO 3: Se incluye el nombre
        cantidad: parseAmount(formData.cantidad),
        ticker: formData.ticker?.trim() || null,
        // La moneda se establece a 'USD' o 'ARS' si son monetarios, o al Ticker para cotizaciones
        moneda: needsTicker(formData.tipoActivo) ? formData.ticker?.trim() : formData.moneda, 
        fecha_adquisicion: formData.fechaAdquisicion,
      };
      
      if (needsTicker(payload.tipo_activo) && !payload.ticker) {
        throw new Error('Debes ingresar el símbolo (Ticker/Símbolo) para este tipo de activo.');
      }
      
      await createActivo(payload); // Ya no devolvemos nada, solo esperamos éxito
      
      if (typeof onDataChanged === 'function') {
        onDataChanged(); // Forzar recarga de activos y Patrimonio Neto
      }
      
      resetForm();
      setShowForm(false);
      setToastMessage('Activo registrado correctamente.');
      
    } catch (error) {
      console.error('Error al crear un activo', error);
      setFormError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleStartEditingActivo = (activo) => {
    setEditingActivoId(activo.id);
    setEditingActivoValues({
      usuario: activo.usuario ?? '',
      tipoActivo: activo.tipo_activo ?? '',
      nombre: activo.nombre ?? '', // PUNTO 3: Se carga el nombre
      cantidad: activo.cantidad ?? '',
      ticker: activo.ticker ?? '',
      moneda: activo.moneda ?? '',
      fechaAdquisicion: formatDateForInput(activo.fecha_adquisicion) || '',
    });
  };
  
  const handleEditActivoChange = (field, value) => {
    setEditingActivoValues((previous) => ({ ...previous, [field]: value }));
  };

  const handleCancelEditingActivo = () => {
    if (isUpdatingActivo) return;
    setEditingActivoId(null);
    setEditingActivoValues(createInitialEditingState());
  };

  const handleSaveEditingActivo = async () => {
    if (!editingActivoId) return;

    const activoToEdit = activos.find((item) => item.id === editingActivoId);

    if (!activoToEdit) {
      setToastMessage('No encontramos el activo que querés editar.');
      handleCancelEditingActivo();
      return;
    }

    setIsUpdatingActivo(true);

    try {
      const payload = {
        usuario: editingActivoValues.usuario,
        tipo_activo: editingActivoValues.tipoActivo,
        nombre: editingActivoValues.nombre?.trim() || null, // PUNTO 3: Se guarda el nombre
        cantidad: parseAmount(editingActivoValues.cantidad),
        ticker: editingActivoValues.ticker?.trim() || null,
        moneda: needsTicker(editingActivoValues.tipoActivo) ? editingActivoValues.ticker?.trim() : editingActivoValues.moneda, 
        fecha_adquisicion: editingActivoValues.fechaAdquisicion,
      };
      
      if (needsTicker(payload.tipo_activo) && !payload.ticker) {
        throw new Error('Debes ingresar el símbolo (Ticker/Símbolo) para este tipo de activo.');
      }

      await updateActivo(activoToEdit, payload);
      
      if (typeof onDataChanged === 'function') {
        onDataChanged();
      }

      setToastMessage('Activo actualizado correctamente.');
      handleCancelEditingActivo();
    } catch (error) {
      console.error('Error al actualizar el activo', error);
      setToastMessage(error?.message ?? 'No pudimos actualizar el activo.');
    } finally {
      setIsUpdatingActivo(false);
    }
  };

  const handleDeleteActivo = async (activo) => {
    if (!activo || deletingActivoId) return;

    const confirmed = window.confirm(`¿Querés borrar este activo (${activo.tipo_activo} - ${activo.cantidad})?`);

    if (!confirmed) return;

    setDeletingActivoId(activo.id);

    try {
      await deleteActivo(activo);
      
      if (typeof onDataChanged === 'function') {
        onDataChanged();
      }

      setToastMessage('Activo eliminado correctamente.');
    } catch (error) {
      console.error('Error al eliminar el activo', error);
      setToastMessage(error?.message ?? 'No pudimos borrar el activo.');
    } finally {
      setDeletingActivoId(null);
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
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Gestión de Activos / Inversiones</h1>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg font-semibold">
            Patrimonio Neto: {formatMoney(patrimonioNeto)}
          </div>
          <button
            type="button"
            onClick={() => {
              setShowForm(true);
              setFormError(null);
            }}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Registrar Activo
          </button>
        </div>
      </div>

      {formError && (
        <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Error al guardar el activo</p>
            <p className="text-sm">{formError}</p>
          </div>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-lg shadow-lg border border-gray-200">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              
              <div>
                <label htmlFor="usuario" className="block text-sm font-medium text-gray-700 mb-1">
                  Usuario
                </label>
                <select
                  id="usuario"
                  name="usuario"
                  value={formData.usuario}
                  onChange={handleInputChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  {USUARIOS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              
              <div>
                <label htmlFor="tipoActivo" className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Activo
                </label>
                <select
                  id="tipoActivo"
                  name="tipoActivo"
                  value={formData.tipoActivo}
                  onChange={handleInputChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  {TIPOS_ACTIVO.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* PUNTO 3: Campo Nombre/Descripción */}
              <div>
                <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre/Descripción (PUNTO 3)
                </label>
                <input
                  id="nombre"
                  name="nombre"
                  type="text"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Ej: Dólar Billete BMA, FCI Renta Fija"
                />
              </div>

              {needsTicker(formData.tipoActivo) && (
                <div>
                  <label htmlFor="ticker" className="block text-sm font-medium text-gray-700 mb-1">
                    Ticker / Símbolo
                  </label>
                  <input
                    id="ticker"
                    name="ticker"
                    type="text"
                    value={formData.ticker}
                    onChange={handleInputChange}
                    required={needsTicker(formData.tipoActivo)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Ej: GGAL, BTC, AL30"
                  />
                </div>
              )}

              <div>
                <label htmlFor="cantidad" className="block text-sm font-medium text-gray-700 mb-1">
                  Cantidad / Monto ({formData.moneda})
                </label>
                <input
                  id="cantidad"
                  name="cantidad"
                  type="number"
                  min="0"
                  step="0.0001"
                  value={formData.cantidad}
                  onChange={handleInputChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div>
                <label htmlFor="fechaAdquisicion" className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Adquisición
                </label>
                <input
                  id="fechaAdquisicion"
                  name="fechaAdquisicion"
                  type="date"
                  value={formData.fechaAdquisicion}
                  onChange={handleInputChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              
              {/* Espacio extra para mantener el grid alineado si el ticker está presente */}
              {needsTicker(formData.tipoActivo) && <div className="hidden md:block"></div>}
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
                  'Guardar Activo'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          {sortedActivos.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">
              {loadError ? 'No pudimos cargar los activos.' : 'Aún no has registrado ningún activo/inversión.'}
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  {/* PUNTO 3: Nueva Columna Nombre */}
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descripción (PUNTO 3)
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cantidad (PUNTO 4)
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Símbolo
                  </th>
                  {/* PUNTO 5: Nueva Columna Valor Actual (USD) */}
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor Actual (USD)
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor Actual (ARS)
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedActivos.map((activo) => (
                  <tr key={activo.id} className="hover:bg-gray-50">
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {activo.usuario}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {activo.tipo_activo}
                    </td>
                    {/* PUNTO 3: Mostrar Nombre */}
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {activo.nombre || '—'}
                    </td>
                    {/* PUNTO 4: Mostrar solo Cantidad */}
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {editingActivoId === activo.id ? (
                        <input
                          type="number"
                          min="0"
                          step="0.0001"
                          value={editingActivoValues.cantidad}
                          onChange={(event) => handleEditActivoChange('cantidad', event.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                      ) : (
                        // PUNTO 4: Solo muestra el número
                        activo.cantidad || '—'
                      )}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                       {/* Muestra el Ticker si existe, sino la moneda base */}
                      {activo.ticker || activo.moneda}
                    </td>
                    {/* PUNTO 5: Columna Valor USD */}
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-600">
                      {formatMoney(activo.valor_usd, 'USD')}
                    </td>
                    {/* PUNTO 2: Columna Valor ARS */}
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600">
                      {formatMoney(activo.valor_ars, 'ARS')} 
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {editingActivoId === activo.id ? (
                        <div className="flex items-center gap-2">
                          {/* ... botones editar/cancelar */}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleStartEditingActivo(activo)}
                            className="inline-flex items-center justify-center rounded-lg bg-gray-100 px-3 py-1 text-gray-700 hover:bg-gray-200 transition-colors"
                            title="Editar activo"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteActivo(activo)}
                            disabled={deletingActivoId === activo.id}
                            className="inline-flex items-center justify-center rounded-lg bg-red-100 px-3 py-1 text-red-600 hover:bg-red-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                            title="Eliminar activo"
                          >
                            {deletingActivoId === activo.id ? (
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

export default Inversiones;