export const dynamic = 'force-dynamic';

// Convierte formato argentino "233.669,955" → 233669.955
function parseArgNumber(str) {
  return parseFloat(str.trim().replace(/\./g, '').replace(',', '.'));
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const fondo = searchParams.get('fondo');
    const clase = searchParams.get('clase');

    if (!fondo || !clase) {
      return Response.json({ error: 'fondo y clase son requeridos' }, { status: 400 });
    }

    const pageUrl = `https://estadisticas.cafci.org.ar/fondos/${fondo}?clase=${clase}`;

    const upstream = await fetch(pageUrl, {
      cache: 'no-store',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-AR,es;q=0.9',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!upstream.ok) {
      return Response.json({ error: `CAFCI respondió ${upstream.status}` }, { status: 502 });
    }

    const html = await upstream.text();

    // Extraer VCP: busca "Valor Cuotaparte</td>" y captura el número en el <td> siguiente
    const vcpMatch = html.match(/Valor Cuotaparte<\/td>\s*<td>\s*([\d.,]+)\s*<\/td>/);
    if (!vcpMatch) {
      return Response.json({ error: 'No se encontró el Valor Cuotaparte en el HTML' }, { status: 502 });
    }
    const vcp = parseArgNumber(vcpMatch[1]);

    // Extraer fecha: busca "información al DD/MM/YYYY"
    const fechaMatch = html.match(/información al (\d{2}\/\d{2}\/\d{4})/);
    const fecha = fechaMatch ? fechaMatch[1] : null;

    return Response.json({ vcp, fecha });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
