import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const fondo = searchParams.get('fondo');
  const clase = searchParams.get('clase');

  if (!fondo || !clase) {
    return NextResponse.json(
      { error: 'Parámetros fondo y clase son requeridos' },
      { status: 400 },
    );
  }

  try {
    const cafciUrl = `https://api.cafci.org.ar/fondo/${fondo}/clase/${clase}/ficha`;
    const response = await fetch(cafciUrl, {
      headers: { Accept: 'application/json' },
      // Revalida cada hora - el VCP se publica una vez por día hábil
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `CAFCI respondió ${response.status}` },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error?.message ?? 'Error al consultar CAFCI' },
      { status: 500 },
    );
  }
}
