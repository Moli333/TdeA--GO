
import { useCallback, useEffect, useState } from "react";

export default function MisNotificaciones({ usuario, API_URL }) {
  const [notificaciones, setNotificaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const idUsuario = usuario?.id || usuario?.id_usuario;
  const token = usuario?.token || usuario?.access_token;

  const consultarNotificaciones = useCallback(async (cancelar = () => false) => {
    if (!idUsuario || !token) {
      setNotificaciones([]);
      setCargando(false);
      return;
    }

    try {
      const respuesta = await fetch(
        `${API_URL}/api/notificaciones/${encodeURIComponent(idUsuario)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Cache-Control": "no-cache",
          },
          cache: "no-store",
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje || "No fue posible cargar las notificaciones."
        );
      }

      if (!cancelar()) {
        setNotificaciones(Array.isArray(datos) ? datos : []);
        setError("");
      }
    } catch (err) {
      if (!cancelar()) {
        console.error("Error al consultar notificaciones:", err);
        setError(err.message || "Error al cargar las notificaciones.");
      }
    } finally {
      if (!cancelar()) {
        setCargando(false);
      }
    }
  }, [idUsuario, token, API_URL]);

  useEffect(() => {
    let cancelado = false;

    const consultar = () => consultarNotificaciones(() => cancelado);

    consultar();

    // Actualiza los estados sin necesidad de salir de la pantalla.
    const intervalo = setInterval(consultar, 10000);

    return () => {
      cancelado = true;
      clearInterval(intervalo);
    };
  }, [consultarNotificaciones]);

  const marcarComoLeida = async (id) => {
    try {
      const respuesta = await fetch(
        `${API_URL}/api/notificaciones/${encodeURIComponent(id)}/leida`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const datos = await respuesta.json().catch(() => ({}));

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || "No fue posible marcar la notificación.");
      }

      setNotificaciones((anteriores) =>
        anteriores.map((notificacion) =>
          notificacion.id === id
            ? { ...notificacion, leida: true }
            : notificacion
        )
      );
    } catch (err) {
      console.error("Error al marcar como leída:", err);
      setError(err.message);
    }
  };

  const obtenerEstado = (estado) => {
    const normalizado = String(estado || "").toLowerCase().trim();

    if (["pendiente", "pending"].includes(normalizado)) {
      return {
        texto: "EN ESPERA",
        color: "#b86b00",
        fondo: "#fff2d8",
      };
    }

    if (["aceptada", "aceptado", "aprobada", "aprobado", "accepted"].includes(normalizado)) {
      return {
        texto: "APROBADA",
        color: "#16834a",
        fondo: "#e3f5eb",
      };
    }

    if (["rechazada", "rechazado", "rejected"].includes(normalizado)) {
      return {
        texto: "RECHAZADA",
        color: "#c62828",
        fondo: "#fde8e8",
      };
    }

    return null;
  };

  return (
    <div
      className="contenedor"
      style={{
        padding: "32px 16px",
        maxWidth: "800px",
        margin: "0 auto",
      }}
    >
      <div style={{ marginBottom: "24px" }}>
        <h1>Mis notificaciones</h1>
        <p style={{ color: "#687782" }}>
          Revisa las solicitudes y novedades de tus rutas.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            padding: "12px 16px",
            marginBottom: "16px",
            borderRadius: "8px",
            background: "#fde8e8",
            color: "#a52222",
          }}
        >
          {error}
        </div>
      )}

      {cargando ? (
        <p>Cargando notificaciones...</p>
      ) : notificaciones.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "40px",
            background: "#f8f9fa",
            borderRadius: "12px",
          }}
        >
          <p>No tienes notificaciones por ahora.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {notificaciones.map((notif) => {
            const estado = obtenerEstado(notif.estado_solicitud);

            return (
              <div
                key={notif.id}
                style={{
                  padding: "16px",
                  borderRadius: "12px",
                  background: notif.leida ? "#ffffff" : "#f0f7ff",
                  border: "1px solid #dfe7ec",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "16px",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ flex: "1 1 250px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "8px",
                      marginBottom: "8px",
                    }}
                  >
                    <strong>{notif.titulo}</strong>

                    {!notif.leida && (
                      <span
                        style={{
                          background: "#0b5f91",
                          color: "#fff",
                          fontSize: "10px",
                          padding: "3px 7px",
                          borderRadius: "4px",
                          fontWeight: "600",
                        }}
                      >
                        NUEVA
                      </span>
                    )}
                  </div>

                  <p
                    style={{
                      margin: "4px 0 10px",
                      color: "#333",
                      fontSize: "14px",
                      lineHeight: "1.5",
                    }}
                  >
                    {notif.mensaje}
                  </p>

                  {estado && (
                    <div style={{ marginBottom: "10px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          background: estado.fondo,
                          color: estado.color,
                          padding: "5px 10px",
                          borderRadius: "5px",
                          fontSize: "11px",
                          fontWeight: "700",
                          letterSpacing: "0.3px",
                        }}
                      >
                        {estado.texto}
                      </span>
                    </div>
                  )}

                  <small style={{ color: "#888", fontSize: "12px" }}>
                    {notif.fecha_creacion
                      ? new Date(notif.fecha_creacion).toLocaleString("es-CO")
                      : ""}
                  </small>
                </div>

                {!notif.leida && (
                  <button
                    type="button"
                    onClick={() => marcarComoLeida(notif.id)}
                    style={{
                      background: "transparent",
                      border: "1px solid #0b5f91",
                      color: "#0b5f91",
                      padding: "7px 12px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "12px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Marcar como leída
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
