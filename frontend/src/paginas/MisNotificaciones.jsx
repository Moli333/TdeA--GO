import { useEffect, useState } from "react";

export default function MisNotificaciones({ usuario, API_URL }) {
  const [notificaciones, setNotificaciones] = useState([]);
  const [cargando, setCargando] = useState(
    Boolean(usuario?.id || usuario?.id_usuario)
  );

  useEffect(() => {
    let cancelado = false;

    const consultarNotificaciones = async () => {
      const idUsuario = usuario?.id || usuario?.id_usuario;

      if (!idUsuario) return;

      try {
        const respuesta = await fetch(
          `${API_URL}/api/notificaciones/${encodeURIComponent(idUsuario)}`,
          {
            headers: {
              Authorization: `Bearer ${usuario.token || usuario.access_token}`,
            },
          }
        );
        const datos = await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(datos.mensaje || "Error al cargar las notificaciones.");
        }

        if (!cancelado) {
          setNotificaciones(Array.isArray(datos) ? datos : []);
        }
      } catch (error) {
        if (!cancelado) {
          console.error("Error al cargar notificaciones:", error);
        }
      } finally {
        if (!cancelado) {
          setCargando(false);
        }
      }
    };

    consultarNotificaciones();

    return () => {
      cancelado = true;
    };
  }, [usuario?.id, usuario?.id_usuario, API_URL]);

  const marcarComoLeida = async (id) => {
    try {
      const respuesta = await fetch(`${API_URL}/api/notificaciones/${id}/leida`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${usuario.token || usuario.access_token}`,
        },
      });

      if (respuesta.ok) {
        setNotificaciones((prev) =>
          prev.map((n) => (n.id === id ? { ...n, leida: true } : n))
        );
      }
    } catch (error) {
      console.error("Error al marcar como leída:", error);
    }
  };

  // Función opcional si deseas gestionar la respuesta del cupo (Aceptar/Rechazar)
  const gestionarAccionCupo = async (notifId, accion) => {
    try {
      // Aquí puedes conectar el endpoint correspondiente si manejas estados de solicitud (ej. /api/solicitudes/:id/estado)
      alert(`Has seleccionado: ${accion} para esta solicitud.`);
      await marcarComoLeida(notifId);
    } catch (error) {
      console.error("Error al procesar la acción:", error);
    }
  };

  return (
    <div className="contenedor" style={{ padding: "32px 16px", maxWidth: "800px" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1>Mis Notificaciones</h1>
        <p style={{ color: "#687782" }}>Revisa las solicitudes y avisos recientes de tus rutas.</p>
      </div>

      {cargando ? (
        <p>Cargando notificaciones...</p>
      ) : notificaciones.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", background: "#f8f9fa", borderRadius: "12px" }}>
          <p>No tienes notificaciones por ahora.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {notificaciones.map((notif) => {
            const esSolicitudCupo = notif.titulo?.toLowerCase().includes("solicitud de cupo");

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
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <strong>{notif.titulo}</strong>
                    {!notif.leida && (
                      <span
                        style={{
                          background: "#0b5f91",
                          color: "#fff",
                          fontSize: "10px",
                          padding: "2px 6px",
                          borderRadius: "4px",
                        }}
                      >
                        Nueva
                      </span>
                    )}
                  </div>
                  <p style={{ margin: "4px 0", color: "#333", fontSize: "14px" }}>{notif.mensaje}</p>
                  <small style={{ color: "#888", fontSize: "12px" }}>
                    {new Date(notif.fecha_creacion).toLocaleString()}
                  </small>

                  {/* Botones de acción rápida si es una solicitud de cupo */}
                  {esSolicitudCupo && !notif.leida && (
                    <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                      <button
                        type="button"
                        onClick={() => gestionarAccionCupo(notif.id, "Aceptada")}
                        style={{
                          background: "#16a765",
                          color: "#fff",
                          border: "none",
                          padding: "6px 12px",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "12px",
                          fontWeight: "500",
                        }}
                      >
                        Aceptar
                      </button>
                      <button
                        type="button"
                        onClick={() => gestionarAccionCupo(notif.id, "Rechazada")}
                        style={{
                          background: "#d93838",
                          color: "#fff",
                          border: "none",
                          padding: "6px 12px",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "12px",
                          fontWeight: "500",
                        }}
                      >
                        Rechazar
                      </button>
                    </div>
                  )}
                </div>

                {!notif.leida && !esSolicitudCupo && (
                  <button
                    type="button"
                    onClick={() => marcarComoLeida(notif.id)}
                    style={{
                      background: "transparent",
                      border: "1px solid #0b5f91",
                      color: "#0b5f91",
                      padding: "6px 12px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "12px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Marcar leída
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