import { useState } from "react";

const API_URL = "http://localhost:3000";

function Pasajero({ usuario, onCerrarSesion, onInicio }) {
  const [seccion, setSeccion] = useState("resumen");

  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");

  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const nombrePasajero = usuario?.nombre || "Pasajero";

  const cambiarSeccion = (nuevaSeccion) => {
    setSeccion(nuevaSeccion);
    setMensaje("");
  };

  const buscarRutas = async (evento) => {
    evento.preventDefault();

    setMensaje("");
    setResultados([]);

    if (!origen.trim() && !destino.trim() && !fecha && !hora) {
      setMensaje("Ingresa al menos un criterio para buscar.");
      return;
    }

    setBuscando(true);

    try {
      const parametros = new URLSearchParams();

      if (origen.trim()) {
        parametros.append("origen", origen.trim());
      }

      if (destino.trim()) {
        parametros.append("destino", destino.trim());
      }

      if (fecha) {
        parametros.append("fecha", fecha);
      }

      if (hora) {
        parametros.append("hora", hora);
      }

      const respuesta = await fetch(
        `${API_URL}/api/rutas?${parametros.toString()}`
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje || "No fue posible buscar las rutas."
        );
      }

      const rutasEncontradas = Array.isArray(datos)
        ? datos
        : datos.rutas || [];

      setResultados(rutasEncontradas);

      if (rutasEncontradas.length === 0) {
        setMensaje(
          "No encontramos rutas que coincidan con tu búsqueda."
        );
      }
    } catch (error) {
      setMensaje(
        error.message || "Ocurrió un error al buscar las rutas."
      );
    } finally {
      setBuscando(false);
    }
  };

  const solicitarCupo = async (ruta) => {
    setMensaje("");

    if (!usuario?.id_usuario) {
      setMensaje("No se encontró la información del pasajero.");
      return;
    }

    if (!ruta?.id) {
      setMensaje("No se encontró el identificador de la ruta.");
      return;
    }

    try {
      const respuesta = await fetch(
        `${API_URL}/api/solicitudes`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id_ruta: ruta.id,
            id_pasajero: usuario.id_usuario,
          }),
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje || "No fue posible solicitar el cupo."
        );
      }

      setMensaje(
        "Solicitud de cupo enviada correctamente."
      );

      setResultados((rutasActuales) =>
        rutasActuales.map((rutaActual) => {
          if (rutaActual.id !== ruta.id) {
            return rutaActual;
          }

          const cuposActuales =
            Number(rutaActual.cupos_disponibles ?? rutaActual.cupos_totales ?? 0);

          return {
            ...rutaActual,
            cupos_disponibles: Math.max(cuposActuales - 1, 0),
          };
        })
      );
    } catch (error) {
      setMensaje(
        error.message ||
          "Ocurrió un error al solicitar el cupo."
      );
    }
  };

  const limpiarBusqueda = () => {
    setOrigen("");
    setDestino("");
    setFecha("");
    setHora("");
    setResultados([]);
    setMensaje("");
  };

  return (
    <div className="pagina-pasajero">

      {/* ENCABEZADO */}
      <header className="pasajero-encabezado">
        <div className="pasajero-encabezado-contenedor">

          <button
            type="button"
            className="pasajero-logo"
            onClick={onInicio}
          >
            <span className="pasajero-logo-icono">
              🚗
            </span>

            <span className="pasajero-logo-texto">
              <strong>TdeA</strong>
              <span>GO</span>
            </span>
          </button>

          <div className="pasajero-titulo">
            <span>Panel del pasajero</span>
          </div>

          <div className="pasajero-usuario">

            <div className="pasajero-avatar">
              {nombrePasajero.charAt(0).toUpperCase()}
            </div>

            <div className="pasajero-datos-usuario">
              <strong>{nombrePasajero}</strong>
              <span>Pasajero</span>
            </div>

            <button
              type="button"
              className="pasajero-cerrar-sesion"
              onClick={onCerrarSesion}
            >
              Cerrar sesión
            </button>

          </div>

        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="pasajero-contenido">

        {/* BIENVENIDA */}
        <section className="pasajero-bienvenida">

          <div>
            <span className="pasajero-etiqueta">
              TdeA GO
            </span>

            <h1>
              ¡Hola, {nombrePasajero}!
            </h1>

            <p>
              Encuentra rutas compartidas y solicita un cupo
              para llegar al TdeA de forma organizada.
            </p>
          </div>

          <div className="pasajero-bienvenida-icono">
            🧑‍🎓
          </div>

        </section>

        {/* MENÚ */}
        <section className="pasajero-menu">

          <button
            type="button"
            className={`pasajero-menu-boton ${
              seccion === "resumen"
                ? "seleccionado"
                : ""
            }`}
            onClick={() => cambiarSeccion("resumen")}
          >
            <span className="pasajero-menu-icono">
              📊
            </span>

            <span>
              <strong>Resumen</strong>
              <small>Mi actividad</small>
            </span>
          </button>

          <button
            type="button"
            className={`pasajero-menu-boton ${
              seccion === "buscar"
                ? "seleccionado"
                : ""
            }`}
            onClick={() => cambiarSeccion("buscar")}
          >
            <span className="pasajero-menu-icono">
              🔎
            </span>

            <span>
              <strong>Buscar rutas</strong>
              <small>Encuentra un recorrido</small>
            </span>
          </button>

          <button
            type="button"
            className={`pasajero-menu-boton ${
              seccion === "solicitudes"
                ? "seleccionado"
                : ""
            }`}
            onClick={() => cambiarSeccion("solicitudes")}
          >
            <span className="pasajero-menu-icono">
              📋
            </span>

            <span>
              <strong>Mis solicitudes</strong>
              <small>Consulta tus solicitudes</small>
            </span>
          </button>

        </section>

        {/* RESUMEN */}
        {seccion === "resumen" && (
          <section className="pasajero-seccion">

            <div className="pasajero-seccion-titulo">

              <div>
                <h2>Resumen</h2>

                <p>
                  Consulta rápidamente tu actividad en TdeA GO.
                </p>
              </div>

              <button
                type="button"
                className="pasajero-boton-principal"
                onClick={() => cambiarSeccion("buscar")}
              >
                🔎 Buscar rutas
              </button>

            </div>

            <div className="pasajero-tarjetas">

              <article className="pasajero-tarjeta">

                <span className="pasajero-tarjeta-icono">
                  🔎
                </span>

                <div>
                  <span>Rutas disponibles</span>
                  <strong>—</strong>
                </div>

                <small>
                  Rutas que puedes consultar
                </small>

              </article>

              <article className="pasajero-tarjeta">

                <span className="pasajero-tarjeta-icono">
                  📋
                </span>

                <div>
                  <span>Mis solicitudes</span>
                  <strong>—</strong>
                </div>

                <small>
                  Solicitudes realizadas
                </small>

              </article>

              <article className="pasajero-tarjeta">

                <span className="pasajero-tarjeta-icono">
                  🚗
                </span>

                <div>
                  <span>Viajes</span>
                  <strong>—</strong>
                </div>

                <small>
                  Información de tus viajes
                </small>

              </article>

            </div>

            <div className="pasajero-panel-informativo">

              <span>💡</span>

              <div>
                <strong>
                  ¿Buscas transporte?
                </strong>

                <p>
                  Utiliza la búsqueda de rutas para encontrar
                  conductores que compartan un recorrido compatible
                  con tus necesidades.
                </p>
              </div>

            </div>

          </section>
        )}

        {/* BUSCAR RUTAS */}
        {seccion === "buscar" && (
          <section className="pasajero-seccion">

            <div className="pasajero-seccion-titulo">

              <div>
                <h2>Buscar rutas</h2>

                <p>
                  Encuentra rutas compartidas disponibles.
                </p>
              </div>

            </div>

            <form
              className="pasajero-formulario-busqueda"
              onSubmit={buscarRutas}
            >

              <div className="pasajero-formulario-grid">

                <div className="pasajero-formulario-grupo">

                  <label htmlFor="pasajero-origen">
                    Origen
                  </label>

                  <input
                    id="pasajero-origen"
                    type="text"
                    value={origen}
                    onChange={(evento) =>
                      setOrigen(evento.target.value)
                    }
                    placeholder="Ej. Bello"
                  />

                </div>

                <div className="pasajero-formulario-grupo">

                  <label htmlFor="pasajero-destino">
                    Destino
                  </label>

                  <input
                    id="pasajero-destino"
                    type="text"
                    value={destino}
                    onChange={(evento) =>
                      setDestino(evento.target.value)
                    }
                    placeholder="Ej. TdeA - Robledo"
                  />

                </div>

                <div className="pasajero-formulario-grupo">

                  <label htmlFor="pasajero-fecha">
                    Fecha
                  </label>

                  <input
                    id="pasajero-fecha"
                    type="date"
                    value={fecha}
                    onChange={(evento) =>
                      setFecha(evento.target.value)
                    }
                  />

                </div>

                <div className="pasajero-formulario-grupo">

                  <label htmlFor="pasajero-hora">
                    Hora
                  </label>

                  <input
                    id="pasajero-hora"
                    type="time"
                    value={hora}
                    onChange={(evento) =>
                      setHora(evento.target.value)
                    }
                  />

                </div>

              </div>

              <div className="pasajero-formulario-acciones">

                <button
                  type="button"
                  className="pasajero-boton-secundario"
                  onClick={limpiarBusqueda}
                >
                  Limpiar
                </button>

                <button
                  type="submit"
                  className="pasajero-boton-principal"
                  disabled={buscando}
                >
                  {buscando
                    ? "Buscando..."
                    : "🔎 Buscar rutas"}
                </button>

              </div>

            </form>

            {mensaje && (
              <div
                className={`pasajero-mensaje ${
                  mensaje.includes("correctamente")
                    ? "exito"
                    : "informacion"
                }`}
              >
                {mensaje}
              </div>
            )}

            {/* RESULTADOS */}
            {resultados.length > 0 && (
              <section className="pasajero-resultados">

                <div className="pasajero-resultados-titulo">
                  <h3>Rutas encontradas</h3>

                  <span>
                    {resultados.length}{" "}
                    {resultados.length === 1
                      ? "ruta"
                      : "rutas"}
                  </span>
                </div>

                <div className="pasajero-lista-rutas">

                  {resultados.map((ruta) => (
                    <article
                      className="pasajero-ruta"
                      key={ruta.id}
                    >

                      <div className="pasajero-ruta-cabecera">

                        <div className="pasajero-ruta-icono">
                          🚗
                        </div>

                        <div>
                          <h4>
                            {ruta.origen} → {ruta.destino}
                          </h4>

                          <p>
                            Ruta compartida por{" "}
                            {ruta.nombre_conductor ||
                              ruta.conductor ||
                              "un conductor"}
                          </p>
                        </div>

                      </div>

                      <div className="pasajero-ruta-datos">

                        <div>
                          <span>📅</span>
                          <div>
                            <small>Fecha</small>
                            <strong>
                              {ruta.fecha || "No disponible"}
                            </strong>
                          </div>
                        </div>

                        <div>
                          <span>🕐</span>
                          <div>
                            <small>Hora</small>
                            <strong>
                              {ruta.hora || "No disponible"}
                            </strong>
                          </div>
                        </div>

                        <div>
                          <span>💺</span>
                          <div>
                            <small>Cupos</small>
                            <strong>
                              {ruta.cupos_disponibles ??
                                ruta.cupos_totales ??
                                "No disponible"}
                            </strong>
                          </div>
                        </div>

                      </div>

                      <div className="pasajero-ruta-acciones">

                        <button
                          type="button"
                          className="pasajero-boton-principal"
                          onClick={() =>
                            solicitarCupo(ruta)
                          }
                        >
                          Solicitar cupo
                        </button>

                      </div>

                    </article>
                  ))}

                </div>

              </section>
            )}

          </section>
        )}

        {/* MIS SOLICITUDES */}
        {seccion === "solicitudes" && (
          <section className="pasajero-seccion">

            <div className="pasajero-seccion-titulo">

              <div>
                <h2>Mis solicitudes</h2>

                <p>
                  Consulta las solicitudes de transporte que has
                  realizado.
                </p>
              </div>

            </div>

            <div className="pasajero-contenido-vacio">

              <span>📋</span>

              <h3>
                No hay solicitudes para mostrar
              </h3>

              <p>
                Cuando solicites un cupo en una ruta, la solicitud
                aparecerá aquí.
              </p>

              <button
                type="button"
                className="pasajero-boton-principal"
                onClick={() => cambiarSeccion("buscar")}
              >
                🔎 Buscar una ruta
              </button>

            </div>

          </section>
        )}

      </main>

      {/* PIE DE PÁGINA */}
      <footer className="pasajero-footer">

        <div>
          <strong>TdeA GO</strong>

          <span>
            Transporte compartido para la comunidad del TdeA
          </span>
        </div>

        <button
          type="button"
          onClick={onInicio}
          className="pasajero-volver-inicio"
        >
          ← Volver al inicio
        </button>

      </footer>

    </div>
  );
}

export default Pasajero;