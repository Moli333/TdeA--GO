# TdeA GO

**Web App responsive para la gestión y coordinación del transporte compartido de la comunidad académica del Tecnológico de Antioquia.**

## Descripción del proyecto

TdeA GO es un proyecto académico desarrollado en el marco de Trabajo de Grados II del programa de Ingeniería de Software del Tecnológico de Antioquia. Su propósito es facilitar la organización y coordinación del transporte compartido entre los integrantes de la comunidad académica, mediante una plataforma web que centraliza la publicación y consulta de rutas, la disponibilidad de cupos y la gestión de solicitudes de viaje.

La propuesta surge como respuesta a las dificultades que se presentan al coordinar desplazamientos compartidos mediante mecanismos informales, como grupos de mensajería, redes sociales y contactos personales, los cuales no siempre permiten consultar de manera organizada la información de los recorridos, los cupos disponibles y las condiciones de cada viaje.

TdeA GO busca proporcionar un espacio digital que facilite la conexión entre conductores y pasajeros de la comunidad académica, promoviendo una alternativa de transporte compartido basada en la organización, la confianza, la accesibilidad y la colaboración.

Es importante precisar que TdeA GO es una iniciativa académica de transporte compartido y no constituye un servicio de transporte institucional ni una empresa de transporte público o privado.

---

## Objetivo general

Desarrollar una aplicación web responsive de transporte estudiantil que ofrezca seguridad, eficiencia y comodidad para la comunidad de la Institución Universitaria Tecnológico de Antioquia.

## Funcionalidades principales

La plataforma contempla los siguientes componentes funcionales:

- **Gestión de usuarios:** registro, inicio de sesión, recuperación de contraseña y administración de perfiles.
- **Gestión de roles:** administración de los perfiles de administrador, conductor y pasajero.
- **Gestión de vehículos:** registro y consulta de la información de los vehículos asociados a los conductores.
- **Publicación de rutas:** registro de recorridos, indicando origen, destino, fecha, hora de salida y disponibilidad de cupos.
- **Búsqueda de rutas:** consulta de recorridos publicados y opciones de transporte disponibles.
- **Gestión de solicitudes:** creación, consulta y administración de solicitudes de cupos.
- **Gestión de pasajeros:** consulta de información relacionada con los pasajeros y las solicitudes asociadas a cada recorrido.
- **Información de tarifas:** presentación de aportes sugeridos y condiciones económicas relacionadas con los viajes compartidos.
- **Geolocalización y mapas:** visualización de ubicaciones y recorridos mediante servicios de mapas.
- **Notificaciones:** información relacionada con las solicitudes y los movimientos de los viajes.
- **Administración del sistema:** herramientas para la gestión y supervisión de la plataforma.

Las funcionalidades se desarrollan progresivamente de acuerdo con los requerimientos y el alcance establecido para el proyecto.

---

## Roles del sistema

La plataforma contempla tres roles principales:

### Administrador

Responsable de gestionar y supervisar los componentes administrativos de la plataforma.

Entre sus responsabilidades se encuentran:

- Gestionar los usuarios registrados.
- Consultar información general del sistema.
- Administrar la información de las rutas.
- Consultar y gestionar las solicitudes de viaje.
- Supervisar la actividad de la plataforma.

### Conductor

Usuario que dispone de un vehículo y ofrece cupos para compartir sus recorridos con otros integrantes de la comunidad académica.

Entre sus funcionalidades se encuentran:

- Registrar la información de su vehículo.
- Publicar nuevas rutas.
- Consultar y administrar sus recorridos.
- Gestionar la disponibilidad de cupos.
- Consultar las solicitudes recibidas.
- Gestionar las solicitudes de los pasajeros.

### Pasajero

Usuario que busca alternativas de transporte compartido para desplazarse hacia o desde la institución.

Entre sus funcionalidades se encuentran:

- Consultar las rutas publicadas.
- Buscar recorridos disponibles.
- Consultar información de los conductores y vehículos.
- Solicitar cupos en las rutas disponibles.
- Consultar el estado de sus solicitudes.
- Gestionar sus solicitudes de viaje.

---

## Tecnologías utilizadas

El desarrollo de TdeA GO utiliza tecnologías orientadas a la construcción de aplicaciones web modernas, organizadas en una arquitectura cliente-servidor.

### Frontend

- **React:** biblioteca de JavaScript para la construcción de interfaces de usuario.
- **Vite:** herramienta de desarrollo y compilación del proyecto.
- **JavaScript:** lenguaje de programación utilizado para implementar la lógica de la interfaz.
- **HTML5:** estructura y organización del contenido.
- **CSS3:** diseño visual y adaptación responsive.
- **React Leaflet:** integración de mapas interactivos en determinados módulos.
- **Mapbox GL JS:** visualización e interacción con mapas.

### Backend

- **Node.js:** entorno de ejecución de JavaScript en el servidor.
- **Express:** framework para la construcción de servicios y API REST.
- **JavaScript:** implementación de la lógica del servidor.

### Base de datos y servicios

- **Supabase:** plataforma utilizada para la gestión de la base de datos y servicios asociados.
- **PostgreSQL:** sistema gestor de bases de datos relacional.
- **Supabase Auth:** servicios de autenticación de usuarios.

### Herramientas de desarrollo

- Git.
- GitHub.
- Visual Studio Code.
- npm.
- Vercel.
- Render.

---

## Arquitectura del sistema

TdeA GO implementa una arquitectura cliente-servidor que separa la presentación de la información, el procesamiento de las solicitudes y la gestión de los datos.

La arquitectura general está compuesta por los siguientes elementos:

