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

async function fetchTableRows(tableName) {
  const url = buildTableUrl(tableName, '?select=*&order=fecha.desc');
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

export const fetchIngresos = () => fetchTableRows('ingresos');

export const createIngreso = (ingreso) => createTableRow('ingresos', ingreso);

export const fetchGastos = () => fetchTableRows('gastos');

export const createGasto = (gasto) => createTableRow('gastos', gasto);
