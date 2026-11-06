import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import "../BuscarRutas.css";

const TOKEN_MAPBOX = import.meta.env.VITE_MAPBOX_TOKEN;

function BuscarRutas({
  rutasIniciales = [],
  API_URL = "http://localhost:5000",
  onSolicitarCupo,
  usuario,
}) {
  const [rutas, setRutas] = useState(rutasIniciales);
  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");
  const [fecha, setFecha] = useState("");
  const [cargandoRutas, setCargandoRutas] = useState(true);
  const [errorRutas, setErrorRutas] = useState("");
  const [solicitandoId, setSolicitandoId] = useState(null);
  const [rutasRechazadas, setRutasRechazadas] = useState([]);

  const mapaContenedor = useRef(null);
  const mapa = useRef(null);
  const marcadores = useRef([]);

  // ---------------------------------------------------------
  // CARGAR RUTAS DESDE EL BACKEND
  // ---------------------------------------------------------

  useEffect(() => {
    const cargarRutas = async () => {
      try {
        setCargandoRutas(true);
        setErrorRutas("");

        const respuesta = await fetch(`${API_URL}/api/rutas`);

        if (!respuesta.ok) {
          throw new Error("No fue posible consultar las rutas.");
        }

        const datos = await respuesta.json();

        setRutas(Array.isArray(datos) ? datos : []);
      } catch (error) {
        console.error("Error al cargar rutas:", error);

        setErrorRutas(
          "No fue posible cargar las rutas. Verifica que el servidor esté funcionando."
        );
      } finally {
        setCargandoRutas(false);
      }
    };

    cargarRutas();
  }, [API_URL]);

  useEffect(() => {
    const cargarSolicitudesPasajero = async () => {
      const idPasajero = usuario?.id || usuario?.id_usuario;
      const token = usuario?.token || usuario?.access_token;

      if (!idPasajero || !token) {
        setRutasRechazadas([]);
        return;
      }

      try {
        const respuesta = await fetch(
          `${API_URL}/api/solicitudes/pasajero/${encodeURIComponent(idPasajero)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const datos = await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(datos.mensaje || "No fue posible consultar tus solicitudes.");
        }

        const rechazadas = (datos.solicitudes || [])
          .filter((solicitud) => solicitud.estado === "rechazada")
          .map((solicitud) => String(solicitud.viaje_id));

        setRutasRechazadas(rechazadas);
      } catch (error) {
        console.error("Error al consultar solicitudes del pasajero:", error);
      }
    };

    cargarSolicitudesPasajero();
  }, [usuario?.id, usuario?.id_usuario, usuario?.token, usuario?.access_token, API_URL]);

  // ---------------------------------------------------------
  // MANEJAR SOLICITUD DE CUPO
  // ---------------------------------------------------------


  const manejarSolicitud = async (ruta) => {
    // Si el componente padre proporciona una función personalizada, usarla.
    if (onSolicitarCupo) {
      onSolicitarCupo(ruta);
      return;
    }

    const idPasajero = usuario?.id || usuario?.id_usuario;
    const token = usuario?.token || usuario?.access_token;

    if (!idPasajero || !token) {
      alert("Debes iniciar sesión para solicitar un cupo.");
      return;
    }

    try {
      setSolicitandoId(ruta.id || ruta.id_ruta);

      const respuesta = await fetch(`${API_URL}/api/solicitudes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          viaje_id: ruta.id || ruta.id_ruta,
          pasajero_id: idPasajero,
        }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje || "No fue posible solicitar el cupo."
        );
      }

      alert(
        datos.mensaje ||
        "Solicitud enviada correctamente. El conductor debe confirmar el cupo."
      );
    } catch (error) {
      console.error("Error al solicitar cupo:", error);
      alert(error.message || "Ocurrió un error al procesar tu solicitud.");
    } finally {
      setSolicitandoId(null);
    }
  };

  // ---------------------------------------------------------
  // FILTRAR RUTAS
  // ---------------------------------------------------------

  const rutasFiltradas = useMemo(() => {
    return rutas.filter((ruta) => {
      // Ocultar las rutas que este pasajero tiene rechazadas
      if (rutasRechazadas.includes(String(ruta.id || ruta.id_ruta))) {
        return false;
      }

      const coincideOrigen =
        !origen ||
        String(ruta.origen || "")
          .toLowerCase()
          .includes(origen.toLowerCase());

      const coincideDestino =
        !destino ||
        String(ruta.destino || "")
          .toLowerCase()
          .includes(destino.toLowerCase());

      const coincideFecha =
        !fecha || String(ruta.fecha || "").slice(0, 10) === fecha;

      return coincideOrigen && coincideDestino && coincideFecha;
    });
  }, [rutas, origen, destino, fecha, rutasRechazadas]);

  // ---------------------------------------------------------
  // CREAR MAPA
  // ---------------------------------------------------------

  useEffect(() => {
    if (!mapaContenedor.current || mapa.current) {
      return;
    }

    if (!TOKEN_MAPBOX) {
      console.error(
        "No se encontró VITE_MAPBOX_TOKEN en el archivo .env del frontend."
      );

      return;
    }

    mapboxgl.accessToken = TOKEN_MAPBOX;

    mapa.current = new mapboxgl.Map({
      container: mapaContenedor.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [-75.5636, 6.2518],
      zoom: 11,
    });

    mapa.current.addControl(
      new mapboxgl.NavigationControl(),
      "top-right"
    );

    mapa.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true,
        },
        trackUserLocation: true,
        showUserHeading: true,
        showAccuracyCircle: true,
      }),
      "top-right"
    );

    mapa.current.addControl(
      new mapboxgl.FullscreenControl(),
      "top-right"
    );

    return () => {
      marcadores.current.forEach((marcador) => marcador.remove());

      marcadores.current = [];

      if (mapa.current) {
        mapa.current.remove();
        mapa.current = null;
      }
    };
  }, []);

  // ---------------------------------------------------------
  // MOSTRAR RUTAS EN EL MAPA
  // ---------------------------------------------------------

  useEffect(() => {
    if (!mapa.current) {
      return;
    }

    const mostrarMarcadores = () => {
      // Eliminar marcadores anteriores
      marcadores.current.forEach((marcador) => marcador.remove());
      marcadores.current = [];

      const coordenadas = [];

      rutasFiltradas.forEach((ruta) => {
        const latOrigen = Number(ruta.lat_origen);
        const lngOrigen = Number(ruta.lng_origen);

        const latDestino = Number(ruta.lat_destino);
        const lngDestino = Number(ruta.lng_destino);

        const tieneOrigenValido =
          Number.isFinite(latOrigen) &&
          Number.isFinite(lngOrigen);

        const tieneDestinoValido =
          Number.isFinite(latDestino) &&
          Number.isFinite(lngDestino);

        if (tieneOrigenValido) {
          const marcadorOrigen = new mapboxgl.Marker({
            color: "#0b5f91",
          })
            .setLngLat([lngOrigen, latOrigen])
            .setPopup(
              new mapboxgl.Popup({ offset: 25 }).setHTML(`
                <strong>Origen</strong>
                <br />
                ${ruta.origen || "Sin información"}
              `)
            )
            .addTo(mapa.current);

          marcadores.current.push(marcadorOrigen);
          coordenadas.push([lngOrigen, latOrigen]);
        }

        if (tieneDestinoValido) {
          const marcadorDestino = new mapboxgl.Marker({
            color: "#0a9a8f",
          })
            .setLngLat([lngDestino, latDestino])
            .setPopup(
              new mapboxgl.Popup({ offset: 25 }).setHTML(`
                <strong>Destino</strong>
                <br />
                ${ruta.destino || "Sin información"}
              `)
            )
            .addTo(mapa.current);

          marcadores.current.push(marcadorDestino);
          coordenadas.push([lngDestino, latDestino]);
        }
      });

      if (coordenadas.length > 0) {
        const limites = coordenadas.reduce(
          (bounds, coordenada) => bounds.extend(coordenada),
          new mapboxgl.LngLatBounds(
            coordenadas[0],
            coordenadas[0]
          )
        );

        mapa.current.fitBounds(limites, {
          padding: 80,
          maxZoom: 14,
          duration: 1000,
        });
      }
    };

    if (mapa.current.loaded()) {
      mostrarMarcadores();
    } else {
      mapa.current.once("load", mostrarMarcadores);
    }
  }, [rutasFiltradas]);

  // ---------------------------------------------------------
  // LIMPIAR BÚSQUEDA
  // ---------------------------------------------------------

  const limpiarBusqueda = () => {
    setOrigen("");
    setDestino("");
    setFecha("");
  };

  return (
    <section className="buscar-rutas">
      <div className="buscar-rutas-encabezado">
        <span className="buscar-rutas-etiqueta">TDEA GO</span>

        <h1>Buscar una ruta</h1>

        <p>
          Encuentra rutas disponibles ofrecidas por otros usuarios de la
          comunidad TdeA.
        </p>
      </div>

      {/* --------------------------------------------------- */}
      {/* BUSCADOR */}
      {/* --------------------------------------------------- */}

      <div className="buscador-rutas">
        <div className="campo-busqueda">
          <label htmlFor="origen">Origen</label>

          <input
            id="origen"
            type="text"
            value={origen}
            onChange={(e) => setOrigen(e.target.value)}
            placeholder="¿Desde dónde viajas?"
          />
        </div>

        <div className="campo-busqueda">
          <label htmlFor="destino">Destino</label>

          <input
            id="destino"
            type="text"
            value={destino}
            onChange={(e) => setDestino(e.target.value)}
            placeholder="¿A dónde quieres llegar?"
          />
        </div>

        <div className="campo-busqueda">
          <label htmlFor="fecha">Fecha</label>

          <input
            id="fecha"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
          />
        </div>

        <button
          type="button"
          className="boton-limpiar"
          onClick={limpiarBusqueda}
        >
          Limpiar
        </button>
      </div>

      {/* --------------------------------------------------- */}
      {/* MAPA */}
      {/* --------------------------------------------------- */}

      <div
        style={{
          marginTop: "24px",
          width: "100%",
          height: "430px",
          borderRadius: "18px",
          overflow: "hidden",
          position: "relative",
          border: "1px solid #dfe7ec",
          boxShadow: "0 8px 24px rgba(7, 59, 104, 0.08)",
          background: "#eef3f5",
        }}
      >
        {!TOKEN_MAPBOX && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px",
              textAlign: "center",
              background: "#f5f8fa",
              color: "#073b68",
            }}
          >
            <div>
              <strong>No se encontró el token de Mapbox.</strong>
              <p>
                Verifica que exista VITE_MAPBOX_TOKEN en frontend/.env.
              </p>
            </div>
          </div>
        )}

        <div
          ref={mapaContenedor}
          style={{
            width: "100%",
            height: "100%",
          }}
        />
      </div>

      <p
        style={{
          marginTop: "10px",
          fontSize: "13px",
          color: "#687782",
        }}
      >
        Usa el botón de ubicación del mapa para permitir que TdeA GO
        consulte tu ubicación actual.
      </p>

      {/* --------------------------------------------------- */}
      {/* RESULTADOS */}
      {/* --------------------------------------------------- */}

      <div className="resultados-rutas">
        <div className="resultados-encabezado">
          <h2>Rutas disponibles</h2>

          <span>
            {rutasFiltradas.length}{" "}
            {rutasFiltradas.length === 1
              ? "ruta encontrada"
              : "rutas encontradas"}
          </span>
        </div>

        {cargandoRutas ? (
          <div className="estado-rutas">
            <div className="estado-rutas-icono">🗺️</div>

            <h3>Cargando rutas</h3>

            <p>
              Estamos consultando las rutas disponibles.
            </p>
          </div>
        ) : errorRutas ? (
          <div className="estado-rutas">
            <div className="estado-rutas-icono">⚠️</div>

            <h3>No fue posible cargar las rutas</h3>

            <p>{errorRutas}</p>
          </div>
        ) : rutas.length === 0 ? (
          <div className="estado-rutas">
            <div className="estado-rutas-icono">🚗</div>

            <h3>Aún no hay rutas disponibles</h3>

            <p>
              Cuando un conductor publique una ruta, aparecerá aquí para
              que puedas consultarla y solicitar un cupo.
            </p>
          </div>
        ) : rutasFiltradas.length === 0 ? (
          <div className="estado-rutas">
            <div className="estado-rutas-icono">🔎</div>

            <h3>No encontramos rutas</h3>

            <p>
              Intenta cambiar el origen, destino o fecha de búsqueda.
            </p>

            <button
              type="button"
              className="boton-secundario"
              onClick={limpiarBusqueda}
            >
              Ver todas las rutas
            </button>
          </div>
        ) : (
          <div className="lista-rutas">
            {rutasFiltradas.map((ruta) => {
              const cuposDisponibles = Number(
                ruta.cupos_disponibles ??
                ruta.cuposDisponibles ??
                ruta.cupos ??
                0
              );

              const estaSolicitando = solicitandoId === ruta.id;

              return (
                <article
                  className="tarjeta-ruta"
                  key={ruta.id || ruta.id_ruta}
                >
                  <div className="ruta-principal">
                    <div className="ruta-lugar">
                      <span className="ruta-punto origen"></span>

                      <div>
                        <small>Origen</small>
                        <strong>{ruta.origen}</strong>
                      </div>
                    </div>

                    <div className="ruta-linea"></div>

                    <div className="ruta-lugar">
                      <span className="ruta-punto destino"></span>

                      <div>
                        <small>Destino</small>
                        <strong>{ruta.destino}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="ruta-informacion">
                    <div>
                      <span>Fecha</span>
                      <strong>
                        {ruta.fecha || "No especificada"}
                      </strong>
                    </div>

                    <div>
                      <span>Hora</span>
                      <strong>
                        {ruta.hora || "No especificada"}
                      </strong>
                    </div>

                    <div>
                      <span>Cupos disponibles</span>
                      <strong>{cuposDisponibles}</strong>
                    </div>
                  </div>

                  {(ruta.conductor?.nombre_completo || ruta.conductor_nombre) && (
                    <div className="ruta-conductor">
                      <div className="conductor-avatar">
                        {String(
                          ruta.conductor?.nombre_completo || ruta.conductor_nombre
                        )
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div>
                        <span>Conductor</span>
                        <strong>
                          {ruta.conductor?.nombre_completo || ruta.conductor_nombre}
                        </strong>
                      </div>
                    </div>
                  )}

                  <div className="ruta-acciones">
                    <button
                      type="button"
                      className="boton-solicitar"
                      disabled={cuposDisponibles <= 0 || estaSolicitando}
                      onClick={() => manejarSolicitud(ruta)}
                    >
                      {estaSolicitando
                        ? "Procesando..."
                        : cuposDisponibles > 0
                          ? "Solicitar cupo"
                          : "Sin cupos disponibles"}
                    </button>
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

export default BuscarRutas;