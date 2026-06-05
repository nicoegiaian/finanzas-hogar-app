export const dynamic = 'force-dynamic';

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

    // Buscar fragmentos alrededor de palabras clave relevantes
    const keywords = ['cuotaparte', 'VCP', 'vcp', 'valor', 'Valor cuota'];
    const excerpts = {};
    for (const kw of keywords) {
      const idx = html.toLowerCase().indexOf(kw.toLowerCase());
      if (idx !== -1) {
        excerpts[kw] = html.slice(Math.max(0, idx - 100), idx + 300);
      }
    }

    // También devolver el body completo desde la mitad
    const bodyStart = html.indexOf('<body');
    const bodySection = bodyStart !== -1 ? html.slice(bodyStart, bodyStart + 5000) : html.slice(3000, 8000);

    return Response.json({
      html_length: html.length,
      keywords_found: excerpts,
      body_section: bodySection,
    });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
