import "./Encabezado.css";

function Encabezado({ usuario, onCerrarSesion, onInicio }) {
  const nombreUsuario = usuario?.nombre || "Usuario";
  const rolUsuario = usuario?.rol || "";

  const nombreRol =
    rolUsuario === "pasajero"
      ? "Pasajero"
      : rolUsuario === "conductor"
        ? "Conductor"
        : rolUsuario === "administrador"
          ? "Administrador"
          : "";

  return (
    <header className="encabezado">
      <div className="encabezado-contenedor">
        {/* Logo */}
        <button
          type="button"
          className="encabezado-logo"
          onClick={onInicio}
          aria-label="Ir al inicio"
        >
          <span className="encabezado-logo-icono">🚗</span>

          <span className="encabezado-logo-texto">
            <strong>TdeA</strong>
            <span>GO</span>
          </span>
        </button>

        {/* Navegación */}
        <nav className="encabezado-navegacion">
          <button
            type="button"
            className="encabezado-enlace activo"
            onClick={onInicio}
          >
            Inicio
          </button>

          {usuario?.rol === "pasajero" && (
            <button type="button" className="encabezado-enlace">
              Buscar rutas
            </button>
          )}

          {usuario?.rol === "conductor" && (
            <button type="button" className="encabezado-enlace">
              Mis rutas
            </button>
          )}

          {usuario?.rol === "administrador" && (
            <button type="button" className="encabezado-enlace">
              Administración
            </button>
          )}
        </nav>

        {/* Usuario */}
        <div className="encabezado-usuario">
          <div className="encabezado-avatar">
            {nombreUsuario.charAt(0).toUpperCase()}
          </div>

          <div className="encabezado-datos">
            <strong>{nombreUsuario}</strong>

            {nombreRol && <span>{nombreRol}</span>}
          </div>

          <button
            type="button"
            className="encabezado-salir"
            onClick={onCerrarSesion}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >
            ↪
          </button>
        </div>
      </div>
    </header>
  );
}

export default Encabezado;