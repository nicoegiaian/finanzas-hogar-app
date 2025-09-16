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
      { id: 1, fecha: '2024-03-01', concepto: 'Sueldo Juan', categoria: 'Salario', monto: 850000, usuario: 'Juan' },
      { id: 2, fecha: '2024-03-01', concepto: 'Sueldo María', categoria: 'Salario', monto: 720000, usuario: 'María' },
      { id: 3, fecha: '2024-03-15', concepto: 'Freelance', categoria: 'Extra', monto: 150000, usuario: 'Juan' }
    ],
    gastos: [
      { id: 1, fecha: '2024-03-05', concepto: 'Supermercado', categoria: 'Alimentación', monto: 85000, usuario: 'María' },
      { id: 2, fecha: '2024-03-10', concepto: 'Nafta', categoria: 'Transporte', monto: 45000, usuario: 'Juan' },
      { id: 3, fecha: '2024-03-12', concepto: 'Internet', categoria: 'Servicios', monto: 25000, usuario: 'María' },
      { id: 4, fecha: '2024-03-15', concepto: 'Ropa', categoria: 'Vestimenta', monto: 120000, usuario: 'María' }
    ],
    inversiones: [
      { simbolo: 'GGAL', nombre: 'Grupo Galicia', precio: 287.50, cambio: 2.15, cambioPorc: 0.75 },
      { simbolo: 'YPF', nombre: 'YPF S.A.', precio: 1456.00, cambio: -23.50, cambioPorc: -1.59 },
      { simbolo: 'ALUA', nombre: 'Aluar', precio: 89.25, cambio: 1.25, cambioPorc: 1.42 },
      { simbolo: 'BTC', nombre: 'Bitcoin USD', precio: 67850.00, cambio: 1250.00, cambioPorc: 1.88 }
    ]
  };

  const menuItems = [
    { id: 'dashboard', icon: Home, label: 'Dashboard' },
    { id: 'ingresos', icon: TrendingUp, label: 'Ingresos' },
    { id: 'gastos', icon: DollarSign, label: 'Gastos' },
    { id: 'inversiones', icon: PieChart, label: 'Inversiones' },
    { id: 'usuarios', icon: Users, label: 'Familia' },
    { id: 'configuracion', icon: Settings, label: 'Configuración' }
  ];

  const totalIngresos = mockData.ingresos.reduce((sum, item) => sum + item.monto, 0);
  const totalGastos = mockData.gastos.reduce((sum, item) => sum + item.monto, 0);
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
      ingresos: <Ingresos ingresos={mockData.ingresos} formatMoney={formatMoney} />,
      gastos: <Gastos gastos={mockData.gastos} formatMoney={formatMoney} />,
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
