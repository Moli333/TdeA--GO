import { useEffect, useMemo, useState } from "react";
import "./MisRutas.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

function MisRutas({ usuario }) {
  const [rutas, setRutas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const cargarRutas = async () => {
      if (!usuario?.id) {
        setRutas([]);
        setCargando(false);
        return;
      }

      setCargando(true);
      setError("");

      try {
        const respuesta = await fetch(`${API_URL}/api/rutas`);

        const datos = await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(
            datos.mensaje || "No fue posible consultar las rutas."
          );
        }

        const listaRutas = Array.isArray(datos)
          ? datos
          : Array.isArray(datos.rutas)
            ? datos.rutas
            : [];

        const rutasDelConductor = listaRutas.filter((ruta) => {
          const idConductor =
            ruta.conductor_id ??
            ruta.id_conductor ??
            ruta.conductorId;

          return String(idConductor) === String(usuario.id);
        });

        setRutas(rutasDelConductor);
      } catch (error) {
        console.error("Error al cargar mis rutas:", error);
        setError(
          error.message || "No fue posible cargar tus rutas."
        );
      } finally {
        setCargando(false);
      }
    };

    cargarRutas();
  }, [usuario]);

  const rutasOrdenadas = useMemo(() => {
    return [...rutas].sort((a, b) => {
      const fechaA =
        a.fecha_hora_salida ||
        a.fechaHoraSalida ||
        a.fecha_salida ||
        "";

      const fechaB =
        b.fecha_hora_salida ||
        b.fechaHoraSalida ||
        b.fecha_salida ||
        "";

      return new Date(fechaA) - new Date(fechaB);
    });
  }, [rutas]);

  const obtenerFecha = (ruta) => {
    const fecha =
      ruta.fecha_hora_salida ||
      ruta.fechaHoraSalida ||
      ruta.fecha_salida;

    if (!fecha) {
      return "Fecha no disponible";
    }

    const fechaConvertida = new Date(fecha);

    if (Number.isNaN(fechaConvertida.getTime())) {
      return String(fecha);
    }

    return fechaConvertida.toLocaleDateString("es-CO", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const obtenerHora = (ruta) => {
    const fecha =
      ruta.fecha_hora_salida ||
      ruta.fechaHoraSalida ||
      ruta.fecha_salida;

    if (!fecha) {
      return "--:--";
    }

    const fechaConvertida = new Date(fecha);

    if (Number.isNaN(fechaConvertida.getTime())) {
      return "--:--";
    }

    return fechaConvertida.toLocaleTimeString("es-CO", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const obtenerCuposTotales = (ruta) => {
    return Number(
      ruta.cupos_totales ??
        ruta.cuposTotales ??
        ruta.cupos ??
        0
    );
  };

  const obtenerCuposDisponibles = (ruta) => {
    return Number(
      ruta.cupos_disponibles ??
        ruta.cuposDisponibles ??
        0
    );
  };

  const obtenerCuposOcupados = (ruta) => {
    const totales = obtenerCuposTotales(ruta);
    const disponibles = obtenerCuposDisponibles(ruta);

    return Math.max(totales - disponibles, 0);
  };

  const obtenerEstado = (ruta) => {
    const fecha =
      ruta.fecha_hora_salida ||
      ruta.fechaHoraSalida ||
      ruta.fecha_salida;

    const cuposDisponibles = obtenerCuposDisponibles(ruta);

    if (fecha) {
      const fechaRuta = new Date(fecha);

      if (
        !Number.isNaN(fechaRuta.getTime()) &&
        fechaRuta < new Date()
      ) {
        return "Finalizada";
      }
    }

    if (cuposDisponibles === 0) {
      return "Sin cupos";
    }

    return "Disponible";
  };

  const obtenerClaseEstado = (estado) => {
    if (estado === "Finalizada") {
      return "estado-finalizada";
    }

    if (estado === "Sin cupos") {
      return "estado-sin-cupos";
    }

    return "estado-disponible";
  };

  if (!usuario?.id) {
    return (
      <section className="pagina-servicio mis-rutas-pagina">
        <div className="contenedor">
          <div className="mis-rutas-acceso">
            <div className="mis-rutas-acceso-icono">
              !
            </div>

            <h1>Mis rutas</h1>

            <p>
              Inicia sesión para consultar las rutas que
              has publicado como conductor.
            </p>
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
            <span className="etiqueta-verde">
              CONDUCTOR
            </span>

            <h1>Mis rutas</h1>

            <p>
              Consulta y administra los recorridos que
              has publicado para la comunidad TdeA.
            </p>
          </div>

          <div className="resumen-rutas">
            <span className="resumen-numero">
              {rutas.length}
            </span>

            <span className="resumen-texto">
              {rutas.length === 1
                ? "ruta publicada"
                : "rutas publicadas"}
            </span>
          </div>
        </div>

        {cargando && (
          <div className="estado-carga">
            <div className="cargador"></div>

            <div>
              <strong>Cargando tus rutas</strong>

              <p>
                Estamos consultando tus recorridos publicados.
              </p>
            </div>
          </div>
        )}

        {!cargando && error && (
          <div className="estado-rutas estado-error">
            <div className="estado-rutas-icono">
              !
            </div>

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
              <span></span>
              <span></span>
              <span></span>
            </div>

            <h2>Aún no tienes rutas publicadas</h2>

            <p>
              Cuando publiques una ruta, aparecerá aquí
              para que puedas consultar sus datos y
              disponibilidad de cupos.
            </p>
          </div>
        )}

        {!cargando && !error && rutas.length > 0 && (
          <div className="lista-rutas">
            {rutasOrdenadas.map((ruta, indice) => {
              const estado = obtenerEstado(ruta);
              const cuposTotales =
                obtenerCuposTotales(ruta);
              const cuposDisponibles =
                obtenerCuposDisponibles(ruta);
              const cuposOcupados =
                obtenerCuposOcupados(ruta);

              const porcentaje =
                cuposTotales > 0
                  ? Math.min(
                      (cuposOcupados / cuposTotales) * 100,
                      100
                    )
                  : 0;

              return (
                <article
                  className="tarjeta-ruta"
                  key={
                    ruta.id ||
                    ruta.id_ruta ||
                    `${ruta.origen}-${ruta.destino}-${indice}`
                  }
                >
                  <div className="tarjeta-ruta-superior">
                    <div className="ruta-numero">
                      Ruta {indice + 1}
                    </div>

                    <span
                      className={`estado-ruta ${obtenerClaseEstado(
                        estado
                      )}`}
                    >
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

                        <strong>
                          {ruta.origen ||
                            "Origen no disponible"}
                        </strong>
                      </div>

                      <div className="ubicacion">
                        <small>DESTINO</small>

                        <strong>
                          {ruta.destino ||
                            "Destino no disponible"}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="informacion-ruta">
                    <div className="dato-ruta">
                      <span className="dato-etiqueta">
                        FECHA
                      </span>

                      <strong>
                        {obtenerFecha(ruta)}
                      </strong>
                    </div>

                    <div className="dato-ruta">
                      <span className="dato-etiqueta">
                        HORA
                      </span>

                      <strong>
                        {obtenerHora(ruta)}
                      </strong>
                    </div>

                    <div className="dato-ruta">
                      <span className="dato-etiqueta">
                        CUPOS
                      </span>

                      <strong>
                        {cuposDisponibles} disponibles
                      </strong>
                    </div>
                  </div>

                  <div className="cupos-ruta">
                    <div className="cupos-encabezado">
                      <span>
                        Ocupación de la ruta
                      </span>

                      <strong>
                        {cuposOcupados} de {cuposTotales}
                      </strong>
                    </div>

                    <div className="barra-cupos">
                      <div
                        className="barra-cupos-progreso"
                        style={{
                          width: `${porcentaje}%`,
                        }}
                      ></div>
                    </div>

                    <span className="cupos-ayuda">
                      {cuposDisponibles > 0
                        ? `Quedan ${cuposDisponibles} ${
                            cuposDisponibles === 1
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