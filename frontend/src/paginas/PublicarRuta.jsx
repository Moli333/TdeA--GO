import { useEffect, useState } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  Polyline,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./PublicarRuta.css";

const UBICACION_INICIAL = [6.2442, -75.5812];

const iconoOrigen = L.divIcon({
  className: "marcador-personalizado",
  html: `
    <div class="marcador-origen">
      <span></span>
    </div>
  `,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const iconoDestino = L.divIcon({
  className: "marcador-personalizado",
  html: `
    <div class="marcador-destino">
      <span></span>
    </div>
  `,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function AjustarMapa({ origen, destino }) {
  const mapa = useMap();

  useEffect(() => {
    if (origen && destino) {
      mapa.fitBounds(
        [
          [origen.lat, origen.lng],
          [destino.lat, destino.lng],
        ],
        {
          padding: [60, 60],
        }
      );
    } else if (origen) {
      mapa.setView(
        [origen.lat, origen.lng],
        14
      );
    } else if (destino) {
      mapa.setView(
        [destino.lat, destino.lng],
        14
      );
    }
  }, [mapa, origen, destino]);

  return null;
}

function SeleccionMapa({
  modoSeleccion,
  seleccionarUbicacion,
}) {
  useMapEvents({
    click(evento) {
      if (!modoSeleccion) return;

      seleccionarUbicacion(
        evento.latlng.lat,
        evento.latlng.lng
      );
    },
  });

  return null;
}

function PublicarRuta({ usuario, API_URL }) {
  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");

  const [ubicacionOrigen, setUbicacionOrigen] =
    useState(null);

  const [ubicacionDestino, setUbicacionDestino] =
    useState(null);

  const [modoSeleccion, setModoSeleccion] =
    useState(null);

  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [cupos, setCupos] = useState("");

  const [cargandoOrigen, setCargandoOrigen] =
    useState(false);

  const [cargandoDestino, setCargandoDestino] =
    useState(false);

  const [guardando, setGuardando] =
    useState(false);

  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const obtenerCoordenadas = async (lugar) => {
    const respuesta = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(
        lugar
      )}`
    );

    if (!respuesta.ok) {
      throw new Error(
        "No fue posible consultar la ubicación."
      );
    }

    const resultados = await respuesta.json();

    if (!resultados.length) {
      throw new Error(
        `No se encontró la ubicación: ${lugar}`
      );
    }

    return {
      lat: Number(resultados[0].lat),
      lng: Number(resultados[0].lon),
      nombre: resultados[0].display_name,
    };
  };

  const obtenerNombreUbicacion = async (
    lat,
    lng
  ) => {
    try {
      const respuesta = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
      );

      if (!respuesta.ok) {
        return "Ubicación seleccionada";
      }

      const resultado = await respuesta.json();

      return (
        resultado.display_name ||
        "Ubicación seleccionada"
      );
    } catch {
      return "Ubicación seleccionada";
    }
  };

  const buscarOrigen = async () => {
    if (!origen.trim()) {
      setError("Ingresa el lugar de origen.");
      return;
    }

    setError("");
    setMensaje("");
    setCargandoOrigen(true);

    try {
      const coordenadas =
        await obtenerCoordenadas(
          origen.trim()
        );

      setUbicacionOrigen(coordenadas);
    } catch (error) {
      setError(error.message);
    } finally {
      setCargandoOrigen(false);
    }
  };

  const buscarDestino = async () => {
    if (!destino.trim()) {
      setError("Ingresa el lugar de destino.");
      return;
    }

    setError("");
    setMensaje("");
    setCargandoDestino(true);

    try {
      const coordenadas =
        await obtenerCoordenadas(
          destino.trim()
        );

      setUbicacionDestino(coordenadas);
    } catch (error) {
      setError(error.message);
    } finally {
      setCargandoDestino(false);
    }
  };

  const usarUbicacionActual = () => {
    if (!navigator.geolocation) {
      setError(
        "El navegador no permite obtener la ubicación."
      );
      return;
    }

    setError("");
    setMensaje("");
    setCargandoOrigen(true);

    navigator.geolocation.getCurrentPosition(
      async (posicion) => {
        const coordenadas = {
          lat: posicion.coords.latitude,
          lng: posicion.coords.longitude,
        };

        const nombre =
          await obtenerNombreUbicacion(
            coordenadas.lat,
            coordenadas.lng
          );

        setUbicacionOrigen({
          ...coordenadas,
          nombre,
        });

        setOrigen(nombre);
        setModoSeleccion(null);
        setCargandoOrigen(false);
      },
      () => {
        setError(
          "No fue posible obtener tu ubicación. Verifica los permisos del navegador."
        );

        setCargandoOrigen(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  const activarSeleccion = (tipo) => {
    setError("");
    setMensaje("");
    setModoSeleccion(tipo);
  };

  const seleccionarUbicacion = async (
    lat,
    lng
  ) => {
    setError("");
    setMensaje("");

    const nombre =
      await obtenerNombreUbicacion(lat, lng);

    const ubicacion = {
      lat,
      lng,
      nombre,
    };

    if (modoSeleccion === "origen") {
      setUbicacionOrigen(ubicacion);
      setOrigen(nombre);
    }

    if (modoSeleccion === "destino") {
      setUbicacionDestino(ubicacion);
      setDestino(nombre);
    }

    setModoSeleccion(null);
  };

  const publicarRuta = async (evento) => {
    evento.preventDefault();

    setError("");
    setMensaje("");

    if (!usuario?.id) {
      setError(
        "Debes iniciar sesión para publicar una ruta."
      );
      return;
    }

    if (!origen.trim() || !destino.trim()) {
      setError(
        "Completa el origen y el destino."
      );
      return;
    }

    if (
      !ubicacionOrigen ||
      !ubicacionDestino
    ) {
      setError(
        "Primero debes ubicar el origen y el destino en el mapa."
      );
      return;
    }

    if (!fecha || !hora || !cupos) {
      setError(
        "Completa la fecha, hora y cantidad de cupos."
      );
      return;
    }

    setGuardando(true);

    try {
      const respuesta = await fetch(
        `${API_URL}/api/rutas`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            conductor_id: usuario.id,

            origen: origen.trim(),
            destino: destino.trim(),

            lat_origen:
              ubicacionOrigen.lat,

            lng_origen:
              ubicacionOrigen.lng,

            lat_destino:
              ubicacionDestino.lat,

            lng_destino:
              ubicacionDestino.lng,

            fecha_hora_salida:
              `${fecha}T${hora}:00`,

            cupos_totales:
              Number(cupos),

            cupos_disponibles:
              Number(cupos),

            tarifa_contribucion: 0,
          }),
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje ||
            "No fue posible publicar la ruta."
        );
      }

      setMensaje(
        "La ruta fue publicada correctamente."
      );

      setOrigen("");
      setDestino("");
      setFecha("");
      setHora("");
      setCupos("");

      setUbicacionOrigen(null);
      setUbicacionDestino(null);
      setModoSeleccion(null);
    } catch (error) {
      setError(error.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section className="pagina-publicar-ruta">

      <div className="contenedor publicar-contenedor">

        {/* =================================================
            ENCABEZADO DE LA PÁGINA
            ================================================= */}

        <div className="cabecera-publicar">

          <div className="cabecera-publicar-texto">

            <span className="etiqueta-conductor">
              CONDUCTOR
            </span>

            <h1>
              Publica tu ruta
            </h1>

            <p>
              Comparte tu recorrido con la
              comunidad TdeA y permite que otros
              estudiantes consulten los cupos
              disponibles.
            </p>

          </div>

          <div className="indicador-publicar">

            <div className="indicador-icono">
              +
            </div>

            <div>
              <strong>
                Nueva ruta
              </strong>

              <span>
                Completa la información del recorrido
              </span>
            </div>

          </div>

        </div>

        {/* =================================================
            FORMULARIO
            ================================================= */}

        <form
          className="formulario-publicar"
          onSubmit={publicarRuta}
        >

          {/* =================================================
              SECCIÓN DEL RECORRIDO
              ================================================= */}

          <section className="tarjeta-publicar">

            <div className="titulo-seccion-publicar">

              <div className="numero-seccion">
                1
              </div>

              <div>
                <h2>
                  Define tu recorrido
                </h2>

                <p>
                  Indica desde dónde sales y hacia
                  dónde te diriges.
                </p>
              </div>

            </div>

            <div className="ruta-puntos">

              {/* ORIGEN */}

              <div className="bloque-ubicacion bloque-origen">

                <div className="indicador-ubicacion">
                  <span></span>
                </div>

                <div className="contenido-ubicacion">

                  <label htmlFor="origen">
                    Punto de origen
                  </label>

                  <div className="campo-ubicacion">

                    <input
                      id="origen"
                      type="text"
                      value={origen}
                      onChange={(evento) => {
                        setOrigen(
                          evento.target.value
                        );
                        setUbicacionOrigen(null);
                      }}
                      placeholder="Ej. Bello, Antioquia"
                    />

                    <button
                      type="button"
                      className="boton-ubicar"
                      onClick={buscarOrigen}
                      disabled={cargandoOrigen}
                    >
                      {cargandoOrigen
                        ? "Buscando..."
                        : "Ubicar"}
                    </button>

                  </div>

                  <div className="acciones-ubicacion-nuevas">

                    <button
                      type="button"
                      className="boton-accion-ubicacion"
                      onClick={
                        usarUbicacionActual
                      }
                      disabled={
                        cargandoOrigen
                      }
                    >
                      <span>
                        ◎
                      </span>

                      Usar mi ubicación
                    </button>

                    <button
                      type="button"
                      className="boton-accion-ubicacion"
                      onClick={() =>
                        activarSeleccion(
                          "origen"
                        )
                      }
                    >
                      <span>
                        ◉
                      </span>

                      Elegir en mapa
                    </button>

                  </div>

                  {ubicacionOrigen && (
                    <div className="ubicacion-confirmada-nueva">
                      <span>✓</span>
                      Origen ubicado correctamente
                    </div>
                  )}

                </div>

              </div>

              {/* LÍNEA DE RECORRIDO */}

              <div className="linea-recorrido-formulario">
                <span></span>
              </div>

              {/* DESTINO */}

              <div className="bloque-ubicacion bloque-destino">

                <div className="indicador-ubicacion destino">
                  <span></span>
                </div>

                <div className="contenido-ubicacion">

                  <label htmlFor="destino">
                    Punto de destino
                  </label>

                  <div className="campo-ubicacion">

                    <input
                      id="destino"
                      type="text"
                      value={destino}
                      onChange={(evento) => {
                        setDestino(
                          evento.target.value
                        );
                        setUbicacionDestino(null);
                      }}
                      placeholder="Ej. Tecnológico de Antioquia"
                    />

                    <button
                      type="button"
                      className="boton-ubicar"
                      onClick={buscarDestino}
                      disabled={cargandoDestino}
                    >
                      {cargandoDestino
                        ? "Buscando..."
                        : "Ubicar"}
                    </button>

                  </div>

                  <div className="acciones-ubicacion-nuevas">

                    <button
                      type="button"
                      className="boton-accion-ubicacion"
                      onClick={() =>
                        activarSeleccion(
                          "destino"
                        )
                      }
                    >
                      <span>
                        ◉
                      </span>

                      Elegir en mapa
                    </button>

                  </div>

                  {ubicacionDestino && (
                    <div className="ubicacion-confirmada-nueva">
                      <span>✓</span>
                      Destino ubicado correctamente
                    </div>
                  )}

                </div>

              </div>

            </div>

          </section>

          {/* =================================================
              FECHA, HORA Y CUPOS
              ================================================= */}

          <section className="tarjeta-publicar">

            <div className="titulo-seccion-publicar">

              <div className="numero-seccion">
                2
              </div>

              <div>
                <h2>
                  Información del viaje
                </h2>

                <p>
                  Define cuándo realizarás el
                  recorrido y cuántos pasajeros puedes
                  llevar.
                </p>
              </div>

            </div>

            <div className="datos-viaje">

              <div className="campo-publicar">

                <label htmlFor="fecha">
                  Fecha de salida
                </label>

                <input
                  id="fecha"
                  type="date"
                  value={fecha}
                  min={
                    new Date()
                      .toISOString()
                      .split("T")[0]
                  }
                  onChange={(evento) =>
                    setFecha(
                      evento.target.value
                    )
                  }
                />

              </div>

              <div className="campo-publicar">

                <label htmlFor="hora">
                  Hora de salida
                </label>

                <input
                  id="hora"
                  type="time"
                  value={hora}
                  onChange={(evento) =>
                    setHora(
                      evento.target.value
                    )
                  }
                />

              </div>

              <div className="campo-publicar">

                <label htmlFor="cupos">
                  Cupos disponibles
                </label>

                <div className="campo-cupos">

                  <input
                    id="cupos"
                    type="number"
                    min="1"
                    max="20"
                    value={cupos}
                    onChange={(evento) =>
                      setCupos(
                        evento.target.value
                      )
                    }
                    placeholder="Ej. 3"
                  />

                  <span>
                    pasajeros
                  </span>

                </div>

              </div>

            </div>

          </section>

          {/* =================================================
              MAPA
              ================================================= */}

          <section className="tarjeta-publicar tarjeta-mapa-publicar">

            <div className="encabezado-mapa-nuevo">

              <div className="titulo-seccion-publicar">

                <div className="numero-seccion">
                  3
                </div>

                <div>
                  <h2>
                    Revisa el recorrido
                  </h2>

                  <p>
                    Verifica en el mapa los puntos
                    seleccionados.
                  </p>
                </div>

              </div>

              {modoSeleccion && (
                <button
                  type="button"
                  className="boton-cancelar-mapa"
                  onClick={() =>
                    setModoSeleccion(null)
                  }
                >
                  Cancelar selección
                </button>
              )}

            </div>

            <div className="aviso-mapa">

              <span className="aviso-mapa-icono">
                {modoSeleccion ? "!" : "i"}
              </span>

              <span>
                {modoSeleccion ===
                "origen"
                  ? "Haz clic en el mapa para seleccionar el punto de origen."
                  : modoSeleccion ===
                    "destino"
                  ? "Haz clic en el mapa para seleccionar el punto de destino."
                  : "Puedes seleccionar una ubicación directamente sobre el mapa."}
              </span>

            </div>

            <div className="contenedor-mapa-publicar">

              <MapContainer
                center={UBICACION_INICIAL}
                zoom={12}
                scrollWheelZoom={true}
                className="mapa-publicar"
              >

                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <AjustarMapa
                  origen={ubicacionOrigen}
                  destino={ubicacionDestino}
                />

                <SeleccionMapa
                  modoSeleccion={modoSeleccion}
                  seleccionarUbicacion={
                    seleccionarUbicacion
                  }
                />

                {ubicacionOrigen && (
                  <Marker
                    position={[
                      ubicacionOrigen.lat,
                      ubicacionOrigen.lng,
                    ]}
                    icon={iconoOrigen}
                  >
                    <Popup>
                      <strong>
                        Origen
                      </strong>

                      <br />

                      {origen ||
                        "Ubicación seleccionada"}
                    </Popup>
                  </Marker>
                )}

                {ubicacionDestino && (
                  <Marker
                    position={[
                      ubicacionDestino.lat,
                      ubicacionDestino.lng,
                    ]}
                    icon={iconoDestino}
                  >
                    <Popup>
                      <strong>
                        Destino
                      </strong>

                      <br />

                      {destino ||
                        "Ubicación seleccionada"}
                    </Popup>
                  </Marker>
                )}

                {ubicacionOrigen &&
                  ubicacionDestino && (
                    <Polyline
                      positions={[
                        [
                          ubicacionOrigen.lat,
                          ubicacionOrigen.lng,
                        ],
                        [
                          ubicacionDestino.lat,
                          ubicacionDestino.lng,
                        ],
                      ]}
                      pathOptions={{
                        color: "#0b5f91",
                        weight: 5,
                        opacity: 0.8,
                        dashArray: "10 8",
                      }}
                    />
                  )}

              </MapContainer>

              <div className="leyenda-mapa">

                <div>
                  <span className="punto-leyenda origen"></span>
                  Origen
                </div>

                <div>
                  <span className="punto-leyenda destino"></span>
                  Destino
                </div>

              </div>

            </div>

          </section>

          {/* =================================================
              MENSAJES
              ================================================= */}

          {error && (
            <div className="mensaje-publicar mensaje-publicar-error">
              <span>!</span>
              <p>{error}</p>
            </div>
          )}

          {mensaje && (
            <div className="mensaje-publicar mensaje-publicar-exito">
              <span>✓</span>
              <p>{mensaje}</p>
            </div>
          )}

          {/* =================================================
              BOTÓN FINAL
              ================================================= */}

          <div className="final-publicar">

            <div className="texto-final-publicar">

              <strong>
                ¿Todo listo?
              </strong>

              <span>
                Revisa la información antes de
                publicar tu ruta.
              </span>

            </div>

            <button
              type="submit"
              className="boton-publicar-final"
              disabled={guardando}
            >
              {guardando
                ? "Publicando..."
                : "Publicar ruta"}
            </button>

          </div>

        </form>

      </div>

    </section>
  );
}

export default PublicarRuta;