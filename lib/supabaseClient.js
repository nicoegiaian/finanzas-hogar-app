// nicoegiaian/finanzas-hogar-app/finanzas-hogar-app-32c82672b0e069102ffacbfef6de2de734a85cfe/lib/supabaseClient.js
import { normalizePeriod } from './financeUtils';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const missingEnvMessage =
  'Las variables NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY no están configuradas. ' +
  'Agregalas en tu entorno para habilitar la conexión con Supabase.';

function ensureEnv() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(missingEnvMessage);
  }
}

function buildHeaders(additionalHeaders = {}) {
  ensureEnv();

  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...additionalHeaders,
  };
}

async function handleResponse(response) {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Error al comunicarse con Supabase.');
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function buildTableUrl(tableName, query = '') {
  ensureEnv();

  const baseUrl = `${SUPABASE_URL}/rest/v1/${tableName}`;
  return query ? `${baseUrl}${query}` : baseUrl;
}

async function fetchTableRows(tableName, orderColumn = 'fecha') {
  const orderQuery = orderColumn ? `?select=*&order=${orderColumn}.desc` : '?select=*';
  const url = buildTableUrl(tableName, orderQuery);
  const response = await fetch(url, {
    method: 'GET',
    headers: buildHeaders(),
    cache: 'no-store',
  });

  return handleResponse(response);
}

async function createTableRow(tableName, record) {
  const url = buildTableUrl(tableName);
  const response = await fetch(url, {
    method: 'POST',
    headers: buildHeaders({ Prefer: 'return=representation' }),
    body: JSON.stringify([record]),
    cache: 'no-store',
  });

  const data = await handleResponse(response);
  return Array.isArray(data) ? data[0] : data;
}

async function updateTableRow(tableName, fieldName, value, fields) {
  if (!fieldName || value === null || value === undefined || value === '') {
    throw new Error('El identificador del registro no es válido.');
  }

  const updateQuery = `?${encodeURIComponent(fieldName)}=eq.${encodeURIComponent(value)}`;
  const url = buildTableUrl(tableName, updateQuery);
  const response = await fetch(url, {
    method: 'PATCH',
    headers: buildHeaders({ Prefer: 'return=representation' }),
    body: JSON.stringify(fields),
    cache: 'no-store',
  });

  const data = await handleResponse(response);
  return Array.isArray(data) ? data[0] : data;
}

async function deleteTableRow(tableName, fieldName, value) {
  if (!fieldName || value === null || value === undefined || value === '') {
    throw new Error('El identificador del registro no es válido.');
  }

  const deleteQuery = `?${encodeURIComponent(fieldName)}=eq.${encodeURIComponent(value)}`;
  const url = buildTableUrl(tableName, deleteQuery);
  const response = await fetch(url, {
    method: 'DELETE',
    headers: buildHeaders({ Prefer: 'return=representation' }),
    cache: 'no-store',
  });

  const data = await handleResponse(response);

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return null;
    }

    return data[0];
  }

  return data;
}

async function upsertTableRow(tableName, record, conflictTarget) {
  const conflictQuery = conflictTarget ? `?on_conflict=${encodeURIComponent(conflictTarget)}` : '';
  const url = buildTableUrl(tableName, conflictQuery);
  const response = await fetch(url, {
    method: 'POST',
    headers: buildHeaders({
      Prefer: 'return=representation,resolution=merge-duplicates',
    }),
    body: JSON.stringify([record]),
    cache: 'no-store',
  });

  const data = await handleResponse(response);
  return Array.isArray(data) ? data[0] : data;
}

// ===========================================
// Exportaciones de Fetch
// ===========================================
export const fetchIngresos = () => fetchTableRows('ingresos');

export const fetchGastos = () => fetchTableRows('gastos');

// Nueva función para obtener la tabla de activos
export const fetchActivos = () => fetchTableRows('activos', 'fecha_adquisicion');

// ===========================================
// Exportaciones de CRUD de Ingresos/Gastos (SIN SYNC)
// ===========================================

export const createIngreso = async (ingreso) => {
  const newIngreso = await createTableRow('ingresos', ingreso);
  return newIngreso;
};

export const createGasto = async (gasto) => {
  const newGasto = await createTableRow('gastos', gasto);
  return newGasto;
};

