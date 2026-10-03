import { useEffect, useState } from "react";
import "./MisSolicitudes.css";

function MisSolicitudes({ usuario, API_URL }) {
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  // =========================================================
  // OBTENER ID DEL USUARIO
  // =========================================================

  const idUsuario =
    usuario?.id ||
    usuario?.id_usuario ||
    null;

  // =========================================================
  // CONSULTAR SOLICITUDES
  // =========================================================

  const cargarSolicitudes = async () => {
    if (!idUsuario) {
      setSolicitudes([]);
      setCargando(false);
      setError(
        "No fue posible identificar al usuario."
      );
      return;
    }

    setCargando(true);
    setError("");

    try {
      const respuesta = await fetch(
        `${API_URL}/api/solicitudes/pasajero/${idUsuario}`
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje ||
            "No fue posible consultar tus solicitudes."
        );
      }

      setSolicitudes(
        Array.isArray(datos)
          ? datos
          : []
      );
    } catch (error) {
      console.error(
        "Error cargando solicitudes:",
        error
      );

      setError(
        error.message ||
          "No fue posible cargar tus solicitudes."
      );
    } finally {
      setCargando(false);
    }
  };

  // =========================================================
  // CARGAR AL ENTRAR A LA PÁGINA
  // =========================================================

  useEffect(() => {
    cargarSolicitudes();
  }, [idUsuario]);

  // =========================================================
  // FORMATEAR FECHA Y HORA
  // =========================================================

  const formatearFecha = (fechaHora) => {
    if (!fechaHora) {
      return "Fecha no disponible";
    }

    const fecha = new Date(fechaHora);

    if (Number.isNaN(fecha.getTime())) {
      return "Fecha no disponible";
    }

    return fecha.toLocaleDateString(
      "es-CO",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    );
  };

  const formatearHora = (fechaHora) => {
    if (!fechaHora) {
      return "Hora no disponible";
    }

    const fecha = new Date(fechaHora);

    if (Number.isNaN(fecha.getTime())) {
      return "Hora no disponible";
    }

    return fecha.toLocaleTimeString(
      "es-CO",
      {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }
    );
  };

  // =========================================================
  // TEXTO DEL ESTADO
  // =========================================================

  const obtenerTextoEstado = (estado) => {
    const estados = {
      pendiente: "Pendiente",
      aceptada: "Aceptada",
      rechazada: "Rechazada",
      cancelada: "Cancelada",
    };

    return (
      estados[estado] ||
      estado ||
      "Sin estado"
    );
  };

  // =========================================================
  // CLASE DEL ESTADO
  // =========================================================

  const obtenerClaseEstado = (estado) => {
    const estados = {
      pendiente:
        "estado-solicitud pendiente",
      aceptada:
        "estado-solicitud aceptada",
      rechazada:
        "estado-solicitud rechazada",
      cancelada:
        "estado-solicitud cancelada",
    };

    return (
      estados[estado] ||
      "estado-solicitud"
    );
  };

  // =========================================================
  // FOTO DEL CONDUCTOR
  // =========================================================

  const obtenerIniciales = (nombre) => {
    if (!nombre) {
      return "C";
    }

    const palabras =
      nombre.trim().split(/\s+/);

    if (palabras.length === 1) {
      return palabras[0]
        .charAt(0)
        .toUpperCase();
    }

    return (
      palabras[0].charAt(0) +
      palabras[1].charAt(0)
    ).toUpperCase();
  };

  // =========================================================
  // RENDERIZADO
  // =========================================================

  return (
    <section className="pagina-servicio solicitudes-pagina">

      <div className="contenedor">

        {/* =================================================
            ENCABEZADO
            ================================================= */}

        <div className="encabezado-servicio">

          <div>
            <span className="etiqueta-verde">
              PASAJERO
            </span>

            <h1>Mis solicitudes</h1>

            <p>
              Consulta las solicitudes de cupo
              que has realizado y revisa su estado.
            </p>
          </div>

          <button
            type="button"
            className="boton-recargar-solicitudes"
            onClick={cargarSolicitudes}
            disabled={cargando}
          >
            {cargando
              ? "Actualizando..."
              : "Actualizar"}
          </button>

        </div>

        {/* =================================================
            CARGANDO
            ================================================= */}

        {cargando && (
          <div className="estado-carga-solicitudes">

            <div className="indicador-carga"></div>

            <p>
              Cargando tus solicitudes...
            </p>

          </div>
        )}

        {/* =================================================
            ERROR
            ================================================= */}

        {!cargando && error && (
          <div className="mensaje-error-solicitudes">

            <strong>
              No fue posible cargar las solicitudes
            </strong>

            <p>{error}</p>

            <button
              type="button"
              onClick={cargarSolicitudes}
              className="boton-reintentar-solicitudes"
            >
              Intentar nuevamente
            </button>

          </div>
        )}

        {/* =================================================
            SIN SOLICITUDES
            ================================================= */}

        {!cargando &&
          !error &&
          solicitudes.length === 0 && (
            <div className="sin-solicitudes">

              <div className="icono-sin-solicitudes">
                <span>✓</span>
              </div>

              <h2>
                Aún no tienes solicitudes
              </h2>

              <p>
                Cuando solicites un cupo en una
                ruta, podrás consultar aquí su
                información y estado.
              </p>

            </div>
          )}

        {/* =================================================
            LISTADO
            ================================================= */}

        {!cargando &&
          !error &&
          solicitudes.length > 0 && (
            <div className="lista-solicitudes">

              {solicitudes.map((solicitud) => {

                const ruta =
                  solicitud.rutas ||
                  {};

                const conductor =
                  ruta.profiles ||
                  null;

                const estado =
                  solicitud.estado ||
                  "pendiente";

                return (
                  <article
                    className="tarjeta-solicitud"
                    key={solicitud.id}
                  >

                    {/* =====================================
                        CABECERA DE LA SOLICITUD
                        ===================================== */}

                    <div className="cabecera-tarjeta-solicitud">

                      <div>

                        <span className="numero-solicitud">
                          Solicitud
                        </span>

                        <h2>
                          {ruta.origen ||
                            "Origen no disponible"}
                          <span className="separador-ruta">
                            →
                          </span>
                          {ruta.destino ||
                            "Destino no disponible"}
                        </h2>

                      </div>

                      <span
                        className={obtenerClaseEstado(
                          estado
                        )}
                      >
                        {obtenerTextoEstado(
                          estado
                        )}
                      </span>

                    </div>

                    {/* =====================================
                        INFORMACIÓN DEL VIAJE
                        ===================================== */}

                    <div className="informacion-solicitud">

                      <div className="dato-solicitud">

                        <span className="icono-dato">
                          Fecha
                        </span>

                        <div>
                          <small>
                            Fecha de salida
                          </small>

                          <strong>
                            {formatearFecha(
                              ruta.fecha_hora_salida
                            )}
                          </strong>
                        </div>

                      </div>

                      <div className="dato-solicitud">

                        <span className="icono-dato">
                          Hora
                        </span>

                        <div>
                          <small>
                            Hora de salida
                          </small>

                          <strong>
                            {formatearHora(
                              ruta.fecha_hora_salida
                            )}
                          </strong>
                        </div>

                      </div>

                      <div className="dato-solicitud">

                        <span className="icono-dato">
                          Punto
                        </span>

                        <div>
                          <small>
                            Punto de encuentro
                          </small>

                          <strong>
                            {solicitud.punto_encuentro ||
                              "No especificado"}
                          </strong>
                        </div>

                      </div>

                    </div>

                    {/* =====================================
                        CONDUCTOR
                        ===================================== */}

                    <div className="conductor-solicitud">

                      <div className="titulo-seccion-solicitud">
                        Conductor
                      </div>

                      <div className="datos-conductor-solicitud">

                        <div className="avatar-conductor-solicitud">

                          {conductor?.foto_url ? (
                            <img
                              src={
                                conductor.foto_url
                              }
                              alt={`Foto de ${
                                conductor.nombre_completo ||
                                "conductor"
                              }`}
                            />
                          ) : (
                            obtenerIniciales(
                              conductor?.nombre_completo
                            )
                          )}

                        </div>

                        <div className="nombre-conductor-solicitud">

                          <strong>
                            {conductor?.nombre_completo ||
                              "Conductor no disponible"}
                          </strong>

                          {conductor?.verificado && (
                            <span className="conductor-verificado">
                              Usuario verificado
                            </span>
                          )}

                        </div>

                        {conductor?.telefono && (
                          <div className="telefono-conductor-solicitud">

                            <small>
                              Teléfono
                            </small>

                            <strong>
                              {conductor.telefono}
                            </strong>

                          </div>
                        )}

                      </div>

                    </div>

                    {/* =====================================
                        DETALLES DE CUPOS
                        ===================================== */}

                    <div className="detalle-cupos-solicitud">

                      <div>
                        <small>
                          Cupos disponibles
                        </small>

                        <strong>
                          {ruta.cupos_disponibles ??
                            "No disponible"}
                        </strong>
                      </div>

                      <div>
                        <small>
                          Cupos totales
                        </small>

                        <strong>
                          {ruta.cupos_totales ??
                            "No disponible"}
                        </strong>
                      </div>

                      <div>
                        <small>
                          Solicitud realizada
                        </small>

                        <strong>
                          {formatearFecha(
                            solicitud.fecha_solicitud
                          )}
                        </strong>
                      </div>

                    </div>

                  </article>
                );
              })}

            </div>
          )}

      </div>

    </section>
  );
}

export default MisSolicitudes;