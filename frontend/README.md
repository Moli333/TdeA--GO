# TdeA GO

**Web App para la gestión y coordinación del transporte compartido de la comunidad académica del Tecnológico de Antioquia.**

TdeA GO es un proyecto académico desarrollado para facilitar la organización del transporte compartido entre estudiantes del Tecnológico de Antioquia, permitiendo centralizar la publicación y consulta de rutas, la disponibilidad de cupos y la gestión de solicitudes de transporte.

El proyecto busca ofrecer una alternativa organizada frente a los mecanismos informales utilizados actualmente para coordinar viajes, como grupos de mensajería y redes sociales.

---

## 🎯 Objetivo

Desarrollar una **Web App responsive** que facilite la coordinación del transporte compartido dentro de la comunidad académica del Tecnológico de Antioquia, proporcionando herramientas para publicar y consultar rutas, gestionar cupos y solicitudes, y consultar información relacionada con los viajes.

---

## 🚀 Funcionalidades

El sistema contempla las siguientes funcionalidades principales:

* Registro e inicio de sesión de usuarios.
* Gestión de usuarios.
* Manejo de roles dentro del sistema.
* Registro y administración de rutas.
* Consulta y búsqueda de rutas disponibles.
* Publicación de rutas por parte de los conductores.
* Indicación de disponibilidad de cupos.
* Solicitud y gestión de cupos.
* Consulta de información del conductor y del viaje.
* Visualización de rutas mediante geolocalización y mapas.
* Notificaciones relacionadas con los viajes.
* Administración y supervisión del sistema.

---

## 👥 Roles del sistema

### Administrador

Responsable de la administración y supervisión general de la plataforma.

* Gestionar usuarios.
* Consultar información del sistema.
* Administrar rutas.
* Administrar solicitudes.
* Supervisar el funcionamiento de la plataforma.

### Conductor

Usuario que ofrece cupos disponibles en su vehículo.

* Registrar rutas.
* Gestionar sus rutas.
* Indicar disponibilidad de cupos.
* Consultar solicitudes.
* Gestionar pasajeros.

### Pasajero

Usuario que busca transporte disponible.

* Consultar rutas.
* Buscar opciones de transporte.
* Consultar información del viaje.
* Solicitar cupos.
* Gestionar sus solicitudes.

---

## 🛠️ Tecnologías utilizadas

### Frontend

* **React**
* **Vite**
* HTML5
* CSS3
* JavaScript

### Backend

* **Node.js**
* **Express**

### Base de datos

* **MySQL**
* SQL

### Herramientas de desarrollo

* Git
* GitHub
* Visual Studio Code
* MySQL Workbench

---

## 📁 Estructura del proyecto

pendiente...



> La estructura del proyecto puede cambiar durante el desarrollo a medida que se incorporen nuevos módulos y funcionalidades.

---

## 💻 Requisitos

Para ejecutar el proyecto localmente se requiere:

* Node.js
* npm
* MySQL
* Git
* Visual Studio Code u otro editor de código.

---

## ⚙️ Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/Moli333/TdeA--GO.git
```

Ingresar al proyecto:

```bash
cd TdeA--GO
```

### 2. Instalar las dependencias

```bash
npm install
```

En Windows PowerShell, si `npm` presenta restricciones de ejecución, puede utilizarse:

```powershell
npm.cmd install
```

---

## 🗄️ Configuración de la base de datos

El proyecto utiliza **MySQL** como sistema gestor de base de datos.

La base de datos utilizada por el proyecto se denomina:

```text
tdea_go
```

Las credenciales y parámetros de conexión se manejan mediante variables de entorno en el archivo `.env`.

Ejemplo de configuración:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=TU_CONTRASEÑA
DB_NAME=tdea_go
DB_PORT=3306
```

> El archivo `.env` contiene información de configuración local y no debe compartirse públicamente cuando incluya credenciales reales.

---

## ▶️ Ejecución del proyecto

### Iniciar la Web App

Desde la carpeta principal del proyecto:

```bash
npm run dev
```

En Windows PowerShell, si `npm` presenta restricciones:

```powershell
npm.cmd run dev
```

Vite proporcionará una dirección local similar a:

```text
http://localhost:5173/
```

### Iniciar el servidor

El backend se ejecuta mediante Node.js y Express.

```bash
node server/server.js
```

---

## 🔐 Configuración de autenticación

El sistema contempla autenticación de usuarios y manejo de roles.

Los usuarios podrán acceder de acuerdo con el rol asignado:

```text
Administrador
Conductor
Pasajero
```

La gestión de contraseñas se realizará mediante mecanismos de protección adecuados para evitar almacenar contraseñas en texto plano.

---

## 🧩 Arquitectura general

TdeA GO utiliza una arquitectura basada en la separación entre la interfaz de usuario, el servidor y la base de datos:

```text
┌──────────────────────────────┐
│          Usuario             │
│        Navegador Web         │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│       React + Vite           │
│          Frontend            │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│      Node.js + Express       │
│           Backend            │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│           MySQL              │
│          tdea_go             │
└──────────────────────────────┘
```

---

## 📌 Estado del proyecto

**En desarrollo.**

TdeA GO forma parte del proyecto académico de **Trabajo de Grados II** del programa de Ingeniería de Software del Tecnológico de Antioquia.

Durante el desarrollo se incorporarán progresivamente los módulos de autenticación, usuarios, rutas, solicitudes, cupos y demás componentes definidos para la solución.

---

## 🎓 Proyecto académico

**Proyecto:** TdeA GO
**Programa:** Ingeniería de Software
**Institución:** Tecnológico de Antioquia
**Asignatura:** Trabajo de Grados II

---

## 👩‍💻 Repositorio

Repositorio oficial:

**Moli333/TdeA--GO**

https://github.com/Moli333/TdeA--GO

---

## 📄 Licencia

Proyecto desarrollado con fines académicos para el Tecnológico de Antioquia.
