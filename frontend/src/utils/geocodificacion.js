// ------------------------------------------------------------------
// GEOCODIFICACIÓN PARA TdeA GO
//
// Antes se usaba Nominatim sin restringir la zona, por eso algunas
// direcciones de Medellín se asociaban con Bogotá. Ahora se usa el
// geocodificador de Mapbox (ya configurado con VITE_MAPBOX_TOKEN):
//  - solo Colombia
//  - resultados ordenados por cercanía a Medellín
//  - primero se busca en el Valle de Aburrá y municipios cercanos
//  - si no hay resultados, se amplía a Antioquia
//  - cada sugerencia muestra barrio, municipio y departamento
// ------------------------------------------------------------------

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// Centro de referencia: Medellín.
export const CENTRO_MEDELLIN = { lat: 6.2442, lng: -75.5812 };

// Valle de Aburrá y municipios cercanos (incluye Rionegro y Santa Elena).
const CAJA_AREA_METROPOLITANA = "-75.75,5.95,-75.20,6.50";

const BASE = "https://api.mapbox.com/geocoding/v5/mapbox.places";

function limpiarNombre(nombreCompleto = "") {
    return nombreCompleto.replace(/,\s*Colombia$/i, "");
}

function convertir(feature) {
    const [lng, lat] = feature.center || [];
    const contexto = feature.context || [];

    const buscar = (prefijo) =>
        contexto.find((c) => String(c.id || "").startsWith(prefijo))?.text;

    const municipio = buscar("place") || (feature.id?.startsWith("place") ? feature.text : "");
    const departamento = buscar("region") || "";
    const barrio = buscar("neighborhood") || buscar("locality") || "";

    const principal = feature.address
        ? `${feature.text} ${feature.address}`
        : feature.text;

    return {
        id: feature.id,
        lat,
        lng,
        nombre: limpiarNombre(feature.place_name),
        principal,
        secundario: [barrio, municipio, departamento].filter(Boolean).join(", "),
        municipio,
        departamento,
    };
}

async function consultar(texto, extra) {
    const url =
        `${BASE}/${encodeURIComponent(texto)}.json` +
        `?access_token=${TOKEN}&country=co&language=es&autocomplete=true&limit=6` +
        `&proximity=${CENTRO_MEDELLIN.lng},${CENTRO_MEDELLIN.lat}` +
        `&types=address,poi,neighborhood,locality,place` +
        extra;

    const respuesta = await fetch(url);

    if (!respuesta.ok) {
        throw new Error("No fue posible consultar la ubicación.");
    }

    const datos = await respuesta.json();
    return (datos.features || []).map(convertir).filter((r) => Number.isFinite(r.lat));
}

// Busca lugares a partir de un texto. Devuelve hasta 6 sugerencias.
export async function buscarLugares(texto, { senal } = {}) {
    const consulta = String(texto || "").trim();

    if (consulta.length < 3) return [];

    if (!TOKEN) {
        throw new Error("No está configurado el servicio de mapas (VITE_MAPBOX_TOKEN).");
    }

    // 1. Valle de Aburrá y alrededores.
    let resultados = await consultar(
        consulta,
        `&bbox=${CAJA_AREA_METROPOLITANA}`
    );

    // 2. Si hay pocos resultados, se amplía a toda Colombia, pero se
    //    muestran primero los de Antioquia.
    if (resultados.length < 3) {
        const amplios = await consultar(consulta, "");
        const vistos = new Set(resultados.map((r) => r.id));

        const extra = amplios
            .filter((r) => !vistos.has(r.id))
            .sort(
                (a, b) =>
                    Number(b.departamento === "Antioquia") -
                    Number(a.departamento === "Antioquia")
            );

        resultados = [...resultados, ...extra].slice(0, 6);
    }

    if (senal?.aborted) return [];

    return resultados;
}

// Devuelve el mejor resultado (para el botón "Ubicar").
export async function buscarMejorLugar(texto) {
    const resultados = await buscarLugares(texto);

    if (!resultados.length) {
        throw new Error(
            `No se encontró "${texto}". Prueba agregando el barrio o el municipio (ej. "Calle 80 #45-10, Robledo, Medellín").`
        );
    }

    return resultados[0];
}

// Convierte coordenadas (clic en el mapa o GPS) en una dirección legible.
export async function nombreDesdeCoordenadas(lat, lng) {
    if (!TOKEN) return "Ubicación seleccionada";

    try {
        const url =
            `${BASE}/${lng},${lat}.json` +
            `?access_token=${TOKEN}&country=co&language=es&limit=1` +
            `&types=address,poi,neighborhood,locality,place`;

        const respuesta = await fetch(url);
        if (!respuesta.ok) return "Ubicación seleccionada";

        const datos = await respuesta.json();
        const feature = datos.features?.[0];

        return feature
            ? limpiarNombre(feature.place_name)
            : "Ubicación seleccionada";
    } catch {
        return "Ubicación seleccionada";
    }
}
