export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const fondo = searchParams.get('fondo');
    const clase = searchParams.get('clase');

    if (!fondo || !clase) {
      return Response.json({ error: 'fondo y clase son requeridos' }, { status: 400 });
    }

    const cafciUrl = `https://api.cafci.org.ar/fondo/${fondo}/clase/${clase}/ficha`;

    const upstream = await fetch(cafciUrl, {
      cache: 'no-store',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'es-AR,es;q=0.9',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://estadisticas.cafci.org.ar/',
        'Origin': 'https://estadisticas.cafci.org.ar',
      },
    });

    const contentType = upstream.headers.get('content-type') ?? '';

    // Si CAFCI no devuelve JSON, retornar el body crudo para diagnóstico
    if (!contentType.includes('json')) {
      const rawBody = await upstream.text();
      return Response.json({
        error: `CAFCI respondió ${upstream.status} con content-type: ${contentType}`,
        cafci_status: upstream.status,
        body_preview: rawBody.slice(0, 500),
      }, { status: 502 });
    }

    const data = await upstream.json();
    return Response.json(data, { status: upstream.status });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
