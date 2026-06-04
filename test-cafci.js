/**
 * test-cafci.js
 * Script standalone para probar la API de CAFCI sin tocar la app.
 * Ejecutar con: node test-cafci.js
 *
 * Prueba múltiples endpoints conocidos de CAFCI y reporta cuáles funcionan
 * y qué estructura devuelven, para elegir el mejor antes de integrar.
 */

// Fondos de prueba (Balanz)
const TEST_FUNDS = [
  { nombre: 'Balanz Ahorro Corto Plazo', fondo: '551', clase: '1114' },
  { nombre: 'Balanz Retorno Total',      fondo: '498', clase: '1004' },
  { nombre: 'Balanz Institucional',      fondo: '791', clase: '1818' },
];

// Endpoints a probar
const buildEndpoints = (fondo, clase) => [
  {
    nombre: 'ficha (endpoint original)',
    url: `https://api.cafci.org.ar/fondo/${fondo}/clase/${clase}/ficha`,
    parseVCP: (json) => json?.data?.info?.diaria?.actual?.vcpUnitario,
  },
  {
    nombre: 'estadisticas/informacion/diaria (fondo/clase)',
    url: `https://api.cafci.org.ar/estadisticas/informacion/diaria/${fondo}/${clase}`,
    parseVCP: (json) => json?.data?.vcp ?? json?.data?.[0]?.vcp,
  },
  {
    nombre: 'estadisticas/informacion/diaria (fondo only)',
    url: `https://api.cafci.org.ar/estadisticas/informacion/diaria/${fondo}`,
    parseVCP: (json) => json?.data?.vcp ?? json?.data?.[0]?.vcp,
  },
  {
    nombre: 'rendimiento (últimos 30 días)',
    url: `https://api.cafci.org.ar/fondo/${fondo}/clase/${clase}/rendimiento/${getDateDaysAgo(30)}/${getToday()}`,
    parseVCP: (json) => json?.data?.rendimiento,
  },
];

function getToday() {
  return new Date().toISOString().split('T')[0];
}

function getDateDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

async function testEndpoint(endpoint, fondoNombre) {
  const label = `[${fondoNombre}] ${endpoint.nombre}`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(endpoint.url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; finanzas-test/1.0)',
      },
    });
    clearTimeout(timeout);

    console.log(`\n${label}`);
    console.log(`  URL: ${endpoint.url}`);
    console.log(`  Status: ${res.status} ${res.statusText}`);

    if (!res.ok) {
      const body = await res.text();
      console.log(`  Body: ${body.slice(0, 200)}`);
      return { ok: false, status: res.status };
    }

    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('json')) {
      const body = await res.text();
      console.log(`  Content-Type: ${contentType}`);
      console.log(`  Body (no JSON): ${body.slice(0, 300)}`);
      return { ok: false, status: res.status, reason: 'not json' };
    }

    const json = await res.json();
    const vcp = endpoint.parseVCP(json);

    if (vcp != null) {
      console.log(`  ✅ VCP encontrado: ${vcp}`);
    } else {
      console.log(`  ⚠️  Respondió OK pero VCP no encontrado en el path esperado`);
      console.log(`  Estructura: ${JSON.stringify(json).slice(0, 400)}`);
    }

    return { ok: true, status: res.status, vcp, json };
  } catch (err) {
    console.log(`\n${label}`);
    console.log(`  URL: ${endpoint.url}`);
    console.log(`  ❌ Error: ${err.message}`);
    return { ok: false, error: err.message };
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('TEST DE ENDPOINTS CAFCI');
  console.log(`Fecha: ${new Date().toISOString()}`);
  console.log('='.repeat(60));

  const summary = [];

  // Testar solo el primer fondo con todos los endpoints
  const testFund = TEST_FUNDS[0];
  console.log(`\nProbando endpoints con: ${testFund.nombre} (fondo=${testFund.fondo}, clase=${testFund.clase})`);

  const endpoints = buildEndpoints(testFund.fondo, testFund.clase);

  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint, testFund.nombre);
    summary.push({ endpoint: endpoint.nombre, ...result });
  }

  // Si alguno funcionó, probarlo con los otros fondos
  const workingEndpoint = endpoints.find((_, i) => summary[i]?.ok && summary[i]?.vcp != null);
  if (workingEndpoint) {
    console.log('\n' + '='.repeat(60));
    console.log(`ENDPOINT QUE FUNCIONA: ${workingEndpoint.nombre}`);
    console.log('Probando con los otros fondos...');

    for (const fund of TEST_FUNDS.slice(1)) {
      const ep = buildEndpoints(fund.fondo, fund.clase).find(
        (e) => e.nombre === workingEndpoint.nombre,
      );
      if (ep) await testEndpoint(ep, fund.nombre);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('RESUMEN');
  console.log('='.repeat(60));
  summary.forEach((r) => {
    const status = r.vcp != null ? '✅ VCP OK' : r.ok ? '⚠️  OK sin VCP' : `❌ Falló (${r.status ?? r.error})`;
    console.log(`  ${r.endpoint}: ${status}`);
  });
  console.log('');
}

main().catch(console.error);
