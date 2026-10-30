
import { useEffect, useMemo, useState } from "react";
import "./MisRutas.css";

function MisRutas({ usuario, API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000" }) {
  const [rutas, setRutas] = useState([]);
  const [solicitudesNuevas, setSolicitudesNuevas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [cargandoSolicitudes, setCargandoSolicitudes] = useState(true);
  const [error, setError] = useState("");
  const [errorSolicitudes, setErrorSolicitudes] = useState("");


  useEffect(() => {
    if (!usuario?.id) return;

    let cancelado = false;

    const cargarRutas = async () => {
      try {
        const respuesta = await fetch(`${API_URL}/api/rutas`);
        const datos = await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(datos.mensaje || "No fue posible consultar las rutas.");
        }

        const lista = Array.isArray(datos)
          ? datos
          : Array.isArray(datos.rutas)
            ? datos.rutas
            : [];

        if (!cancelado) {
          setRutas(
            lista.filter((ruta) =>
              String(ruta.conductor_id ?? ruta.id_conductor ?? ruta.conductorId) ===
              String(usuario.id)
            )
          );
          setError("");
        }
      } catch (error) {
        console.error("Error al cargar mis rutas:", error);
        if (!cancelado) {
          setError(error.message || "No fue posible cargar tus rutas.");
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    };

    const cargarSolicitudesNuevas = async () => {
      try {
        const respuesta = await fetch(
          `${API_URL}/api/solicitudes-viajes-nuevos?conductor_id=${encodeURIComponent(usuario.id)}`
        );
        const datos = await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(
            datos.mensaje || "No fue posible consultar las solicitudes."
          );
        }

        const lista = Array.isArray(datos)
          ? datos
          : Array.isArray(datos.solicitudes)
            ? datos.solicitudes
            : [];

        if (!cancelado) {
          setSolicitudesNuevas(
            lista
              .filter((solicitud) => solicitud.estado === "pendiente")
              .sort(
                (a, b) =>
                  new Date(b.creado_en || 0) - new Date(a.creado_en || 0)
              )
          );
          setErrorSolicitudes("");
        }
      } catch (error) {
        console.error("Error al cargar solicitudes nuevas:", error);
        if (!cancelado) {
          setErrorSolicitudes(
            error.message || "No fue posible cargar las solicitudes."
          );
        }
      } finally {
        if (!cancelado) setCargandoSolicitudes(false);
      }
    };

    cargarRutas();
    cargarSolicitudesNuevas();

    return () => {
      cancelado = true;
    };
  }, [usuario?.id, API_URL]);

  const rutasOrdenadas = useMemo(
    () =>
      [...rutas].sort((a, b) => {
        const fechaA = a.fecha_hora_salida || a.fechaHoraSalida || a.fecha_salida || "";
        const fechaB = b.fecha_hora_salida || b.fechaHoraSalida || b.fecha_salida || "";
        return new Date(fechaA) - new Date(fechaB);
      }),
    [rutas]
  );

  const obtenerFecha = (fecha) => {
    if (!fecha) return "Fecha no disponible";

    const convertida = new Date(fecha);
    if (Number.isNaN(convertida.getTime())) return String(fecha);

    return convertida.toLocaleDateString("es-CO", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const obtenerHora = (fecha) => {
    if (!fecha) return "--:--";

    const convertida = new Date(fecha);
    if (Number.isNaN(convertida.getTime())) return "--:--";

    return convertida.toLocaleTimeString("es-CO", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const obtenerCuposTotales = (ruta) =>
    Number(ruta.cupos_totales ?? ruta.cuposTotales ?? ruta.cupos ?? 0);

  const obtenerCuposDisponibles = (ruta) =>
    Number(ruta.cupos_disponibles ?? ruta.cuposDisponibles ?? 0);

  const obtenerEstado = (ruta) => {
    const fecha = ruta.fecha_hora_salida || ruta.fechaHoraSalida || ruta.fecha_salida;

    if (fecha && new Date(fecha) < new Date()) return "Finalizada";
    if (obtenerCuposDisponibles(ruta) === 0) return "Sin cupos";
    return "Disponible";
  };

  const obtenerClaseEstado = (estado) => {
    if (estado === "Finalizada") return "estado-finalizada";
    if (estado === "Sin cupos") return "estado-sin-cupos";
    return "estado-disponible";
  };

  if (!usuario?.id) {
    return (
      <section className="pagina-servicio mis-rutas-pagina">
        <div className="contenedor">
          <div className="mis-rutas-acceso">
            <div className="mis-rutas-acceso-icono">!</div>
            <h1>Mis rutas</h1>
            <p>Inicia sesión para consultar las rutas que has publicado como conductor.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="pagina-servicio mis-rutas-pagina">
      <div className="contenedor mis-rutas-contenedor">
        <div className="mis-rutas-encabezado">
          <div>
            <span className="etiqueta-verde">CONDUCTOR</span>
            <h1>Mis rutas</h1>
            <p>Consulta tus recorridos publicados y las nuevas solicitudes de viaje de la comunidad TdeA.</p>
          </div>

          <div className="resumen-rutas">
            <span className="resumen-numero">{rutas.length}</span>
            <span className="resumen-texto">
              {rutas.length === 1 ? "ruta publicada" : "rutas publicadas"}
            </span>
          </div>
        </div>

        {/* NUEVA SECCIÓN: SOLICITUDES DE VIAJES NUEVOS */}
        <section className="solicitudes-nuevas-seccion">
          <div className="solicitudes-nuevas-encabezado">
            <div>
              <span className="etiqueta-verde">OPORTUNIDADES DE VIAJE</span>
              <h2>Nuevas solicitudes de viaje</h2>
              <p>
                Consulta los viajes que los pasajeros necesitan realizar
                y considera publicar una ruta para atenderlos.
              </p>
            </div>

            <span className="solicitudes-nuevas-contador">
              {solicitudesNuevas.length}
              <small>pendientes</small>
            </span>
          </div>

          {cargandoSolicitudes && (
            <div className="solicitudes-nuevas-cargando">
              <div className="cargador"></div>
              <span>Consultando nuevas solicitudes...</span>
            </div>
          )}

          {!cargandoSolicitudes && errorSolicitudes && (
            <div className="solicitudes-nuevas-error">
              <p>{errorSolicitudes}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
              >
                Intentar nuevamente
              </button>
            </div>
          )}

          {!cargandoSolicitudes &&
            !errorSolicitudes &&
            solicitudesNuevas.length === 0 && (
              <div className="solicitudes-nuevas-vacio">
                <div className="solicitud-vacia-ruta">
                  <span></span>
                  <span></span>
                </div>
                <strong>No hay solicitudes nuevas pendientes</strong>
                <p>
                  Cuando un pasajero registre una necesidad de viaje,
                  aparecerá aquí para que puedas consultarla.
                </p>
              </div>
            )}

          {!cargandoSolicitudes && !errorSolicitudes && solicitudesNuevas.length > 0 && (
            <div className="solicitudes-nuevas-lista">
              {solicitudesNuevas.map((solicitud) => {
                const pasajero = solicitud.pasajero || {};

                return (
                  <article className="solicitud-nueva-tarjeta" key={solicitud.id}>
                    <div className="solicitud-nueva-superior">
                      <span className="solicitud-nueva-etiqueta">
                        NUEVA SOLICITUD
                      </span>
                      <span className="solicitud-nueva-estado">
                        <span></span>
                        Pendiente
                      </span>
                    </div>

                    <div className="solicitud-nueva-recorrido">
                      <div className="solicitud-nueva-linea">
                        <span className="solicitud-punto-origen"></span>
                        <span className="solicitud-linea"></span>
                        <span className="solicitud-punto-destino"></span>
                      </div>

                      <div className="solicitud-nueva-ubicaciones">
                        <div>
                          <small>ORIGEN</small>
                          <strong>{solicitud.origen || "No disponible"}</strong>
                        </div>
                        <div>
                          <small>DESTINO</small>
                          <strong>{solicitud.destino || "No disponible"}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="solicitud-nueva-datos">
                      <div>
                        <small>FECHA DEL VIAJE</small>
                        <strong>{obtenerFecha(solicitud.fecha_hora_salida)}</strong>
                      </div>
                      <div>
                        <small>HORA DE SALIDA</small>
                        <strong>{obtenerHora(solicitud.fecha_hora_salida)}</strong>
                      </div>
                    </div>

                    <div className="solicitud-nueva-pasajero">
                      <div className="solicitud-pasajero-avatar">
                        {pasajero.foto_url ? (
                          <img src={pasajero.foto_url} alt="Foto del pasajero" />
                        ) : (
                          (pasajero.nombre_completo || "P").charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <small>SOLICITADO POR</small>
                        <strong>{pasajero.nombre_completo || "Pasajero TdeA"}</strong>
                        {pasajero.telefono && <span>{pasajero.telefono}</span>}
                      </div>
                    </div>

                    <div className="solicitud-nueva-pie">
                      <span>
                        Registrada: {obtenerFecha(solicitud.creado_en)}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* SECCIÓN EXISTENTE: RUTAS PUBLICADAS */}
        <div className="rutas-publicadas-titulo">
          <h2>Mis rutas publicadas</h2>
          <p>Consulta los recorridos que ya has ofrecido a la comunidad.</p>
        </div>

        {cargando && (
          <div className="estado-carga">
            <div className="cargador"></div>
            <div>
              <strong>Cargando tus rutas</strong>
              <p>Estamos consultando tus recorridos publicados.</p>
            </div>
          </div>
        )}

        {!cargando && error && (
          <div className="estado-rutas estado-error">
            <div className="estado-rutas-icono">!</div>
            <div>
              <h2>No pudimos cargar tus rutas</h2>
              <p>{error}</p>
              <button
                type="button"
                className="boton-reintentar"
                onClick={() => window.location.reload()}
              >
                Intentar nuevamente
              </button>
            </div>
          </div>
        )}

        {!cargando && !error && rutas.length === 0 && (
          <div className="estado-rutas estado-vacio">
            <div className="ruta-vacia-ilustracion">
              <span></span><span></span><span></span>
            </div>
            <h2>Aún no tienes rutas publicadas</h2>
            <p>
              Cuando publiques una ruta, aparecerá aquí para que puedas
              consultar sus datos y disponibilidad de cupos.
            </p>
          </div>
        )}

        {!cargando && !error && rutas.length > 0 && (
          <div className="lista-rutas">
            {rutasOrdenadas.map((ruta, indice) => {
              const estado = obtenerEstado(ruta);
              const cuposTotales = obtenerCuposTotales(ruta);
              const cuposDisponibles = obtenerCuposDisponibles(ruta);
              const cuposOcupados = Math.max(cuposTotales - cuposDisponibles, 0);
              const porcentaje = cuposTotales > 0
                ? Math.min((cuposOcupados / cuposTotales) * 100, 100)
                : 0;

              return (
                <article className="tarjeta-ruta" key={ruta.id || `${ruta.origen}-${ruta.destino}-${indice}`}>
                  <div className="tarjeta-ruta-superior">
                    <div className="ruta-numero">Ruta {indice + 1}</div>
                    <span className={`estado-ruta ${obtenerClaseEstado(estado)}`}>
                      <span className="estado-punto"></span>
                      {estado}
                    </span>
                  </div>

                  <div className="recorrido">
                    <div className="recorrido-linea">
                      <span className="punto-origen"></span>
                      <span className="linea"></span>
                      <span className="punto-destino"></span>
                    </div>
                    <div className="ubicaciones">
                      <div className="ubicacion">
                        <small>ORIGEN</small>
                        <strong>{ruta.origen || "Origen no disponible"}</strong>
                      </div>
                      <div className="ubicacion">
                        <small>DESTINO</small>
                        <strong>{ruta.destino || "Destino no disponible"}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="informacion-ruta">
                    <div className="dato-ruta">
                      <span className="dato-etiqueta">FECHA</span>
                      <strong>{obtenerFecha(ruta.fecha_hora_salida || ruta.fechaHoraSalida || ruta.fecha_salida)}</strong>
                    </div>
                    <div className="dato-ruta">
                      <span className="dato-etiqueta">HORA</span>
                      <strong>{obtenerHora(ruta.fecha_hora_salida || ruta.fechaHoraSalida || ruta.fecha_salida)}</strong>
                    </div>
                    <div className="dato-ruta">
                      <span className="dato-etiqueta">CUPOS</span>
                      <strong>{cuposDisponibles} disponibles</strong>
                    </div>
                  </div>

                  <div className="cupos-ruta">
                    <div className="cupos-encabezado">
                      <span>Ocupación de la ruta</span>
                      <strong>{cuposOcupados} de {cuposTotales}</strong>
                    </div>
                    <div className="barra-cupos">
                      <div className="barra-cupos-progreso" style={{ width: `${porcentaje}%` }}></div>
                    </div>
                    <span className="cupos-ayuda">
                      {cuposDisponibles > 0
                        ? `Quedan ${cuposDisponibles} ${cuposDisponibles === 1 ? "cupo disponible" : "cupos disponibles"}`
                        : "No quedan cupos disponibles"}
                    </span>
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

export default MisRutas;
