import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./SolicitarViajeNuevo.css";

const CENTRO = [6.2442, -75.5812];

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
      mapa.setView(puntos[0], 14);
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

  const buscarCoordenadas = async (tipo) => {
    const texto = tipo === "origen" ? origen : destino;
    if (!texto.trim()) {
      setError(`Escribe el ${tipo} antes de ubicarlo.`);
      return;
    }
    setBuscando(tipo);
    setError("");
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(texto + ", Colombia")}`;
      const respuesta = await fetch(url, { headers: { "Accept-Language": "es" } });
      const resultados = await respuesta.json();
      if (!resultados.length) throw new Error("No se encontró esa ubicación. Prueba con una dirección más específica.");
      const punto = [Number(resultados[0].lat), Number(resultados[0].lon)];
      if (tipo === "origen") setCoordOrigen(punto);
      else setCoordDestino(punto);
    } catch (e) {
      setError(e.message || "No fue posible ubicar el lugar.");
    } finally {
      setBuscando("");
    }
  };

  const seleccionarEnMapa = (tipo, punto) => {
    if (tipo === "origen") setCoordOrigen(punto);
    else setCoordDestino(punto);
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
      setError("Ubica el origen y el destino en el mapa antes de continuar.");
      return;
    }
    const fechaHora = `${fecha}T${hora}:00`;
    if (new Date(fechaHora) <= new Date()) {
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
          fecha_hora_salida: fechaHora,
        }),
      });
      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) throw new Error(datos.mensaje || datos.error || "No fue posible registrar la solicitud.");
      setMensaje("Tu solicitud de viaje fue registrada y ya puede ser consultada por los conductores.");
      setOrigen("");
      setDestino("");
      setCoordOrigen(null);
      setCoordDestino(null);
      setFecha("");
      setHora("");
    } catch (e) {
      setError(e.message || "Ocurrió un error al registrar la solicitud.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section className="viaje-nuevo pagina-contenido">
      <header className="viaje-nuevo-encabezado">
        <span className="viaje-nuevo-etiqueta">TRANSPORTE COMPARTIDO</span>
        <h1>Solicitar un viaje nuevo</h1>
        <p>Indica desde dónde sales, hacia dónde te diriges y cuándo necesitas viajar.</p>
      </header>

      <form className="viaje-nuevo-panel" onSubmit={guardarSolicitud}>
        <div className="viaje-nuevo-campos">
          <label>
            Origen
            <div className="viaje-nuevo-ubicacion">
              <input value={origen} onChange={(e) => { setOrigen(e.target.value); setCoordOrigen(null); }} placeholder="Ej. Bello, Antioquia" required />
              <button type="button" onClick={() => buscarCoordenadas("origen")} disabled={buscando === "origen"}>{buscando === "origen" ? "Buscando..." : "Ubicar"}</button>
            </div>
            {coordOrigen && <small className="ubicacion-confirmada">Origen ubicado en el mapa</small>}
          </label>

          <label>
            Destino
            <div className="viaje-nuevo-ubicacion">
              <input value={destino} onChange={(e) => { setDestino(e.target.value); setCoordDestino(null); }} placeholder="Ej. Tecnológico de Antioquia" required />
              <button type="button" onClick={() => buscarCoordenadas("destino")} disabled={buscando === "destino"}>{buscando === "destino" ? "Buscando..." : "Ubicar"}</button>
            </div>
            {coordDestino && <small className="ubicacion-confirmada">Destino ubicado en el mapa</small>}
          </label>

          <label>
            Fecha de salida
            <input type="date" min={fechaMinima} value={fecha} onChange={(e) => setFecha(e.target.value)} required />
          </label>
          <label>
            Hora de salida
            <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} required />
          </label>
        </div>

        <div className="viaje-nuevo-mapa-ayuda">
          <strong>Confirma las ubicaciones en el mapa</strong>
          <span>Selecciona primero qué punto deseas marcar y después haz clic en el mapa.</span>
          <div className="viaje-nuevo-modos">
            <button type="button" className={modoMapa === "origen" ? "activo" : ""} onClick={() => setModoMapa("origen")}>Marcar origen</button>
            <button type="button" className={modoMapa === "destino" ? "activo" : ""} onClick={() => setModoMapa("destino")}>Marcar destino</button>
          </div>
        </div>

        <MapContainer center={CENTRO} zoom={11} scrollWheelZoom className="viaje-nuevo-mapa">
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
          {guardando ? "Registrando solicitud..." : "Publicar solicitud de viaje"}
        </button>
      </form>
    </section>
  );
}
