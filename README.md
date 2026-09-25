# Sistema-de-Biblioteca-y-Cultura-Municipal

## Descripción del Sistema
Este sistema es una aplicación web desarrollada en **Angular** diseñada para optimizar y centralizar la gestión de servicios bibliotecarios, culturales y de espacios comunitarios. Permite a los ciudadanos interactuar de manera fluida con el catálogo de la biblioteca, mientras que los administradores gestionan los recursos operacionales y de control.

### Usuarios del Sistema
El sistema gestiona accesos y capacidades basándose en dos roles de usuario principales:

* **Ciudadano:** Usuario general de la plataforma con permisos para consultar recursos en el catálogo, gestionar su carrito de selección, realizar y cancelar reservas, consultar su historial de préstamos, revisar multas o sanciones activas, inscribirse a talleres o actividades culturales y reservar salas de estudio.
* **Administrador:** Usuario operativo con privilegios avanzados para gestionar el catálogo (altas, bajas, ediciones), registrar préstamos directos, procesar entregas y devoluciones, administrar multas, gestionar la oferta de eventos/talleres y controlar la disponibilidad de salas de estudio y cuentas de usuario.

## Requisitos Previos e Instalación

### Prerrequisitos
Asegúrate de contar con los siguientes componentes instalados en tu sistema:
* **Node.js**: v18.20.0
* **npm**: 10.5.0
* **Angular CLI**: v17.3.17

### Instrucciones de Ejecución Local

1. **Clonar el repositorio:**
   ```bash
   git clone [https://github.com/alex21z1991/Sistema-de-Biblioteca-y-Cultura-Municipal](https://github.com/alex21z1991/Sistema-de-Biblioteca-y-Cultura-Municipal)
   ```

2. **Navega al directorio del proyecto:**
   ```bash
   cd Sistema-de-Biblioteca-y-Cultura-Municipal
   ```
   
3. **Instalar dependencias:**
   ```bash
   npm install
   ```
   
4. **Ejecutar el servidor local con el CLI de Angular:**
   ```bash
   ng serve
   ```

## Estructura del Proyecto

El proyecto sigue una arquitectura modular enfocada en la separación de responsabilidades y escalabilidad:

```text
src/
├── app/
│   ├── components/              # Vistas y componentes UI (catálogo, reservas, home, panel admin)
│   ├── guards/                  # Protección de rutas según sesión y rol
│   ├── interfaces/              # Definiciones de tipos y modelos TypeScript (Actividades, Recursos, Usuarios)
│   ├── services/                # Servicios de uso general (Login, Actividades, Catalogo)
│   │
│   ├── app.component.ts         # Componente raíz
│   ├── app.config.ts            # Configuración global del cliente
│   │── app.config.server.ts     # Configuración de renderizado del lado del servidor
│   └── app.routes.ts            # Configuración principal de rutas
```

## Convenciones de Código

Para mantener la consistencia en el proyecto, el equipo adopta las siguientes convenciones:

### 1. Nomenclaturas definidas
* **Archivos:** kebab-case (minúsculas-y-guiones-por-espacios).
* **Clases y Tipos:** PascalCase (SinEspacios,CadaPrimeraLetraDeLasPalabrasEnMayúscula).
* **Variables, Funciones y Constantes:** camelCase (primeraLetraDeLaPrimeraPalabraMinusculaSiguientesPascalCase).

### 2. Git y Control de Versiones
* **Commits Semánticos:**
  * `feat:` para nuevas características o historias de usuario.
  * `fix:` para corrección de errores o *bugs*.
  * `docs:` para cambios en documentación o README.
  * `style:` para formateo, CSS o ajuste de diseño.
  * `refactor:` para mejoras de código que no cambian funcionalidad.

## Design System

El sistema utiliza un sistema de diseño estructurado para garantizar consistencia visual a través de la aplicación.

### Fundamentos Visuales
* **Paleta de Colores Primaria:**
  * **Color Primario:** Gris claro. Utilizado en los fondos, donde se usa para cubrir los espacios vaciós de la interfaz.
  * **Colores Secundarios:** 
    * **Azul Marino:** Utilizado en las barras de navegación y como resaltado en elementos visuales.
    * **Blanco:** Utilizado en los elementos de la interfaz, como botones, tarjetas de información o campos de texto.
  * **Colores Semánticos (Estado):**
    * **Éxito:** Préstamo devuelto, reserva confirmada, cupo disponible.
    * **Advertencia:** Reserva pendiente, fecha límite próxima de devolución.
    * **Error:** Multa activa, sanción, sin disponibilidad/cupos.
    * **Información:** Estado del usuario, avisos de eventos o salas.
