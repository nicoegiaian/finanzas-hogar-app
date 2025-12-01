'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Menu, X, Home, TrendingUp, DollarSign, PieChart, Users, Settings } from 'lucide-react';

import Ingresos from './ingresos/Ingresos';
import Gastos from './gastos/Gastos';
import Dashboard from './dashboard/Dashboard';
import Inversiones from './inversiones/Inversiones';
import { fetchIngresos, fetchGastos, fetchAhorros } from '../lib/supabaseClient';
import {
  calculateMonthlyTotals,
  sumAhorrosBeforePeriod,
  collectPeriodsFromRecords,
  sortPeriodsDesc,
  getCurrentPeriod,
  normalizePeriod,
} from '../lib/financeUtils';

export default function FinanzasApp() {
  const [sidebarOpen, setSidebarOpen] = useState(false); // Empezar cerrado en mobile
  const [activeSection, setActiveSection] = useState('dashboard');
  const currentPeriod = getCurrentPeriod();
  const [selectedMonth, setSelectedMonth] = useState(currentPeriod);
  const [ingresos, setIngresos] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [ahorros, setAhorros] = useState([]);
  const [financeLoading, setFinanceLoading] = useState(false);
  const [financeError, setFinanceError] = useState(null);
  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 1024 : false;

  const commonProps = {
    selectedMonth,
    onMonthChange: handleMonthChange,
    monthOptions,
  };

  const inversionesData = useMemo(
    () => [
      { simbolo: 'GGAL', nombre: 'Grupo Galicia', precio: 287.5, cambio: 2.15, cambioPorc: 0.75 },
      { simbolo: 'YPF', nombre: 'YPF S.A.', precio: 1456.0, cambio: -23.5, cambioPorc: -1.59 },
      { simbolo: 'ALUA', nombre: 'Aluar', precio: 89.25, cambio: 1.25, cambioPorc: 1.42 },
      { simbolo: 'BTC', nombre: 'Bitcoin USD', precio: 67850.0, cambio: 1250.0, cambioPorc: 1.88 },
    ],
    [],
  );

  const loadFinanceData = useCallback(async () => {
    setFinanceLoading(true);
    setFinanceError(null);

    try {
      const [ingresosResponse, gastosResponse, ahorrosResponse] = await Promise.all([
        fetchIngresos(),
        fetchGastos(),
        fetchAhorros(),
      ]);

      setIngresos(Array.isArray(ingresosResponse) ? ingresosResponse : []);
      setGastos(Array.isArray(gastosResponse) ? gastosResponse : []);
      setAhorros(Array.isArray(ahorrosResponse) ? ahorrosResponse : []);
    } catch (error) {
      console.error('Error al obtener los datos financieros', error);
      setFinanceError(error?.message ?? 'No pudimos cargar los datos financieros.');
      setIngresos([]);
      setGastos([]);
      setAhorros([]);
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
    const periodSet = new Set(collectPeriodsFromRecords({ ingresos, gastos, ahorros }));
    const normalizedCurrent = normalizePeriod(currentPeriod);

    if (normalizedCurrent) {
      periodSet.add(normalizedCurrent);
    }

    const normalizedSelected = normalizePeriod(selectedMonth);

    if (normalizedSelected) {
      periodSet.add(normalizedSelected);
    }

    return sortPeriodsDesc(Array.from(periodSet));
  }, [ingresos, gastos, ahorros, currentPeriod, selectedMonth]);

  const { ingresosARS, gastosARS, ahorroDelMes } = useMemo(
    () => calculateMonthlyTotals(ingresos, gastos, selectedMonth),
    [ingresos, gastos, selectedMonth],
  );

  const ahorroHistorico = useMemo(
    () => sumAhorrosBeforePeriod(ahorros, selectedMonth),
    [ahorros, selectedMonth],
  );

  const ahorroActual = ahorroHistorico + ahorroDelMes;
  const metaAhorro = 0.2;
  const ahorroObjetivo = ingresosARS * metaAhorro;

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
    const sectionComponents = {
      dashboard: (
        <Dashboard
          {...commonProps}  
          selectedMonth={selectedMonth}
          setSelectedMonth={handleMonthChange}
          monthOptions={monthOptions}
          totalIngresos={ingresosARS}
          totalGastos={gastosARS}
          ahorroDelMes={ahorroDelMes}
          ahorroHistorico={ahorroHistorico}
          ahorroActual={ahorroActual}
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
      inversiones: <Inversiones inversiones={inversionesData} formatMoney={formatMoney} />,
      usuarios: (
        <div className="text-center py-12">
          <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Módulo de Familia - En desarrollo</p>
        </div>
      ),
      configuracion: (
        <div className="text-center py-12">
          <Settings className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Configuración - En desarrollo</p>
        </div>
      ),
    };

    return sectionComponents[activeSection] ?? sectionComponents.dashboard;
  };

  return (
    <div className="flex h-screen bg-gray-100 relative">
      {/* Overlay para mobile cuando sidebar está abierto */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64 lg:w-16'
        } lg:translate-x-0 bg-white shadow-lg transition-all duration-300 flex flex-col fixed lg:relative h-full z-30 overflow-hidden`}
      >
        {/* Header */}
        <div
          className={`p-4 border-b border-gray-200 flex items-center ${
            sidebarOpen ? 'justify-between' : 'justify-center'
          }`}
        >
          {(sidebarOpen || isMobile) && (
            <h1 className="text-xl font-bold text-gray-800">Finanzas Hogar</h1>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 p-4 space-y-2">
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
                  sidebarOpen ? 'justify-start' : 'justify-center'
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
