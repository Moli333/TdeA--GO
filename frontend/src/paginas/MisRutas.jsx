
import { useEffect, useMemo, useState } from "react";
import "./MisRutas.css";

function MisRutas({ usuario, API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000" }) {
  const [rutas, setRutas] = useState([]);
  const [solicitudesNuevas, setSolicitudesNuevas] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [cargandoReservas, setCargandoReservas] = useState(true);
  const [errorReservas, setErrorReservas] = useState("");
  const [procesandoSolicitud, setProcesandoSolicitud] = useState(null);
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

    const cargarReservas = async () => {
      try {
        const token = usuario?.token || usuario?.access_token;

        if (!token) {
          throw new Error("No se encontró la sesión. Cierra sesión e ingresa nuevamente.");
        }

        const respuesta = await fetch(
          `${API_URL}/api/solicitudes/conductor/${encodeURIComponent(usuario.id)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const datos = await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(datos.mensaje || "No fue posible consultar las reservas.");
        }

        if (!cancelado) {
          setReservas(Array.isArray(datos) ? datos : datos.solicitudes || []);
          setErrorReservas("");
        }
      } catch (error) {
        console.error("Error al cargar las reservas de cupos:", error);

        if (!cancelado) {
          setErrorReservas(error.message || "No fue posible cargar las reservas.");
        }
      } finally {
        if (!cancelado) setCargandoReservas(false);
      }
    };

    cargarRutas();
    cargarSolicitudesNuevas();
    cargarReservas();

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

  const obtenerIdRutaSolicitud = (solicitud) =>
    solicitud.viaje_id ??
    solicitud.ruta_id ??
    solicitud.ruta?.id ??
    solicitud.ruta?.id_ruta;

  const normalizarEstadoSolicitud = (estado) =>
    String(estado || "").trim().toLowerCase();

  const esReservaAceptada = (solicitud) =>
    ["aceptada", "aceptado", "aprobada", "aprobado"].includes(
      normalizarEstadoSolicitud(solicitud.estado)
    );

  const obtenerTextoEstadoSolicitud = (estado) => {
    const valor = normalizarEstadoSolicitud(estado);

    if (["aceptada", "aceptado", "aprobada", "aprobado"].includes(valor)) {
      return "Aprobada";
    }

    if (["rechazada", "rechazado"].includes(valor)) {
      return "Rechazada";
    }

    return "Pendiente";
  };

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

  const responderSolicitud = async (solicitud, accion) => {
    try {
      const token = usuario?.token || usuario?.access_token;

      if (!token) {
        throw new Error("No se encontró la sesión. Inicia sesión nuevamente.");
      }

      setProcesandoSolicitud(solicitud.id);

      const respuesta = await fetch(
        `${API_URL}/api/solicitudes/${encodeURIComponent(solicitud.id)}/responder`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ accion }),
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || "No fue posible responder la solicitud.");
      }

      // Actualizar el estado de la solicitud en pantalla
      setReservas((anteriores) =>
        anteriores.map((item) =>
          String(item.id) === String(solicitud.id)
            ? { ...item, estado: datos.resultado.estado }
            : item
        )
      );

      // Actualizar los cupos disponibles de la ruta
      if (accion === "aceptar") {
        const idRuta = obtenerIdRutaSolicitud(solicitud);
        const cuposActualizados = Number(datos.resultado?.cupos_disponibles);

        if (idRuta && Number.isFinite(cuposActualizados)) {
          setRutas((anteriores) =>
            anteriores.map((ruta) =>
              String(ruta.id ?? ruta.id_ruta) === String(idRuta)
                ? {
                  ...ruta,
                  cupos_disponibles: cuposActualizados,
                }
                : ruta
            )
          );
        }
      }

      alert(datos.mensaje);
    } catch (error) {
      console.error("Error al responder la solicitud:", error);
      alert(error.message || "Ocurrió un error al responder la solicitud.");
    } finally {
      setProcesandoSolicitud(null);
    }
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

        {/* RESERVAS DE CUPOS EN RUTAS PUBLICADAS */}
        <section className="solicitudes-nuevas-seccion">
          <div className="solicitudes-nuevas-encabezado">
            <div>
              <span className="solicitud-nueva-etiqueta">GESTIÓN DE PASAJEROS</span>
              <h2>Reservas de cupos</h2>
              <p>
                Consulta la información de las personas que solicitan reservar
                un espacio en tus rutas publicadas.
              </p>
            </div>

            <div className="solicitudes-nuevas-contador">
              {reservas.length}
              <small>Reservas</small>
            </div>
          </div>

          {cargandoReservas && (
            <div className="solicitudes-nuevas-cargando">
              Consultando las reservas de tus rutas...
            </div>
          )}

          {!cargandoReservas && errorReservas && (
            <div className="solicitudes-nuevas-error">
              <p>{errorReservas}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
              >
                Volver a cargar
              </button>
            </div>
          )}

          {!cargandoReservas && !errorReservas && reservas.length === 0 && (
            <div className="solicitudes-nuevas-vacio">
              <div className="solicitud-vacia-ruta">
                <span></span>
                <span></span>
              </div>
              <strong>Aún no tienes reservas de cupos</strong>
              <p>
                Cuando un estudiante solicite reservar un espacio en alguna
                de tus rutas, encontrarás aquí su información.
              </p>
            </div>
          )}

          {!cargandoReservas && !errorReservas && reservas.length > 0 && (
            <div className="solicitudes-nuevas-lista">
              {reservas.map((solicitud, indice) => {
                const pasajero = solicitud.pasajero || {};
                const ruta = solicitud.ruta || {};

                return (
                  <article
                    className="solicitud-nueva-tarjeta"
                    key={solicitud.id || indice}
                  >
                    <div className="solicitud-nueva-superior">
                      <span className="solicitud-nueva-etiqueta">
                        SOLICITUD DE RESERVA
                      </span>

                      <span className="solicitud-nueva-estado">
                        <span></span>
                        {obtenerTextoEstadoSolicitud(solicitud.estado)}
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
                          <strong>{ruta.origen || "No disponible"}</strong>
                        </div>
                        <div>
                          <small>DESTINO</small>
                          <strong>{ruta.destino || "No disponible"}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="solicitud-nueva-pasajero">
                      <div className="solicitud-pasajero-avatar">
                        {pasajero.foto_url ? (
                          <img
                            src={pasajero.foto_url}
                            alt={`Foto de ${pasajero.nombre_completo || "pasajero"}`}
                          />
                        ) : (
                          (pasajero.nombre_completo || "P")
                            .charAt(0)
                            .toUpperCase()
                        )}
                      </div>

                      <div>
                        <small>INFORMACIÓN DEL PASAJERO</small>
                        <strong>
                          {pasajero.nombre_completo || "Nombre no disponible"}
                        </strong>
                        <span>
                          {pasajero.verificado
                            ? "Cuenta verificada"
                            : "Cuenta sin verificar"}
                        </span>
                      </div>
                    </div>

                    <div className="solicitud-nueva-datos">
                      <div>
                        <small>CORREO INSTITUCIONAL</small>
                        <strong>{pasajero.correo || "No disponible"}</strong>
                      </div>

                      <div>
                        <small>TELÉFONO</small>
                        <strong>{pasajero.telefono || "No registrado"}</strong>
                      </div>
                    </div>

                    <div className="solicitud-nueva-pie">
                      Solicitud recibida:{" "}
                      {solicitud.fecha_solicitud
                        ? new Date(solicitud.fecha_solicitud).toLocaleString("es-CO")
                        : "Fecha no disponible"}
                    </div>

                    {(solicitud.estado || "").toLowerCase() === "pendiente" && (
                      <div className="solicitud-acciones">
                        <button
                          type="button"
                          className="boton-aceptar-solicitud"
                          disabled={procesandoSolicitud !== null}
                          onClick={() => responderSolicitud(solicitud, "aceptar")}
                        >
                          {procesandoSolicitud === solicitud.id
                            ? "Procesando..."
                            : "Aceptar cupo"}
                        </button>

                        <button
                          type="button"
                          className="boton-rechazar-solicitud"
                          disabled={procesandoSolicitud !== null}
                          onClick={() => responderSolicitud(solicitud, "rechazar")}
                        >
                          Rechazar
                        </button>
                      </div>
                    )}

                  </article>
                );
              })}
            </div>
          )}
        </section>

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
              const reservasRuta = reservas.filter(
                (solicitud) =>
                  String(obtenerIdRutaSolicitud(solicitud)) ===
                  String(ruta.id ?? ruta.id_ruta)
              );

              const reservasAceptadas = reservasRuta.filter(esReservaAceptada);

              const cuposOcupados = reservasAceptadas.length;
              const cuposDisponiblesCalculados = Math.max(
                cuposTotales - cuposOcupados,
                0
              );

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
                      <span>Distribución de cupos</span>
                      <strong>
                        {cuposOcupados} de {cuposTotales} ocupados
                      </strong>
                    </div>

                    <div className="barra-cupos">
                      <div
                        className="barra-cupos-progreso"
                        style={{
                          width: `${cuposTotales > 0
                            ? Math.min((cuposOcupados / cuposTotales) * 100, 100)
                            : 0
                            }%`,
                        }}
                      ></div>
                    </div>

                    <div className="lista-cupos-individuales">
                      {Array.from({ length: cuposTotales }, (_, indiceCupo) => {
                        const reserva = reservasAceptadas[indiceCupo];
                        const pasajero = reserva?.pasajero || {};

                        const tarifa =
                          reserva?.tarifa_acordada ??
                          reserva?.tarifa_sugerida ??
                          ruta.tarifa_contribucion ??
                          ruta.tarifa_sugerida;

                        return (
                          <div
                            key={reserva?.id || `cupo-${ruta.id}-${indiceCupo}`}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: "12px",
                              padding: "12px",
                              marginTop: "10px",
                              border: "1px solid #dfe7ec",
                              borderRadius: "10px",
                              background: reserva ? "#f0faf4" : "#fff8f8",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              {reserva && pasajero.foto_url ? (
                                <img
                                  src={pasajero.foto_url}
                                  alt="Foto del pasajero"
                                  style={{
                                    width: "40px",
                                    height: "40px",
                                    borderRadius: "50%",
                                    objectFit: "cover",
                                  }}
                                />
                              ) : (
                                <div
                                  style={{
                                    width: "40px",
                                    height: "40px",
                                    borderRadius: "50%",
                                    display: "grid",
                                    placeItems: "center",
                                    background: reserva ? "#d9f2e3" : "#fce3e3",
                                    fontWeight: "600",
                                  }}
                                >
                                  {reserva
                                    ? (pasajero.nombre_completo || "P").charAt(0).toUpperCase()
                                    : indiceCupo + 1}
                                </div>
                              )}

                              <div>
                                <strong>
                                  {reserva
                                    ? pasajero.nombre_completo || "Pasajero reservado"
                                    : `Cupo ${indiceCupo + 1} - Disponible`}
                                </strong>

                                {reserva && (
                                  <div style={{ fontSize: "12px", color: "#687782" }}>
                                    {pasajero.telefono || pasajero.correo || "Datos no disponibles"}
                                  </div>
                                )}
                              </div>
                            </div>

                            <strong
                              style={{
                                color: reserva ? "#16834a" : "#c62828",
                                whiteSpace: "nowrap",
                                fontSize: "13px",
                              }}
                            >
                              {tarifa != null
                                ? `$${Number(tarifa).toLocaleString("es-CO")}`
                                : "Tarifa pendiente"}
                            </strong>
                          </div>
                        );
                      })}
                    </div>

                    <span className="cupos-ayuda">
                      {cuposDisponiblesCalculados > 0
                        ? `Quedan ${cuposDisponiblesCalculados} ${cuposDisponiblesCalculados === 1
                          ? "cupo disponible"
                          : "cupos disponibles"
                        }`
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
