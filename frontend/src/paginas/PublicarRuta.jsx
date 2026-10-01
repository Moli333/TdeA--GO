import { useState } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

const UBICACION_INICIAL = [6.2442, -75.5812];

function AjustarMapa({ origen, destino }) {
  const mapa = useMap();

  if (origen && destino) {
    mapa.fitBounds(
      [
        [origen.lat, origen.lng],
        [destino.lat, destino.lng],
      ],
      { padding: [40, 40] }
    );
  } else if (origen) {
    mapa.setView([origen.lat, origen.lng], 14);
  } else if (destino) {
    mapa.setView([destino.lat, destino.lng], 14);
  }

  return null;
}

function PublicarRuta({ usuario, API_URL }) {
  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");
  const [ubicacionOrigen, setUbicacionOrigen] = useState(null);
  const [ubicacionDestino, setUbicacionDestino] = useState(null);

  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [cupos, setCupos] = useState("");

  const [cargandoOrigen, setCargandoOrigen] = useState(false);
  const [cargandoDestino, setCargandoDestino] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const obtenerCoordenadas = async (lugar) => {
    const respuesta = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(
        lugar
      )}`
    );

    if (!respuesta.ok) {
      throw new Error("No fue posible consultar la ubicación.");
    }

    const resultados = await respuesta.json();

    if (!resultados.length) {
      throw new Error(`No se encontró la ubicación: ${lugar}`);
    }

    return {
      lat: Number(resultados[0].lat),
      lng: Number(resultados[0].lon),
      nombre: resultados[0].display_name,
    };
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
      const coordenadas = await obtenerCoordenadas(origen.trim());

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
      const coordenadas = await obtenerCoordenadas(destino.trim());

      setUbicacionDestino(coordenadas);
    } catch (error) {
      setError(error.message);
    } finally {
      setCargandoDestino(false);
    }
  };

  const usarUbicacionActual = () => {
    if (!navigator.geolocation) {
      setError("El navegador no permite obtener la ubicación.");
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

        setUbicacionOrigen(coordenadas);

        try {
          const respuesta = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coordenadas.lat}&lon=${coordenadas.lng}`
          );

          if (respuesta.ok) {
            const resultado = await respuesta.json();

            if (resultado.display_name) {
              setOrigen(resultado.display_name);
            }
          }
        } catch {
          setOrigen("Ubicación actual");
        } finally {
          setCargandoOrigen(false);
        }
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

  const publicarRuta = async (evento) => {
    evento.preventDefault();

    setError("");
    setMensaje("");

    if (!usuario?.id) {
      setError("Debes iniciar sesión para publicar una ruta.");
      return;
    }

    if (!ubicacionOrigen || !ubicacionDestino) {
      setError(
        "Primero debes ubicar el origen y el destino en el mapa."
      );
      return;
    }

    if (!fecha || !hora || !cupos) {
      setError("Completa la fecha, hora y cantidad de cupos.");
      return;
    }

    setGuardando(true);

    try {
      const respuesta = await fetch(`${API_URL}/api/rutas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conductor_id: usuario.id,
          origen: origen.trim(),
          destino: destino.trim(),
          lat_origen: ubicacionOrigen.lat,
          lng_origen: ubicacionOrigen.lng,
          lat_destino: ubicacionDestino.lat,
          lng_destino: ubicacionDestino.lng,
          fecha_hora_salida: `${fecha}T${hora}`,
          cupos_totales: Number(cupos),
          cupos_disponibles: Number(cupos),
        }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje || "No fue posible publicar la ruta."
        );
      }

      setMensaje("La ruta fue publicada correctamente.");

      setOrigen("");
      setDestino("");
      setFecha("");
      setHora("");
      setCupos("");
      setUbicacionOrigen(null);
      setUbicacionDestino(null);
    } catch (error) {
      setError(error.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section className="pagina-servicio">
      <div className="contenedor">
        <span className="etiqueta-verde">TDEA GO</span>

        <h1>Publicar una ruta</h1>

        <p>
          Registra tu recorrido para que otros integrantes de la
          comunidad TdeA puedan consultar los cupos disponibles.
        </p>

        <form className="formulario-ruta" onSubmit={publicarRuta}>
          <div className="campos-ruta">
            <div className="campo-formulario">
              <label htmlFor="origen">Origen</label>

              <div className="campo-con-accion">
                <input
                  id="origen"
                  type="text"
                  value={origen}
                  onChange={(evento) => setOrigen(evento.target.value)}
                  placeholder="Ej. Bello, Antioquia"
                />

                <button
                  type="button"
                  className="boton-secundario"
                  onClick={buscarOrigen}
                  disabled={cargandoOrigen}
                >
                  {cargandoOrigen ? "Buscando..." : "Ubicar"}
                </button>
              </div>

              <button
                type="button"
                className="boton-ubicacion"
                onClick={usarUbicacionActual}
                disabled={cargandoOrigen}
              >
                Usar mi ubicación actual
              </button>
            </div>

            <div className="campo-formulario">
              <label htmlFor="destino">Destino</label>

              <div className="campo-con-accion">
                <input
                  id="destino"
                  type="text"
                  value={destino}
                  onChange={(evento) => setDestino(evento.target.value)}
                  placeholder="Ej. Tecnológico de Antioquia"
                />

                <button
                  type="button"
                  className="boton-secundario"
                  onClick={buscarDestino}
                  disabled={cargandoDestino}
                >
                  {cargandoDestino ? "Buscando..." : "Ubicar"}
                </button>
              </div>
            </div>

            <div className="campo-formulario">
              <label htmlFor="fecha">Fecha de salida</label>

              <input
                id="fecha"
                type="date"
                value={fecha}
                onChange={(evento) => setFecha(evento.target.value)}
              />
            </div>

            <div className="campo-formulario">
              <label htmlFor="hora">Hora de salida</label>

              <input
                id="hora"
                type="time"
                value={hora}
                onChange={(evento) => setHora(evento.target.value)}
              />
            </div>

            <div className="campo-formulario">
              <label htmlFor="cupos">Cupos disponibles</label>

              <input
                id="cupos"
                type="number"
                min="1"
                value={cupos}
                onChange={(evento) => setCupos(evento.target.value)}
                placeholder="Ej. 3"
              />
            </div>
          </div>

          <div className="mapa-ruta">
            <div className="encabezado-mapa">
              <div>
                <h2>Ubicación del recorrido</h2>

                <p>
                  Ubica el origen y el destino para registrar las
                  coordenadas de la ruta.
                </p>
              </div>
            </div>

            <MapContainer
              center={UBICACION_INICIAL}
              zoom={12}
              scrollWheelZoom={true}
              className="mapa"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <AjustarMapa
                origen={ubicacionOrigen}
                destino={ubicacionDestino}
              />

              {ubicacionOrigen && (
                <Marker
                  position={[
                    ubicacionOrigen.lat,
                    ubicacionOrigen.lng,
                  ]}
                >
                  <Popup>
                    <strong>Origen</strong>
                    <br />
                    {origen || "Ubicación seleccionada"}
                  </Popup>
                </Marker>
              )}

              {ubicacionDestino && (
                <Marker
                  position={[
                    ubicacionDestino.lat,
                    ubicacionDestino.lng,
                  ]}
                >
                  <Popup>
                    <strong>Destino</strong>
                    <br />
                    {destino || "Ubicación seleccionada"}
                  </Popup>
                </Marker>
              )}
            </MapContainer>
          </div>

          {error && (
            <p className="mensaje-formulario mensaje-error">
              {error}
            </p>
          )}

          {mensaje && (
            <p className="mensaje-formulario mensaje-exito">
              {mensaje}
            </p>
          )}

          <div className="acciones-formulario">
            <button
              type="submit"
              className="boton-principal"
              disabled={guardando}
            >
              {guardando ? "Publicando..." : "Publicar ruta"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

export default PublicarRuta;