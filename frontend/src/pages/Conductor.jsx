import { useState } from "react";

function Conductor({ usuario, onCerrarSesion, onInicio }) {
  const [seccion, setSeccion] = useState("resumen");

  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [cupos, setCupos] = useState("");

  const [publicando, setPublicando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const nombreConductor = usuario?.nombre || "Conductor";

  const cambiarSeccion = (nuevaSeccion) => {
    setSeccion(nuevaSeccion);
    setMensaje("");
  };

  const publicarRuta = async (evento) => {
    evento.preventDefault();

    setMensaje("");

    if (!origen.trim() || !destino.trim() || !fecha || !hora || !cupos) {
      setMensaje("Completa todos los campos de la ruta.");
      return;
    }

    if (Number(cupos) <= 0) {
      setMensaje("La cantidad de cupos debe ser mayor que cero.");
      return;
    }

    if (!usuario?.id_usuario) {
      setMensaje("No se encontró la información del conductor.");
      return;
    }

    setPublicando(true);

    try {
      const respuesta = await fetch("http://localhost:3000/api/rutas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id_conductor: usuario.id_usuario,
          origen: origen.trim(),
          destino: destino.trim(),
          fecha,
          hora,
          cupos_totales: Number(cupos),
        }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje || "No fue posible publicar la ruta."
        );
      }

      setMensaje("Ruta publicada correctamente.");

      setOrigen("");
      setDestino("");
      setFecha("");
      setHora("");
      setCupos("");

    } catch (error) {
      setMensaje(
        error.message || "Ocurrió un error al publicar la ruta."
      );
    } finally {
      setPublicando(false);
    }
  };

  return (
    <div className="pagina-conductor">

      {/* ENCABEZADO */}
      <header className="conductor-encabezado">
        <div className="conductor-encabezado-contenedor">

          <button
            type="button"
            className="conductor-logo"
            onClick={onInicio}
          >
            <span className="conductor-logo-icono">🚗</span>

            <span className="conductor-logo-texto">
              <strong>TdeA</strong>
              <span>GO</span>
            </span>
          </button>

          <div className="conductor-titulo">
            <span>Panel del conductor</span>
          </div>

          <div className="conductor-usuario">

            <div className="conductor-avatar">
              {nombreConductor.charAt(0).toUpperCase()}
            </div>

            <div className="conductor-datos-usuario">
              <strong>{nombreConductor}</strong>
              <span>Conductor</span>
            </div>

            <button
              type="button"
              className="conductor-cerrar-sesion"
              onClick={onCerrarSesion}
            >
              Cerrar sesión
            </button>

          </div>

        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="conductor-contenido">

        {/* BIENVENIDA */}
        <section className="conductor-bienvenida">

          <div>
            <span className="conductor-etiqueta">
              TdeA GO
            </span>

            <h1>
              ¡Hola, {nombreConductor}!
            </h1>

            <p>
              Comparte tus recorridos y ayuda a otros estudiantes
              de la comunidad TdeA a encontrar transporte.
            </p>
          </div>

          <div className="conductor-bienvenida-icono">
            🚗
          </div>

        </section>

        {/* MENÚ */}
        <section className="conductor-menu">

          <button
            type="button"
            className={`conductor-menu-boton ${
              seccion === "resumen" ? "seleccionado" : ""
            }`}
            onClick={() => cambiarSeccion("resumen")}
          >
            <span className="conductor-menu-icono">
              📊
            </span>

            <span>
              <strong>Resumen</strong>
              <small>Mi actividad</small>
            </span>
          </button>

          <button
            type="button"
            className={`conductor-menu-boton ${
              seccion === "publicar" ? "seleccionado" : ""
            }`}
            onClick={() => cambiarSeccion("publicar")}
          >
            <span className="conductor-menu-icono">
              ➕
            </span>

            <span>
              <strong>Publicar ruta</strong>
              <small>Comparte un recorrido</small>
            </span>
          </button>

          <button
            type="button"
            className={`conductor-menu-boton ${
              seccion === "rutas" ? "seleccionado" : ""
            }`}
            onClick={() => cambiarSeccion("rutas")}
          >
            <span className="conductor-menu-icono">
              🛣️
            </span>

            <span>
              <strong>Mis rutas</strong>
              <small>Mis recorridos publicados</small>
            </span>
          </button>

          <button
            type="button"
            className={`conductor-menu-boton ${
              seccion === "solicitudes" ? "seleccionado" : ""
            }`}
            onClick={() => cambiarSeccion("solicitudes")}
          >
            <span className="conductor-menu-icono">
              📋
            </span>

            <span>
              <strong>Solicitudes</strong>
              <small>Solicitudes de pasajeros</small>
            </span>
          </button>

        </section>

        {/* RESUMEN */}
        {seccion === "resumen" && (
          <section className="conductor-seccion">

            <div className="conductor-seccion-titulo">
              <div>
                <h2>Resumen</h2>

                <p>
                  Consulta rápidamente tu actividad como conductor.
                </p>
              </div>

              <button
                type="button"
                className="conductor-boton-principal"
                onClick={() => cambiarSeccion("publicar")}
              >
                + Publicar ruta
              </button>
            </div>

            <div className="conductor-tarjetas">

              <article className="conductor-tarjeta">

                <span className="conductor-tarjeta-icono">
                  🛣️
                </span>

                <div>
                  <span>Mis rutas</span>
                  <strong>—</strong>
                </div>

                <small>
                  Rutas publicadas
                </small>

              </article>

              <article className="conductor-tarjeta">

                <span className="conductor-tarjeta-icono">
                  💺
                </span>

                <div>
                  <span>Cupos disponibles</span>
                  <strong>—</strong>
                </div>

                <small>
                  Cupos de tus rutas
                </small>

              </article>

              <article className="conductor-tarjeta">

                <span className="conductor-tarjeta-icono">
                  📋
                </span>

                <div>
                  <span>Solicitudes</span>
                  <strong>—</strong>
                </div>

                <small>
                  Solicitudes de pasajeros
                </small>

              </article>

            </div>

            <div className="conductor-panel-informativo">

              <span>💡</span>

              <div>
                <strong>
                  Comparte tu ruta
                </strong>

                <p>
                  Publica tu recorrido para que otros estudiantes
                  puedan encontrarlo y solicitar un cupo.
                </p>
              </div>

            </div>

          </section>
        )}

        {/* PUBLICAR RUTA */}
        {seccion === "publicar" && (
          <section className="conductor-seccion">

            <div className="conductor-seccion-titulo">

              <div>
                <h2>Publicar una ruta</h2>

                <p>
                  Ingresa la información del recorrido que deseas
                  compartir.
                </p>
              </div>

            </div>

            <form
              className="conductor-formulario"
              onSubmit={publicarRuta}
            >

              <div className="conductor-formulario-grid">

                <div className="conductor-formulario-grupo">

                  <label htmlFor="origen">
                    Origen
                  </label>

                  <input
                    id="origen"
                    type="text"
                    value={origen}
                    onChange={(evento) =>
                      setOrigen(evento.target.value)
                    }
                    placeholder="Ej. Bello"
                  />

                </div>

                <div className="conductor-formulario-grupo">

                  <label htmlFor="destino">
                    Destino
                  </label>

                  <input
                    id="destino"
                    type="text"
                    value={destino}
                    onChange={(evento) =>
                      setDestino(evento.target.value)
                    }
                    placeholder="Ej. TdeA - Robledo"
                  />

                </div>

                <div className="conductor-formulario-grupo">

                  <label htmlFor="fecha">
                    Fecha
                  </label>

                  <input
                    id="fecha"
                    type="date"
                    value={fecha}
                    onChange={(evento) =>
                      setFecha(evento.target.value)
                    }
                  />

                </div>

                <div className="conductor-formulario-grupo">

                  <label htmlFor="hora">
                    Hora de salida
                  </label>

                  <input
                    id="hora"
                    type="time"
                    value={hora}
                    onChange={(evento) =>
                      setHora(evento.target.value)
                    }
                  />

                </div>

                <div className="conductor-formulario-grupo">

                  <label htmlFor="cupos">
                    Cupos disponibles
                  </label>

                  <input
                    id="cupos"
                    type="number"
                    min="1"
                    value={cupos}
                    onChange={(evento) =>
                      setCupos(evento.target.value)
                    }
                    placeholder="Ej. 3"
                  />

                </div>

              </div>

              {mensaje && (
                <div
                  className={`conductor-mensaje ${
                    mensaje.includes("correctamente")
                      ? "exito"
                      : "error"
                  }`}
                >
                  {mensaje}
                </div>
              )}

              <div className="conductor-formulario-acciones">

                <button
                  type="button"
                  className="conductor-boton-secundario"
                  onClick={() => cambiarSeccion("resumen")}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="conductor-boton-principal"
                  disabled={publicando}
                >
                  {publicando
                    ? "Publicando..."
                    : "Publicar ruta"}
                </button>

              </div>

            </form>

          </section>
        )}

        {/* MIS RUTAS */}
        {seccion === "rutas" && (
          <section className="conductor-seccion">

            <div className="conductor-seccion-titulo">

              <div>
                <h2>Mis rutas</h2>

                <p>
                  Consulta los recorridos que has publicado.
                </p>
              </div>

              <button
                type="button"
                className="conductor-boton-principal"
                onClick={() => cambiarSeccion("publicar")}
              >
                + Nueva ruta
              </button>

            </div>

            <div className="conductor-contenido-vacio">

              <span>🛣️</span>

              <h3>
                Aún no hay rutas para mostrar
              </h3>

              <p>
                Cuando publiques una ruta, aparecerá aquí.
              </p>

              <button
                type="button"
                className="conductor-boton-principal"
                onClick={() => cambiarSeccion("publicar")}
              >
                Publicar mi primera ruta
              </button>

            </div>

          </section>
        )}

        {/* SOLICITUDES */}
        {seccion === "solicitudes" && (
          <section className="conductor-seccion">

            <div className="conductor-seccion-titulo">

              <div>
                <h2>Solicitudes de pasajeros</h2>

                <p>
                  Revisa las solicitudes relacionadas con tus
                  rutas publicadas.
                </p>
              </div>

            </div>

            <div className="conductor-contenido-vacio">

              <span>📋</span>

              <h3>
                No hay solicitudes para mostrar
              </h3>

              <p>
                Las solicitudes de los pasajeros aparecerán aquí.
              </p>

            </div>

          </section>
        )}

      </main>

      {/* PIE DE PÁGINA */}
      <footer className="conductor-footer">

        <div>
          <strong>TdeA GO</strong>

          <span>
            Transporte compartido para la comunidad del TdeA
          </span>
        </div>

        <button
          type="button"
          onClick={onInicio}
          className="conductor-volver-inicio"
        >
          ← Volver al inicio
        </button>

      </footer>

    </div>
  );
}

export default Conductor;