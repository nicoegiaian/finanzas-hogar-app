'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  RefreshCw,
  ExternalLink,
  Edit2,
  Plus,
  Loader2,
  Check,
  X,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Settings,
} from 'lucide-react';
import {
  fetchInversionesInstrumentos,
  fetchInversionesMovimientos,
  fetchPreciosManuales,
  createMovimiento,
  upsertPrecioManual,
  createInversionInstrumento,
  updateInversionInstrumento,
} from '../../lib/supabaseClient';

// ─── External API helpers ─────────────────────────────────────────────────

const getDolarBlue = async () => {
  const res = await fetch('https://dolarapi.com/v1/dolares/blue');
  if (!res.ok) throw new Error('No se pudo obtener el dólar blue');
  return res.json();
};

const getCAFCIPrice = async (cafciId) => {
  const [fondoId, claseId] = cafciId.split(';');
  // Proxy Next.js → estadisticas.cafci.org.ar (evita CORS y auth)
  const res = await fetch(`/api/cafci?fondo=${fondoId}&clase=${claseId}`);
  if (!res.ok) throw new Error(`CAFCI error para fondo ${cafciId}`);
  const json = await res.json();
  // El proxy devuelve { vcp: number, fecha: string } directamente
  return {
    vcp: Number(json.vcp ?? 0),
    fecha: json.fecha ?? null,
  };
};

// ─── Portfolio calculation ────────────────────────────────────────────────

const buildPortfolio = (instrumentos, movimientos, cafciPrices, preciosManuales, dolarBlue) => {
  return instrumentos.map((inst) => {
    const instMovs = movimientos.filter((m) => m.instrumento_id === inst.id);
    const totalCuotapartes = instMovs.reduce((sum, m) => {
      const cant = Number(m.cantidad ?? 0);
      return m.tipo === 'suscripcion' || m.tipo === 'compra' ? sum + cant : sum - cant;
    }, 0);

    let precioActual = null;
    let precioFuente = 'sin_precio';
    let precioFecha = null;

    if (inst.fuente_precio === 'cafci' && cafciPrices[inst.id]) {
      precioActual = cafciPrices[inst.id].vcp;
      precioFecha = cafciPrices[inst.id].fecha;
      precioFuente = 'cafci';
    } else {
      const manual = preciosManuales
        .filter((p) => p.instrumento_id === inst.id)
        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0];
      if (manual) {
        precioActual = Number(manual.precio);
        precioFecha = manual.updated_at;
        precioFuente = inst.fuente_precio === 'cafci' ? 'cafci_fallback' : 'manual';
      }
    }

    const valorARS = precioActual !== null ? totalCuotapartes * precioActual : null;
    const valorUSD =
      valorARS !== null && dolarBlue?.venta ? valorARS / dolarBlue.venta : null;

    return { ...inst, totalCuotapartes, precioActual, precioFuente, precioFecha, valorARS, valorUSD };
  });
};

// ─── Format helpers ───────────────────────────────────────────────────────

const fmtARS = (val) => {
  if (val == null) return '—';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
};
const fmtUSD = (val) => {
  if (val == null) return '—';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
};
const fmtNum = (val, dec = 4) => {
  if (val == null || val === 0) return '0';
  return new Intl.NumberFormat('es-AR', { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(val);
};

const TIPOS = ['FCI', 'Accion', 'CEDEAR', 'Bono', 'Efectivo'];
const BROKERS = ['Balanz', 'Santander', 'Efectivo'];
const TIPO_LABELS = { FCI: 'FCI', Accion: 'Acción', CEDEAR: 'CEDEAR', Bono: 'Bono', Efectivo: 'Efectivo' };
const USUARIO_LABELS = { nico: 'Nico', nali: 'Nali' };

const EMPTY_INSTR_FORM = {
  nombre: '', ticker: '', tipo: 'FCI', broker: 'Balanz',
  usuario: 'nico', moneda: 'ARS', fuente_precio: 'cafci',
  cafci_fondo_id: '', url_precio_referencia: '', precio_manual: '', activo: true,
};

// ─── Sub-components ───────────────────────────────────────────────────────

const PrecioFuenteBadge = ({ fuente }) => {
  if (fuente === 'cafci') return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">⚡ Tiempo real</span>
  );
  if (fuente === 'cafci_fallback') return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700">⚡ Último conocido</span>
  );
  if (fuente === 'manual') return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">✏️ Manual</span>
  );
  return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">Sin precio</span>;
};

