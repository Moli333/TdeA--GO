// ------------------------------------------------------------------
// SERVICIO DE NOTIFICACIONES
//
// Eventos:
//   cupo_pendiente        -> conductor  (un pasajero pidió un cupo)
//   cupo_respuesta        -> pasajero   (el conductor aceptó/rechazó)
//   viaje_nuevo_pendiente -> conductores interesados
//   viaje_nuevo_respuesta -> pasajero   (un conductor aceptó su viaje)
//
// "leida" = el usuario vio el aviso.
// "atendida" = la solicitud ya fue aceptada/rechazada (apaga la alarma).
// Marcar como leída NUNCA apaga la alarma.
// ------------------------------------------------------------------

import crypto from "crypto";
import { supabaseAdmin } from "../config/supabase.js";

const db = supabaseAdmin;

export const TIPOS_PENDIENTES = [
    "cupo_pendiente",
    "viaje_nuevo_pendiente",
];

function esErrorDeColumna(error) {
    const texto = `${error?.message || ""} ${error?.details || ""}`;
    return (
        error?.code === "42703" ||
        error?.code === "PGRST204" ||
        /atendida|origen_solicitud/.test(texto)
    );
}

export async function crearNotificacion({
    usuarioId,
    titulo,
    mensaje,
    tipoEvento,
    solicitudId = null,
    origenSolicitud = null,
}) {
    if (!usuarioId) return null;

    try {
        // Evita duplicados del mismo aviso para la misma solicitud.
        if (solicitudId) {
            const { data: existente } = await db
                .from("notificaciones")
                .select("id")
                .eq("usuario_id", usuarioId)
                .eq("tipo_evento", tipoEvento)
                .eq("solicitud_id", solicitudId)
                .limit(1)
                .maybeSingle();

            if (existente) return existente;
        }

        const base = {
            id: crypto.randomUUID(),
            usuario_id: usuarioId,
            titulo,
            mensaje,
            leida: false,
            tipo_evento: tipoEvento,
            solicitud_id: solicitudId,
            fecha_creacion: new Date().toISOString(),
        };

        const completa = {
            ...base,
            atendida: !TIPOS_PENDIENTES.includes(tipoEvento),
            origen_solicitud: origenSolicitud,
        };

        let { data, error } = await db
            .from("notificaciones")
            .insert(completa)
            .select()
            .single();

        // Si todavía no se ejecutó la migración SQL, se guarda sin las
        // columnas nuevas para no perder el aviso.
        if (error && esErrorDeColumna(error)) {
            ({ data, error } = await db
                .from("notificaciones")
                .insert(base)
                .select()
                .single());
        }

        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Error creando notificación:", error);
        return null;
    }
}

// Apaga la alarma de una solicitud. Si se indica usuarioId solo
// afecta a ese usuario; si no, a todos los que la recibieron.
export async function marcarAtendidas(
    solicitudId,
    tipos = TIPOS_PENDIENTES,
    usuarioId = null
) {
    if (!solicitudId) return;

    try {
        let consulta = db
            .from("notificaciones")
            .update({
                atendida: true,
                atendida_en: new Date().toISOString(),
            })
            .eq("solicitud_id", solicitudId)
            .in("tipo_evento", tipos);

        if (usuarioId) consulta = consulta.eq("usuario_id", usuarioId);

        const { error } = await consulta;

        if (error && !esErrorDeColumna(error)) {
            console.error("Error marcando atendidas:", error);
        }
    } catch (error) {
        console.error("Error marcando atendidas:", error);
    }
}

// Estimación de distancia y tarifa para un viaje nuevo, con la misma
// tarifa del sistema (automóvil: $1.000/km, mínimo $8.300).
export function estimarViaje(latO, lngO, latD, lngD) {
    const rad = (g) => (g * Math.PI) / 180;
    const R = 6371;
    const dLat = rad(latD - latO);
    const dLng = rad(lngD - lngO);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(rad(latO)) *
        Math.cos(rad(latD)) *
        Math.sin(dLng / 2) ** 2;

    const recta = 2 * R * Math.asin(Math.sqrt(a));
    const distanciaKm = Math.round(recta * 1.35 * 100) / 100; // factor vial
    const base = distanciaKm * 1000;
    const tarifa = base <= 8300 ? 8300 : Math.ceil(base / 500) * 500;

    return { distanciaKm, tarifa };
}
