
import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./SolicitarViajeNuevo.css";
import BuscadorUbicacion from "../components/BuscadorUbicacion";
import {
  buscarMejorLugar,
  nombreDesdeCoordenadas,
  CENTRO_MEDELLIN,
} from "../utils/geocodificacion";

const CENTRO = [CENTRO_MEDELLIN.lat, CENTRO_MEDELLIN.lng];

const icono = new L.DivIcon({
  className: "marcador-viaje-nuevo",
  html: "<span></span>",
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const TARIFA_MINIMA_AUTOMOVIL = 8300;
const TARIFA_MINIMA_MOTOCICLETA = 7000;

const formatoPesos = (valor) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(valor);

function obtenerToken(usuario) {
  try {
    const sesion = JSON.parse(
      sessionStorage.getItem("tdea_go_usuario") || "{}"
    );

    return (
      usuario?.token ||
      usuario?.access_token ||
      sesion?.token ||
      sesion?.access_token ||
      null
    );
  } catch {
    return usuario?.token || usuario?.access_token || null;
  }
}

function AjustarMapa({ origen, destino, recorrido }) {
  const mapa = useMap();

  useEffect(() => {
    if (recorrido?.length > 1) {
      mapa.fitBounds(recorrido, {
        padding: [35, 35],
        maxZoom: 14,
      });
      return;
    }

    const puntos = [origen, destino].filter(Boolean);

    if (puntos.length === 2) {
      mapa.fitBounds(puntos, {
        padding: [35, 35],
        maxZoom: 14,
      });
    } else if (puntos.length === 1) {
      mapa.setView(puntos[0], 15);
    }
  }, [mapa, origen, destino, recorrido]);

  return null;
}

function SeleccionarEnMapa({ modo, onSeleccionar }) {
  useMapEvents({
    click(evento) {
      onSeleccionar(modo, [
        evento.latlng.lat,
        evento.latlng.lng,
      ]);
    },
  });

  return null;
}

export default function SolicitarViajeNuevo({
  usuario,
  API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000",
}) {
  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");

  const [coordOrigen, setCoordOrigen] = useState(null);
  const [coordDestino, setCoordDestino] = useState(null);

  const [textoOrigenConfirmado, setTextoOrigenConfirmado] = useState("");
  const [textoDestinoConfirmado, setTextoDestinoConfirmado] = useState("");

  const [tipoViaje, setTipoViaje] = useState("reserva");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");

  const [modoMapa, setModoMapa] = useState("origen");
  const [buscando, setBuscando] = useState("");
  const [guardando, setGuardando] = useState(false);

  const [distanciaKm, setDistanciaKm] = useState(null);
  const [duracionMinutos, setDuracionMinutos] = useState(null);
  const [recorrido, setRecorrido] = useState([]);
  const [errorRuta, setErrorRuta] = useState("");

  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const inmediato = tipoViaje === "inmediato";

  // El cálculo está pendiente mientras existen dos ubicaciones
  // confirmadas, pero todavía no hay resultado ni error.
  const calculandoRuta = Boolean(
    coordOrigen &&
    coordDestino &&
    distanciaKm === null &&
    duracionMinutos === null &&
    !errorRuta
  );

  const fechaMinima = useMemo(() => {
    const ahora = new Date();
    const local = new Date(
      ahora.getTime() - ahora.getTimezoneOffset() * 60000
    );

    return local.toISOString().slice(0, 10);
  }, []);

  const token = useMemo(
    () => obtenerToken(usuario),
    [usuario]
  );

  // Calcula distancia, duración y recorrido real por carretera.
  // No modifica los controles ni la interacción del mapa.
  useEffect(() => {
    if (!coordOrigen || !coordDestino) return;

    const controlador = new AbortController();

    const calcularRuta = async () => {
      try {
        const [latOrigen, lngOrigen] = coordOrigen;
        const [latDestino, lngDestino] = coordDestino;

        const url =
          `https://router.project-osrm.org/route/v1/driving/` +
          `${lngOrigen},${latOrigen};${lngDestino},${latDestino}` +
          "?overview=full&geometries=geojson&steps=false";

        const respuesta = await fetch(url, {
          signal: controlador.signal,
        });

        if (!respuesta.ok) {
          throw new Error("No fue posible calcular el recorrido.");
        }

        const datos = await respuesta.json();

        if (datos.code !== "Ok" || !datos.routes?.length) {
          throw new Error("No se encontró una ruta entre los puntos.");
        }

        const ruta = datos.routes[0];
        const coordenadasRuta = ruta.geometry?.coordinates;

        if (
          !Number.isFinite(ruta.distance) ||
          !Number.isFinite(ruta.duration) ||
          !Array.isArray(coordenadasRuta) ||
          coordenadasRuta.length < 2
        ) {
          throw new Error("El servicio no devolvió un recorrido válido.");
        }

        setDistanciaKm(ruta.distance / 1000);
        setDuracionMinutos(Math.ceil(ruta.duration / 60));

        setRecorrido(
          coordenadasRuta.map(([lng, lat]) => [lat, lng])
        );
      } catch (e) {
        if (e.name !== "AbortError") {
          setErrorRuta(
            e.message || "No se pudo calcular la ruta."
          );
          setDistanciaKm(null);
          setDuracionMinutos(null);
          setRecorrido([]);
        }
      }
    };

    calcularRuta();

    return () => controlador.abort();
  }, [coordOrigen, coordDestino]);

  // Hora estimada de llegada según la duración calculada.
  const horaLlegada = useMemo(() => {
    if (duracionMinutos === null) return null;

    if (!inmediato && (!fecha || !hora)) {
      return null;
    }

    const salida = inmediato
      ? new Date()
      : new Date(`${fecha}T${hora}:00`);

    if (Number.isNaN(salida.getTime())) {
      return null;
    }

    const llegada = new Date(
      salida.getTime() + duracionMinutos * 60000
    );

    return llegada.toLocaleString("es-CO", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }, [duracionMinutos, inmediato, fecha, hora]);

  // Limpia los cálculos anteriores cuando se confirma una nueva ubicación.
  const limpiarCalculoRuta = () => {
    setDistanciaKm(null);
    setDuracionMinutos(null);
    setRecorrido([]);
    setErrorRuta("");
  };

  const fijarUbicacion = (tipo, lugar) => {
    const punto = [lugar.lat, lugar.lng];

    limpiarCalculoRuta();

    if (tipo === "origen") {
      setOrigen(lugar.nombre);
      setCoordOrigen(punto);
      setTextoOrigenConfirmado(lugar.nombre);
    } else {
      setDestino(lugar.nombre);
      setCoordDestino(punto);
      setTextoDestinoConfirmado(lugar.nombre);
    }
  };

  const buscarCoordenadas = async (tipo) => {
    const texto = tipo === "origen" ? origen : destino;

    if (!texto.trim()) {
      setError(`Escribe el ${tipo} antes de ubicarlo.`);
      return;
    }

    setBuscando(tipo);
    setError("");

    try {
      const lugar = await buscarMejorLugar(texto);
      fijarUbicacion(tipo, lugar);
    } catch (e) {
      setError(e.message || "No fue posible ubicar el lugar.");
    } finally {
      setBuscando("");
    }
  };

  const seleccionarEnMapa = async (tipo, punto) => {
    setError("");
    setBuscando(tipo);

    try {
      const nombre = await nombreDesdeCoordenadas(
        punto[0],
        punto[1]
      );

      fijarUbicacion(tipo, {
        lat: punto[0],
        lng: punto[1],
        nombre,
      });
    } catch {
      fijarUbicacion(tipo, {
        lat: punto[0],
        lng: punto[1],
        nombre: `${punto[0].toFixed(5)}, ${punto[1].toFixed(5)}`,
      });
    } finally {
      setBuscando("");
    }
  };

  const usarMiUbicacion = () => {
    if (!navigator.geolocation) {
      setError("Tu navegador no permite obtener la ubicación.");
      return;
    }

    setError("");
    setBuscando("origen");

    navigator.geolocation.getCurrentPosition(
      async (posicion) => {
        const { latitude, longitude } = posicion.coords;

        try {
          const nombre = await nombreDesdeCoordenadas(
            latitude,
            longitude
          );

          fijarUbicacion("origen", {
            lat: latitude,
            lng: longitude,
            nombre,
          });
        } catch {
          fijarUbicacion("origen", {
            lat: latitude,
            lng: longitude,
            nombre: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
          });
        } finally {
          setBuscando("");
        }
      },
      () => {
        setError(
          "No fue posible obtener tu ubicación. Revisa los permisos del navegador."
        );
        setBuscando("");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  const guardarSolicitud = async (evento) => {
    evento.preventDefault();
    setError("");
    setMensaje("");

    const pasajeroId = usuario?.id || usuario?.id_usuario;

    if (!pasajeroId) {
      setError(
        "No se pudo identificar tu cuenta. Cierra sesión e inicia nuevamente."
      );
      return;
    }

    if (!token) {
      setError(
        "Tu sesión no está disponible. Cierra sesión e inicia nuevamente."
      );
      return;
    }

    if (!origen.trim() || !destino.trim()) {
      setError("Debes indicar el origen y el destino.");
      return;
    }

    if (!coordOrigen || !coordDestino) {
      setError(
        "Elige el origen y el destino de las sugerencias o márcalos en el mapa."
      );
      return;
    }

    if (calculandoRuta) {
      setError("Espera a que termine el cálculo del recorrido.");
      return;
    }

    if (
      distanciaKm === null ||
      duracionMinutos === null ||
      distanciaKm <= 0 ||
      duracionMinutos <= 0
    ) {
      setError(
        "No se pudo calcular la distancia y duración. Verifica las ubicaciones e inténtalo nuevamente."
      );
      return;
    }

    if (!inmediato) {
      if (!fecha || !hora) {
        setError("Selecciona la fecha y hora de salida.");
        return;
      }

      const fechaHora = `${fecha}T${hora}:00`;

      if (new Date(fechaHora) <= new Date()) {
        setError("La fecha y hora del viaje deben ser futuras.");
        return;
      }
    }

    const fechaHora = `${fecha}T${hora}:00`;

    setGuardando(true);

    try {
      const respuesta = await fetch(
        `${API_URL}/api/solicitudes-viajes-nuevos`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            pasajero_id: pasajeroId,
            origen: origen.trim(),
            destino: destino.trim(),
            lat_origen: coordOrigen[0],
            lng_origen: coordOrigen[1],
            lat_destino: coordDestino[0],
            lng_destino: coordDestino[1],
            inmediato,
            ...(inmediato
              ? {}
              : { fecha_hora_salida: fechaHora }),
          }),
        }
      );

      const datos = await respuesta.json().catch(() => ({}));

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje ||
          datos.error ||
          "No fue posible registrar la solicitud."
        );
      }

      setMensaje(
        datos.conductores_avisados > 0
          ? `Tu solicitud fue publicada y avisamos a ${datos.conductores_avisados} conductor(es). Te notificaremos cuando uno la acepte.`
          : "Tu solicitud fue publicada. Por ahora no hay conductores disponibles en ese horario; seguirá visible para quienes se conecten."
      );

      setOrigen("");
      setDestino("");
      setCoordOrigen(null);
      setCoordDestino(null);
      setTextoOrigenConfirmado("");
      setTextoDestinoConfirmado("");
      setFecha("");
      setHora("");
      setTipoViaje("reserva");

      limpiarCalculoRuta();
    } catch (e) {
      setError(
        e.message || "Ocurrió un error al registrar la solicitud."
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section className="viaje-nuevo pagina-contenido">
      <header className="viaje-nuevo-encabezado">
        <span className="viaje-nuevo-etiqueta">
          TRANSPORTE COMPARTIDO
        </span>

        <h1>Solicitar un viaje nuevo</h1>

        <p>
          Indica desde dónde sales, hacia dónde te diriges y cuándo necesitas viajar.
        </p>
      </header>

      <form
        className="viaje-nuevo-panel"
        onSubmit={guardarSolicitud}
      >
        <div
          className="viaje-nuevo-tipo"
          role="radiogroup"
          aria-label="Tipo de viaje"
        >
          <button
            type="button"
            role="radio"
            aria-checked={inmediato}
            className={inmediato ? "activo" : ""}
            onClick={() => setTipoViaje("inmediato")}
          >
            <strong>Ahora</strong>
            <span>Salgo en unos minutos</span>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={!inmediato}
            className={!inmediato ? "activo" : ""}
            onClick={() => setTipoViaje("reserva")}
          >
            <strong>Reservar</strong>
            <span>Elijo fecha y hora</span>
          </button>
        </div>

        <div className="viaje-nuevo-campos">
          <label>
            Origen

            <div className="viaje-nuevo-ubicacion">
              <BuscadorUbicacion
                valor={origen}
                textoConfirmado={textoOrigenConfirmado}
                placeholder="Ej. Calle 80 #45-10, Robledo, Medellín"
                alCambiarTexto={(texto) => {
                  setOrigen(texto);
                  setCoordOrigen(null);
                  setTextoOrigenConfirmado("");
                  limpiarCalculoRuta();
                }}
                alSeleccionar={(lugar) =>
                  fijarUbicacion("origen", lugar)
                }
                requerido
              />

              <button
                type="button"
                onClick={() => buscarCoordenadas("origen")}
                disabled={buscando === "origen"}
              >
                {buscando === "origen" ? "Buscando..." : "Ubicar"}
              </button>
            </div>

            <button
              type="button"
              className="viaje-nuevo-gps"
              onClick={usarMiUbicacion}
              disabled={buscando === "origen"}
            >
              Usar mi ubicación actual
            </button>

            {coordOrigen && (
              <small className="ubicacion-confirmada">
                Origen ubicado en el mapa
              </small>
            )}
          </label>

          <label>
            Destino

            <div className="viaje-nuevo-ubicacion">
              <BuscadorUbicacion
                valor={destino}
                textoConfirmado={textoDestinoConfirmado}
                placeholder="Ej. Tecnológico de Antioquia, Robledo"
                alCambiarTexto={(texto) => {
                  setDestino(texto);
                  setCoordDestino(null);
                  setTextoDestinoConfirmado("");
                  limpiarCalculoRuta();
                }}
                alSeleccionar={(lugar) =>
                  fijarUbicacion("destino", lugar)
                }
                requerido
              />

              <button
                type="button"
                onClick={() => buscarCoordenadas("destino")}
                disabled={buscando === "destino"}
              >
                {buscando === "destino" ? "Buscando..." : "Ubicar"}
              </button>
            </div>

            {coordDestino && (
              <small className="ubicacion-confirmada">
                Destino ubicado en el mapa
              </small>
            )}
          </label>

          {!inmediato && (
            <>
              <label>
                Fecha de salida

                <input
                  type="date"
                  min={fechaMinima}
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  required
                />
              </label>

              <label>
                Hora de salida

                <input
                  type="time"
                  value={hora}
                  onChange={(e) => setHora(e.target.value)}
                  required
                />
              </label>
            </>
          )}
        </div>

        <div className="viaje-nuevo-mapa-ayuda">
          <strong>Confirma las ubicaciones en el mapa</strong>

          <span>
            Escribe la dirección y elige una sugerencia, o marca el punto exacto en el mapa.
          </span>

          <div className="viaje-nuevo-modos">
            <button
              type="button"
              className={modoMapa === "origen" ? "activo" : ""}
              onClick={() => setModoMapa("origen")}
            >
              Marcar origen
            </button>

            <button
              type="button"
              className={modoMapa === "destino" ? "activo" : ""}
              onClick={() => setModoMapa("destino")}
            >
              Marcar destino
            </button>
          </div>
        </div>

        <MapContainer
          center={CENTRO}
          zoom={12}
          scrollWheelZoom
          className="viaje-nuevo-mapa"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <SeleccionarEnMapa
            modo={modoMapa}
            onSeleccionar={seleccionarEnMapa}
          />

          <AjustarMapa
            origen={coordOrigen}
            destino={coordDestino}
            recorrido={recorrido}
          />

          {recorrido.length > 1 && (
            <Polyline
              positions={recorrido}
              pathOptions={{
                color: "#1769aa",
                weight: 5,
                opacity: 0.85,
              }}
            />
          )}

          {coordOrigen && (
            <Marker position={coordOrigen} icon={icono} />
          )}

          {coordDestino && (
            <Marker position={coordDestino} icon={icono} />
          )}
        </MapContainer>

        <div className="viaje-nuevo-resumen-ubicaciones">
          <span>
            {coordOrigen
              ? "Origen confirmado"
              : "Origen pendiente de ubicación"}
          </span>

          <span>
            {coordDestino
              ? "Destino confirmado"
              : "Destino pendiente de ubicación"}
          </span>
        </div>

        {coordOrigen && coordDestino && (
          <section className="viaje-nuevo-estimacion">
            <h2>Estimación de tu recorrido</h2>

            {calculandoRuta ? (
              <p>Calculando distancia y duración del recorrido...</p>
            ) : errorRuta ? (
              <p className="viaje-nuevo-mensaje error">
                {errorRuta}
              </p>
            ) : distanciaKm !== null && duracionMinutos !== null ? (
              <>
                <div className="viaje-nuevo-estimacion-datos">
                  <div>
                    <span>Distancia aproximada</span>
                    <strong>{distanciaKm.toFixed(1)} km</strong>
                  </div>

                  <div>
                    <span>Duración estimada</span>
                    <strong>
                      {duracionMinutos < 60
                        ? `${duracionMinutos} min`
                        : `${Math.floor(duracionMinutos / 60)} h ${duracionMinutos % 60} min`}
                    </strong>
                  </div>

                  <div>
                    <span>Hora estimada de llegada</span>
                    <strong>{horaLlegada || "Selecciona la salida"}</strong>
                  </div>
                </div>

                <div className="viaje-nuevo-tarifa">
                  <h3>Tarifa estimada</h3>

                  <p>
                    El aporte definitivo dependerá del tipo de vehículo y de las condiciones acordadas con el conductor.
                  </p>

                  <div>
                    <span>Automóvil</span>
                    <strong>
                      Desde {formatoPesos(TARIFA_MINIMA_AUTOMOVIL)}
                    </strong>
                  </div>

                  <div>
                    <span>Motocicleta</span>
                    <strong>
                      Desde {formatoPesos(TARIFA_MINIMA_MOTOCICLETA)}
                    </strong>
                  </div>
                </div>
              </>
            ) : (
              <p>
                Selecciona un origen y un destino para calcular tu recorrido.
              </p>
            )}
          </section>
        )}

        {error && (
          <p className="viaje-nuevo-mensaje error" role="alert">
            {error}
          </p>
        )}

        {mensaje && (
          <p className="viaje-nuevo-mensaje exito" role="status">
            {mensaje}
          </p>
        )}

        <button
          className="viaje-nuevo-enviar"
          type="submit"
          disabled={guardando || calculandoRuta}
        >
          {guardando
            ? "Registrando solicitud..."
            : inmediato
              ? "Pedir viaje ahora"
              : "Publicar reserva de viaje"}
        </button>
      </form>
    </section>
  );
}