function MiCuenta({ usuario, cerrarSesion }) {
  return (
    <section className="pagina-servicio">
      <div className="contenedor">

        <span className="etiqueta-verde">MI CUENTA</span>

        <h1>
          Hola, {usuario?.nombre || "usuario"}.
        </h1>

        <p>
          Aquí podrás consultar y administrar tu información.
        </p>

        <button
          className="boton-principal"
          onClick={cerrarSesion}
        >
          Cerrar sesión
        </button>

      </div>
    </section>
  );
}

export default MiCuenta;