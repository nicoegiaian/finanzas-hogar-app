const ALPHA_VANTAGE_API_KEY = process.env.NEXT_PUBLIC_ALPHA_VANTAGE_KEY;

// Tasa ficticia que usaremos para convertir USD a ARS (Ej. Dólar MEP)
const MOCK_USD_MEP_RATE = 1200; 

/**
 * Busca el precio de cierre del último día para una acción dada.
 * Por ahora devuelve un precio mock para simular el cálculo.
 * @param {string} ticker - Símbolo de la acción (e.g., GGAL, YPF).
 * @returns {Promise<number>} El precio de la acción en su moneda base (ARS o USD).
 */
export async function fetchStockPrice(ticker) {
  if (!ALPHA_VANTAGE_API_KEY) {
    // Si la clave no está configurada, devolvemos 0 o un mock simple.
    // En un entorno real, esta parte haría la llamada a la API de Alpha Vantage.
    console.warn('ADVERTENCIA: API Key de Alpha Vantage no configurada. Usando datos mock.');
  }
  
  // MOCK DATA: Devuelve precios simulados para la prueba de lógica
  switch (ticker) {
    case 'GGAL':
      return 1500; // Ejemplo de precio
    case 'YPF':
      return 1800;
    case 'ALUA':
      return 95;
    case 'BTC':
      return 70000;
    default:
      return 1;
  }
}

/**
 * Provee un tipo de cambio de mercado (e.g., MEP o Blue) para convertir USD a ARS.
 * @returns {number} Tasa de cambio ARS/USD.
 */
export function getUSDExchangeRate() {
  // Esta tasa debería obtenerse de una API confiable en producción.
  return MOCK_USD_MEP_RATE;
}