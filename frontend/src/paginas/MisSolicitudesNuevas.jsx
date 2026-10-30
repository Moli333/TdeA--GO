import { useEffect, useState } from "react";
import "./MisSolicitudesNuevas.css";

export default function MisSolicitudesNuevas({
  usuario,
  API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000",
}) {
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const id = usuario?.id || usuario?.id_usuario;

  useEffect(() => {
    if (!id) return;

    let cancelado = false;

    const consultar = async () => {
      try {
        const respuesta = await fetch(
          `${API_URL}/api/solicitudes-viajes-nuevos/pasajero/${encodeURIComponent(id)}`
        );

        const datos = await respuesta.json().catch(() => ({}));

        if (!respuesta.ok) {
          throw new Error(datos.mensaje || "No fue posible consultar tus solicitudes.");
        }

        const lista = Array.isArray(datos)
          ? datos
          : datos.solicitudes || datos.data || [];

        if (!cancelado) {
          setSolicitudes(lista);
          setError("");
        }
      } catch (e) {
        if (!cancelado) {
          setError(e.message || "Ocurrió un error al consultar tus solicitudes.");
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    };

    consultar();
    const intervalo = setInterval(consultar, 10000);

    return () => {
      cancelado = true;
      clearInterval(intervalo);
    };
  }, [id, API_URL]);

  const fechaLegible = (valor) => {
    if (!valor) return "Fecha no disponible";

    const fecha = new Date(valor);

    return Number.isNaN(fecha.getTime())
      ? valor
      : fecha.toLocaleString("es-CO", {
        dateStyle: "medium",
        timeStyle: "short",
      });
  };

  const textoEstado = (estado) => {
    switch (String(estado || "pendiente").toLowerCase()) {
      case "aceptada":
        return "Conductor asignado";
      case "rechazada":
        return "Solicitud rechazada";
      default:
        return "Buscando conductor";
    }
  };

  if (!id) {
    return (
      <section className="mis-viajes-nuevos pagina-contenido">
        <p>No se pudo identificar tu cuenta. Inicia sesión nuevamente.</p>
      </section>
    );
  }

  return (
    <section className="mis-viajes-nuevos pagina-contenido">
      <header className="mis-viajes-nuevos-encabezado">
        <div>
          <span>MIS VIAJES</span>
          <h1>Mis solicitudes de viaje</h1>
          <p>Consulta tus solicitudes y el estado de asignación del conductor.</p>
        </div>
        <a href="/solicitar-viaje">Solicitar otro viaje</a>
      </header>

      {cargando && (
        <p className="mis-viajes-nuevos-estado">Cargando tus solicitudes...</p>
      )}

      {error && (
        <p className="mis-viajes-nuevos-error" role="alert">{error}</p>
      )}

      {!cargando && !error && solicitudes.length === 0 && (
        <div className="mis-viajes-nuevos-vacio">
          <h2>Aún no tienes solicitudes</h2>
          <p>Cuando registres un viaje nuevo, aparecerá aquí.</p>
        </div>
      )}

      <div className="mis-viajes-nuevos-lista">
        {solicitudes.map((solicitud) => {
          const estado = String(solicitud.estado || "pendiente").toLowerCase();

          return (
            <article className="mis-viajes-nuevos-tarjeta" key={solicitud.id}>
              <div className="mis-viajes-nuevos-ruta">
                <div>
                  <small>ORIGEN</small>
                  <strong>{solicitud.origen || "No disponible"}</strong>
                </div>
                <span aria-hidden="true">→</span>
                <div>
                  <small>DESTINO</small>
                  <strong>{solicitud.destino || "No disponible"}</strong>
                </div>
              </div>

              <div className="mis-viajes-nuevos-pie">
                <span>{fechaLegible(solicitud.fecha_hora_salida)}</span>
                <span
                  className={`estado-solicitud-nueva ${estado}`}
                  role="status"
                >
                  {textoEstado(estado)}
                </span>
              </div>

              {estado === "pendiente" && (
                <p role="status">
                  Tu solicitud está publicada. Estamos buscando un conductor.
                </p>
              )}

              {estado === "aceptada" && (
                <div className="mis-viajes-nuevos-conductor">
                  <strong>Tu viaje tiene conductor asignado.</strong>
                  {solicitud.conductor?.nombre_completo && (
                    <p>Conductor: {solicitud.conductor.nombre_completo}</p>
                  )}
                  {solicitud.conductor?.telefono && (
                    <p>Teléfono: {solicitud.conductor.telefono}</p>
                  )}
                </div>
              )}

              {estado === "rechazada" && (
                <p>Esta solicitud fue rechazada. Puedes registrar una nueva.</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
