'use client';

import React, { useState } from 'react';
import { Menu, X, Home, TrendingUp, DollarSign, PieChart, Users, Settings } from 'lucide-react';

import Ingresos from './ingresos/Ingresos';
import Gastos from './gastos/Gastos';
import Dashboard from './dashboard/Dashboard';
import Inversiones from './inversiones/Inversiones';

export default function FinanzasApp() {
  const [sidebarOpen, setSidebarOpen] = useState(false); // Empezar cerrado en mobile
  const [activeSection, setActiveSection] = useState('dashboard');
  const [selectedMonth, setSelectedMonth] = useState('2024-03');
  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 1024 : false;

  // Datos de ejemplo
  const mockData = {
    ingresos: [
      {
        id: 1,
        fecha: '2024-03-01',
        concepto: 'Sueldo Juan',
        usuario: 'Juan',
        tipoMovimiento: 'Salario',
        tipoDeCambio: 'Oficial',
        montoARS: 850000,
        montoUSD: 0,
      },
      {
        id: 2,
        fecha: '2024-03-01',
        concepto: 'Sueldo María',
        usuario: 'María',
        tipoMovimiento: 'Salario',
        tipoDeCambio: 'Oficial',
        montoARS: 720000,
        montoUSD: 0,
      },
      {
        id: 3,
        fecha: '2024-03-15',
        concepto: 'Freelance',
        usuario: 'Juan',
        tipoMovimiento: 'Extra',
        tipoDeCambio: 'MEP',
        montoARS: 150000,
        montoUSD: 500,
      },
    ],
    gastos: [
      {
        id: 1,
        fecha: '2024-03-05',
        concepto: 'Supermercado',
        usuario: 'María',
        tipoMovimiento: 'Alimentación',
        tipoDeCambio: '',
        montoARS: 85000,
        montoUSD: null,
      },
      {
        id: 2,
        fecha: '2024-03-10',
        concepto: 'Nafta',
        usuario: 'Juan',
        tipoMovimiento: 'Transporte',
        tipoDeCambio: '',
        montoARS: 45000,
        montoUSD: null,
      },
      {
        id: 3,
        fecha: '2024-03-12',
        concepto: 'Internet',
        usuario: 'María',
        tipoMovimiento: 'Servicios',
        tipoDeCambio: '',
        montoARS: 25000,
        montoUSD: null,
      },
      {
        id: 4,
        fecha: '2024-03-15',
        concepto: 'Suscripción streaming',
        usuario: 'María',
        tipoMovimiento: 'Entretenimiento',
        tipoDeCambio: '850',
        montoARS: 0,
        montoUSD: 12,
      },
    ],
    inversiones: [
      { simbolo: 'GGAL', nombre: 'Grupo Galicia', precio: 287.50, cambio: 2.15, cambioPorc: 0.75 },
      { simbolo: 'YPF', nombre: 'YPF S.A.', precio: 1456.00, cambio: -23.50, cambioPorc: -1.59 },
      { simbolo: 'ALUA', nombre: 'Aluar', precio: 89.25, cambio: 1.25, cambioPorc: 1.42 },
      { simbolo: 'BTC', nombre: 'Bitcoin USD', precio: 67850.00, cambio: 1250.00, cambioPorc: 1.88 }
    ]
  };

  const getNumericValue = (value) => {
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
        const parsed = Number.parseFloat(withoutThousands);
        return Number.isFinite(parsed) ? parsed : null;
      }

      const parsed = Number.parseFloat(normalized);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  };

  const getExchangeRateValue = (value) => {
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

  const menuItems = [
    { id: 'dashboard', icon: Home, label: 'Dashboard' },
    { id: 'ingresos', icon: TrendingUp, label: 'Ingresos' },
    { id: 'gastos', icon: DollarSign, label: 'Gastos' },
    { id: 'inversiones', icon: PieChart, label: 'Inversiones' },
    { id: 'usuarios', icon: Users, label: 'Familia' },
    { id: 'configuracion', icon: Settings, label: 'Configuración' }
  ];

  const totalIngresos = mockData.ingresos.reduce((sum, item) => sum + (item.montoARS ?? 0), 0);
  const totalGastos = mockData.gastos.reduce((sum, item) => {
    const montoARS = getNumericValue(item.montoARS);
    const montoUSD = getNumericValue(item.montoUSD);

    let subtotal = 0;

    if (montoARS !== null) {
      subtotal += montoARS;
    }

    if (montoUSD !== null) {
      const exchangeRate = getExchangeRateValue(item.tipoDeCambio);

      if (exchangeRate !== null) {
        subtotal += montoUSD * exchangeRate;
      }
    }

    return sum + subtotal;
  }, 0);
  const metaAhorro = 0.20;
  const ahorroActual = totalIngresos - totalGastos;
  const ahorroObjetivo = totalIngresos * metaAhorro;

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-AR', { 
      style: 'currency', 
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0 
    }).format(amount);
  };

  const renderContent = () => {
    const sectionComponents = {
      dashboard: (
        <Dashboard
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          totalIngresos={totalIngresos}
          totalGastos={totalGastos}
          ahorroActual={ahorroActual}
          ahorroObjetivo={ahorroObjetivo}
          formatMoney={formatMoney}
        />
      ),
      ingresos: <Ingresos />,
      gastos: <Gastos />, 
      inversiones: <Inversiones inversiones={mockData.inversiones} formatMoney={formatMoney} />,
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
