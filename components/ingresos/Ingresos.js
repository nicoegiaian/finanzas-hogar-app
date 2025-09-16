import React from 'react';
import { Plus } from 'lucide-react';

const Ingresos = ({ ingresos, formatMoney }) => (
  <div className="space-y-6">
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Ingresos</h1>
      <button
        onClick={() => alert('Funcionalidad de agregar ingreso - En desarrollo')}
        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
      >
        <Plus className="h-4 w-4 mr-2" />
        Agregar Ingreso
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
            {ingresos.map((ingreso) => (
              <tr key={ingreso.id} className="hover:bg-gray-50">
                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ingreso.fecha}</td>
                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ingreso.concepto}</td>
                <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                    {ingreso.categoria}
                  </span>
                </td>
                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ingreso.usuario}</td>
                <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">{formatMoney(ingreso.monto)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

export default Ingresos;
