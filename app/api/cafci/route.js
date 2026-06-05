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
      return Response.json({
        error: `estadisticas.cafci.org.ar respondió ${upstream.status}`,
        cafci_status: upstream.status,
      }, { status: 502 });
    }

    const html = await upstream.text();

    // Para diagnóstico: devolver los primeros 3000 chars del HTML
    // Una vez que confirmemos la estructura, parseamos el VCP
    return Response.json({
      status: upstream.status,
      html_length: html.length,
      html_preview: html.slice(0, 3000),
    });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
