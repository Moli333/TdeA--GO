// ------------------------------------------------------------------
// Conecta TODAS las peticiones al backend de TdeA GO con la sesión:
//  1. Agrega Authorization: Bearer <token> si la petición no lo trae.
//  2. Si el servidor responde 401 (token vencido), renueva la sesión
//     con el refresh_token y repite la petición UNA vez.
//  3. Si no se puede renovar, avisa a la app para pedir inicio de
//     sesión (evento "tdea:sesion-expirada").
// ------------------------------------------------------------------

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const CLAVE_SESION = "tdea_go_usuario";

// Rutas que nunca deben llevar token ni reintento.
const RUTAS_PUBLICAS = ["/api/login", "/api/refrescar-sesion"];

function leerSesion() {
    try {
        const guardado =
            sessionStorage.getItem(CLAVE_SESION) ||
            localStorage.getItem(CLAVE_SESION);

        return guardado ? JSON.parse(guardado) : null;
    } catch {
        return null;
    }
}

function leerToken() {
    const sesion = leerSesion();

    return (
        sesion?.token ||
        sesion?.access_token ||
        sesion?.session?.access_token ||
        null
    );
}

function guardarTokens(token, refreshToken) {
    try {
        const sesion = leerSesion();
        if (!sesion) return;

        sessionStorage.setItem(
            CLAVE_SESION,
            JSON.stringify({
                ...sesion,
                token,
                refresh_token: refreshToken || sesion.refresh_token,
            })
        );
    } catch {
        // Sin almacenamiento disponible: la app sigue con el estado en memoria.
    }
}

export function activarFetchConToken() {
    if (window.__tdeaFetchConToken) return;
    window.__tdeaFetchConToken = true;

    const fetchOriginal = window.fetch.bind(window);
    let renovacionEnCurso = null;

    const renovarToken = () => {
        if (renovacionEnCurso) return renovacionEnCurso;

        const refreshToken = leerSesion()?.refresh_token;
        if (!refreshToken) return Promise.resolve(null);

        renovacionEnCurso = fetchOriginal(`${API_URL}/api/refrescar-sesion`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh_token: refreshToken }),
        })
            .then(async (respuesta) => {
                if (!respuesta.ok) return null;

                const datos = await respuesta.json();
                if (!datos.token) return null;

                guardarTokens(datos.token, datos.refresh_token);

                window.dispatchEvent(
                    new CustomEvent("tdea:token-renovado", {
                        detail: {
                            token: datos.token,
                            refresh_token: datos.refresh_token,
                        },
                    })
                );

                return datos.token;
            })
            .catch(() => null)
            .finally(() => {
                renovacionEnCurso = null;
            });

        return renovacionEnCurso;
    };

    window.fetch = async (entrada, opciones = {}) => {
        let url = "";

        try {
            url = typeof entrada === "string" ? entrada : entrada?.url || "";
        } catch {
            return fetchOriginal(entrada, opciones);
        }

        const esApi = url.startsWith(API_URL);
        const esPublica = RUTAS_PUBLICAS.some((ruta) => url.includes(ruta));

        if (!esApi || esPublica) {
            return fetchOriginal(entrada, opciones);
        }

        const headers = new Headers(
            opciones.headers ||
            (typeof entrada !== "string" ? entrada.headers : undefined)
        );

        const token = leerToken();

        if (token && !headers.has("Authorization")) {
            headers.set("Authorization", `Bearer ${token}`);
        }

        const respuesta = await fetchOriginal(entrada, { ...opciones, headers });

        // Solo se intenta renovar si había una sesión iniciada.
        if (respuesta.status !== 401 || !token) return respuesta;

        const nuevoToken = await renovarToken();

        if (nuevoToken) {
            headers.set("Authorization", `Bearer ${nuevoToken}`);
            return fetchOriginal(entrada, { ...opciones, headers });
        }

        window.dispatchEvent(new CustomEvent("tdea:sesion-expirada"));
        return respuesta;
    };
}
