import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
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
  html: '<span></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function AjustarMapa({ origen, destino }) {
  const mapa = useMap();
  useEffect(() => {
    const puntos = [origen, destino].filter(Boolean);
    if (puntos.length === 2) {
      mapa.fitBounds(puntos, { padding: [35, 35], maxZoom: 14 });
    } else if (puntos.length === 1) {
      mapa.setView(puntos[0], 15);
    }
  }, [mapa, origen, destino]);
  return null;
}

function SeleccionarEnMapa({ modo, onSeleccionar }) {
  useMapEvents({
    click(evento) {
      onSeleccionar(modo, [evento.latlng.lat, evento.latlng.lng]);
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
  const [tipoViaje, setTipoViaje] = useState("reserva"); // "inmediato" | "reserva"
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [modoMapa, setModoMapa] = useState("origen");
  const [buscando, setBuscando] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const fechaMinima = useMemo(() => {
    const ahora = new Date();
    const local = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }, []);

  const fijarUbicacion = (tipo, lugar) => {
    const punto = [lugar.lat, lugar.lng];
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

  // Botón "Ubicar": usa el mejor resultado cercano a Medellín.
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

  // Clic en el mapa: se marca el punto y se escribe su dirección.
  const seleccionarEnMapa = async (tipo, punto) => {
    if (tipo === "origen") setCoordOrigen(punto);
    else setCoordDestino(punto);

    const nombre = await nombreDesdeCoordenadas(punto[0], punto[1]);
    fijarUbicacion(tipo, { lat: punto[0], lng: punto[1], nombre });
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
        const nombre = await nombreDesdeCoordenadas(latitude, longitude);
        fijarUbicacion("origen", { lat: latitude, lng: longitude, nombre });
        setBuscando("");
      },
      () => {
        setError("No fue posible obtener tu ubicación. Revisa los permisos del navegador.");
        setBuscando("");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const guardarSolicitud = async (evento) => {
    evento.preventDefault();
    setError("");
    setMensaje("");

    const pasajeroId = usuario?.id || usuario?.id_usuario;
    if (!pasajeroId) {
      setError("No se pudo identificar tu cuenta. Cierra sesión e inicia nuevamente.");
      return;
    }
    if (!coordOrigen || !coordDestino) {
      setError("Elige el origen y el destino de la lista de sugerencias o márcalos en el mapa.");
      return;
    }

    const inmediato = tipoViaje === "inmediato";
    const fechaHora = `${fecha}T${hora}:00`;

    if (!inmediato && new Date(fechaHora) <= new Date()) {
      setError("La fecha y hora del viaje deben ser futuras.");
      return;
    }

    setGuardando(true);
    try {
      const respuesta = await fetch(`${API_URL}/api/solicitudes-viajes-nuevos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pasajero_id: pasajeroId,
          origen: origen.trim(),
          destino: destino.trim(),
          lat_origen: coordOrigen[0],
          lng_origen: coordOrigen[1],
          lat_destino: coordDestino[0],
          lng_destino: coordDestino[1],
          inmediato,
          ...(inmediato ? {} : { fecha_hora_salida: fechaHora }),
        }),
      });
      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) throw new Error(datos.mensaje || datos.error || "No fue posible registrar la solicitud.");

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
    } catch (e) {
      setError(e.message || "Ocurrió un error al registrar la solicitud.");
    } finally {
      setGuardando(false);
    }
  };

  const inmediato = tipoViaje === "inmediato";

  return (
    <section className="viaje-nuevo pagina-contenido">
      <header className="viaje-nuevo-encabezado">
        <span className="viaje-nuevo-etiqueta">TRANSPORTE COMPARTIDO</span>
        <h1>Solicitar un viaje nuevo</h1>
        <p>Indica desde dónde sales, hacia dónde te diriges y cuándo necesitas viajar.</p>
      </header>

      <form className="viaje-nuevo-panel" onSubmit={guardarSolicitud}>
        <div className="viaje-nuevo-tipo" role="radiogroup" aria-label="Tipo de viaje">
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
                alCambiarTexto={(texto) => { setOrigen(texto); setCoordOrigen(null); }}
                alSeleccionar={(lugar) => fijarUbicacion("origen", lugar)}
                requerido
              />
              <button type="button" onClick={() => buscarCoordenadas("origen")} disabled={buscando === "origen"}>{buscando === "origen" ? "Buscando..." : "Ubicar"}</button>
            </div>
            <button type="button" className="viaje-nuevo-gps" onClick={usarMiUbicacion} disabled={buscando === "origen"}>
              ◎ Usar mi ubicación actual
            </button>
            {coordOrigen && <small className="ubicacion-confirmada">✓ Origen ubicado en el mapa</small>}
          </label>

          <label>
            Destino
            <div className="viaje-nuevo-ubicacion">
              <BuscadorUbicacion
                valor={destino}
                textoConfirmado={textoDestinoConfirmado}
                placeholder="Ej. Tecnológico de Antioquia, Robledo"
                alCambiarTexto={(texto) => { setDestino(texto); setCoordDestino(null); }}
                alSeleccionar={(lugar) => fijarUbicacion("destino", lugar)}
                requerido
              />
              <button type="button" onClick={() => buscarCoordenadas("destino")} disabled={buscando === "destino"}>{buscando === "destino" ? "Buscando..." : "Ubicar"}</button>
            </div>
            {coordDestino && <small className="ubicacion-confirmada">✓ Destino ubicado en el mapa</small>}
          </label>

          {!inmediato && (
            <>
              <label>
                Fecha de salida
                <input type="date" min={fechaMinima} value={fecha} onChange={(e) => setFecha(e.target.value)} required />
              </label>
              <label>
                Hora de salida
                <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} required />
              </label>
            </>
          )}
        </div>

        <div className="viaje-nuevo-mapa-ayuda">
          <strong>Confirma las ubicaciones en el mapa</strong>
          <span>Escribe la dirección y elige una sugerencia, o marca el punto exacto en el mapa.</span>
          <div className="viaje-nuevo-modos">
            <button type="button" className={modoMapa === "origen" ? "activo" : ""} onClick={() => setModoMapa("origen")}>Marcar origen</button>
            <button type="button" className={modoMapa === "destino" ? "activo" : ""} onClick={() => setModoMapa("destino")}>Marcar destino</button>
          </div>
        </div>

        <MapContainer center={CENTRO} zoom={12} scrollWheelZoom className="viaje-nuevo-mapa">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <SeleccionarEnMapa modo={modoMapa} onSeleccionar={seleccionarEnMapa} />
          <AjustarMapa origen={coordOrigen} destino={coordDestino} />
          {coordOrigen && <Marker position={coordOrigen} icon={icono} />}
          {coordDestino && <Marker position={coordDestino} icon={icono} />}
        </MapContainer>

        <div className="viaje-nuevo-resumen-ubicaciones">
          <span>{coordOrigen ? "Origen confirmado" : "Origen pendiente de ubicación"}</span>
          <span>{coordDestino ? "Destino confirmado" : "Destino pendiente de ubicación"}</span>
        </div>

        {error && <p className="viaje-nuevo-mensaje error" role="alert">{error}</p>}
        {mensaje && <p className="viaje-nuevo-mensaje exito" role="status">{mensaje}</p>}

        <button className="viaje-nuevo-enviar" type="submit" disabled={guardando}>
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