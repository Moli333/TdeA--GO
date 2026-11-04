
import { useCallback, useEffect, useMemo, useState } from "react";
import "./Administrador.css";

const ADMINISTRADORA_PRINCIPAL_ID =
  "2f1ea263-8be4-48be-99f7-b75e4408265f";

function Administrador({ usuario, API_URL, onCerrarSesion, onInicio }) {
  const [seccion, setSeccion] = useState("resumen");

  const [usuarios, setUsuarios] = useState([]);
  const [rutas, setRutas] = useState([]);
  const [solicitudesCupos, setSolicitudesCupos] = useState([]);
  const [solicitudesNuevas, setSolicitudesNuevas] = useState([]);

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [procesandoUsuario, setProcesandoUsuario] = useState("");

  const esAdministradoraPrincipal =
    usuario?.id === ADMINISTRADORA_PRINCIPAL_ID ||
    usuario?.id_usuario === ADMINISTRADORA_PRINCIPAL_ID;

  const token = usuario?.token || usuario?.access_token || "";

  const nombreAdministrador =
    usuario?.nombre_completo || usuario?.nombre || "Administradora";

  const consultar = useCallback(
    async (ruta) => {
      const respuesta = await fetch(`${API_URL}${ruta}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje || "No fue posible consultar la información."
        );
      }

      return datos;
    },
    [API_URL, token]
  );

  const cargarDatos = useCallback(async () => {
    try {
      setCargando(true);
      setError("");

      const [datosUsuarios, datosRutas, datosSolicitudes] =
        await Promise.all([
          consultar("/api/usuarios"),
          consultar("/api/admin/rutas"),
          consultar("/api/admin/solicitudes"),
        ]);

      setUsuarios(
        Array.isArray(datosUsuarios)
          ? datosUsuarios
          : datosUsuarios.usuarios || []
      );

      setRutas(Array.isArray(datosRutas) ? datosRutas : []);

      setSolicitudesCupos(
        Array.isArray(datosSolicitudes.solicitudesCupos)
          ? datosSolicitudes.solicitudesCupos
          : []
      );

      setSolicitudesNuevas(
        Array.isArray(datosSolicitudes.solicitudesNuevas)
          ? datosSolicitudes.solicitudesNuevas
          : []
      );
    } catch (errorConsulta) {
      console.error("Error cargando información administrativa:", errorConsulta);
      setError(errorConsulta.message);
    } finally {
      setCargando(false);
    }
  }, [consultar]);

  useEffect(() => {
    const iniciarCarga = async () => {
      await cargarDatos();
    };

    iniciarCarga();
  }, [cargarDatos]);

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
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ accion }),
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje || "No fue posible modificar los privilegios."
        );
      }

      await cargarDatos();
      alert(datos.mensaje || "Privilegios actualizados correctamente.");
    } catch (errorAccion) {
      console.error("Error administrando privilegios:", errorAccion);
      alert(errorAccion.message);
    } finally {
      setProcesandoUsuario("");
    }
  };

  const usuariosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return usuarios.filter((item) =>
      [
        item.nombre_completo,
        item.correo,
        item.rol,
      ].some((valor) => String(valor || "").toLowerCase().includes(texto))
    );
  }, [usuarios, busqueda]);

  const totalSolicitudes =
    solicitudesCupos.length + solicitudesNuevas.length;

  const formatearFecha = (valor) => {
    if (!valor) return "Sin fecha";

    const fecha = new Date(valor);

    if (Number.isNaN(fecha.getTime())) return String(valor);

    return fecha.toLocaleString("es-CO", {
      dateStyle: "short",
      timeStyle: "short",
    });
  };

  const mostrarValor = (valor) => {
    if (valor === null || valor === undefined || valor === "") {
      return "No disponible";
    }

    return String(valor);
  };

  const actualizarTextoEstado = (estado) => {
    return String(estado || "Sin estado")
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letra) => letra.toUpperCase());
  };

  return (
    <div className="pagina-administrador">
      <header className="admin-encabezado">
        <div className="admin-encabezado-contenedor">
          <button
            type="button"
            className="admin-logo"
            onClick={onInicio}
          >
            <span className="admin-logo-icono"></span>
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
              <span>Administradora</span>
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

      <main className="admin-contenido">
        <section className="admin-bienvenida">
          <div>
            <span className="admin-etiqueta">TdeA GO</span>
            <h1>Panel de administración</h1>
            <p>
              Supervisa los usuarios, las rutas y las solicitudes
              de transporte de la comunidad TdeA.
            </p>
          </div>
        </section>

        <section className="admin-menu">
          {[
            ["resumen", "Resumen", "Vista general"],
            ["usuarios", "Usuarios", "Gestionar usuarios"],
            ["rutas", "Rutas", "Consultar rutas"],
            ["solicitudes", "Solicitudes", "Consultar solicitudes"],
          ].map(([id, titulo, descripcion]) => (
            <button
              key={id}
              type="button"
              className={`admin-menu-boton ${seccion === id ? "seleccionado" : ""
                }`}
              onClick={() => setSeccion(id)}
            >
              <span>
                <strong>{titulo}</strong>
                <small>{descripcion}</small>
              </span>
            </button>
          ))}
        </section>

        <section className="admin-acciones-datos">
          <button
            type="button"
            onClick={cargarDatos}
            disabled={cargando}
          >
            {cargando ? "Actualizando información..." : "Actualizar información"}
          </button>

          {error && (
            <p style={{ color: "#b91c1c" }}>
              {error}
            </p>
          )}
        </section>

        {cargando && (
          <p>Consultando información de TdeA GO...</p>
        )}

        {seccion === "resumen" && (
          <section className="admin-seccion">
            <div className="admin-seccion-titulo">
              <div>
                <h2>Resumen del sistema</h2>
                <p>Indicadores de los registros disponibles en la plataforma.</p>
              </div>
            </div>

            <div className="admin-tarjetas">
              <article className="admin-tarjeta">
                <span>Usuarios registrados</span>
                <strong>{usuarios.length}</strong>
                <small>Total de perfiles registrados</small>
              </article>

              <article className="admin-tarjeta">
                <span>Conductores</span>
                <strong>
                  {usuarios.filter(
                    (item) => item.rol?.toLowerCase() === "conductor"
                  ).length}
                </strong>
                <small>Usuarios con rol conductor</small>
              </article>

              <article className="admin-tarjeta">
                <span>Rutas registradas</span>
                <strong>{rutas.length}</strong>
                <small>Total de rutas consultadas</small>
              </article>

              <article className="admin-tarjeta">
                <span>Solicitudes registradas</span>
                <strong>{totalSolicitudes}</strong>
                <small>Solicitudes de ambos tipos</small>
              </article>
            </div>

            <div className="admin-panel-informativo">
              <div>
                <strong>Información general</strong>
                <p>
                  Los indicadores se calculan a partir de los registros
                  consultados en la base de datos. Utiliza el botón de
                  actualización para consultar los datos más recientes.
                </p>
              </div>
            </div>
          </section>
        )}

        {seccion === "usuarios" && (
          <section className="admin-seccion">
            <div className="admin-seccion-titulo">
              <div>
                <h2>Gestión de usuarios</h2>
                <p>Consulta los usuarios registrados y administra sus privilegios.</p>
              </div>
            </div>

            <input
              type="search"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
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

            <p>
              Usuarios encontrados: <strong>{usuariosFiltrados.length}</strong>
            </p>

            {!cargando && !error && usuariosFiltrados.length === 0 && (
              <div className="admin-contenido-vacio">
                <h3>No se encontraron usuarios</h3>
                <p>Prueba con otro nombre, correo o rol.</p>
              </div>
            )}

            {usuariosFiltrados.length > 0 && (
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
                      <th style={{ textAlign: "left", padding: "12px" }}>Verificación</th>
                      {esAdministradoraPrincipal && (
                        <th style={{ textAlign: "left", padding: "12px" }}>Acciones</th>
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
                            {esPrincipal && <strong> (Cuenta principal)</strong>}
                          </td>

                          <td style={{ padding: "12px" }}>
                            {item.correo || "Sin correo"}
                          </td>

                          <td style={{ padding: "12px" }}>
                            {item.rol || "Sin rol"}
                          </td>

                          <td style={{ padding: "12px" }}>
                            {item.verificado ? "Verificado" : "Pendiente"}
                          </td>

                          {esAdministradoraPrincipal && (
                            <td style={{ padding: "12px" }}>
                              {!esPrincipal ? (
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
                              ) : (
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
          </section>
        )}

        {seccion === "rutas" && (
          <section className="admin-seccion">
            <div className="admin-seccion-titulo">
              <div>
                <h2>Gestión de rutas</h2>
                <p>Consulta las rutas registradas por los conductores.</p>
              </div>
              <strong>Total: {rutas.length}</strong>
            </div>

            {!cargando && !error && rutas.length === 0 && (
              <div className="admin-contenido-vacio">
                <h3>No hay rutas registradas</h3>
                <p>Cuando se publiquen rutas, aparecerán en esta sección.</p>
              </div>
            )}

            {rutas.length > 0 && (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ padding: "12px", textAlign: "left" }}>Origen</th>
                      <th style={{ padding: "12px", textAlign: "left" }}>Destino</th>
                      <th style={{ padding: "12px", textAlign: "left" }}>Salida</th>
                      <th style={{ padding: "12px", textAlign: "left" }}>Conductor</th>
                      <th style={{ padding: "12px", textAlign: "left" }}>Cupos</th>
                      <th style={{ padding: "12px", textAlign: "left" }}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rutas.map((ruta) => (
                      <tr key={ruta.id}>
                        <td style={{ padding: "12px" }}>{mostrarValor(ruta.origen)}</td>
                        <td style={{ padding: "12px" }}>{mostrarValor(ruta.destino)}</td>
                        <td style={{ padding: "12px" }}>
                          {formatearFecha(ruta.fecha_hora_salida)}
                        </td>
                        <td style={{ padding: "12px" }}>
                          {mostrarValor(ruta.conductor_id)}
                        </td>
                        <td style={{ padding: "12px" }}>
                          {mostrarValor(ruta.cupos_disponibles)}
                          {" / "}
                          {mostrarValor(ruta.cupos_totales)}
                        </td>
                        <td style={{ padding: "12px" }}>
                          {actualizarTextoEstado(ruta.estado)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {seccion === "solicitudes" && (
          <section className="admin-seccion">
            <div className="admin-seccion-titulo">
              <div>
                <h2>Gestión de solicitudes</h2>
                <p>Consulta las solicitudes de cupos y de viajes nuevos.</p>
              </div>
              <strong>Total: {totalSolicitudes}</strong>
            </div>

            <h3>Solicitudes de cupos</h3>

            {solicitudesCupos.length === 0 ? (
              <p>No hay solicitudes de cupos registradas.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ padding: "12px", textAlign: "left" }}>ID</th>
                      <th style={{ padding: "12px", textAlign: "left" }}>Pasajero</th>
                      <th style={{ padding: "12px", textAlign: "left" }}>Viaje</th>
                      <th style={{ padding: "12px", textAlign: "left" }}>Estado</th>
                      <th style={{ padding: "12px", textAlign: "left" }}>Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {solicitudesCupos.map((solicitud) => (
                      <tr key={solicitud.id}>
                        <td style={{ padding: "12px" }}>{mostrarValor(solicitud.id)}</td>
                        <td style={{ padding: "12px" }}>{mostrarValor(solicitud.pasajero_id)}</td>
                        <td style={{ padding: "12px" }}>{mostrarValor(solicitud.viaje_id)}</td>
                        <td style={{ padding: "12px" }}>{actualizarTextoEstado(solicitud.estado)}</td>
                        <td style={{ padding: "12px" }}>{formatearFecha(solicitud.fecha_solicitud)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <h3 style={{ marginTop: "30px" }}>Solicitudes de viajes nuevos</h3>

            {solicitudesNuevas.length === 0 ? (
              <p>No hay solicitudes de viajes nuevos registradas.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ padding: "12px", textAlign: "left" }}>ID</th>
                      <th style={{ padding: "12px", textAlign: "left" }}>Pasajero</th>
                      <th style={{ padding: "12px", textAlign: "left" }}>Origen</th>
                      <th style={{ padding: "12px", textAlign: "left" }}>Destino</th>
                      <th style={{ padding: "12px", textAlign: "left" }}>Salida</th>
                      <th style={{ padding: "12px", textAlign: "left" }}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {solicitudesNuevas.map((solicitud) => (
                      <tr key={solicitud.id}>
                        <td style={{ padding: "12px" }}>{mostrarValor(solicitud.id)}</td>
                        <td style={{ padding: "12px" }}>{mostrarValor(solicitud.pasajero_id)}</td>
                        <td style={{ padding: "12px" }}>{mostrarValor(solicitud.origen)}</td>
                        <td style={{ padding: "12px" }}>{mostrarValor(solicitud.destino)}</td>
                        <td style={{ padding: "12px" }}>{formatearFecha(solicitud.fecha_hora_salida)}</td>
                        <td style={{ padding: "12px" }}>{actualizarTextoEstado(solicitud.estado)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>

      <footer className="admin-footer">
        <div>
          <strong>TdeA GO</strong>
          <span>Transporte compartido para la comunidad del TdeA</span>
        </div>

        <button
          type="button"
          onClick={onInicio}
          className="admin-volver-inicio"
        >
          Volver al inicio
        </button>
      </footer>
    </div>
  );
}

export default Administrador;
