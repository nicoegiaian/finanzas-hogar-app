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

export async function fetchIngresos() {
  const url = `${SUPABASE_URL}/rest/v1/ingresos?select=*&order=fecha.desc`;
  const response = await fetch(url, {
    method: 'GET',
    headers: buildHeaders(),
    cache: 'no-store',
  });

  return handleResponse(response);
}

export async function createIngreso(ingreso) {
  const url = `${SUPABASE_URL}/rest/v1/ingresos`;
  const response = await fetch(url, {
    method: 'POST',
    headers: buildHeaders({ Prefer: 'return=representation' }),
    body: JSON.stringify([ingreso]),
    cache: 'no-store',
  });

  const data = await handleResponse(response);
  return Array.isArray(data) ? data[0] : data;
}

export async function fetchGastos() {
  const url = `${SUPABASE_URL}/rest/v1/gastos?select=*&order=fecha.desc`;
  const response = await fetch(url, {
    method: 'GET',
    headers: buildHeaders(),
    cache: 'no-store',
  });

  return handleResponse(response);
}

export async function createGasto(gasto) {
  const url = `${SUPABASE_URL}/rest/v1/gastos`;
  const response = await fetch(url, {
    method: 'POST',
    headers: buildHeaders({ Prefer: 'return=representation' }),
    body: JSON.stringify([gasto]),
    cache: 'no-store',
  });

  const data = await handleResponse(response);
  return Array.isArray(data) ? data[0] : data;
}
