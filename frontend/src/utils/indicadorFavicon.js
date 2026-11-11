// ------------------------------------------------------------------
// FAVICON CON PUNTO ROJO
// Conserva el favicon original de TdeA GO y le dibuja un punto rojo
// cuando existen notificaciones sin leer (como Outlook o WhatsApp).
// ------------------------------------------------------------------

let hrefOriginal = null;
let imagenBase = null;
let ultimoEstado = null;

function obtenerEnlace() {
    let enlace = document.querySelector("link[rel~='icon']");

    if (!enlace) {
        enlace = document.createElement("link");
        enlace.rel = "icon";
        document.head.appendChild(enlace);
    }

    return enlace;
}

function cargarImagenBase(href) {
    return new Promise((resolver, rechazar) => {
        const imagen = new Image();
        imagen.onload = () => resolver(imagen);
        imagen.onerror = rechazar;
        imagen.src = href;
    });
}

export async function actualizarFavicon(hayPendientes) {
    if (ultimoEstado === hayPendientes) return;
    ultimoEstado = hayPendientes;

    const enlace = obtenerEnlace();

    if (hrefOriginal === null) {
        hrefOriginal = enlace.getAttribute("href") || "/favicon.svg";
    }

    if (!hayPendientes) {
        enlace.removeAttribute("type");
        enlace.href = hrefOriginal;
        return;
    }

    try {
        if (!imagenBase) {
            imagenBase = await cargarImagenBase(hrefOriginal);
        }

        const lienzo = document.createElement("canvas");
        lienzo.width = 64;
        lienzo.height = 64;

        const ctx = lienzo.getContext("2d");
        ctx.drawImage(imagenBase, 0, 0, 64, 64);

        // Punto rojo con borde blanco en la esquina superior derecha.
        ctx.beginPath();
        ctx.arc(49, 15, 13, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(49, 15, 10, 0, Math.PI * 2);
        ctx.fillStyle = "#e53935";
        ctx.fill();

        enlace.type = "image/png";
        enlace.href = lienzo.toDataURL("image/png");
    } catch {
        // Si no se puede dibujar, se deja el favicon original.
    }
}

// Título de la pestaña: "(2) TdeA GO".
export function actualizarTitulo(cantidad) {
    const base = "TdeA GO";
    document.title = cantidad > 0 ? `(${cantidad}) ${base}` : base;
}
