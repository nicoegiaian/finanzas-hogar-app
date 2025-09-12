'use client';

import React, { useState } from 'react';
import { Menu, X, Home, TrendingUp, DollarSign, PieChart, Users, Settings, Plus, AlertTriangle, ArrowUp, ArrowDown } from 'lucide-react';

const FinanzasHogarApp = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [selectedMonth, setSelectedMonth] = useState('2024-03');

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
  const metaAhorro = 0.20; // 20%
  const ahorroActual = totalIngresos - totalGastos;
  const ahorroObjetivo = totalIngresos * metaAhorro;

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard Financiero</h1>
        <select 
          value={selectedMonth} 
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="bg-white border border-gray-300 rounded-lg px-4 py-2"
        >
          <option value="2024-03">Marzo 2024</option>
          <option value="2024-02">Febrero 2024</option>
          <option value="2024-01">Enero 2024</option>
        </select>
      </div>

      {/* Alertas */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2" />
          <p className="text-yellow-700">
            Estás {ahorroActual < ahorroObjetivo ? 'por debajo' : 'cumpliendo'} tu meta de ahorro del 20%
          </p>
        </div>
      </div>

      {/* Cards principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600">Ingresos del mes</p>
              <p className="text-2xl font-bold text-green-600">{formatMoney(totalIngresos)}</p>
            </div>
            <ArrowUp className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600">Gastos del mes</p>
              <p className="text-2xl font-bold text-red-600">{formatMoney(totalGastos)}</p>
            </div>
            <ArrowDown className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600">Ahorro actual</p>
              <p className="text-2xl font-bold text-blue-600">{formatMoney(ahorroActual)}</p>
              <p className="text-sm text-gray-500">Meta: {formatMoney(ahorroObjetivo)}</p>
            </div>
            <PieChart className="h-8 w-8 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Gráfico simulado */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Evolución Mensual</h3>
        <div className="h-64 bg-gray-100 rounded flex items-center justify-center">
          <p className="text-gray-500">[Aquí iría el gráfico de tendencias]</p>
        </div>
      </div>
    </div>
  );

  const renderIngresos = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Ingresos</h1>
        <button className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center">
          <Plus className="h-4 w-4 mr-2" />
          Agregar Ingreso
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Concepto</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {mockData.ingresos.map((ingreso) => (
              <tr key={ingreso.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900">{ingreso.fecha}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{ingreso.concepto}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                    {ingreso.categoria}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">{ingreso.usuario}</td>
                <td className="px-6 py-4 text-sm font-semibold text-green-600">{formatMoney(ingreso.monto)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderGastos = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Gastos</h1>
        <button className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center">
          <Plus className="h-4 w-4 mr-2" />
          Agregar Gasto
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Concepto</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {mockData.gastos.map((gasto) => (
              <tr key={gasto.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900">{gasto.fecha}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{gasto.concepto}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                    {gasto.categoria}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">{gasto.usuario}</td>
                <td className="px-6 py-4 text-sm font-semibold text-red-600">{formatMoney(gasto.monto)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderInversiones = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Inversiones</h1>
        <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg">
          Simulador
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Cotizaciones en Tiempo Real</h3>
        </div>
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Símbolo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Precio</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cambio</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {mockData.inversiones.map((inversion) => (
              <tr key={inversion.simbolo} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{inversion.simbolo}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{inversion.nombre}</td>
                <td className="px-6 py-4 text-sm font-semibold">{formatMoney(inversion.precio)}</td>
                <td className="px-6 py-4 text-sm">
                  <span className={`flex items-center ${inversion.cambio > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {inversion.cambio > 0 ? <ArrowUp className="h-4 w-4 mr-1" /> : <ArrowDown className="h-4 w-4 mr-1" />}
                    {formatMoney(Math.abs(inversion.cambio))} ({inversion.cambioPorc}%)
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">
                  <button className="text-blue-600 hover:text-blue-900">Simular</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Panel de simulación */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Simulador de Inversión</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Activo</label>
            <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
              <option>Seleccionar activo...</option>
              <option>GGAL - Grupo Galicia</option>
              <option>YPF - YPF S.A.</option>
              <option>ALUA - Aluar</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de compra</label>
            <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Monto invertido</label>
            <input type="number" placeholder="$100,000" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
          </div>
          <div className="flex items-end">
            <button className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg">
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
      case 'ingresos': return renderIngresos();
      case 'gastos': return renderGastos();
      case 'inversiones': return renderInversiones();
      case 'usuarios': return <div className="text-center py-12"><p className="text-gray-500">Módulo de Familia - En desarrollo</p></div>;
      case 'configuracion': return <div className="text-center py-12"><p className="text-gray-500">Configuración - En desarrollo</p></div>;
      default: return renderDashboard();
    }
  };

  return (
    <div className="flex h-screen bg-gray-100" style={{
      backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23f0f9ff" fill-opacity="0.4"%3E%3Ccircle cx="30" cy="30" r="1"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
    }}>
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-white shadow-lg transition-all duration-300 flex flex-col`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          {sidebarOpen && <h1 className="text-xl font-bold text-gray-800">Finanzas Hogar</h1>}
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
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center px-3 py-2 rounded-lg transition-colors ${
                  activeSection === item.id 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-5 w-5" />
                {sidebarOpen && <span className="ml-3">{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default FinanzasHogarApp;