1. **Cliente web:** interfaz con la que interactúan los usuarios desde un navegador.
2. **Frontend:** desarrollado con React y Vite, responsable de presentar la información y gestionar las interacciones.
3. **Backend:** desarrollado con Node.js y Express, encargado de procesar las solicitudes y ejecutar la lógica del sistema.
4. **Servicios de datos:** Supabase y PostgreSQL, utilizados para la autenticación y persistencia de la información.

### Diagrama general de arquitectura

<img width="688" height="586" alt="image" src="https://github.com/user-attachments/assets/87c44fd1-b980-4c7d-8420-4140d4c26873" />

              USUARIO
                 |
                 v
          NAVEGADOR WEB
                 |
                 v
          FRONTEND
          React + Vite
                 |
                 v
          API REST
       Node.js + Express
                 |
                 v
          SUPABASE
                 |
                 v
          POSTGRESQL
          Base de datos
```

---

## Estructura del proyecto

El proyecto está organizado en directorios que separan los componentes de la interfaz, los servicios del servidor, las rutas de la API y los recursos necesarios para su funcionamiento.

La estructura detallada se encuentra en proceso de documentación y se actualizará de acuerdo con la organización definitiva del código fuente.

---

## Requisitos previos

Para ejecutar el proyecto en un entorno de desarrollo local se requiere:

- Node.js.
- npm (incluido con Node.js).
- Git.
- Visual Studio Code o un editor de código equivalente.
- Acceso a un proyecto de Supabase.
- Variables de entorno necesarias para la conexión con los servicios del sistema.

Se recomienda utilizar versiones estables y compatibles de las herramientas mencionadas.

---

## Instalación y configuración

### 1. Clonar el repositorio

Ejecutar el siguiente comando en una terminal:

```bash
git clone https://github.com/Moli333/TdeA--GO.git
```

Ingresar al directorio del proyecto:

```bash
cd TdeA--GO
```

### 2. Instalar las dependencias

Desde el directorio correspondiente al frontend, ejecutar:

```bash
npm install
```

En Windows PowerShell, si existen restricciones de ejecución con npm, se puede utilizar:

```powershell
npm.cmd install
```

Las dependencias del backend deben instalarse desde su respectivo directorio, de acuerdo con su archivo `package.json`.

### 3. Configurar las variables de entorno

El proyecto utiliza variables de entorno para gestionar los parámetros de conexión y configuración de los servicios.

Se debe crear el archivo `.env` correspondiente a cada entorno, tomando como referencia las variables requeridas por el código fuente.

**Importante:** no se deben publicar claves privadas, contraseñas, tokens de acceso ni credenciales administrativas en el repositorio.

---

## Ejecución del proyecto

### Iniciar el frontend

Desde el directorio del frontend, ejecutar:

```bash
npm run dev
```

En caso de utilizar Windows PowerShell con restricciones de ejecución:

```powershell
npm.cmd run dev
```

Vite iniciará el servidor de desarrollo y mostrará una dirección local similar a:

```text
http://localhost:5173/
```

### Iniciar el backend

Desde el directorio correspondiente al backend, ejecutar:

```bash
node server/server.js
```

El servidor iniciará los servicios de la API de acuerdo con la configuración establecida en las variables de entorno.

Para el funcionamiento integral del sistema, deben estar disponibles tanto el frontend como el backend y los servicios de Supabase configurados.

---

## Seguridad y autenticación

TdeA GO contempla mecanismos de autenticación y autorización para controlar el acceso de los usuarios a las funcionalidades de la plataforma.

El sistema considera:

- Registro e inicio de sesión.
- Validación de los datos de acceso.
- Autenticación mediante los servicios de Supabase.
- Control de acceso según los roles asignados.
- Protección de las rutas y operaciones que requieren autorización.
- Gestión de sesiones de usuario.
- Validaciones para las operaciones realizadas a través del backend.

Las credenciales y los parámetros sensibles se gestionan mediante variables de entorno y mecanismos de protección, evitando su exposición en el código fuente público.

---

## Despliegue

El proyecto contempla servicios de despliegue independientes para sus componentes:

- **Frontend:** Vercel.
- **Backend:** Render.
- **Base de datos y autenticación:** Supabase.

Esta distribución permite mantener separados los servicios de presentación, procesamiento y almacenamiento de información.

---

## Estado del proyecto

**En desarrollo.**

TdeA GO forma parte del proyecto académico de Trabajo de Grados II del programa de Ingeniería de Software del Tecnológico de Antioquia.

Su construcción se realiza de manera progresiva mediante la implementación de módulos y funcionalidades definidos a partir de los requerimientos del sistema.

El desarrollo contempla actividades de análisis, diseño, implementación, integración y validación de los componentes de la solución.

---

## Información académica

| Campo | Descripción |
|---|---|
| Proyecto | TdeA GO |
| Programa académico | Ingeniería de Software |
| Institución | Tecnológico de Antioquia |
| Asignatura | Trabajo de Grados II |
| Integrantes | Sthyd Anderson Guissao Ramírez y Mónica Liliana Atehortúa Ramírez |
| Directora | Bibiana Urrea Correa |

---

## Repositorio del proyecto

El código fuente de TdeA GO se encuentra disponible en GitHub:

**Repositorio:** [Moli333/TdeA--GO](https://github.com/Moli333/TdeA--GO)

---

## Licencia y uso académico

TdeA GO es un proyecto desarrollado con fines académicos en el marco del programa de Ingeniería de Software del Tecnológico de Antioquia.

Su código fuente se comparte como parte de la documentación y entrega del proyecto académico. Su utilización, modificación o distribución debe respetar los derechos de sus autores y las condiciones de uso que se establezcan para el repositorio.
