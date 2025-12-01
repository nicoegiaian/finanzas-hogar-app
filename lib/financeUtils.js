const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

export const getNumericValue = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();

    if (trimmed === '') {
      return null;
    }

    const normalized = trimmed.replace(/\s/g, '').replace(/,/g, '.');
    const dotMatches = normalized.match(/\./g) ?? [];

    if (dotMatches.length > 1) {
      const lastDotIndex = normalized.lastIndexOf('.');
      const withoutThousands =
        normalized.slice(0, lastDotIndex).replace(/\./g, '') + normalized.slice(lastDotIndex);
      const parsedWithThousands = Number.parseFloat(withoutThousands);

      return Number.isFinite(parsedWithThousands) ? parsedWithThousands : null;
    }

    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

export const getExchangeRateValue = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  const direct = getNumericValue(value);

  if (direct !== null) {
    return direct;
  }

  if (typeof value === 'string') {
    const match = value.replace(',', '.').match(/[0-9.]+/);

    if (!match) {
      return null;
    }

    const parsed = Number.parseFloat(match[0]);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

export const normalizePeriod = (value) => {
  if (!value && value !== 0) {
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();

    if (trimmed === '') {
      return null;
    }

    const simpleMatch = trimmed.match(/^(\d{4})-(\d{1,2})$/);

    if (simpleMatch) {
      const [, year, month] = simpleMatch;
      return `${year}-${month.padStart(2, '0')}`;
    }
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

export const calculateIngresoARS = (record) => {
  const amount = getNumericValue(record?.monto_ars ?? record?.montoARS);
  return amount !== null ? amount : 0;
};

export const calculateGastoARS = (record) => {
  const montoARS = getNumericValue(record?.monto_ars ?? record?.montoARS);
  return montoARS !== null ? montoARS : 0;
};

export const calculateMonthlyTotals = (ingresos = [], gastos = [], period) => {
  const normalizedPeriod = normalizePeriod(period);

  if (!normalizedPeriod) {
    return { ingresosARS: 0, gastosARS: 0, ahorroDelMes: 0 };
  }

  const ingresosARS = ingresos.reduce((sum, ingreso) => {
    const ingresoPeriod = normalizePeriod(ingreso?.fecha ?? ingreso?.periodo ?? ingreso?.mes);

    if (ingresoPeriod !== normalizedPeriod) {
      return sum;
    }

    return sum + calculateIngresoARS(ingreso);
  }, 0);

  const gastosARS = gastos.reduce((sum, gasto) => {
    const gastoPeriod = normalizePeriod(gasto?.fecha ?? gasto?.periodo ?? gasto?.mes);

    if (gastoPeriod !== normalizedPeriod) {
      return sum;
    }

    return sum + calculateGastoARS(gasto);
  }, 0);

  return {
    ingresosARS,
    gastosARS,
    ahorroDelMes: ingresosARS - gastosARS,
  };
};

export const sumAhorrosBeforePeriod = (ahorros = [], period) => {
  const normalizedPeriod = normalizePeriod(period);

  if (!normalizedPeriod) {
    return 0;
  }

  return ahorros.reduce((sum, ahorro) => {
    const ahorroPeriod = normalizePeriod(
      ahorro?.periodo ?? ahorro?.period ?? ahorro?.mes ?? ahorro?.fecha ?? ahorro?.fecha_periodo,
    );

    if (!ahorroPeriod || ahorroPeriod >= normalizedPeriod) {
      return sum;
    }

    const amount = getNumericValue(
      ahorro?.monto ?? ahorro?.monto_ars ?? ahorro?.total ?? ahorro?.valor ?? ahorro?.cantidad,
    );

    return amount !== null ? sum + amount : sum;
  }, 0);
};

export const collectPeriodsFromRecords = ({ ingresos = [], gastos = [], ahorros = [] } = {}) => {
  const periods = new Set();

  ingresos.forEach((ingreso) => {
    const period = normalizePeriod(ingreso?.fecha ?? ingreso?.periodo ?? ingreso?.mes);

    if (period) {
      periods.add(period);
    }
  });

  gastos.forEach((gasto) => {
    const period = normalizePeriod(gasto?.fecha ?? gasto?.periodo ?? gasto?.mes);

    if (period) {
      periods.add(period);
    }
  });

  ahorros.forEach((ahorro) => {
    const period = normalizePeriod(
      ahorro?.periodo ?? ahorro?.period ?? ahorro?.mes ?? ahorro?.fecha ?? ahorro?.fecha_periodo,
    );

    if (period) {
      periods.add(period);
    }
  });

  return Array.from(periods);
};

export const formatPeriodLabel = (period) => {
  const normalized = normalizePeriod(period);

  if (!normalized) {
    return 'Periodo desconocido';
  }

  const [year, monthString] = normalized.split('-');
  const monthIndex = Number.parseInt(monthString, 10) - 1;

  if (Number.isNaN(monthIndex) || monthIndex < 0 || monthIndex >= MONTH_NAMES.length) {
    return normalized;
  }

  return `${MONTH_NAMES[monthIndex]} ${year}`;
};

export const getCurrentPeriod = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

export const sortPeriodsDesc = (periods = []) =>
  [...periods]
    .map((period) => normalizePeriod(period))
    .filter(Boolean)
    .sort((a, b) => b.localeCompare(a));

export { MONTH_NAMES };

// ... (código existente omitido)

// === NUEVAS FUNCIONES PARA COPIAR MES ANTERIOR ===

/**
 * Calcula el periodo (YYYY-MM) anterior al periodo dado (YYYY-MM).
 * @param {string} period - Periodo actual en formato 'YYYY-MM'.
 * @returns {string | null} Periodo anterior en formato 'YYYY-MM'.
 */
export const getPreviousPeriod = (period) => {
  const normalized = normalizePeriod(period);
  if (!normalized) return null;

  const [yearString, monthString] = normalized.split('-');
  const year = Number.parseInt(yearString, 10);
  const month = Number.parseInt(monthString, 10);

  let prevYear = year;
  let prevMonth = month - 1;

  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear -= 1;
  }

  // Retorna en formato YYYY-MM
  return `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
};

/**
 * Ajusta una fecha dada sumando o restando una cantidad de meses (+1 mes para la copia).
 * @param {string} dateString - Fecha en formato 'yyyy-mm-dd'.
 * @param {number} monthsToAdjust - Número de meses a sumar (positivo) o restar (negativo).
 * @returns {string | null} Nueva fecha en formato 'yyyy-mm-dd'.
 */
export const adjustDateForCopy = (dateString, monthsToAdjust) => {
  if (!dateString) return null;

  // Creamos Date object usando 'T00:00:00' para evitar problemas de zona horaria
  const date = new Date(dateString + 'T00:00:00'); 
  
  // Guardamos el día original
  const originalDay = date.getDate();
  
  // Ajustamos el mes
  date.setMonth(date.getMonth() + monthsToAdjust);
  
  // Si el día cambió (ej: 31 Ene -> 3 Mar), lo forzamos al día original si es posible
  if (date.getDate() !== originalDay) {
    // Intentamos establecer el día original. Si es inválido (ej. Feb 30), JS ajusta
    date.setDate(originalDay);
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};