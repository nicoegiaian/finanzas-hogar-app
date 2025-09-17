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
