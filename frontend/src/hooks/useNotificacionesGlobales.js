import { useCallback, useEffect, useRef, useState } from "react";
import {
    actualizarFavicon,
    actualizarTitulo,
} from "../utils/indicadorFavicon";
import {
    activarDesbloqueoAutomatico,
    detenerAlarmaBocina,
    iniciarAlarmaBocina,
    sonarBocinaUnaVez,
} from "../utils/sonidos";

const INTERVALO_MS = 6000;

// ------------------------------------------------------------------
// Consulta periódicamente el resumen de notificaciones, sin importar
// en qué pantalla esté el usuario, y se encarga de:
//  - punto rojo en el favicon, título de la pestaña y menú
//  - sonido único (pasajero) o alarma repetitiva (conductor)
//  - cambio de rol obligatorio cuando llega la hora de un viaje
// ------------------------------------------------------------------
export default function useNotificacionesGlobales({
    usuario,
    API_URL,
    alCambiarRol,
}) {
    const [resumen, setResumen] = useState({
        no_leidas: 0,
        no_leidas_ids: [],
        alarmas: [],
        compromiso_activo: null,
    });

    const idsConocidos = useRef(null);
    const alCambiarRolRef = useRef(alCambiarRol);

    useEffect(() => {
        alCambiarRolRef.current = alCambiarRol;
    }, [alCambiarRol]);

    const idUsuario = usuario?.id || usuario?.id_usuario;
    const token = usuario?.token || usuario?.access_token;
    const rol = usuario?.rol?.toLowerCase();
    const activo =
        Boolean(idUsuario && token) &&
        ["conductor", "pasajero"].includes(rol);

    useEffect(() => {
        activarDesbloqueoAutomatico();
    }, []);

    const consultar = useCallback(async () => {
        if (!activo) return;

        try {
            const respuesta = await fetch(`${API_URL}/api/notificaciones-resumen`, {
                headers: { Authorization: `Bearer ${token}` },
                cache: "no-store",
            });

            if (!respuesta.ok) return;

            const datos = await respuesta.json();
            setResumen(datos);

            if (datos.rol_cambiado && datos.rol_actual) {
                alCambiarRolRef.current?.(datos.rol_actual, datos.compromiso_activo);
            }
        } catch {
            // Sin conexión momentánea: se reintenta en el próximo ciclo.
        }
    }, [activo, API_URL, token]);

    // Sondeo periódico + al volver a la pestaña.
    useEffect(() => {
        if (!activo) {
            // El estado se limpia en el siguiente ciclo para no renderizar en cascada.
            const limpiar = setTimeout(
                () =>
                    setResumen({
                        no_leidas: 0,
                        no_leidas_ids: [],
                        alarmas: [],
                        compromiso_activo: null,
                    }),
                0
            );
            idsConocidos.current = null;
            return () => clearTimeout(limpiar);
        }

        const primera = setTimeout(consultar, 0);
        const intervalo = setInterval(consultar, INTERVALO_MS);
        const alVolver = () => {
            if (document.visibilityState === "visible") consultar();
        };
        document.addEventListener("visibilitychange", alVolver);

        return () => {
            clearTimeout(primera);
            clearInterval(intervalo);
            document.removeEventListener("visibilitychange", alVolver);
        };
    }, [activo, consultar]);

    // Indicadores visuales: favicon y título.
    useEffect(() => {
        actualizarFavicon(activo && resumen.no_leidas > 0);
        actualizarTitulo(activo ? resumen.no_leidas : 0);
    }, [activo, resumen.no_leidas]);

    // Sonido único cuando aparecen notificaciones nuevas sin leer.
    const hayAlarmas = resumen.alarmas.length > 0;

    useEffect(() => {
        if (!activo) return;

        const actuales = resumen.no_leidas_ids || [];

        if (idsConocidos.current === null) {
            // Primera carga: si ya hay avisos pendientes, suena una vez.
            if (actuales.length > 0 && !hayAlarmas) sonarBocinaUnaVez();
        } else {
            const hayNuevas = actuales.some(
                (id) => !idsConocidos.current.has(id)
            );
            if (hayNuevas && !hayAlarmas) sonarBocinaUnaVez();
        }

        idsConocidos.current = new Set(actuales);
    }, [activo, resumen.no_leidas_ids, hayAlarmas]);

    // Alarma insistente mientras existan solicitudes sin atender.
    useEffect(() => {
        if (activo && hayAlarmas) {
            iniciarAlarmaBocina();
        } else {
            detenerAlarmaBocina();
        }

        return () => detenerAlarmaBocina();
    }, [activo, hayAlarmas]);

    return { resumen, refrescar: consultar };
}