const buildIdentifierCandidate = (field, value) => {
  if (!field) {
    return null;
  }

  const normalizedField = String(field).trim();

  if (!normalizedField) {
    return null;
  }

  if (value === null || value === undefined) {
    return null;
  }

  const normalizedValue = typeof value === 'string' ? value.trim() : value;

  if (normalizedValue === '') {
    return null;
  }

  return { field: normalizedField, value: normalizedValue };
};

const resolveUpdateIdentifiers = (record) => {
  if (!record || typeof record !== 'object') {
    throw new Error('No se puede actualizar el registro porque falta su identificador.');
  }

  const candidates = [];
  const seen = new Set();

  const pushCandidate = (field, value) => {
    const candidate = buildIdentifierCandidate(field, value);

    if (!candidate) {
      return;
    }

    const key = `${candidate.field}:${String(candidate.value)}`;

    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    candidates.push(candidate);
  };

  pushCandidate(record.databaseIdField, record.databaseId);
  pushCandidate('id', record.id ?? record.Id ?? record.ID ?? record.ingreso_id ?? record.gasto_id);
  pushCandidate('uuid', record.uuid ?? record.UUID ?? record.ingreso_uuid ?? record.gasto_uuid);

  if (candidates.length === 0) {
    throw new Error('No se puede actualizar el registro porque falta su identificador.');
  }

  return candidates;
};

const updateRecordWithIdentifiers = async (tableName, identifiers, fields) => {
  for (const { field, value } of identifiers) {
    try {
      const updatedRecord = await updateTableRow(tableName, field, value, fields);

      if (updatedRecord) {
        return updatedRecord;
      }
    } catch (error) {
      if (error?.message === 'El identificador del registro no es válido.') {
        continue;
      }

      throw error;
    }
  }

  return null;
};

const deleteRecordWithIdentifiers = async (tableName, identifiers) => {
  for (const { field, value } of identifiers) {
    try {
      const deletedRecord = await deleteTableRow(tableName, field, value);

      if (deletedRecord) {
        return deletedRecord;
      }
    } catch (error) {
      if (error?.message === 'El identificador del registro no es válido.') {
        continue;
      }

      throw error;
    }
  }

  return null;
};

export const updateIngreso = async (previousRecord, fields) => {
  const identifiers = resolveUpdateIdentifiers(previousRecord);
  const updatedIngreso = await updateRecordWithIdentifiers('ingresos', identifiers, fields);

  if (!updatedIngreso) {
    throw new Error('No encontramos el ingreso que querés actualizar. Probá recargar la página.');
  }

  return updatedIngreso;
};

export const updateGasto = async (previousRecord, fields) => {
  const identifiers = resolveUpdateIdentifiers(previousRecord);
  const updatedGasto = await updateRecordWithIdentifiers('gastos', identifiers, fields);

  if (!updatedGasto) {
    throw new Error('No encontramos el gasto que querés actualizar. Probá recargar la página.');
  }

  return updatedGasto;
};

export const deleteIngreso = async (previousRecord) => {
  const identifiers = resolveUpdateIdentifiers(previousRecord);
  const deletedIngreso = await deleteRecordWithIdentifiers('ingresos', identifiers);

  if (!deletedIngreso) {
    throw new Error('No encontramos el ingreso que querés borrar. Probá recargar la página.');
  }

  return deletedIngreso;
};

export const deleteGasto = async (previousRecord) => {
  const identifiers = resolveUpdateIdentifiers(previousRecord);
  const deletedGasto = await deleteRecordWithIdentifiers('gastos', identifiers);

  if (!deletedGasto) {
    throw new Error('No encontramos el gasto que querés borrar. Probá recargar la página.');
  }

  return deletedGasto;
};

// ===========================================
// Exportaciones de CRUD para ACTVOS (TAREA 1.3)
// ===========================================

export const createActivo = async (activo) => {
  return createTableRow('activos', activo);
};

export const updateActivo = async (previousRecord, fields) => {
  const identifiers = resolveUpdateIdentifiers(previousRecord);
  const updatedActivo = await updateRecordWithIdentifiers('activos', identifiers, fields);

  if (!updatedActivo) {
    throw new Error('No encontramos el activo que querés actualizar. Probá recargar la página.');
  }

  return updatedActivo;
};

export const deleteActivo = async (previousRecord) => {
  const identifiers = resolveUpdateIdentifiers(previousRecord);
  const deletedActivo = await deleteRecordWithIdentifiers('activos', identifiers);

  if (!deletedActivo) {
    throw new Error('No encontramos el activo que querés borrar. Probá recargar la página.');
  }

  return deletedActivo;
};