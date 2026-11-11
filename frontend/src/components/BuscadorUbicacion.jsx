import { useEffect, useRef, useState } from "react";
import { buscarLugares } from "../utils/geocodificacion";
import "./BuscadorUbicacion.css";

// ------------------------------------------------------------------
// Campo de dirección con sugerencias mientras se escribe.
// Al elegir una sugerencia se entrega el lugar con sus coordenadas.
// ------------------------------------------------------------------
export default function BuscadorUbicacion({
    id,
    valor,
    placeholder,
    alCambiarTexto,
    alSeleccionar,
    textoConfirmado = "",
    requerido = false,
}) {
    const [sugerencias, setSugerencias] = useState([]);
    const [abierto, setAbierto] = useState(false);
    const [buscando, setBuscando] = useState(false);
    const [activa, setActiva] = useState(-1);
    const contenedorRef = useRef(null);
    const ultimaSeleccion = useRef("");

    useEffect(() => {
        const texto = String(valor || "").trim();

        // No se vuelve a buscar justo después de elegir una sugerencia.
        if (
            texto === ultimaSeleccion.current ||
            texto === String(textoConfirmado || "").trim() ||
            texto.length < 3
        ) {
            const limpiar = setTimeout(() => {
                setSugerencias([]);
                setBuscando(false);
            }, 0);
            return () => clearTimeout(limpiar);
        }

        const controlador = new AbortController();

        const temporizador = setTimeout(async () => {
            setBuscando(true);
            try {
                const resultados = await buscarLugares(texto, { senal: controlador.signal });
                if (!controlador.signal.aborted) {
                    setSugerencias(resultados);
                    setAbierto(true);
                    setActiva(-1);
                }
            } catch {
                if (!controlador.signal.aborted) setSugerencias([]);
            } finally {
                if (!controlador.signal.aborted) setBuscando(false);
            }
        }, 350);

        return () => {
            clearTimeout(temporizador);
            controlador.abort();
        };
    }, [valor, textoConfirmado]);

    useEffect(() => {
        const cerrar = (evento) => {
            if (contenedorRef.current && !contenedorRef.current.contains(evento.target)) {
                setAbierto(false);
            }
        };
        document.addEventListener("mousedown", cerrar);
        return () => document.removeEventListener("mousedown", cerrar);
    }, []);

    const elegir = (lugar) => {
        ultimaSeleccion.current = lugar.nombre.trim();
        setAbierto(false);
        setSugerencias([]);
        alSeleccionar(lugar);
    };

    const manejarTeclas = (evento) => {
        if (!abierto || sugerencias.length === 0) return;

        if (evento.key === "ArrowDown") {
            evento.preventDefault();
            setActiva((i) => (i + 1) % sugerencias.length);
        } else if (evento.key === "ArrowUp") {
            evento.preventDefault();
            setActiva((i) => (i <= 0 ? sugerencias.length - 1 : i - 1));
        } else if (evento.key === "Enter" && activa >= 0) {
            evento.preventDefault();
            elegir(sugerencias[activa]);
        } else if (evento.key === "Escape") {
            setAbierto(false);
        }
    };

    return (
        <div className="buscador-ubicacion" ref={contenedorRef}>
            <input
                id={id}
                type="text"
                value={valor}
                placeholder={placeholder}
                required={requerido}
                autoComplete="off"
                role="combobox"
                aria-expanded={abierto}
                aria-autocomplete="list"
                onChange={(evento) => {
                    ultimaSeleccion.current = "";
                    alCambiarTexto(evento.target.value);
                }}
                onFocus={() => sugerencias.length > 0 && setAbierto(true)}
                onKeyDown={manejarTeclas}
            />

            {buscando && <span className="buscador-ubicacion-cargando">Buscando…</span>}

            {abierto && sugerencias.length > 0 && (
                <ul className="buscador-ubicacion-lista" role="listbox">
                    {sugerencias.map((lugar, indice) => (
                        <li
                            key={lugar.id}
                            role="option"
                            aria-selected={indice === activa}
                            className={indice === activa ? "activa" : ""}
                            onMouseDown={(evento) => {
                                evento.preventDefault();
                                elegir(lugar);
                            }}
                        >
                            <strong>{lugar.principal}</strong>
                            <small>{lugar.secundario}</small>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}