'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Menu, X, Home, TrendingUp, DollarSign, PieChart, Users, Settings } from 'lucide-react';

import Ingresos from './ingresos/Ingresos';
import Gastos from './gastos/Gastos';
import Dashboard from './dashboard/Dashboard';
import Inversiones from './inversiones/Inversiones';
import { fetchIngresos, fetchGastos, fetchActivos } from '../lib/supabaseClient';
import { fetchStockPrice, getUSDExchangeRate } from '../lib/externalDataService';
import {
  calculateMonthlyTotals,
  collectPeriodsFromRecords,
  sortPeriodsDesc,
  getCurrentPeriod,
  normalizePeriod,
} from '../lib/financeUtils';

// === FUNCIÓN DE CÁLCULO DE PATRIMONIO NETO === (Se mantiene, sin cambios)
const calculateNetWorth = async (activos) => {
    const rateUSD_ARS = await getUSDExchangeRate();
    const rateARS_USD = 1 / rateUSD_ARS; 
    
    let totalNetWorthARS = 0;
    const pricingCache = {}; 
    const detailedActivos = []; 
    const netWorthsByUsuario = { Total: 0, Yo: 0, Ella: 0, Común: 0 };

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
            
        } else if (ticker) { 
            
            const pricePerUnit = await getPrice(ticker);
            const isPricedInUSD = ['BTC', 'ETH', 'TSLA', 'AAPL'].includes(ticker.toUpperCase()) || activo.tipo_activo?.includes('CEDEAR') || activo.tipo_activo?.includes('Crypto');

            if (isPricedInUSD) {
                valorUSD = quantity * pricePerUnit;
                valorARS = valorUSD * rateUSD_ARS;
            } else {
                valorARS = quantity * pricePerUnit;
                valorUSD = valorARS * rateARS_USD;
            }
        }
        
        const usuarioKey = activo.usuario in netWorthsByUsuario ? activo.usuario : 'Común';
        netWorthsByUsuario[usuarioKey] = (netWorthsByUsuario[usuarioKey] || 0) + valorARS;
        netWorthsByUsuario.Total += valorARS;

        totalNetWorthARS += valorARS;
        
        detailedActivos.push({
            ...activo,
            valor_ars: valorARS,
            valor_usd: valorUSD,
        });
    }
    
    return { 
        totalNetWorth: totalNetWorthARS, 
        detailedActivos: detailedActivos,
        netWorthsByUsuario: netWorthsByUsuario
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
  
  // CORRECCIÓN CLAVE: Dos estados para romper el bucle.
  const [rawActivos, setRawActivos] = useState([]); // Datos brutos, sin valorar
  const [valuedActivos, setValuedActivos] = useState([]); // Datos valorados (para la UI)
  
  const [patrimonioNeto, setPatrimonioNeto] = useState(0);
  const [patrimonioNetoFiltrado, setPatrimonioNetoFiltrado] = useState(null);

  const [financeLoading, setFinanceLoading] = useState(false);
  const [financeError, setFinanceError] = useState(null);
  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 1024 : false;
  
  const [userOptions, setUserOptions] = useState(['Yo', 'Ella', 'Común']);

  const { ingresosARS, gastosARS, ahorroDelMes } = useMemo(
    () => calculateMonthlyTotals(ingresos, gastos, selectedMonth),
    [ingresos, gastos, selectedMonth],
  );
  
  // CORRECCIÓN CLAVE: runNetWorthCalculation ahora depende solo de rawActivos
  const runNetWorthCalculation = useCallback(async () => {
    if (rawActivos.length > 0) {
      try {
        const result = await calculateNetWorth(rawActivos); 
        setPatrimonioNeto(result.totalNetWorth);
        setValuedActivos(result.detailedActivos); // Actualiza la lista VALORADA (UI)
        setPatrimonioNetoFiltrado(result.netWorthsByUsuario);
      } catch (error) {
        console.error("Error al calcular el Patrimonio Neto:", error);
        setPatrimonioNeto(0); 
        setPatrimonioNetoFiltrado(null);
        setValuedActivos([]);
      }
    } else {
        setPatrimonioNeto(0);
        setPatrimonioNetoFiltrado(null);
        setValuedActivos([]);
    }
  }, [rawActivos]); // La dependencia es rawActivos

  // El cálculo se dispara cuando rawActivos cambia
  useEffect(() => {
      runNetWorthCalculation();
  }, [runNetWorthCalculation]);
  
  const extractUniqueUsers = useCallback((ingresos, gastos, activos) => {
    const userSet = new Set(['Yo', 'Ella', 'Común']); 

    const combineUsers = (list) => {
        list.forEach(item => {
            if (item.usuario && typeof item.usuario === 'string') {
                userSet.add(item.usuario.trim());
            }
        });
    };
    
    combineUsers(ingresos);
    combineUsers(gastos);
    combineUsers(activos);

    return Array.from(userSet).filter(u => u).sort();
  }, []);


  const loadFinanceData = useCallback(async () => {
    setFinanceLoading(true);
    setFinanceError(null);

    try {
      const [ingresosResponse, gastosResponse, activosResponse] = await Promise.all([
        fetchIngresos(),
        fetchGastos(),
        fetchActivos(),
      ]);

      const fetchedIngresos = Array.isArray(ingresosResponse) ? ingresosResponse : [];
      const fetchedGastos = Array.isArray(gastosResponse) ? gastosResponse : [];
      const fetchedActivos = Array.isArray(activosResponse) ? activosResponse : [];

      setIngresos(fetchedIngresos);
      setGastos(fetchedGastos);
      setRawActivos(fetchedActivos); // Almacena en RAW para evitar el bucle inicial
      
      const uniqueUsers = extractUniqueUsers(fetchedIngresos, fetchedGastos, fetchedActivos);
      setUserOptions(uniqueUsers);
      
    } catch (error) {
      console.error('Error al obtener los datos financieros', error);
      setFinanceError(error?.message ?? 'No pudimos cargar los datos financieros.');
      setIngresos([]);
      setGastos([]);
      setRawActivos([]); // Almacena en RAW al fallar
    } finally {
      setFinanceLoading(false);
    }
  }, [extractUniqueUsers]);

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
    userOptions, 
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
          ahorroActual={patrimonioNeto} 
          ahorroObjetivo={ahorroObjetivo}
          metaAhorro={metaAhorro}
          isLoading={financeLoading}
          error={financeError}
          formatMoney={formatMoney}
          onRefresh={refreshFinanceData}
          gastos={gastos}
          patrimonioFiltrado={patrimonioNetoFiltrado}
        />
      ),
      ingresos: <Ingresos {...commonProps} onDataChanged={refreshFinanceData} />,
      gastos: <Gastos {...commonProps} onDataChanged={refreshFinanceData} />,
      inversiones: (
        <Inversiones 
          {...commonProps} 
          onDataChanged={refreshFinanceData} 
          activos={valuedActivos} // CORRECCIÓN CLAVE: Usa la lista VALORADA para el componente
          patrimonioNeto={patrimonioNeto} 
          formatMoney={formatMoney} 
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
  
  // ... (código de UI y navegación)
}