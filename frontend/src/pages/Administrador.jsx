import { useEffect, useState } from "react";
import "./Administrador.css";

function Administrador({ usuario, API_URL, onCerrarSesion, onInicio }) {
  const [seccion, setSeccion] = useState("resumen");
  const [usuarios, setUsuarios] = useState([]);
  const [cargandoUsuarios, setCargandoUsuarios] = useState(false);
  const [errorUsuarios, setErrorUsuarios] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [procesandoUsuario, setProcesandoUsuario] = useState("");

  const ADMINISTRADORA_PRINCIPAL_ID =
    "2f1ea263-8be4-48be-99f7-b75e4408265f";

  const esAdministradoraPrincipal =
    usuario?.id === ADMINISTRADORA_PRINCIPAL_ID ||
    usuario?.id_usuario === ADMINISTRADORA_PRINCIPAL_ID;

  const cargarUsuarios = async () => {
    try {
      setCargandoUsuarios(true);
      setErrorUsuarios("");

      const respuesta = await fetch(`${API_URL}/api/usuarios`, {
        headers: {
          Authorization: `Bearer ${usuario?.token || usuario?.access_token || ""}`,
        },
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || "No fue posible consultar los usuarios.");
      }

      setUsuarios(
        Array.isArray(datos)
          ? datos
          : Array.isArray(datos.usuarios)
            ? datos.usuarios
            : []
      );
    } catch (error) {
      console.error("Error cargando usuarios:", error);
      setErrorUsuarios(error.message);
    } finally {
      setCargandoUsuarios(false);
    }
  };

  useEffect(() => {
    const temporizador = setTimeout(() => {
      void cargarUsuarios();
    }, 0);

    return () => clearTimeout(temporizador);
  }, []);

  const administrarPrivilegios = async (idUsuario, accion) => {
    if (!esAdministradoraPrincipal || !idUsuario || procesandoUsuario) {
      return;
    }

    const confirmacion =
      accion === "conceder"
        ? "¿Deseas conceder el rol de administrador a este usuario?"
        : "¿Deseas retirar los privilegios administrativos de este usuario?";

    if (!window.confirm(confirmacion)) return;

    try {
      setProcesandoUsuario(idUsuario);

      const respuesta = await fetch(
        `${API_URL}/api/admin/usuarios/${encodeURIComponent(idUsuario)}/rol`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${usuario.token || usuario.access_token}`,
          },
          body: JSON.stringify({ accion }),
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || "No fue posible modificar los privilegios.");
      }

      await cargarUsuarios();
      alert(datos.mensaje || "Privilegios actualizados correctamente.");
    } catch (error) {
      console.error("Error administrando privilegios:", error);
      alert(error.message);
    } finally {
      setProcesandoUsuario("");
    }
  };

  const usuariosFiltrados = usuarios.filter((item) => {
    const texto = busqueda.trim().toLowerCase();

    return (
      (item.nombre_completo || "").toLowerCase().includes(texto) ||
      (item.correo || "").toLowerCase().includes(texto) ||
      (item.rol || "").toLowerCase().includes(texto)
    );
  });

  const nombreAdministrador =
    usuario?.nombre_completo || usuario?.nombre || "Administradora";

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
            className={`admin-menu-boton ${seccion === "resumen" ? "seleccionado" : ""
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
            className={`admin-menu-boton ${seccion === "usuarios" ? "seleccionado" : ""
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
            className={`admin-menu-boton ${seccion === "rutas" ? "seleccionado" : ""
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
            className={`admin-menu-boton ${seccion === "solicitudes" ? "seleccionado" : ""
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
                  Consulta los usuarios registrados y administra sus privilegios.
                </p>
              </div>

              <button
                type="button"
                onClick={cargarUsuarios}
                disabled={cargandoUsuarios}
              >
                {cargandoUsuarios ? "Cargando..." : "Actualizar usuarios"}
              </button>
            </div>

            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, correo o rol..."
              style={{
                width: "100%",
                maxWidth: "450px",
                padding: "12px",
                margin: "15px 0",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
              }}
            />

            {cargandoUsuarios && (
              <p>Consultando usuarios registrados...</p>
            )}

            {errorUsuarios && (
              <p style={{ color: "#b91c1c" }}>{errorUsuarios}</p>
            )}

            {!cargandoUsuarios && !errorUsuarios && (
              <>
                <p>
                  Usuarios encontrados: <strong>{usuariosFiltrados.length}</strong>
                </p>

                {usuariosFiltrados.length === 0 ? (
                  <div className="admin-contenido-vacio">
                    <h3>No se encontraron usuarios</h3>
                    <p>Prueba con otro nombre, correo o rol.</p>
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        background: "#fff",
                      }}
                    >
                      <thead>
                        <tr>
                          <th style={{ textAlign: "left", padding: "12px" }}>Usuario</th>
                          <th style={{ textAlign: "left", padding: "12px" }}>Correo</th>
                          <th style={{ textAlign: "left", padding: "12px" }}>Rol</th>
                          {esAdministradoraPrincipal && (
                            <th style={{ textAlign: "left", padding: "12px" }}>
                              Acciones
                            </th>
                          )}
                        </tr>
                      </thead>

                      <tbody>
                        {usuariosFiltrados.map((item) => {
                          const esPrincipal =
                            item.id === ADMINISTRADORA_PRINCIPAL_ID;

                          const esAdministrador =
                            item.rol?.toLowerCase() === "administrador";

                          return (
                            <tr key={item.id}>
                              <td style={{ padding: "12px" }}>
                                {item.nombre_completo || "Sin nombre"}
                                {esPrincipal && (
                                  <strong> (Cuenta principal)</strong>
                                )}
                              </td>

                              <td style={{ padding: "12px" }}>
                                {item.correo || "Sin correo"}
                              </td>

                              <td style={{ padding: "12px" }}>
                                {item.rol || "Sin rol"}
                              </td>

                              {esAdministradoraPrincipal && (
                                <td style={{ padding: "12px" }}>
                                  {!esPrincipal && (
                                    <button
                                      type="button"
                                      disabled={procesandoUsuario === item.id}
                                      onClick={() =>
                                        administrarPrivilegios(
                                          item.id,
                                          esAdministrador ? "retirar" : "conceder"
                                        )
                                      }
                                    >
                                      {procesandoUsuario === item.id
                                        ? "Procesando..."
                                        : esAdministrador
                                          ? "Retirar administrador"
                                          : "Conceder administrador"}
                                    </button>
                                  )}

                                  {esPrincipal && (
                                    <span>Cuenta protegida</span>
                                  )}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
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