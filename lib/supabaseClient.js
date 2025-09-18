import { calculateMonthlyTotals, normalizePeriod } from './financeUtils';

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

export const fetchIngresos = () => fetchTableRows('ingresos');

export const fetchGastos = () => fetchTableRows('gastos');

export const fetchAhorros = () => fetchTableRows('ahorros', 'periodo');

async function fetchAhorroByPeriod(periodo) {
  const periodQuery = `?select=*&periodo=eq.${encodeURIComponent(periodo)}&limit=1`;
  const url = buildTableUrl('ahorros', periodQuery);
  const response = await fetch(url, {
    method: 'GET',
    headers: buildHeaders(),
    cache: 'no-store',
  });

  const data = await handleResponse(response);
  return Array.isArray(data) && data.length > 0 ? data[0] : null;
}

async function updateAhorro(periodo, fields) {
  const updateQuery = `?periodo=eq.${encodeURIComponent(periodo)}`;
  const url = buildTableUrl('ahorros', updateQuery);
  const response = await fetch(url, {
    method: 'PATCH',
    headers: buildHeaders({ Prefer: 'return=representation' }),
    body: JSON.stringify(fields),
    cache: 'no-store',
  });

  const data = await handleResponse(response);
  return Array.isArray(data) ? data[0] : data;
}

export const upsertAhorro = async (ahorro) => {
  const normalizedPeriod = normalizePeriod(ahorro?.periodo);

  if (!normalizedPeriod) {
    throw new Error('El periodo del ahorro no es válido.');
  }

  const existingAhorro = await fetchAhorroByPeriod(normalizedPeriod);

  if (existingAhorro) {
    return updateAhorro(normalizedPeriod, { monto: ahorro?.monto });
  }

  return createTableRow('ahorros', {
    ...ahorro,
    periodo: normalizedPeriod,
  });
};

export async function syncAhorroForPeriod(period) {
  const normalizedPeriod = normalizePeriod(period);

  if (!normalizedPeriod) {
    return;
  }

  const [ingresos, gastos] = await Promise.all([fetchIngresos(), fetchGastos()]);
  const { ahorroDelMes } = calculateMonthlyTotals(ingresos ?? [], gastos ?? [], normalizedPeriod);

  return upsertAhorro({
    periodo: normalizedPeriod,
    monto: ahorroDelMes,
  });
}

const getRecordPeriod = (record) => normalizePeriod(record?.fecha ?? record?.periodo ?? record?.mes);

const syncAhorroAfterUpdate = async (updatedRecord, previousRecord) => {
  const newPeriod = getRecordPeriod(updatedRecord) ?? getRecordPeriod(previousRecord);
  const previousPeriod = getRecordPeriod(previousRecord);

  const periodsToSync = new Set();

  if (newPeriod) {
    periodsToSync.add(newPeriod);
  }

  if (previousPeriod && previousPeriod !== newPeriod) {
    periodsToSync.add(previousPeriod);
  }

  await Promise.all(Array.from(periodsToSync).map((period) => syncAhorroForPeriod(period)));
};

async function syncAhorroForRecord(record, fallbackRecord) {
  const period = normalizePeriod(
    record?.fecha ?? record?.periodo ?? fallbackRecord?.fecha ?? fallbackRecord?.periodo,
  );

  if (!period) {
    return;
  }

  try {
    await syncAhorroForPeriod(period);
  } catch (error) {
    throw new Error(
      error?.message
        ? `No se pudo actualizar el ahorro del periodo seleccionado: ${error.message}`
        : 'No se pudo actualizar el ahorro del periodo seleccionado.',
    );
  }
}

export const createIngreso = async (ingreso) => {
  const newIngreso = await createTableRow('ingresos', ingreso);
  await syncAhorroForRecord(newIngreso, ingreso);
  return newIngreso;
};

export const createGasto = async (gasto) => {
  const newGasto = await createTableRow('gastos', gasto);
  await syncAhorroForRecord(newGasto, gasto);
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

export const updateIngreso = async (previousRecord, fields) => {
  const identifiers = resolveUpdateIdentifiers(previousRecord);
  const updatedIngreso = await updateRecordWithIdentifiers('ingresos', identifiers, fields);

  if (!updatedIngreso) {
    throw new Error('No encontramos el ingreso que querés actualizar. Probá recargar la página.');
  }

  await syncAhorroAfterUpdate(updatedIngreso, previousRecord);
  return updatedIngreso;
};

export const updateGasto = async (previousRecord, fields) => {
  const identifiers = resolveUpdateIdentifiers(previousRecord);
  const updatedGasto = await updateRecordWithIdentifiers('gastos', identifiers, fields);

  if (!updatedGasto) {
    throw new Error('No encontramos el gasto que querés actualizar. Probá recargar la página.');
  }

  await syncAhorroAfterUpdate(updatedGasto, previousRecord);
  return updatedGasto;
};
