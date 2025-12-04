'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Menu, X, Home, TrendingUp, DollarSign, PieChart, Users, Settings } from 'lucide-react';

import Ingresos from './ingresos/Ingresos';
import Gastos from './gastos/Gastos';
import Dashboard from './dashboard/Dashboard';
import Inversiones from './inversiones/Inversiones'; // Se mantiene tu componente
// ACTUALIZACIÓN: Cambiar fetchAhorros por fetchActivos
import { fetchIngresos, fetchGastos, fetchActivos } from '../lib/supabaseClient';
// NUEVO: Importar servicio de cotizaciones
import { fetchStockPrice, getUSDExchangeRate } from '../lib/externalDataService';
import {
  calculateMonthlyTotals,
  // REMOVIDO: sumAhorrosBeforePeriod
  collectPeriodsFromRecords,
  sortPeriodsDesc,
  getCurrentPeriod,
  normalizePeriod,
} from '../lib/financeUtils';

// === FUNCIÓN DE CÁLCULO DE PATRIMONIO NETO ===
const calculateNetWorth = async (activos) => {
    // 1. Obtener tasa de conversión (Asumimos Dólar MEP/Blue)
    const rate = getUSDExchangeRate();
    let totalNetWorth = 0;
    const pricingCache = {}; // Cache para evitar llamadas duplicadas a la API

    // Helper para obtener el precio con cache
    const getPrice = async (ticker) => {
        if (!pricingCache[ticker]) {
            pricingCache[ticker] = await fetchStockPrice(ticker); 
        }
        return pricingCache[ticker];
    };

    for (const activo of activos) {
        const quantity = Number(activo.cantidad) || 0;
        if (quantity <= 0) continue;

        let valueInARS = 0;
        const ticker = activo.ticker || activo.moneda; // Usar ticker si existe, sino la moneda

        switch (activo.moneda) {
            case 'ARS':
                valueInARS = quantity;
                break;
            case 'USD':
                valueInARS = quantity * rate;
                break;
            default: // Moneda es un Ticker
                if (ticker) {
                    const price = await getPrice(ticker); 
                    
                    // Lógica de conversión basada en tipo de activo
                    if (activo.moneda === 'BTC' || activo.tipo_activo?.includes('CEDEAR')) {
                        // Cripto y CEDEARs se valoran en USD y se convierten a ARS
                        valueInARS = quantity * price * rate;
                    } else {
                        // Acciones locales (ej. GGAL), se asume precio de API en ARS
                        valueInARS = quantity * price;
                    }
                } else {
                    // Fallback para activos sin ticker/moneda clara
                    valueInARS = 0;
                }
                break;
        }

        totalNetWorth += valueInARS;
    }
    
    return totalNetWorth;
};
// ==========================================================


