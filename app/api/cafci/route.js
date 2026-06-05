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
    const upstream = await fetch(cafciUrl, { cache: 'no-store' });
    const data = await upstream.json();

    return Response.json(data, { status: upstream.status });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
