'use client';

import React, { useState } from 'react';
import { Menu, X, Home, TrendingUp, DollarSign, PieChart, Users, Settings, Plus, AlertTriangle, ArrowUp, ArrowDown } from 'lucide-react';

import Ingresos from './ingresos/Ingresos';

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

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Dashboard Financiero</h1>
        <select 
          value={selectedMonth} 
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="bg-white border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="2024-03">Marzo 2024</option>
          <option value="2024-02">Febrero 2024</option>
          <option value="2024-01">Enero 2024</option>
        </select>
      </div>

      {/* Alertas */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2 flex-shrink-0" />
          <p className="text-yellow-700 text-sm sm:text-base">
            Estás {ahorroActual < ahorroObjetivo ? 'por debajo de' : 'cumpliendo'} tu meta de ahorro del 20%
          </p>
        </div>
      </div>

      {/* Cards principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-gray-600 text-sm">Ingresos del mes</p>
              <p className="text-xl sm:text-2xl font-bold text-green-600 truncate">{formatMoney(totalIngresos)}</p>
            </div>
            <ArrowUp className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 flex-shrink-0" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-gray-600 text-sm">Gastos del mes</p>
              <p className="text-xl sm:text-2xl font-bold text-red-600 truncate">{formatMoney(totalGastos)}</p>
            </div>
            <ArrowDown className="h-6 w-6 sm:h-8 sm:w-8 text-red-500 flex-shrink-0" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 border-l-4 border-blue-500 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-gray-600 text-sm">Ahorro actual</p>
              <p className="text-xl sm:text-2xl font-bold text-blue-600 truncate">{formatMoney(ahorroActual)}</p>
              <p className="text-xs sm:text-sm text-gray-500">Meta: {formatMoney(ahorroObjetivo)}</p>
            </div>
            <PieChart className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 flex-shrink-0" />
          </div>
        </div>
      </div>

      {/* Gráfico simulado */}
      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
        <h3 className="text-lg font-semibold mb-4">Evolución Mensual</h3>
        <div className="h-48 sm:h-64 bg-gray-100 rounded flex items-center justify-center">
          <p className="text-gray-500 text-center px-4">[Aquí iría el gráfico de tendencias]</p>
        </div>
      </div>
    </div>
  );

  const renderGastos = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Gastos</h1>
        <button 
          onClick={() => alert('Funcionalidad de agregar gasto - En desarrollo')}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Agregar Gasto
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Concepto</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {mockData.gastos.map((gasto) => (
                <tr key={gasto.id} className="hover:bg-gray-50">
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">{gasto.fecha}</td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">{gasto.concepto}</td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                      {gasto.categoria}
                    </span>
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">{gasto.usuario}</td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">{formatMoney(gasto.monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderInversiones = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Inversiones</h1>
        <button 
          onClick={() => alert('Simulador de inversiones - En desarrollo')}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Simulador
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Cotizaciones en Tiempo Real</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Símbolo</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cambio</th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {mockData.inversiones.map((inversion) => (
                <tr key={inversion.simbolo} className="hover:bg-gray-50">
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{inversion.simbolo}</td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">{inversion.nombre}</td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-semibold">{formatMoney(inversion.precio)}</td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`flex items-center ${inversion.cambio > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {inversion.cambio > 0 ? <ArrowUp className="h-4 w-4 mr-1" /> : <ArrowDown className="h-4 w-4 mr-1" />}
                      {formatMoney(Math.abs(inversion.cambio))} ({inversion.cambioPorc}%)
                    </span>
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm">
                    <button 
                      onClick={() => alert(`Simular ${inversion.simbolo} - En desarrollo`)}
                      className="text-blue-600 hover:text-blue-900 transition-colors"
                    >
                      Simular
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Panel de simulación */}
      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Simulador de Inversión</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Activo</label>
            <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option>Seleccionar activo...</option>
              <option>GGAL - Grupo Galicia</option>
              <option>YPF - YPF S.A.</option>
              <option>ALUA - Aluar</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de compra</label>
            <input 
              type="date" 
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Monto invertido</label>
            <input 
              type="number" 
              placeholder="100000" 
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
            />
          </div>
          <div className="flex items-end">
            <button 
              onClick={() => alert('Simulación de inversión - En desarrollo')}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Simular
            </button>
          </div>
        </div>
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Resultado de la simulación aparecerá aquí...</p>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard': return renderDashboard();
      case 'ingresos': return <Ingresos ingresos={mockData.ingresos} formatMoney={formatMoney} />;
      case 'gastos': return renderGastos();
      case 'inversiones': return renderInversiones();
      case 'usuarios': return (
        <div className="text-center py-12">
          <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Módulo de Familia - En desarrollo</p>
        </div>
      );
      case 'configuracion': return (
        <div className="text-center py-12">
          <Settings className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Configuración - En desarrollo</p>
        </div>
      );
      default: return renderDashboard();
    }
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
