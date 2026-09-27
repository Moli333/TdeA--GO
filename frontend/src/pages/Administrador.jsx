import { useState } from "react";

function Administrador({ usuario, onCerrarSesion, onInicio }) {
  const [seccion, setSeccion] = useState("resumen");

  const nombreAdministrador = usuario?.nombre || "Administrador";

  const cambiarSeccion = (nuevaSeccion) => {
    setSeccion(nuevaSeccion);
  };

  return (
    <div className="pagina-administrador">
      {/* Encabezado */}
      <header className="admin-encabezado">
        <div className="admin-encabezado-contenedor">
          <button
            type="button"
            className="admin-logo"
            onClick={onInicio}
          >
            <span className="admin-logo-icono">🚗</span>

            <span className="admin-logo-texto">
              <strong>TdeA</strong>
              <span>GO</span>
            </span>
          </button>

          <div className="admin-titulo">
            <span>Panel de administración</span>
          </div>

          <div className="admin-usuario">
            <div className="admin-avatar">
              {nombreAdministrador.charAt(0).toUpperCase()}
            </div>

            <div className="admin-datos-usuario">
              <strong>{nombreAdministrador}</strong>
              <span>Administrador</span>
            </div>

            <button
              type="button"
              className="admin-cerrar-sesion"
              onClick={onCerrarSesion}
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="admin-contenido">
        <section className="admin-bienvenida">
          <div>
            <span className="admin-etiqueta">TdeA GO</span>

            <h1>Panel de administración</h1>

            <p>
              Gestiona los usuarios, las rutas y las solicitudes de
              transporte de la comunidad TdeA.
            </p>
          </div>
        </section>

        {/* Menú de administración */}
        <section className="admin-menu">
          <button
            type="button"
            className={`admin-menu-boton ${
              seccion === "resumen" ? "seleccionado" : ""
            }`}
            onClick={() => cambiarSeccion("resumen")}
          >
            <span className="admin-menu-icono">📊</span>
            <span>
              <strong>Resumen</strong>
              <small>Vista general</small>
            </span>
          </button>

          <button
            type="button"
            className={`admin-menu-boton ${
              seccion === "usuarios" ? "seleccionado" : ""
            }`}
            onClick={() => cambiarSeccion("usuarios")}
          >
            <span className="admin-menu-icono">👥</span>
            <span>
              <strong>Usuarios</strong>
              <small>Gestionar usuarios</small>
            </span>
          </button>

          <button
            type="button"
            className={`admin-menu-boton ${
              seccion === "rutas" ? "seleccionado" : ""
            }`}
            onClick={() => cambiarSeccion("rutas")}
          >
            <span className="admin-menu-icono">🛣️</span>
            <span>
              <strong>Rutas</strong>
              <small>Gestionar rutas</small>
            </span>
          </button>

          <button
            type="button"
            className={`admin-menu-boton ${
              seccion === "solicitudes" ? "seleccionado" : ""
            }`}
            onClick={() => cambiarSeccion("solicitudes")}
          >
            <span className="admin-menu-icono">📋</span>
            <span>
              <strong>Solicitudes</strong>
              <small>Supervisar solicitudes</small>
            </span>
          </button>
        </section>

        {/* Resumen */}
        {seccion === "resumen" && (
          <section className="admin-seccion">
            <div className="admin-seccion-titulo">
              <div>
                <h2>Resumen del sistema</h2>
                <p>
                  Información general de TdeA GO.
                </p>
              </div>
            </div>

            <div className="admin-tarjetas">
              <article className="admin-tarjeta">
                <span className="admin-tarjeta-icono">👥</span>
                <div>
                  <span>Usuarios</span>
                  <strong>—</strong>
                </div>
                <small>
                  Información disponible próximamente
                </small>
              </article>

              <article className="admin-tarjeta">
                <span className="admin-tarjeta-icono">🚗</span>
                <div>
                  <span>Conductores</span>
                  <strong>—</strong>
                </div>
                <small>
                  Información disponible próximamente
                </small>
              </article>

              <article className="admin-tarjeta">
                <span className="admin-tarjeta-icono">🛣️</span>
                <div>
                  <span>Rutas</span>
                  <strong>—</strong>
                </div>
                <small>
                  Información disponible próximamente
                </small>
              </article>

              <article className="admin-tarjeta">
                <span className="admin-tarjeta-icono">📋</span>
                <div>
                  <span>Solicitudes</span>
                  <strong>—</strong>
                </div>
                <small>
                  Información disponible próximamente
                </small>
              </article>
            </div>

            <div className="admin-panel-informativo">
              <span>ℹ️</span>

              <div>
                <strong>Administración de TdeA GO</strong>
                <p>
                  Desde este panel podrás supervisar los usuarios,
                  rutas y solicitudes cuando conectemos estas secciones
                  con la base de datos.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Usuarios */}
        {seccion === "usuarios" && (
          <section className="admin-seccion">
            <div className="admin-seccion-titulo">
              <div>
                <h2>Gestión de usuarios</h2>
                <p>
                  Consulta y administra los usuarios registrados en
                  TdeA GO.
                </p>
              </div>
            </div>

            <div className="admin-contenido-vacio">
              <span>👥</span>
              <h3>Usuarios</h3>
              <p>
                Aquí se mostrará la información de los usuarios
                registrados.
              </p>
            </div>
          </section>
        )}

        {/* Rutas */}
        {seccion === "rutas" && (
          <section className="admin-seccion">
            <div className="admin-seccion-titulo">
              <div>
                <h2>Gestión de rutas</h2>
                <p>
                  Consulta y supervisa las rutas publicadas por los
                  conductores.
                </p>
              </div>
            </div>

            <div className="admin-contenido-vacio">
              <span>🛣️</span>
              <h3>Rutas</h3>
              <p>
                Aquí se mostrarán las rutas registradas en TdeA GO.
              </p>
            </div>
          </section>
        )}

        {/* Solicitudes */}
        {seccion === "solicitudes" && (
          <section className="admin-seccion">
            <div className="admin-seccion-titulo">
              <div>
                <h2>Gestión de solicitudes</h2>
                <p>
                  Supervisa las solicitudes de cupos realizadas por
                  los pasajeros.
                </p>
              </div>
            </div>

            <div className="admin-contenido-vacio">
              <span>📋</span>
              <h3>Solicitudes</h3>
              <p>
                Aquí se mostrarán las solicitudes de transporte
                registradas en el sistema.
              </p>
            </div>
          </section>
        )}
      </main>

      {/* Pie de página */}
      <footer className="admin-footer">
        <div>
          <strong>TdeA GO</strong>
          <span>
            Transporte compartido para la comunidad del TdeA
          </span>
        </div>

        <button
          type="button"
          onClick={onInicio}
          className="admin-volver-inicio"
        >
          ← Volver al inicio
        </button>
      </footer>
    </div>
  );
}

export default Administrador;