export default function FinanzasApp() {
  const [sidebarOpen, setSidebarOpen] = useState(false); // Empezar cerrado en mobile
  const [activeSection, setActiveSection] = useState('dashboard');
  const currentPeriod = getCurrentPeriod();
  const [selectedMonth, setSelectedMonth] = useState(currentPeriod);
  const [ingresos, setIngresos] = useState([]);
  const [gastos, setGastos] = useState([]);
  
  // CAMBIO: Eliminar [ahorros, setAhorros]
  // NUEVOS ESTADOS:
  const [activos, setActivos] = useState([]);
  const [patrimonioNeto, setPatrimonioNeto] = useState(0);

  const [financeLoading, setFinanceLoading] = useState(false);
  const [financeError, setFinanceError] = useState(null);
  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 1024 : false;
  
  // REMOVIDO: inversionesData (los datos reales vendrán de la tabla 'activos')

  // CÁLCULOS PRINCIPALES DEL MES
  const { ingresosARS, gastosARS, ahorroDelMes } = useMemo(
    () => calculateMonthlyTotals(ingresos, gastos, selectedMonth),
    [ingresos, gastos, selectedMonth],
  );
  
  // === CÁLCULO ASÍNCRONO DEL PATRIMONIO NETO ===
  const runNetWorthCalculation = useCallback(async () => {
    // Solo calcular si hay activos cargados
    if (activos.length > 0) {
      try {
        const netWorth = await calculateNetWorth(activos);
        setPatrimonioNeto(netWorth);
      } catch (error) {
        console.error("Error al calcular el Patrimonio Neto:", error);
        // Si hay un error en la API, mostramos 0 para no bloquear la app
        setPatrimonioNeto(0); 
      }
    } else {
        setPatrimonioNeto(0);
    }
  }, [activos]);

  // Ejecutar el cálculo del Patrimonio Neto cada vez que los activos cambian
  useEffect(() => {
      runNetWorthCalculation();
  }, [runNetWorthCalculation]);

  const loadFinanceData = useCallback(async () => {
    setFinanceLoading(true);
    setFinanceError(null);

    try {
      // ACTUALIZACIÓN: Llama a fetchActivos en lugar de fetchAhorros
      const [ingresosResponse, gastosResponse, activosResponse] = await Promise.all([
        fetchIngresos(),
        fetchGastos(),
        fetchActivos(),
      ]);

      setIngresos(Array.isArray(ingresosResponse) ? ingresosResponse : []);
      setGastos(Array.isArray(gastosResponse) ? gastosResponse : []);
      // ACTUALIZACIÓN: Almacena el resultado en 'activos'
      setActivos(Array.isArray(activosResponse) ? activosResponse : []);
      
    } catch (error) {
      console.error('Error al obtener los datos financieros', error);
      setFinanceError(error?.message ?? 'No pudimos cargar los datos financieros.');
      setIngresos([]);
      setGastos([]);
      setActivos([]); // Resetea activos
    } finally {
      setFinanceLoading(false);
    }
  }, []); // Dependencias vacías, solo se carga una vez al montar

  useEffect(() => {
    loadFinanceData();
  }, [loadFinanceData]);
  
  const handleMonthChange = useCallback(
    (value) => {
      const normalized = normalizePeriod(value);
      setSelectedMonth(normalized ?? currentPeriod);
    },
    [currentPeriod],
  );

  const monthOptions = useMemo(() => {
    // La lógica de periodos se mantiene usando solo ingresos y gastos (correcto)
    const periodSet = new Set(collectPeriodsFromRecords({ ingresos, gastos }));
    const normalizedCurrent = normalizePeriod(currentPeriod);

    if (normalizedCurrent) {
      periodSet.add(normalizedCurrent);
    }

    const normalizedSelected = normalizePeriod(selectedMonth);

    if (normalizedSelected) {
      periodSet.add(normalizedSelected);
    }

    return sortPeriodsDesc(Array.from(periodSet));
  }, [ingresos, gastos, currentPeriod, selectedMonth]);


  const commonProps = {
    selectedMonth,
    onMonthChange: handleMonthChange,
    monthOptions,
  };

  const refreshFinanceData = useCallback(() => {
    loadFinanceData();
  }, [loadFinanceData]);

  const formatMoney = (amount) => {
    const numericAmount = Number(amount);
    const safeAmount = Number.isFinite(numericAmount) ? numericAmount : 0;

    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(safeAmount);
  };

  const menuItems = [
    { id: 'dashboard', icon: Home, label: 'Dashboard' },
    { id: 'ingresos', icon: TrendingUp, label: 'Ingresos' },
    { id: 'gastos', icon: DollarSign, label: 'Gastos' },
    { id: 'inversiones', icon: PieChart, label: 'Inversiones' },
    { id: 'usuarios', icon: Users, label: 'Familia' },
    { id: 'configuracion', icon: Settings, label: 'Configuración' }
  ];

  const renderContent = () => {
    // NUEVA LÓGICA DE AHORRO/PATRIMONIO:
    // El ahorro histórico ya no se calcula con sumAhorrosBeforePeriod, sino que se infiere
    // del Patrimonio Neto total menos el ahorro del mes actual (es un HACK temporal).
    const ahorroHistoricoContable = patrimonioNeto - ahorroDelMes; 
    
    // Métrica Objetivo (se mantiene basada en ingresos, pero ahora el ahorroActual es el Patrimonio Neto)
    const metaAhorro = 0.2;
    const ahorroObjetivo = ingresosARS * metaAhorro; 

    const sectionComponents = {
      dashboard: (
        <Dashboard
          selectedMonth={selectedMonth}
          setSelectedMonth={handleMonthChange}
          monthOptions={monthOptions}
          totalIngresos={ingresosARS}
          totalGastos={gastosARS}
          ahorroDelMes={ahorroDelMes}
          // ACTUALIZACIÓN: Pasa el Patrimonio Neto como métrica principal (el ahorro acumulado)
          ahorroHistorico={ahorroHistoricoContable} 
          ahorroActual={patrimonioNeto} // El Patrimonio Neto es el nuevo "ahorro"
          ahorroObjetivo={ahorroObjetivo}
          metaAhorro={metaAhorro}
          isLoading={financeLoading}
          error={financeError}
          formatMoney={formatMoney}
          onRefresh={refreshFinanceData}
          gastos={gastos}
        />
      ),
      ingresos: <Ingresos {...commonProps} onDataChanged={refreshFinanceData} />,
      gastos: <Gastos {...commonProps} onDataChanged={refreshFinanceData} />,
      inversiones: (
        // CAMBIO: Se mantiene tu componente, pero le pasamos los activos
        // En la Tarea 1.3 haremos que este componente muestre la lista de activos
        <Inversiones 
          {...commonProps} 
          onDataChanged={refreshFinanceData} 
          // NUEVO PROP: Le pasamos la lista de activos y el Patrimonio Neto total
          activos={activos}
          patrimonioNeto={patrimonioNeto}
        />
      ),
      // MANTENIDOS: Estas secciones se mantienen
      usuarios: (
        <div className="text-center py-12">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Módulo de Usuarios / Familia</p>
            <p className="text-sm text-gray-500 mt-4">Próxima implementación para diferenciar ahorros por miembro.</p>
        </div>
      ),
      configuracion: (
        <div className="text-center py-12">
            <Settings className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Configuración de la Aplicación</p>
            <p className="text-sm text-gray-500 mt-4">Aquí se podrán definir metas, categorías y tipo de cambio por defecto.</p>
        </div>
      ),
    };

    return sectionComponents[activeSection] ?? sectionComponents.dashboard;
  };

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  const Icon = sidebarOpen ? X : Menu;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar Overlay para mobile */}
      {sidebarOpen && isMobile && (
        <div
          className="fixed inset-0 z-20 bg-black opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-30 flex-shrink-0 bg-white shadow-xl transform ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } transition-transform duration-300 ease-in-out ${
          isMobile ? 'w-64' : 'lg:relative lg:translate-x-0 lg:w-20 lg:hover:w-64 group'
        }`}
        onMouseEnter={() => {
          if (!isMobile) setSidebarOpen(true);
        }}
        onMouseLeave={() => {
          if (!isMobile) setSidebarOpen(false);
        }}
      >
        <div className="flex-1 flex flex-col min-h-0">
          {/* Logo y toggle en mobile */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className={`text-xl font-bold text-blue-600 ${sidebarOpen ? '' : 'hidden lg:block'}`}>
              <Home className="h-6 w-6" />
            </div>
            {isMobile && (
              <button
                onClick={handleSidebarToggle}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
          
          {/* Navegación */}
          <nav className="flex-1 px-2 py-4 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveSection(item.id);
                    if (isMobile) {
                      setSidebarOpen(false);
                    }
                  }}
                  className={`w-full flex items-center px-3 py-2 rounded-lg transition-colors ${
                    sidebarOpen || isMobile ? 'justify-start' : 'justify-center'
                  } ${
                    activeSection === item.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {(sidebarOpen || isMobile) && (
                    <span className="ml-3">{item.label}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar para mobile */}
        <div className="lg:hidden bg-white shadow-sm border-b border-gray-200 p-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}