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

Para asegurar un historial de proyecto limpio, legible y profesional, el equipo se adhiere a un flujo de trabajo estructurado basado en **Git Flow** y **Conventional Commits**.

#### Estrategia de Ramas (Branching)
Está estrictamente prohibido trabajar o hacer push directamente a las ramas de integración principal (`main` o `develop`). Toda modificación debe nacer en una rama de vida corta, con la siguiente nomenclatura:

- **`main`**: Código en producción, estable y completamente funcional.
- **`develop`**: Rama principal de desarrollo, donde se integra el trabajo diario.
- **`feature/nombre-tarea`**: Para desarrollo de nuevas características o funcionalidades.
- **`fix/nombre-arreglo`**: Para solucionar errores de lógica o *bugs* durante el desarrollo.
- **`refactor/nombre-mejora`**: Para reestructurar código existente sin cambiar su comportamiento externo.
- **`style/nombre-ajuste`**: Para cambios puramente estéticos o de interfaz.

#### Commits Atómicos y Semánticos
Cada commit debe representar una **única** unidad lógica de cambio (commit atómico) y no mezclar múltiples tareas. Se deben utilizar los siguientes prefijos estandarizados:

* `feat:` Añade una nueva funcionalidad.
* `fix:` Corrige un error.
* `docs:` Cambios exclusivos en documentación o `README.md`.
* `style:` Cambios de exclusivamente estilos, sin efectos en logica.
* `refactor:` Mejoras de código (ej. cambiar *strings* por *enums*, extracción de componentes).

#### Flujo de Integración y Pull Requests (PR)
Para mantener la calidad del código, el equipo sigue reglas estrictas de revisión:
1. **PR Obligatorios:** Todo código nuevo debe integrarse mediante un Pull Request hacia la rama `develop`.
2. **Revisión de Pares (Code Review):** Ningún desarrollador está autorizado a aprobar o fusionar (*merge*) su propio código. 
3. **Aprobación:** Todo PR requiere obligatoriamente la revisión y aprobación formal de al menos **uno o dos compañeros de equipo** antes de ser integrado al repositorio principal.
## Design System

El sistema utiliza un sistema de diseño estructurado para garantizar consistencia visual a través de la aplicación.

### Fundamentos Visuales
* **Paleta de Colores Primaria:**
  * **Color Primario:** Gris claro. Utilizado en los fondos, donde se usa para cubrir los espacios vaciós de la interfaz.
  * **Colores Secundarios:** 