const SummaryCard = ({ label, ars, usd, color = 'blue' }) => {
  const colorMap = { blue: 'border-blue-500', purple: 'border-purple-500', green: 'border-green-500' };
  return (
    <div className={`bg-white rounded-lg shadow p-4 border-l-4 ${colorMap[color]}`}>
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-800">{fmtARS(ars)}</p>
      <p className="text-sm text-gray-500 mt-0.5">{fmtUSD(usd)}</p>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────

export default function Inversiones({ formatMoney }) {
  const [activeTab, setActiveTab] = useState('resumen');
  const [instrumentos, setInstrumentos] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [preciosManuales, setPreciosManuales] = useState([]);
  const [cafciPrices, setCafciPrices] = useState({});
  const [dolarBlue, setDolarBlue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshingPrices, setRefreshingPrices] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // ── Movimiento form state
  const [showMovForm, setShowMovForm] = useState(false);
  const [movFormData, setMovFormData] = useState({
    instrumento_id: '', fecha: new Date().toISOString().split('T')[0],
    tipo: 'suscripcion', monto_ars: '', cantidad: '', notas: '',
  });
  const [movFormSaving, setMovFormSaving] = useState(false);

  // ── Instrumento form state
  const [showInstrForm, setShowInstrForm] = useState(false);
  const [instrFormMode, setInstrFormMode] = useState('create'); // 'create' | 'edit'
  const [instrEditId, setInstrEditId] = useState(null);
  const [instrFormData, setInstrFormData] = useState(EMPTY_INSTR_FORM);
  const [instrFormSaving, setInstrFormSaving] = useState(false);

  // ── Inline price edit state (tab Instrumentos)
  const [editingPrecioId, setEditingPrecioId] = useState(null);
  const [editingPrecioValue, setEditingPrecioValue] = useState('');
  const [savingPrecio, setSavingPrecio] = useState(false);

  const [expandedUsers, setExpandedUsers] = useState({ nico: true, nali: true });

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ─── Data loading ─────────────────────────────────────────────────────────

  const loadExternalPrices = useCallback(async (insts) => {
    // Dólar blue
    try {
      const blue = await getDolarBlue();
      setDolarBlue(blue);
    } catch { /* opcional */ }

    // Precios CAFCI
    const fciInsts = insts.filter((i) => i.fuente_precio === 'cafci' && i.cafci_fondo_id);
    const settled = await Promise.allSettled(
      fciInsts.map(async (inst) => {
        const price = await getCAFCIPrice(inst.cafci_fondo_id);
        return { id: inst.id, nombre: inst.ticker, price };
      }),
    );

    const newPrices = {};
    const ok = [];
    const failed = [];

    for (const r of settled) {
      if (r.status === 'fulfilled') {
        newPrices[r.value.id] = r.value.price;
        ok.push(r.value.nombre);
        // Persistir en Supabase como fallback para recargas futuras
        try {
          await upsertPrecioManual(r.value.id, r.value.price.vcp);
        } catch { /* no crítico */ }
      } else {
        const inst = fciInsts[settled.indexOf(r)];
        failed.push(inst?.ticker ?? 'desconocido');
      }
    }

    setCafciPrices(newPrices);

    // Retornar resumen para el toast
    return { ok, failed };
  }, []);

  const loadSupabaseData = useCallback(async () => {
    const [insts, movs, precios] = await Promise.all([
      fetchInversionesInstrumentos(),
      fetchInversionesMovimientos(),
      fetchPreciosManuales(),
    ]);
    const activeInsts = Array.isArray(insts) ? insts.filter((i) => i.activo) : [];
    setInstrumentos(activeInsts);
    setMovimientos(Array.isArray(movs) ? movs : []);
    setPreciosManuales(Array.isArray(precios) ? precios : []);
    return activeInsts;
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const insts = await loadSupabaseData();
      await loadExternalPrices(insts);
    } catch (err) {
      setError(err?.message ?? 'Error al cargar inversiones.');
    } finally {
      setLoading(false);
    }
  }, [loadSupabaseData, loadExternalPrices]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleRefreshPrices = async () => {
    setRefreshingPrices(true);
    try {
      const { ok, failed } = await loadExternalPrices(instrumentos) ?? { ok: [], failed: [] };
      const dolarMsg = dolarBlue ? ` · Blue: ${fmtARS(dolarBlue.venta)}` : '';
      if (failed.length === 0) {
        showToast(`${ok.length}/${ok.length} precios actualizados ✓${dolarMsg}`);
      } else {
        showToast(`${ok.length}/${ok.length + failed.length} actualizados · Sin datos: ${failed.join(', ')}`);
      }
      // Recargar precios manuales desde Supabase (se persistieron los CAFCI)
      await loadSupabaseData();
    } catch {
      showToast('Error al actualizar precios');
    } finally {
      setRefreshingPrices(false);
    }
  };

  // ─── Portfolio ────────────────────────────────────────────────────────────

  const portfolio = useMemo(
    () => buildPortfolio(instrumentos, movimientos, cafciPrices, preciosManuales, dolarBlue),
    [instrumentos, movimientos, cafciPrices, preciosManuales, dolarBlue],
  );

  const portfolioByUser = useMemo(() =>
    Object.fromEntries(['nico', 'nali'].map((u) => [u, portfolio.filter((i) => i.usuario === u)])),
    [portfolio],
  );

  const totalARS = portfolio.reduce((s, i) => s + (i.valorARS ?? 0), 0);
  const totalUSD = portfolio.reduce((s, i) => s + (i.valorUSD ?? 0), 0);

  const totalByUser = useMemo(() =>
    Object.fromEntries(
      Object.entries(portfolioByUser).map(([u, insts]) => [u, {
        ars: insts.reduce((s, i) => s + (i.valorARS ?? 0), 0),
        usd: insts.reduce((s, i) => s + (i.valorUSD ?? 0), 0),
      }])
    ), [portfolioByUser],
  );

  // ─── Movimiento handlers ──────────────────────────────────────────────────

  const precioImplicito = useMemo(() => {
    const monto = parseFloat(movFormData.monto_ars);
    const cant = parseFloat(movFormData.cantidad);
    if (monto > 0 && cant > 0) return (monto / cant).toFixed(6);
    return null;
  }, [movFormData.monto_ars, movFormData.cantidad]);

  const selectedInstrumento = instrumentos.find((i) => i.id === movFormData.instrumento_id);

  const handleSaveMovimiento = async () => {
    if (!movFormData.instrumento_id || !movFormData.fecha || !movFormData.cantidad) {
      showToast('Completá instrumento, fecha y cantidad');
      return;
    }
    setMovFormSaving(true);
    try {
      await createMovimiento({
        instrumento_id: movFormData.instrumento_id,
        fecha: movFormData.fecha,
        tipo: movFormData.tipo,
        monto_ars: parseFloat(movFormData.monto_ars) || 0,
        cantidad: parseFloat(movFormData.cantidad),
        notas: movFormData.notas || null,
      });
      if (precioImplicito && parseFloat(precioImplicito) > 0) {
        await upsertPrecioManual(movFormData.instrumento_id, parseFloat(precioImplicito));
      }
      setMovFormData({
        instrumento_id: '', fecha: new Date().toISOString().split('T')[0],
        tipo: 'suscripcion', monto_ars: '', cantidad: '', notas: '',
      });
      setShowMovForm(false);
      showToast('Movimiento registrado ✓');
      const insts = await loadSupabaseData();
      await loadExternalPrices(insts);
    } catch (err) {
      showToast(err?.message ?? 'Error al guardar');
    } finally {
      setMovFormSaving(false);
    }
  };

  // ─── Instrumento handlers ─────────────────────────────────────────────────

  const handleOpenNewInstr = () => {
    setInstrFormMode('create');
    setInstrEditId(null);
    setInstrFormData(EMPTY_INSTR_FORM);
    setShowInstrForm(true);
    setShowMovForm(false);
  };

  const handleOpenEditInstr = (inst) => {
    setInstrFormMode('edit');
    setInstrEditId(inst.id);
    // Buscar precio manual actual
    const precioActual = preciosManuales
      .filter((p) => p.instrumento_id === inst.id)
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0];
    setInstrFormData({
      nombre: inst.nombre ?? '',
      ticker: inst.ticker ?? '',
      tipo: inst.tipo ?? 'FCI',
      broker: inst.broker ?? 'Balanz',
      usuario: inst.usuario ?? 'nico',
      moneda: inst.moneda ?? 'ARS',
      fuente_precio: inst.fuente_precio ?? 'manual',
      cafci_fondo_id: inst.cafci_fondo_id ?? '',
      url_precio_referencia: inst.url_precio_referencia ?? '',
      precio_manual: precioActual ? String(precioActual.precio) : '',
      activo: inst.activo ?? true,
    });
    setShowInstrForm(true);
    setShowMovForm(false);
  };

  const handleInstrFormChange = (field, value) => {
    setInstrFormData((prev) => {
      const next = { ...prev, [field]: value };
      // Sincronizar fuente_precio con tipo automáticamente
      if (field === 'tipo') {
        next.fuente_precio = value === 'FCI' ? 'cafci' : 'manual';
      }
      return next;
    });
  };

  const handleSaveInstrumento = async () => {
    if (!instrFormData.nombre || !instrFormData.ticker) {
      showToast('Nombre y ticker son obligatorios');
      return;
    }
    setInstrFormSaving(true);
    try {
      const payload = {
        nombre: instrFormData.nombre.trim(),
        ticker: instrFormData.ticker.trim().toUpperCase(),
        tipo: instrFormData.tipo,
        broker: instrFormData.broker,
        usuario: instrFormData.usuario,
        moneda: instrFormData.moneda,
        fuente_precio: instrFormData.fuente_precio,
        cafci_fondo_id: instrFormData.tipo === 'FCI' ? instrFormData.cafci_fondo_id.trim() || null : null,
        url_precio_referencia: instrFormData.tipo !== 'FCI' ? instrFormData.url_precio_referencia.trim() || null : null,
        activo: instrFormData.activo,
      };

      let savedId = instrEditId;
      if (instrFormMode === 'create') {
        const created = await createInversionInstrumento(payload);
        savedId = created?.id;
      } else {
        await updateInversionInstrumento(instrEditId, payload);
      }

      // Guardar precio manual si se ingresó y no es FCI
      if (instrFormData.tipo !== 'FCI' && instrFormData.precio_manual && savedId) {
        const precioNum = parseFloat(instrFormData.precio_manual);
        if (precioNum > 0) await upsertPrecioManual(savedId, precioNum);
      }

      setShowInstrForm(false);
      setInstrFormData(EMPTY_INSTR_FORM);
      showToast(instrFormMode === 'create' ? 'Instrumento creado ✓' : 'Instrumento actualizado ✓');
      const insts = await loadSupabaseData();
      await loadExternalPrices(insts);
    } catch (err) {
      showToast(err?.message ?? 'Error al guardar instrumento');
    } finally {
      setInstrFormSaving(false);
    }
  };

  // ─── Inline price edit ────────────────────────────────────────────────────

  const handleSavePrecio = async (instrumentoId) => {
    if (!editingPrecioValue) return;
    setSavingPrecio(true);
    try {
      await upsertPrecioManual(instrumentoId, parseFloat(editingPrecioValue));
      setEditingPrecioId(null);
      setEditingPrecioValue('');
      showToast('Precio actualizado ✓');
      const insts = await loadSupabaseData();
      await loadExternalPrices(insts);
    } catch (err) {
      showToast(err?.message ?? 'Error al guardar precio');
    } finally {
      setSavingPrecio(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-gray-500 text-sm">Cargando portfolio y precios...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-red-700">Error al cargar inversiones</p>
          <p className="text-sm text-red-600 mt-1">{error}</p>
          <button onClick={loadAll} className="mt-3 text-sm text-red-600 underline">Reintentar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-800 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Inversiones</h1>
          {dolarBlue && (
            <p className="text-sm text-gray-500 mt-0.5">
              Dólar blue: {fmtARS(dolarBlue.venta)} · {fmtARS(dolarBlue.compra)} compra
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleRefreshPrices}
            disabled={refreshingPrices}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshingPrices ? 'animate-spin' : ''}`} />
            Actualizar precios
          </button>
          <button
            onClick={handleOpenNewInstr}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm transition-colors"
          >
            <Settings className="h-4 w-4" />
            Nuevo instrumento
          </button>
          <button
            onClick={() => { setShowMovForm((v) => !v); setShowInstrForm(false); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            Movimiento
          </button>
        </div>
      </div>

      {/* ── Instrumento Form ───────────────────────────────────────────────── */}
      {showInstrForm && (
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-800">
              {instrFormMode === 'create' ? 'Nuevo instrumento' : `Editar: ${instrFormData.nombre}`}
            </h3>
            <button onClick={() => setShowInstrForm(false)} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Nombre */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={instrFormData.nombre}
                onChange={(e) => handleInstrFormChange('nombre', e.target.value)}
                placeholder="Ej: Balanz Ahorro Corto Plazo"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Ticker */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Ticker <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={instrFormData.ticker}
                onChange={(e) => handleInstrFormChange('ticker', e.target.value.toUpperCase())}
                placeholder="Ej: BCAHA"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Tipo */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
              <select
                value={instrFormData.tipo}
                onChange={(e) => handleInstrFormChange('tipo', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {TIPOS.map((t) => <option key={t} value={t}>{TIPO_LABELS[t]}</option>)}
              </select>
            </div>

            {/* Broker */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Broker</label>
              <select
                value={instrFormData.broker}
                onChange={(e) => handleInstrFormChange('broker', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {BROKERS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            {/* Usuario */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Usuario</label>
              <select
                value={instrFormData.usuario}
                onChange={(e) => handleInstrFormChange('usuario', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="nico">Nico</option>
                <option value="nali">Nali</option>
              </select>
            </div>

            {/* Moneda */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Moneda</label>
              <select
                value={instrFormData.moneda}
                onChange={(e) => handleInstrFormChange('moneda', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
              </select>
            </div>

            {/* CAFCI ID — solo para FCI */}
            {instrFormData.tipo === 'FCI' && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  CAFCI ID <span className="text-gray-400 font-normal">(fondo;clase — ej: 551;1114)</span>
                </label>
                <input
                  type="text"
                  value={instrFormData.cafci_fondo_id}
                  onChange={(e) => handleInstrFormChange('cafci_fondo_id', e.target.value)}
                  placeholder="551;1114"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Obtené el ID desde{' '}
                  <a href="https://estadisticas.cafci.org.ar" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
                    estadisticas.cafci.org.ar
                  </a>
                  {' '}→ URL: fondos/XXX?clase=YYYY
                </p>
              </div>
            )}

            {/* URL de referencia — solo para no-FCI */}
            {instrFormData.tipo !== 'FCI' && (
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">URL de referencia de precio</label>
                <input
                  type="url"
                  value={instrFormData.url_precio_referencia}
                  onChange={(e) => handleInstrFormChange('url_precio_referencia', e.target.value)}
                  placeholder="https://clientes.balanz.com/app/detalleinstrumento?ticker=..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

            {/* Precio manual actual — solo para no-FCI */}
            {instrFormData.tipo !== 'FCI' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Precio actual {instrFormMode === 'edit' ? '(actualizar)' : '(inicial)'}
                </label>
                <input
                  type="number"
                  value={instrFormData.precio_manual}
                  onChange={(e) => handleInstrFormChange('precio_manual', e.target.value)}
                  placeholder="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

            {/* Activo — solo en edición */}
            {instrFormMode === 'edit' && (
              <div className="flex items-center gap-3 pt-5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={instrFormData.activo}
                    onChange={(e) => handleInstrFormChange('activo', e.target.checked)}
                    className="w-4 h-4 rounded accent-blue-500"
                  />
                  <span className="text-sm text-gray-600">Instrumento activo</span>
                </label>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-5">
            <button
              onClick={() => setShowInstrForm(false)}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveInstrumento}
              disabled={instrFormSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-60 flex items-center gap-2 transition-colors"
            >
              {instrFormSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</> : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {/* ── Movimiento Form ────────────────────────────────────────────────── */}
      {showMovForm && (
        <div className="bg-white rounded-lg shadow-lg border border-blue-100 p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-800">Registrar movimiento</h3>
            <button onClick={() => setShowMovForm(false)} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Instrumento <span className="text-red-500">*</span></label>
              <select
                value={movFormData.instrumento_id}
                onChange={(e) => setMovFormData((p) => ({ ...p, instrumento_id: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Seleccioná un instrumento...</option>
                {['nico', 'nali'].map((u) => {
                  const uInsts = instrumentos.filter((i) => i.usuario === u);
                  if (!uInsts.length) return null;
                  return (
                    <optgroup key={u} label={USUARIO_LABELS[u]}>
                      {uInsts.map((inst) => (
                        <option key={inst.id} value={inst.id}>
                          {inst.nombre} ({inst.ticker}) — {inst.broker}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fecha <span className="text-red-500">*</span></label>
              <input type="date" value={movFormData.fecha}
                onChange={(e) => setMovFormData((p) => ({ ...p, fecha: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
              <select value={movFormData.tipo}
                onChange={(e) => setMovFormData((p) => ({ ...p, tipo: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="suscripcion">Suscripción</option>
                <option value="rescate">Rescate</option>
                <option value="compra">Compra</option>
                <option value="venta">Venta</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Monto ARS invertido</label>
              <input type="number" placeholder="0" value={movFormData.monto_ars}
                onChange={(e) => setMovFormData((p) => ({ ...p, monto_ars: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {selectedInstrumento?.tipo === 'Efectivo' ? 'Dólares' : selectedInstrumento?.tipo === 'FCI' ? 'Cuotapartes' : 'Cantidad'}{' '}
                <span className="text-red-500">*</span>
              </label>
              <input type="number" placeholder="0" value={movFormData.cantidad}
                onChange={(e) => setMovFormData((p) => ({ ...p, cantidad: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Precio por unidad (calculado)</label>
              <div className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-600">
                {precioImplicito ? fmtARS(parseFloat(precioImplicito)) : '—'}
              </div>
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">Notas</label>
              <input type="text" placeholder="Opcional..." value={movFormData.notas}
                onChange={(e) => setMovFormData((p) => ({ ...p, notas: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setShowMovForm(false)}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button onClick={handleSaveMovimiento} disabled={movFormSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-60 flex items-center gap-2 transition-colors">
              {movFormSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</> : 'Guardar movimiento'}
            </button>
          </div>
        </div>
      )}

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-gray-200 rounded-lg p-1 w-fit">
        {[{ id: 'resumen', label: 'Resumen' }, { id: 'instrumentos', label: 'Instrumentos' }].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Resumen ──────────────────────────────────────────────────── */}
      {activeTab === 'resumen' && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-lg p-5 border-l-4 border-blue-500">
            <p className="text-sm text-gray-500 mb-1">Portfolio total</p>
            <p className="text-3xl font-bold text-gray-800">{fmtARS(totalARS)}</p>
            <p className="text-base text-gray-500 mt-1">{fmtUSD(totalUSD)} al blue</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SummaryCard label="Nico" ars={totalByUser.nico?.ars ?? 0} usd={totalByUser.nico?.usd ?? 0} color="blue" />
            <SummaryCard label="Nali" ars={totalByUser.nali?.ars ?? 0} usd={totalByUser.nali?.usd ?? 0} color="purple" />
          </div>

          {['nico', 'nali'].map((usuario) => {
            const insts = portfolioByUser[usuario];
            if (!insts?.length) return null;
            const porBroker = insts.reduce((acc, inst) => {
              if (!acc[inst.broker]) acc[inst.broker] = [];
              acc[inst.broker].push(inst);
              return acc;
            }, {});
            return (
              <div key={usuario} className="bg-white rounded-lg shadow overflow-hidden">
                <button
                  onClick={() => setExpandedUsers((p) => ({ ...p, [usuario]: !p[usuario] }))}
                  className="w-full flex items-center justify-between px-5 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-gray-700">{USUARIO_LABELS[usuario]}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-600">{fmtARS(totalByUser[usuario]?.ars ?? 0)}</span>
                    {expandedUsers[usuario] ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  </div>
                </button>
                {expandedUsers[usuario] && (
                  <div className="divide-y divide-gray-50">
                    {Object.entries(porBroker).map(([broker, bInsts]) => (
                      <div key={broker} className="px-5 py-3">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{broker}</p>
                        {bInsts.map((inst) => (
                          <div key={inst.id} className="flex items-center justify-between py-1.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">{inst.ticker}</span>
                              <span className="text-sm text-gray-700 truncate">{inst.nombre}</span>
                            </div>
                            <div className="text-right flex-shrink-0 ml-3">
                              <p className="text-sm font-semibold text-gray-800">{inst.valorARS != null ? fmtARS(inst.valorARS) : '—'}</p>
                              <p className="text-xs text-gray-400">{inst.valorUSD != null ? fmtUSD(inst.valorUSD) : ''}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Tab: Instrumentos ─────────────────────────────────────────────── */}
      {activeTab === 'instrumentos' && (
        <div className="space-y-4">
          {['nico', 'nali'].map((usuario) => {
            const insts = portfolioByUser[usuario];
            if (!insts?.length) return null;
            return (
              <div key={usuario} className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-700">{USUARIO_LABELS[usuario]}</h3>
                  <span className="text-sm text-gray-500">
                    {fmtARS(totalByUser[usuario]?.ars ?? 0)} · {fmtUSD(totalByUser[usuario]?.usd ?? 0)}
                  </span>
                </div>

                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {['Instrumento', 'Tipo', 'Cuotapartes', 'Precio actual', 'Valor ARS', 'Valor USD', ''].map((h) => (
                          <th key={h} className={`px-4 py-2.5 text-xs font-medium text-gray-400 uppercase ${h && h !== 'Instrumento' && h !== 'Tipo' ? 'text-right' : 'text-left'}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {insts.map((inst) => (
                        <tr key={inst.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-gray-800">{inst.nombre}</p>
                            <p className="text-xs text-gray-400 font-mono">{inst.ticker} · {inst.broker}</p>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600">{TIPO_LABELS[inst.tipo] ?? inst.tipo}</td>
                          <td className="px-4 py-3 text-right text-sm text-gray-700 font-mono">{fmtNum(inst.totalCuotapartes)}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="text-sm text-gray-700">{inst.precioActual != null ? fmtARS(inst.precioActual) : '—'}</span>
                              <PrecioFuenteBadge fuente={inst.precioFuente} />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-semibold text-gray-800">{inst.valorARS != null ? fmtARS(inst.valorARS) : '—'}</td>
                          <td className="px-4 py-3 text-right text-sm text-gray-600">{inst.valorUSD != null ? fmtUSD(inst.valorUSD) : '—'}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              {/* Editar instrumento */}
                              <button
                                onClick={() => handleOpenEditInstr(inst)}
                                title="Editar instrumento"
                                className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition-colors"
                              >
                                <Settings className="h-3.5 w-3.5" />
                              </button>
                              {/* Link externo (precio de referencia) */}
                              {inst.url_precio_referencia && (
                                <a href={inst.url_precio_referencia} target="_blank" rel="noopener noreferrer"
                                  title="Ver precio en broker"
                                  className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-500 transition-colors">
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              )}
                              {/* Editar precio inline (solo manual) */}
                              {inst.fuente_precio === 'manual' && (
                                editingPrecioId === inst.id ? (
                                  <div className="flex items-center gap-1">
                                    <input type="number" value={editingPrecioValue}
                                      onChange={(e) => setEditingPrecioValue(e.target.value)}
                                      className="w-24 border border-blue-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                      placeholder="Precio" autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSavePrecio(inst.id);
                                        if (e.key === 'Escape') { setEditingPrecioId(null); setEditingPrecioValue(''); }
                                      }}
                                    />
                                    <button onClick={() => handleSavePrecio(inst.id)} disabled={savingPrecio} className="p-1 rounded hover:bg-green-100 text-green-600">
                                      {savingPrecio ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                    </button>
                                    <button onClick={() => { setEditingPrecioId(null); setEditingPrecioValue(''); }} className="p-1 rounded hover:bg-red-100 text-red-500">
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => { setEditingPrecioId(inst.id); setEditingPrecioValue(inst.precioActual?.toString() ?? ''); }}
                                    title="Actualizar precio"
                                    className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-500 transition-colors"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                )
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden divide-y divide-gray-100">
                  {insts.map((inst) => (
                    <div key={inst.id} className="px-4 py-3 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{inst.nombre}</p>
                          <p className="text-xs text-gray-400 font-mono">{inst.ticker} · {inst.broker}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-800">{inst.valorARS != null ? fmtARS(inst.valorARS) : '—'}</p>
                          <p className="text-xs text-gray-500">{inst.valorUSD != null ? fmtUSD(inst.valorUSD) : ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">{fmtNum(inst.totalCuotapartes)} cptes × {inst.precioActual != null ? fmtARS(inst.precioActual) : '—'}</span>
                          <PrecioFuenteBadge fuente={inst.precioFuente} />
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => handleOpenEditInstr(inst)} className="p-1.5 rounded hover:bg-blue-50 text-gray-400">
                            <Settings className="h-3.5 w-3.5" />
                          </button>
                          {inst.url_precio_referencia && (
                            <a href={inst.url_precio_referencia} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded hover:bg-gray-100 text-gray-400">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                          {inst.fuente_precio === 'manual' && editingPrecioId !== inst.id && (
                            <button onClick={() => { setEditingPrecioId(inst.id); setEditingPrecioValue(inst.precioActual?.toString() ?? ''); }} className="p-1.5 rounded hover:bg-gray-100 text-gray-400">
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {editingPrecioId === inst.id && (
                            <div className="flex items-center gap-1">
                              <input type="number" value={editingPrecioValue}
                                onChange={(e) => setEditingPrecioValue(e.target.value)}
                                className="w-20 border border-blue-300 rounded px-2 py-1 text-xs" placeholder="Precio" autoFocus />
                              <button onClick={() => handleSavePrecio(inst.id)} className="p-1 text-green-600"><Check className="h-3.5 w-3.5" /></button>
                              <button onClick={() => { setEditingPrecioId(null); setEditingPrecioValue(''); }} className="p-1 text-red-500"><X className="h-3.5 w-3.5" /></button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
