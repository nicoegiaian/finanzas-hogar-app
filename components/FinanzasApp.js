'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Menu, X, Home, TrendingUp, DollarSign, PieChart, Users, Settings } from 'lucide-react';

import Ingresos from './ingresos/Ingresos';
import Gastos from './gastos/Gastos';
import Dashboard from './dashboard/Dashboard';
import Inversiones from './inversiones/Inversiones';
// TAREA 1.2: Cambiar fetchAhorros por fetchActivos
import { fetchIngresos, fetchGastos, fetchActivos } from '../lib/supabaseClient';
// TAREA 2.1: Importar servicio de cotizaciones
import { fetchStockPrice, getUSDExchangeRate } from '../lib/externalDataService';
import {
  calculateMonthlyTotals,
  // TAREA 1.2: sumAhorrosBeforePeriod ya no se usa aquí.
  collectPeriodsFromRecords,
  sortPeriodsDesc,
  getCurrentPeriod,
  normalizePeriod,
} from '../lib/financeUtils';

// === FUNCIÓN DE CÁLCULO DE PATRIMONIO NETO (TAREA 2.2) ===
const calculateNetWorth = async (activos) => {
    // 1. OBTENER TASA DE CAMBIO
    const rateUSD_ARS = await getUSDExchangeRate(); // <--- DEBE USAR 'await'
    const rateARS_USD = 1 / rateUSD_ARS;
    
    let totalNetWorthARS = 0;
    const pricingCache = {}; 
    const detailedActivos = []; // Array para devolver los activos con su valorización

    const getPrice = async (ticker) => {
        if (!pricingCache[ticker]) {
            pricingCache[ticker] = await fetchStockPrice(ticker); 
        }
        return pricingCache[ticker];
    };

    for (const activo of activos) {
        const quantity = Number(activo.cantidad) || 0;
        if (quantity <= 0) continue;

        let valorARS = 0;
        let valorUSD = 0;
        const ticker = activo.ticker || activo.moneda;
        const assetMoneda = activo.moneda.toUpperCase();

        if (assetMoneda === 'ARS') {
            valorARS = quantity;
            valorUSD = quantity * rateARS_USD;

        } else if (assetMoneda === 'USD') {
            valorUSD = quantity;
            valorARS = quantity * rateUSD_ARS;
            
        } else if (ticker) { // Activos que cotizan (Acciones, Cedears, etc.)
            
            const pricePerUnit = await getPrice(ticker);
            const isPricedInUSD = ['BTC', 'ETH', 'TSLA', 'AAPL'].includes(ticker.toUpperCase()) || activo.tipo_activo?.includes('CEDEAR') || activo.tipo_activo?.includes('Crypto');

            if (isPricedInUSD) {
                // Activos valorados en USD (Cripto, CEDEARs)
                valorUSD = quantity * pricePerUnit;
                valorARS = valorUSD * rateUSD_ARS;
            } else {
                // Activos valorados en ARS (Acciones Locales)
                valorARS = quantity * pricePerUnit;
                valorUSD = valorARS * rateARS_USD;
            }
        }
        
        // Suma el valor en ARS al Patrimonio Neto total
        totalNetWorthARS += valorARS;
        
        // Adjunta los valores calculados al activo para mostrar en la tabla
        detailedActivos.push({
            ...activo,
            valor_ars: valorARS,
            valor_usd: valorUSD,
        });
    }
    
    // Retorna el Patrimonio Neto total y la lista detallada de activos
    return { 
        totalNetWorth: totalNetWorthARS, 
        detailedActivos: detailedActivos 
    };
};
// ==========================================================


export default function FinanzasApp() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');
  const currentPeriod = getCurrentPeriod();
  const [selectedMonth, setSelectedMonth] = useState(currentPeriod);
  const [ingresos, setIngresos] = useState([]);
  const [gastos, setGastos] = useState([]);
  
  // TAREA 1.2/2.2: Nuevos estados para Activos y Patrimonio Neto
  // Se elimina [ahorros, setAhorros] de la línea 27 original
  const [activos, setActivos] = useState([]);
  const [patrimonioNeto, setPatrimonioNeto] = useState(0);

  const [financeLoading, setFinanceLoading] = useState(false);
  const [financeError, setFinanceError] = useState(null);
  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 1024 : false;
  
  // Tarea 2.2: Cálculos base del mes
  const { ingresosARS, gastosARS, ahorroDelMes } = useMemo(
    () => calculateMonthlyTotals(ingresos, gastos, selectedMonth),
    [ingresos, gastos, selectedMonth],
  );
  
  // TAREA 2.2: Lógica de Patrimonio Neto (Net Worth)
  const runNetWorthCalculation = useCallback(async () => {
    if (activos.length > 0) {
      try {
        const result = await calculateNetWorth(activos); // <- AQUI SE CAMBIA
        setPatrimonioNeto(result.totalNetWorth);
        setActivos(result.detailedActivos);
      } catch (error) {
        console.error("Error al calcular el Patrimonio Neto:", error);
        setPatrimonioNeto(0); 
      }
    } else {
        setPatrimonioNeto(0);
    }
  }, [activos]);

  useEffect(() => {
      runNetWorthCalculation();
  }, [runNetWorthCalculation]);

  // TAREA 1.2: Carga de datos
  const loadFinanceData = useCallback(async () => {
    setFinanceLoading(true);
    setFinanceError(null);

    try {
      const [ingresosResponse, gastosResponse, activosResponse] = await Promise.all([
        fetchIngresos(),
        fetchGastos(),
        fetchActivos(), // TAREA 1.2
      ]);

      setIngresos(Array.isArray(ingresosResponse) ? ingresosResponse : []);
      setGastos(Array.isArray(gastosResponse) ? gastosResponse : []);
      setActivos(Array.isArray(activosResponse) ? activosResponse : []);
      
    } catch (error) {
      console.error('Error al obtener los datos financieros', error);
      setFinanceError(error?.message ?? 'No pudimos cargar los datos financieros.');
      setIngresos([]);
      setGastos([]);
      setActivos([]);
    } finally {
      setFinanceLoading(false);
    }
  }, []);

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
    // TAREA 2.2: Lógica de presentación de Patrimonio en Dashboard
    const ahorroHistoricoContable = patrimonioNeto - ahorroDelMes; 
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
          ahorroHistorico={ahorroHistoricoContable} 
          ahorroActual={patrimonioNeto} // Usa Patrimonio Neto
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
        // TAREA 1.3: Pasamos todas las dependencias necesarias al ABM de Activos
        <Inversiones 
          {...commonProps} 
          onDataChanged={refreshFinanceData} 
          activos={activos} // Tarea 1.3: Lista de Activos
          patrimonioNeto={patrimonioNeto} // Tarea 2.2: Valor calculado
          formatMoney={formatMoney} // CORRECCIÓN CLAVE: Pasa la función de formato
        />
      ),
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