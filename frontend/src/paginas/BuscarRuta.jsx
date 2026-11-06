import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import "../BuscarRutas.css";

const TOKEN_MAPBOX = import.meta.env.VITE_MAPBOX_TOKEN;

function MiniMapaTarjeta({ ruta }) {
  const contenedorRef = useRef(null);

  useEffect(() => {
    const latOrigen = Number(ruta.lat_origen);
    const lngOrigen = Number(ruta.lng_origen);
    const latDestino = Number(ruta.lat_destino);
    const lngDestino = Number(ruta.lng_destino);

    const coordenadasValidas = [
      latOrigen,
      lngOrigen,
      latDestino,
      lngDestino,
    ].every(Number.isFinite);

    if (
      !contenedorRef.current ||
      !TOKEN_MAPBOX ||
      !coordenadasValidas
    ) {
      return;
    }

    const mapaMiniatura = new mapboxgl.Map({
      container: contenedorRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [lngOrigen, latOrigen],
      zoom: 11,
      interactive: false,
      attributionControl: false,
    });

    mapaMiniatura.on("load", async () => {
      try {
        const coordenadas = `${lngOrigen},${latOrigen};${lngDestino},${latDestino}`;

        const respuesta = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${coordenadas}?geometries=geojson&overview=full&access_token=${TOKEN_MAPBOX}`
        );

        if (!respuesta.ok) return;

        const datos = await respuesta.json();
        const recorrido = datos.routes?.[0]?.geometry;

        if (!recorrido || !mapaMiniatura.getStyle()) return;

        mapaMiniatura.addSource("recorrido-miniatura", {
          type: "geojson",
          data: {
            type: "Feature",
            geometry: recorrido,
            properties: {},
          },
        });

        mapaMiniatura.addLayer({
          id: "linea-recorrido-miniatura",
          type: "line",
          source: "recorrido-miniatura",
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": "#2563eb",
            "line-width": 4,
          },
        });

        const limites = new mapboxgl.LngLatBounds();

        recorrido.coordinates.forEach((punto) => {
          limites.extend(punto);
        });

        mapaMiniatura.fitBounds(limites, {
          padding: 35,
          maxZoom: 14,
        });
      } catch (error) {
        console.error("Error al cargar el mini mapa:", error);
      }
    });

    return () => {
      mapaMiniatura.remove();
    };
  }, [
    ruta.lat_origen,
    ruta.lng_origen,
    ruta.lat_destino,
    ruta.lng_destino,
  ]);

  const tieneCoordenadas = [
    ruta.lat_origen,
    ruta.lng_origen,
    ruta.lat_destino,
    ruta.lng_destino,
  ].every((valor) => valor !== null && valor !== undefined && valor !== "");

  if (!tieneCoordenadas || !TOKEN_MAPBOX) {
    return (
      <div className="mini-mapa-sin-datos">
        Mapa no disponible para este recorrido.
      </div>
    );
  }

  return <div ref={contenedorRef} className="mini-mapa-tarjeta" />;
}

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

        const token = usuario?.token || usuario?.access_token;

        const respuesta = await fetch(`${API_URL}/api/rutas`, {
          headers: token
            ? { Authorization: `Bearer ${token}` }
            : {}
        });

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
  }, [API_URL, usuario?.token, usuario?.access_token]);
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
              const idRuta = ruta.id || ruta.id_ruta;

              const cuposTotales = Number(ruta.cupos_totales || 0);
              const cuposDisponibles = Number(
                ruta.cupos_disponibles ??
                ruta.cuposDisponibles ??
                ruta.cupos ??
                0
              );

              const reservas = ruta.reservas_aceptadas || [];
              const cuposOcupados = Number(
                ruta.cupos_ocupados ?? reservas.length
              );

              const conductor = ruta.conductor || {};
              const vehiculo = ruta.vehiculo || {};

              const estaSolicitando = String(solicitandoId) === String(idRuta);

              const tarifaPorCupo = Number(
                ruta.tarifa_sugerida ||
                ruta.tarifa_contribucion ||
                0
              );

              const formatoPesos = (valor) =>
                Number(valor || 0).toLocaleString("es-CO", {
                  style: "currency",
                  currency: "COP",
                  maximumFractionDigits: 0,
                });

              return (
                <article className="tarjeta-ruta" key={idRuta}>
                  <div className="tarjeta-ruta-encabezado">
                    <span>RUTA DISPONIBLE</span>
                    <span className="estado-ruta-disponible">
                      {cuposDisponibles > 0 ? "Disponible" : "Completa"}
                    </span>
                  </div>

                  <div className="ruta-principal">
                    <div className="ruta-lugar">
                      <span className="ruta-punto origen"></span>
                      <div>
                        <small>Origen</small>
                        <strong>{ruta.origen || "No especificado"}</strong>
                      </div>
                    </div>

                    <div className="ruta-linea"></div>

                    <div className="ruta-lugar">
                      <span className="ruta-punto destino"></span>
                      <div>
                        <small>Destino</small>
                        <strong>{ruta.destino || "No especificado"}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="ruta-informacion">
                    <div>
                      <span>Fecha</span>
                      <strong>{ruta.fecha || "No especificada"}</strong>
                    </div>
                    <div>
                      <span>Hora</span>
                      <strong>{ruta.hora || "No especificada"}</strong>
                    </div>
                    <div>
                      <span>Distancia</span>
                      <strong>
                        {ruta.distancia_km
                          ? `${Number(ruta.distancia_km).toFixed(1)} km`
                          : "No disponible"}
                      </strong>
                    </div>
                    <div>
                      <span>Duración estimada</span>
                      <strong>
                        {ruta.duracion_minutos
                          ? `${Math.round(Number(ruta.duracion_minutos))} min`
                          : "No disponible"}
                      </strong>
                    </div>
                  </div>

                  <div className="tarjeta-seccion">
                    <h3>Mapa del recorrido</h3>
                    <MiniMapaTarjeta ruta={ruta} />
                  </div>

                  <div className="tarjeta-seccion">
                    <h3>Información del conductor</h3>

                    <div className="tarjeta-conductor">
                      {conductor.foto_url ? (
                        <img
                          src={conductor.foto_url}
                          alt={`Foto de ${conductor.nombre_completo || "conductor"}`}
                          className="avatar-ruta"
                        />
                      ) : (
                        <div className="avatar-ruta avatar-inicial">
                          {(conductor.nombre_completo || "C").charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div className="datos-conductor">
                        <strong>
                          {conductor.nombre_completo || "Conductor"}
                        </strong>
                        <span>
                          {conductor.verificado ? "Usuario verificado" : "Verificación pendiente"}
                        </span>
                        {conductor.telefono && (
                          <span>
                            Teléfono: {conductor.telefono}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="tarjeta-seccion">
                    <h3>Vehículo</h3>

                    <div className="datos-vehiculo">
                      <div>
                        <span>Tipo</span>
                        <strong>{vehiculo.tipo || "No disponible"}</strong>
                      </div>
                      <div>
                        <span>Marca y modelo</span>
                        <strong>{vehiculo.marca_modelo || "No disponible"}</strong>
                      </div>
                      <div>
                        <span>Placa</span>
                        <strong>{vehiculo.placa || "No disponible"}</strong>
                      </div>
                      <div>
                        <span>Color</span>
                        <strong>{vehiculo.color || "No disponible"}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="tarjeta-seccion">
                    <h3>Distribución de cupos</h3>

                    <div className="resumen-cupos">
                      <span>{cuposOcupados} ocupados</span>
                      <span>{cuposDisponibles} disponibles</span>
                      <span>{cuposTotales} en total</span>
                    </div>

                    <div className="barra-cupos">
                      <div
                        className="barra-cupos-ocupados"
                        style={{
                          width: `${cuposTotales > 0
                            ? Math.min((cuposOcupados / cuposTotales) * 100, 100)
                            : 0
                            }%`,
                        }}
                      />
                    </div>

                    <div className="lista-cupos">
                      {Array.from({ length: cuposTotales }, (_, indice) => {
                        const reserva = reservas[indice] || null;
                        const cupoOcupado = indice < cuposOcupados;

                        return (
                          <div
                            className={`fila-cupo ${cupoOcupado ? "cupo-ocupado" : "cupo-libre"}`}
                            key={`${idRuta}-cupo-${indice + 1}`}
                          >
                            {cupoOcupado ? (
                              <>
                                {reserva ? (
                                  <>
                                    <div className="pasajero-cupo">
                                      {reserva.pasajero?.foto_url ? (
                                        <img
                                          src={reserva.pasajero.foto_url}
                                          alt=""
                                          className="avatar-pasajero-cupo"
                                        />
                                      ) : (
                                        <div className="avatar-pasajero-cupo avatar-inicial">
                                          {(reserva.pasajero?.nombre_completo || "P")
                                            .charAt(0)
                                            .toUpperCase()}
                                        </div>
                                      )}

                                      <div>
                                        <strong>
                                          {reserva.pasajero?.nombre_completo || "Cupo ocupado"}
                                        </strong>
                                        <span>Cupo {indice + 1} · Ocupado</span>
                                      </div>
                                    </div>

                                    <strong className="tarifa-cupo-ocupado">
                                      {formatoPesos(
                                        reserva.tarifa_acordada ||
                                        reserva.tarifa_sugerida ||
                                        tarifaPorCupo
                                      )}
                                    </strong>
                                  </>
                                ) : (
                                  <>
                                    <div>
                                      <strong>Cupo {indice + 1}</strong>
                                      <span>Ocupado</span>
                                    </div>
                                    <strong className="tarifa-cupo-ocupado">
                                      {formatoPesos(tarifaPorCupo)}
                                    </strong>
                                  </>
                                )}
                              </>
                            ) : (
                              <>
                                <div>
                                  <strong>Cupo {indice + 1}</strong>
                                  <span>Disponible</span>
                                </div>
                                <strong className="tarifa-cupo-disponible">
                                  {formatoPesos(tarifaPorCupo)}
                                </strong>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>

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