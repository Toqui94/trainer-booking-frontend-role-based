# Trainer Booking — Frontend por roles

Frontend responsive para el sistema Trainer Booking.

## Flujo principal corregido

La aplicación empieza en `index.html`, que funciona como portal de acceso. El usuario debe seleccionar primero uno de estos roles:

- CLIENTE
- ENTRENADOR
- ADMINISTRADOR

Después ingresa sus credenciales. El frontend valida que el rol seleccionado exista realmente en la respuesta del backend y dirige al usuario al panel correspondiente:

| Rol | Página de destino |
|---|---|
| CLIENTE | `cliente.html` |
| ENTRENADOR | `entrenador.html` |
| ADMINISTRADOR | `administrador.html` |

Seleccionar un rol en la interfaz no concede permisos. El backend sigue siendo la fuente de verdad mediante el JWT y la lista de roles de la cuenta.

## Páginas incluidas

- `index.html`: portal principal, selección de rol, inicio de sesión y registro.
- `cliente.html`: catálogo de entrenadores, servicios, reserva, pago y panel de reservas.
- `entrenador.html`: resumen, agenda, servicios, horarios, certificaciones, ingresos y perfil.
- `administrador.html`: usuarios, entrenadores, reservas, pagos, reportes, especialidades y auditoría.

## Ejecutar en Windows

1. Descomprime el proyecto.
2. Ejecuta `start.bat`.
3. Abre `http://localhost:5173`.

También puedes usar:

```bash
python -m http.server 5173
```

## Backend

La URL predeterminada es:

```text
http://localhost:4000/api/v1
```

Se configura en cada HTML mediante `window.TRAINER_BOOKING_CONFIG`.

## Modo demostración

El portal incluye botones para abrir cada panel sin una base de datos activa. Sirven para revisar la interfaz. En producción deben conservarse deshabilitados o eliminarse.

## Seguridad

La protección visual del frontend evita abrir un panel con un rol distinto al almacenado, pero la seguridad real debe aplicarse también en cada endpoint del backend mediante autorización por rol.
