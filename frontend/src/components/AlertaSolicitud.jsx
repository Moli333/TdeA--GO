import { useState } from "react";
import "./AlertaSolicitud.css";

function formatearPesos(valor) {
    const numero = Number(valor);
    if (!Number.isFinite(numero) || numero <= 0) return "Por definir";
    return `$${numero.toLocaleString("es-CO")}`;
}

function formatearFecha(valor) {
    if (!valor) return "Por definir";
    const texto = String(valor).replace(" ", "T");
    const [fecha, hora = ""] = texto.split("T");
    const [anio, mes, dia] = fecha.split("-");
    if (!anio || !mes || !dia) return texto;
    const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
    return `${Number(dia)} ${meses[Number(mes) - 1] || mes} ${anio}, ${hora.slice(0, 5)}`;
}

// ------------------------------------------------------------------
// Ventana emergente BLOQUEANTE para el conductor.
// No se puede cerrar: solo se libera al aceptar o rechazar.
// ------------------------------------------------------------------
export default function AlertaSolicitud({ alarmas, API_URL, token, alResponder }) {
    const [procesando, setProcesando] = useState(false);
    const [error, setError] = useState("");

    if (!alarmas || alarmas.length === 0) return null;

    const alarma = alarmas[0];
    const pasajero = alarma.pasajero || {};
    const esCupo = alarma.tipo === "cupo";

    const responder = async (accion) => {
        if (procesando) return;
        setProcesando(true);
        setError("");

        try {
            const url = esCupo
                ? `${API_URL}/api/solicitudes/${encodeURIComponent(alarma.solicitud_id)}/responder`
                : `${API_URL}/api/solicitudes-viajes-nuevos/${encodeURIComponent(alarma.solicitud_id)}/responder`;

            const respuesta = await fetch(url, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ accion }),
            });

            const datos = await respuesta.json().catch(() => ({}));

            // 409: otro conductor la tomó o ya fue atendida; igual se libera.
            if (!respuesta.ok && respuesta.status !== 409) {
                throw new Error(datos.mensaje || "No fue posible responder la solicitud.");
            }

            if (!respuesta.ok && respuesta.status === 409) {
                setError(datos.mensaje || "La solicitud ya no está disponible.");
            }

            await alResponder?.();
        } catch (e) {
            setError(e.message || "No fue posible responder la solicitud.");
        } finally {
            setProcesando(false);
        }
    };

    return (
        <div className="alerta-fondo" role="alertdialog" aria-modal="true" aria-labelledby="alerta-titulo">
            <div className="alerta-tarjeta">
                <div className="alerta-cabecera">
                    <span className="alerta-pulso" aria-hidden="true" />
                    <div>
                        <h2 id="alerta-titulo">
                            {esCupo ? "Solicitud de cupo" : "Solicitud de viaje"}
                        </h2>
                        <p>Responde para continuar usando TdeA GO</p>
                    </div>
                    {alarmas.length > 1 && (
                        <span className="alerta-contador">1 de {alarmas.length}</span>
                    )}
                </div>

                <div className="alerta-pasajero">
                    <span className="alerta-avatar">
                        {pasajero.foto_url ? (
                            <img src={pasajero.foto_url} alt="" />
                        ) : (
                            (pasajero.nombre_completo || "P").charAt(0).toUpperCase()
                        )}
                    </span>
                    <div>
                        <strong>{pasajero.nombre_completo || "Pasajero"}</strong>
                        <small>
                            {pasajero.verificado ? "✔ Cuenta verificada" : "Cuenta sin verificar"}
                            {pasajero.telefono ? ` · ${pasajero.telefono}` : ""}
                        </small>
                    </div>
                </div>

                <div className="alerta-ruta">
                    <div>
                        <span className="alerta-punto origen" />
                        <div>
                            <small>Origen</small>
                            <strong>{alarma.origen}</strong>
                        </div>
                    </div>
                    <div>
                        <span className="alerta-punto destino" />
                        <div>
                            <small>Destino</small>
                            <strong>{alarma.destino}</strong>
                        </div>
                    </div>
                </div>

                <dl className="alerta-datos">
                    <div>
                        <dt>Salida</dt>
                        <dd>{formatearFecha(alarma.fecha_hora_salida)}</dd>
                    </div>
                    <div>
                        <dt>Tarifa</dt>
                        <dd>{formatearPesos(alarma.tarifa)}</dd>
                    </div>
                    {alarma.distancia_km ? (
                        <div>
                            <dt>Distancia</dt>
                            <dd>{Number(alarma.distancia_km).toFixed(1)} km</dd>
                        </div>
                    ) : null}
                    {alarma.punto_encuentro ? (
                        <div>
                            <dt>Punto de encuentro</dt>
                            <dd>{alarma.punto_encuentro}</dd>
                        </div>
                    ) : null}
                </dl>

                {error && <p className="alerta-error" role="alert">{error}</p>}

                <div className="alerta-acciones">
                    <button
                        type="button"
                        className="alerta-rechazar"
                        onClick={() => responder("rechazar")}
                        disabled={procesando}
                    >
                        Rechazar
                    </button>
                    <button
                        type="button"
                        className="alerta-aceptar"
                        onClick={() => responder("aceptar")}
                        disabled={procesando}
                    >
                        {procesando ? "Enviando..." : "Aceptar"}
                    </button>
                </div>
            </div>
        </div>
    );
}
