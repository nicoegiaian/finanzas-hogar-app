import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

const Inversiones = ({ inversiones, formatMoney }) => (
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
            {inversiones.map((inversion) => (
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

export default Inversiones;
