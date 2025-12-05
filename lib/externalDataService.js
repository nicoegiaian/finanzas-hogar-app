// TAREA 2.1: Implementación del servicio Dólar Blue desde MonedaAPI.ar

const ALPHA_VANTAGE_API_KEY = process.env.NEXT_PUBLIC_ALPHA_VANTAGE_KEY;
const API_URL_DOLAR_BLUE = 'https://monedapi.ar/api/usd';
const FALLBACK_USD_BLUE_RATE = 1450; // Valor de fallback si la API falla o no se encuentra el valor.
const API_BASE_URL = 'https://www.alphavantage.co/query';
const API_TIME_SERIES = 'TIME_SERIES_DAILY';

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
    console.warn('ADVERTENCIA: API Key de Alpha Vantage no configurada. Usando datos mock.');
    // Mantiene la lógica de mock para asegurar el funcionamiento si la llave falla
    switch (ticker.toUpperCase()) {
        case 'GGAL': return 1500;
        case 'BMA': return 1800;
        case 'TSLA': return 240;
        case 'BTC': return 68000;
        case 'ETH': return 4000;
        default: return 1;
    }
  }

  
  const isCrypto = ['BTC', 'ETH'].includes(ticker.toUpperCase());
  const functionType = isCrypto ? 'DIGITAL_CURRENCY_DAILY' : API_TIME_SERIES;
  const symbolParam = isCrypto ? `symbol=${ticker}&market=USD` : `symbol=${ticker}`;
  
  const url = `${API_BASE_URL}?function=${functionType}&${symbolParam}&apikey=${ALPHA_VANTAGE_API_KEY}`;
  
  try {
    const response = await fetch(url, { next: { revalidate: 3600 } }); // Cachea por 1 hora
    const data = await response.json();

    if (data['Error Message'] || data['Note']) {
      console.error(`Error de API para ${ticker}:`, data);
      return 1; // Fallback seguro
    }

    if (isCrypto) {
        // Ejemplo de extracción para Crypto (tomando el último precio de cierre en USD)
        const timeSeries = data['Time Series (Digital Currency Daily)'];
        if (timeSeries) {
            const latestDate = Object.keys(timeSeries)[0];
            // 4b. close (USD)
            return parseFloat(timeSeries[latestDate]['4b. close (USD)']); 
        }
    } else {
        // Ejemplo de extracción para Stocks (tomando el último precio de cierre)
        const timeSeries = data['Time Series (Daily)'];
        if (timeSeries) {
            const latestDate = Object.keys(timeSeries)[0];
            // 4. close
            return parseFloat(timeSeries[latestDate]['4. close']);
        }
    }

    return 1;
  } catch (error) {
    console.error(`Error al obtener cotización real para ${ticker}:`, error);
    return 1;
  }
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