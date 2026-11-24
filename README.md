# RentCar Fleet — demo funcional

Prototipo independiente para validar la experiencia de una plataforma de gestión de flota. En esta etapa todos los vehículos, ubicaciones, métricas, alertas y costos son **datos ficticios de demostración**. No existe conexión con bases de datos, Flespi ni Traccar.

## Ejecutar

```bash
npm install
npm run dev
```

Abrir la URL indicada por Vite. Para validar producción:

```bash
npm run build
npm run preview
```

## Incluido en el demo

- Dashboard operativo responsive.
- Mapa Leaflet con teselas de OpenStreetMap y posiciones ficticias.
- Flota con búsqueda, filtros y detalle navegable.
- Centro de alertas con cambio local de estado.
- Mantenimiento, órdenes de trabajo y reportes.
- Configuración visual de proveedores Flespi y Traccar.
- Módulos de fase 2 visibles como próximos: clientes, reservas, contratos y facturación.

## Preparación para integraciones futuras

La interfaz separa visualmente el origen de datos y evita presentar valores demo como mediciones reales. `.env.example` contiene únicamente nombres de variables, sin secretos. En la fase backend se implementarán adaptadores `TelemetryProvider`, persistencia multi-organización, autenticación, worker idempotente, migraciones, auditoría y pruebas de aislamiento.

Los tokens de proveedor nunca deben usar variables `VITE_*`, porque esas variables se empaquetan para el navegador. `FLESPI_TOKEN` y credenciales Traccar pertenecen exclusivamente al backend.

## Fuentes de datos en esta fase

| Elemento | Origen actual | Origen futuro |
|---|---|---|
| Posición, velocidad, encendido | DEMO ficticio | Proveedor de telemetría |
| Odómetro y combustible | DEMO ficticio | MEASURED si el dispositivo lo entrega |
| Kilómetros y utilización | DEMO ficticio | CALCULATED y versionado |
| Costos | DEMO ficticio | Registros manuales / sistema transaccional |
| Alertas | DEMO ficticio | Reglas evaluadas por el worker |

Este proyecto no lee ni modifica `Producto_Data`.
