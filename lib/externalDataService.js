// TAREA 2.1: Implementación del servicio Dólar Blue desde MonedaAPI.ar

const ALPHA_VANTAGE_API_KEY = process.env.NEXT_PUBLIC_ALPHA_VANTAGE_KEY;
const API_URL_DOLAR_BLUE = 'https://monedapi.ar/api/usd';
const FALLBACK_USD_BLUE_RATE = 1450; // Valor de fallback si la API falla o no se encuentra el valor.

// Cache simple para evitar múltiples llamadas a la API en una misma sesión.
let exchangeRateCache = null;

/**
 * Busca el precio de cierre del último día para una acción dada.
 * @param {string} ticker - Símbolo de la acción (e.g., GGAL, YPF, BTC).
 * @returns {Promise<number>} El precio de la acción en su moneda base (ARS o USD).
 */
export async function fetchStockPrice(ticker) {
  // En un entorno real, esta parte haría la llamada a la API de Alpha Vantage.
  if (!ALPHA_VANTAGE_API_KEY) {
    // MOCK DATA: Devuelve precios simulados para la prueba de lógica
    switch (ticker.toUpperCase()) {
      case 'GGAL':
        return 1500; // Precio en ARS (Acción Local)
      case 'BMA':
        return 1800; // Precio en ARS (Acción Local)
      case 'TSLA':
        return 240; // Precio en USD (CEDEAR base)
      case 'BTC':
      case 'ETH':
        return 68000; // Precio en USD (Cripto base)
      default:
        return 1;
    }
  }
  
  // TO DO: Implementación futura de la API de cotizaciones bursátiles.
  return 1;
}

/**
 * Obtiene la cotización del Dólar Blue (Compra) desde MonedaAPI.
 * Si falla, retorna un valor de fallback y notifica un error.
 * @returns {Promise<number>} Tasa de cambio Dólar Blue (Compra).
 */
export async function getUSDExchangeRate() {
  if (exchangeRateCache) {
    return exchangeRateCache;
  }

  try {
    const response = await fetch(API_URL_DOLAR_BLUE, { next: { revalidate: 3600 } }); // Cachea por 1 hora
    
    if (!response.ok) {
      throw new Error(`API response was not OK: ${response.status}`);
    }

    const data = await response.json();

    const blueRate = data.find(item => item.origen === 'BLUE');
    
    if (blueRate && blueRate.compra) {
      exchangeRateCache = blueRate.compra;
      return blueRate.compra; // Tomamos el valor de compra (el precio al que podemos vender)
    }

    throw new Error('Could not find BLUE rate in the API response.');

  } catch (error) {
    console.error(`ERROR al obtener Dólar Blue: ${error.message}`);
    // Criterio de Fallo: Retornar fallback para que el cálculo continúe
    exchangeRateCache = FALLBACK_USD_BLUE_RATE;
    return FALLBACK_USD_BLUE_RATE;
  }
}