import { useEffect, useState } from "react";
import "./MisSolicitudesNuevas.css";

export default function MisSolicitudesNuevas({
  usuario,
  API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000",
}) {
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const id = usuario?.id || usuario?.id_usuario;
    if (!id) {
      return;
    }
    let cancelado = false;
    const consultar = async () => {
      try {
        const respuesta = await fetch(`${API_URL}/api/solicitudes-viajes-nuevos/pasajero/${encodeURIComponent(id)}`);
        const datos = await respuesta.json().catch(() => ({}));
        if (!respuesta.ok) throw new Error(datos.mensaje || "No fue posible consultar tus solicitudes.");
        const lista = Array.isArray(datos) ? datos : (datos.solicitudes || datos.data || []);
        if (!cancelado) setSolicitudes(lista);
      } catch (e) {
        if (!cancelado) setError(e.message || "Ocurrió un error al consultar tus solicitudes.");
      } finally {
        if (!cancelado) setCargando(false);
      }
    };
    consultar();
    return () => { cancelado = true; };
  }, [usuario?.id, usuario?.id_usuario, API_URL]);

  const fechaLegible = (valor) => {
    if (!valor) return "Fecha no disponible";
    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime()) ? valor : fecha.toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" });
  };

  return (
    <section className="mis-viajes-nuevos pagina-contenido">
      <header className="mis-viajes-nuevos-encabezado">
        <div><span>MIS VIAJES</span><h1>Mis solicitudes de viaje</h1><p>Consulta las solicitudes de viaje nuevo que has registrado.</p></div>
        <a href="/solicitar-viaje">Solicitar otro viaje</a>
      </header>
      {cargando && <p className="mis-viajes-nuevos-estado">Cargando tus solicitudes...</p>}
      {error && <p className="mis-viajes-nuevos-error" role="alert">{error}</p>}
      {!cargando && !error && solicitudes.length === 0 && (
        <div className="mis-viajes-nuevos-vacio"><h2>Aún no tienes solicitudes</h2><p>Cuando registres un viaje nuevo, aparecerá aquí.</p></div>
      )}
      <div className="mis-viajes-nuevos-lista">
        {solicitudes.map((solicitud) => (
          <article className="mis-viajes-nuevos-tarjeta" key={solicitud.id}>
            <div className="mis-viajes-nuevos-ruta"><div><small>ORIGEN</small><strong>{solicitud.origen}</strong></div><span aria-hidden="true">→</span><div><small>DESTINO</small><strong>{solicitud.destino}</strong></div></div>
            <div className="mis-viajes-nuevos-pie"><span>{fechaLegible(solicitud.fecha_hora_salida)}</span><span className={`estado-solicitud-nueva ${String(solicitud.estado || "pendiente").toLowerCase()}`}>{solicitud.estado || "pendiente"}</span></div>
          </article>
        ))}
      </div>
    </section>
  );
}
