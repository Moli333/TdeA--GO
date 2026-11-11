// ------------------------------------------------------------------
// REGLAS DE HORARIO ENTRE ROLES
//
// Un usuario no puede tener, al mismo tiempo, un compromiso como
// conductor y otro como pasajero. Este módulo centraliza esa regla.
//
// Las fechas de la base de datos son "timestamp" SIN zona horaria y
// representan la hora de Colombia. Para no depender de la zona
// horaria del servidor (Render usa UTC) todas las fechas se
// interpretan como UTC y la hora actual se convierte a hora Colombia.
// ------------------------------------------------------------------

import { supabaseAdmin } from "../config/supabase.js";

const db = supabaseAdmin;

// Duración estimada cuando el viaje no tiene duracion_minutos.
export const DURACION_POR_DEFECTO_MIN = 90;

// Margen de seguridad antes y después del viaje.
export const MARGEN_MIN = 30;

// Minutos antes de la salida en que el compromiso "se activa" y el
// sistema obliga al usuario a usar el rol que corresponde.
export const MINUTOS_ACTIVACION = 15;

const UTC_COLOMBIA_OFFSET_MS = 5 * 60 * 60 * 1000;

export function aMilisegundos(valor) {
    if (!valor) return NaN;
    const texto = String(valor).trim().replace(" ", "T");
    const tieneZona = /(Z|[+-]\d{2}:?\d{2})$/.test(texto);
    return new Date(tieneZona ? texto : `${texto}Z`).getTime();
}

export function ahoraColombiaMs() {
    return Date.now() - UTC_COLOMBIA_OFFSET_MS;
}

function ventana(fechaHoraSalida, duracionMin) {
    const inicio = aMilisegundos(fechaHoraSalida);
    const duracion =
        Number(duracionMin) > 0
            ? Number(duracionMin)
            : DURACION_POR_DEFECTO_MIN;

    return {
        inicio,
        fin: inicio + (duracion + MARGEN_MIN) * 60000,
    };
}

function seCruzan(a, b) {
    return a.inicio < b.fin && b.inicio < a.fin;
}

// Devuelve todos los compromisos vigentes (no terminados) del usuario.
export async function obtenerCompromisos(usuarioId) {
    const compromisos = [];
    const ahora = ahoraColombiaMs();

    const agregar = (rol, tipo, id, origen, destino, salida, duracion, confirmado = true) => {
        const v = ventana(salida, duracion);
        if (!Number.isFinite(v.inicio) || v.fin < ahora) return;

        compromisos.push({
            rol,
            tipo,
            id,
            origen,
            destino,
            fecha_hora_salida: salida,
            confirmado,
            ...v,
        });
    };

    // 1. Rutas publicadas por el usuario (conductor).
    const { data: rutas } = await db
        .from("rutas")
        .select("id, origen, destino, fecha_hora_salida, duracion_minutos")
        .eq("conductor_id", usuarioId)
        .eq("estado", "programado");

    (rutas || []).forEach((r) =>
        agregar(
            "conductor",
            "ruta",
            r.id,
            r.origen,
            r.destino,
            r.fecha_hora_salida,
            r.duracion_minutos
        )
    );

    // 2. Viajes nuevos que el usuario aceptó como conductor.
    const { data: aceptados } = await db
        .from("solicitudes_viajes_nuevos")
        .select("id, origen, destino, fecha_hora_salida")
        .eq("conductor_id", usuarioId)
        .eq("estado", "aceptada");

    (aceptados || []).forEach((s) =>
        agregar(
            "conductor",
            "viaje_nuevo",
            s.id,
            s.origen,
            s.destino,
            s.fecha_hora_salida,
            null
        )
    );

    // 3. Cupos solicitados o reservados como pasajero.
    const { data: cupos } = await db
        .from("solicitudes_viaje")
        .select(
            `id, estado,
       ruta:rutas!solicitudes_viaje_viaje_id_fkey (
         origen, destino, fecha_hora_salida, duracion_minutos, estado
       )`
        )
        .eq("pasajero_id", usuarioId)
        .in("estado", ["pendiente", "aceptada"]);

    (cupos || []).forEach((c) => {
        if (!c.ruta || c.ruta.estado !== "programado") return;
        agregar(
            "pasajero",
            "cupo",
            c.id,
            c.ruta.origen,
            c.ruta.destino,
            c.ruta.fecha_hora_salida,
            c.ruta.duracion_minutos,
            c.estado === "aceptada"
        );
    });

    // 4. Viajes nuevos pedidos por el usuario como pasajero.
    const { data: pedidos } = await db
        .from("solicitudes_viajes_nuevos")
        .select("id, estado, origen, destino, fecha_hora_salida")
        .eq("pasajero_id", usuarioId)
        .in("estado", ["pendiente", "aceptada"]);

    (pedidos || []).forEach((s) =>
        agregar(
            "pasajero",
            "viaje_nuevo",
            s.id,
            s.origen,
            s.destino,
            s.fecha_hora_salida,
            null,
            s.estado === "aceptada"
        )
    );

    return compromisos;
}

// Busca un compromiso del usuario que se cruce con la nueva franja.
// rolNuevo: rol con el que el usuario quiere participar en la franja.
// Si el compromiso existente es del MISMO rol y es el mismo viaje,
// se puede excluir con excluirId.
export async function buscarConflictoHorario(
    usuarioId,
    fechaHoraSalida,
    duracionMin,
    { excluirId = null } = {}
) {
    const nueva = ventana(fechaHoraSalida, duracionMin);
    if (!Number.isFinite(nueva.inicio)) return null;

    const compromisos = await obtenerCompromisos(usuarioId);

    return (
        compromisos.find(
            (c) => c.id !== excluirId && seCruzan(c, nueva)
        ) || null
    );
}

export function mensajeConflicto(conflicto) {
    if (!conflicto) return "";

    const cuando = String(conflicto.fecha_hora_salida)
        .replace("T", " ")
        .slice(0, 16);

    const comoRol =
        conflicto.rol === "conductor" ? "conductor" : "pasajero";

    return (
        `Ya tienes un compromiso como ${comoRol} el ${cuando} ` +
        `(${conflicto.origen} → ${conflicto.destino}) que se cruza con este horario. ` +
        `Cumple o cancela ese servicio primero.`
    );
}

// Si hay un compromiso "activo" (llegó su hora) devuelve el rol
// que el usuario está obligado a usar.
export async function obtenerRolObligado(usuarioId) {
    const ahora = ahoraColombiaMs();
    const compromisos = await obtenerCompromisos(usuarioId);

    // Un cupo solo solicitado (pendiente) no obliga a cambiar de rol;
    // por eso solo se consideran los confirmados.
    const activos = compromisos
        .filter((c) => {
            if (!c.confirmado) return false;
            const desde = c.inicio - MINUTOS_ACTIVACION * 60000;
            return ahora >= desde && ahora <= c.fin;
        })
        .sort((a, b) => a.inicio - b.inicio);

    return activos[0] || null;
}
