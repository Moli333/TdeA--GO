// ------------------------------------------------------------------
// Agrega automáticamente el token de sesión (Authorization: Bearer)
// a TODAS las peticiones que van al backend de TdeA GO, para que el
// servidor siempre pueda verificar la identidad del usuario.
// Si una petición ya trae su propio Authorization, no se modifica.
// ------------------------------------------------------------------

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function leerToken() {
    try {
        const guardado = sessionStorage.getItem("tdea_go_usuario");
        if (!guardado) return null;
        const usuario = JSON.parse(guardado);
        return usuario?.token || usuario?.access_token || null;
    } catch {
        return null;
    }
}

export function activarFetchConToken() {
    if (window.__tdeaFetchConToken) return;
    window.__tdeaFetchConToken = true;

    const fetchOriginal = window.fetch.bind(window);

    window.fetch = (entrada, opciones = {}) => {
        try {
            const url =
                typeof entrada === "string" ? entrada : entrada?.url || "";

            if (url.startsWith(API_URL)) {
                const token = leerToken();
                const headers = new Headers(
                    opciones.headers ||
                    (typeof entrada !== "string" ? entrada.headers : undefined)
                );

                if (token && !headers.has("Authorization")) {
                    headers.set("Authorization", `Bearer ${token}`);
                }

                return fetchOriginal(entrada, { ...opciones, headers });
            }
        } catch {
            // Si algo falla, se envía la petición sin modificar.
        }

        return fetchOriginal(entrada, opciones);
    };
}
