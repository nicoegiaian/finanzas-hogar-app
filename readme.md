# Finanzas del Hogar 🏠💰

Una aplicación web moderna para gestionar las finanzas familiares de manera inteligente.

## 🚀 Características

- **Dashboard Financiero**: Resumen visual de ingresos, gastos y metas de ahorro
- **Gestión Multi-usuario**: Permite que varios miembros de la familia registren movimientos
- **Seguimiento de Inversiones**: Cotizaciones en tiempo real y simulador de inversiones
- **Alertas Inteligentes**: Notificaciones cuando las metas de ahorro están en riesgo
- **Análisis Histórico**: Gráficos y tendencias de comportamiento financiero

## 🛠️ Tecnologías

- **Frontend**: Next.js 14, React 18, Tailwind CSS
- **Iconos**: Lucide React
- **Deploy**: Vercel con CI/CD automático
- **Responsive**: Optimizado para móvil y desktop

## 🔧 Instalación Local

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/finanzas-hogar-app.git
cd finanzas-hogar-app

# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## 📦 Scripts Disponibles

- `npm run dev` - Servidor de desarrollo
- `npm run build` - Build de producción
- `npm run start` - Servidor de producción
- `npm run lint` - Linter de código

## 🔐 Configuración de Supabase

Para que los ingresos se sincronicen con Supabase necesitás configurar las siguientes variables de entorno (por ejemplo en un archivo `.env.local`):

```bash
NEXT_PUBLIC_SUPABASE_URL="https://<tu-proyecto>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<tu_anon_key>"
```

También asegurate de crear en Supabase una tabla llamada `ingresos` con las columnas:

| Columna          | Tipo sugerido | Descripción                          |
| ---------------- | ------------- | ------------------------------------ |
| `id`             | uuid (PK)     | Identificador único generado por DB |
| `fecha`          | date          | Fecha del movimiento                 |
| `concepto`       | text          | Descripción del ingreso              |
| `usuario`        | text          | Miembro de la familia                |
| `tipo_movimiento` | text          | Categoría o tipo de ingreso          |
| `tipo_de_cambio`  | text          | Referencia del tipo de cambio        |
| `monto_ars`      | numeric       | Importe en pesos argentinos          |
| `monto_usd`      | numeric       | Importe en dólares (opcional)        |

Para la sección de gastos, creá una tabla `gastos` con la misma estructura de columnas (incluyendo `tipo_movimiento`, `tipo_de_cambio`, `monto_ars` y `monto_usd`) para que la aplicación pueda listar y registrar egresos.

La aplicación utiliza el API REST de Supabase, por lo que los permisos de la política de seguridad (RLS) deben permitir leer e insertar registros con la clave anónima.

## 🚀 Deploy en Vercel

Este proyecto está configurado para deploy automático en Vercel:

1. Conecta tu repositorio de GitHub con Vercel
2. Cada push a `main` dispara un deploy automático
3. Los pull requests generan previews