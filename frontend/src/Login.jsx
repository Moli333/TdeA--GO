
import { useState } from "react";
import { supabase } from "./supabase";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

const cumplePoliticaContrasena = (contrasena) =>
  contrasena.length >= 8 &&
  /[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(contrasena) &&
  /\d/.test(contrasena) &&
  /[^A-Za-zÁÉÍÓÚáéíóúÑñ0-9\s]/.test(contrasena);

function Login({ onLoginExitoso }) {
  const [modo, setModo] = useState("login");

  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [mostrarContrasena, setMostrarContrasena] = useState(false);

  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [telefono, setTelefono] = useState("");
  const [rol, setRol] = useState("pasajero");
  const [mostrarContrasenaRegistro, setMostrarContrasenaRegistro] =
    useState(false);

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const cambiarModo = (nuevoModo) => {
    setModo(nuevoModo);
    setError("");
    setMensaje("");
    setContrasena("");
  };

  const iniciarSesion = async (e) => {
    e.preventDefault();
    setError("");
    setMensaje("");

    if (!correo.trim() || !contrasena) {
      setError("Completa el correo electrónico y la contraseña.");
      return;
    }

    try {
      setCargando(true);

      const respuesta = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          correo: correo.trim(),
          contrasena,
        }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje || "No fue posible iniciar sesión."
        );
      }

      if (onLoginExitoso) {
        onLoginExitoso(datos.usuario);
      }
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
      setError(error.message || "Ocurrió un error al iniciar sesión.");
    } finally {
      setCargando(false);
    }
  };

  const enviarRecuperacion = async (e) => {
    e.preventDefault();
    setError("");
    setMensaje("");

    if (!correo.trim()) {
      setError("Escribe tu correo electrónico para recuperar la contraseña.");
      return;
    }

    try {
      setCargando(true);

      const { error: errorSupabase } =
        await supabase.auth.resetPasswordForEmail(correo.trim(), {
          redirectTo: `${window.location.origin}/restablecer-contrasena`,
        });

      if (errorSupabase) {
        throw errorSupabase;
      }

      setMensaje(
        "Si existe una cuenta asociada a ese correo, recibirás un enlace para restablecer tu contraseña. Revisa también la carpeta de correo no deseado."
      );
    } catch (error) {
      console.error("Error al solicitar recuperación:", error);
      setError(
        error.message ||
          "No fue posible solicitar la recuperación. Inténtalo de nuevo."
      );
    } finally {
      setCargando(false);
    }
  };

  const registrarUsuario = async (e) => {
    e.preventDefault();
    setError("");
    setMensaje("");

    if (
      !nombre.trim() ||
      !apellido.trim() ||
      !correo.trim() ||
      !telefono.trim() ||
      !contrasena
    ) {
      setError("Completa todos los campos para crear tu cuenta.");
      return;
    }

    if (!cumplePoliticaContrasena(contrasena)) {
      setError(
        "La contraseña debe tener mínimo 8 caracteres e incluir una letra, un número y un símbolo."
      );
      return;
    }

    try {
      setCargando(true);

      const respuesta = await fetch(`${API_URL}/api/usuarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          apellido: apellido.trim(),
          correo: correo.trim(),
          telefono: telefono.trim(),
          contrasena,
          rol,
        }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje || "No fue posible crear la cuenta."
        );
      }

      const correoRegistrado = correo.trim();

      localStorage.setItem(
        "tdea_go_registro_pendiente",
        JSON.stringify({
          correo: correoRegistrado,
          rol,
        })
      );

      const mensajeBackend =
        datos.mensaje ||
        "Tu cuenta se creó correctamente. Revisa tu correo institucional para confirmar tu dirección.";

      const mensajeRol =
        rol === "conductor"
          ? "Después de confirmar tu correo, inicia sesión para continuar con el registro de tu vehículo."
          : "Después de confirmar tu correo, podrás iniciar sesión para ingresar a TdeA GO.";

      setMensaje(`${mensajeBackend} ${mensajeRol}`);

      setNombre("");
      setApellido("");
      setTelefono("");
      setContrasena("");
    } catch (error) {
      console.error("Error al registrar usuario:", error);
      setError(error.message || "Ocurrió un error al crear la cuenta.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-brand">
        <span className="login-brand-tdea">TdeA</span>
        <span className="login-brand-go">GO</span>
      </div>

      {modo === "login" ? (
        <>
          <div className="login-header">
            <h2>Inicia sesión</h2>
            <p>Ingresa para continuar</p>
          </div>

          <form className="login-form" onSubmit={iniciarSesion}>
            <div className="login-field">
              <label htmlFor="correo">Correo electrónico</label>
              <input
                id="correo"
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="Tu correo electrónico"
                autoComplete="email"
                required
              />
            </div>

            <div className="login-field">
              <label htmlFor="contrasena">Contraseña</label>
              <div className="password-wrapper">
                <input
                  id="contrasena"
                  type={mostrarContrasena ? "text" : "password"}
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  placeholder="Ingresa tu contraseña"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setMostrarContrasena(!mostrarContrasena)
                  }
                  aria-label={
                    mostrarContrasena
                      ? "Ocultar contraseña"
                      : "Mostrar contraseña"
                  }
                >
                  {mostrarContrasena ? "◉" : "○"}
                </button>
              </div>
            </div>

            <div className="login-options">
              <button
                type="button"
                className="forgot-password"
                onClick={() => cambiarModo("recuperacion")}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {error && (
              <div className="login-error" role="alert">
                <span className="login-error-icon">!</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="login-submit"
              disabled={cargando}
            >
              {cargando ? "Ingresando..." : "Iniciar sesión"}
            </button>
          </form>

          <div className="login-register">
            <span>¿No tienes una cuenta?</span>
            <button
              type="button"
              onClick={() => cambiarModo("registro")}
            >
              Crear cuenta
            </button>
          </div>
        </>
      ) : modo === "recuperacion" ? (
        <>
          <div className="login-header">
            <h2>Recuperar contraseña</h2>
            <p>Te enviaremos un enlace a tu correo electrónico.</p>
          </div>

          <form className="login-form" onSubmit={enviarRecuperacion}>
            <div className="login-field">
              <label htmlFor="correoRecuperacion">
                Correo electrónico
              </label>
              <input
                id="correoRecuperacion"
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="Tu correo electrónico"
                autoComplete="email"
                required
              />
            </div>

            {error && (
              <div className="login-error" role="alert">
                <span className="login-error-icon">!</span>
                <span>{error}</span>
              </div>
            )}

            {mensaje && (
              <div className="login-success" role="status">
                <span className="login-success-icon">✓</span>
                <span>{mensaje}</span>
              </div>
            )}

            <button
              type="submit"
              className="login-submit"
              disabled={cargando}
            >
              {cargando ? "Enviando..." : "Enviar enlace de recuperación"}
            </button>
          </form>

          <div className="login-register">
            <button
              type="button"
              onClick={() => cambiarModo("login")}
            >
              Volver a iniciar sesión
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="login-header register-header">
            <h2>Crear una cuenta</h2>
            <p>Únete a la comunidad TdeA</p>
          </div>

          <form
            className="login-form register-form"
            onSubmit={registrarUsuario}
          >
            <div className="register-grid">
              <div className="login-field">
                <label htmlFor="nombre">Nombre</label>
                <input
                  id="nombre"
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Tu nombre"
                  autoComplete="given-name"
                  required
                />
              </div>

              <div className="login-field">
                <label htmlFor="apellido">Apellido</label>
                <input
                  id="apellido"
                  type="text"
                  value={apellido}
                  onChange={(e) => setApellido(e.target.value)}
                  placeholder="Tu apellido"
                  autoComplete="family-name"
                  required
                />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="correoRegistro">Correo electrónico</label>
              <input
                id="correoRegistro"
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="Tu correo electrónico"
                autoComplete="email"
                required
              />
            </div>

            <div className="login-field">
              <label htmlFor="telefono">Teléfono</label>
              <input
                id="telefono"
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Tu número de teléfono"
                autoComplete="tel"
                required
              />
            </div>

            <div className="login-field">
              <label htmlFor="contrasenaRegistro">Contraseña</label>
              <div className="password-wrapper">
                <input
                  id="contrasenaRegistro"
                  type={
                    mostrarContrasenaRegistro ? "text" : "password"
                  }
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  placeholder="Mínimo 8 caracteres, letra, número y símbolo"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setMostrarContrasenaRegistro(
                      !mostrarContrasenaRegistro
                    )
                  }
                  aria-label={
                    mostrarContrasenaRegistro
                      ? "Ocultar contraseña"
                      : "Mostrar contraseña"
                  }
                >
                  {mostrarContrasenaRegistro ? "◉" : "○"}
                </button>
              </div>
            </div>

            <div className="role-section">
              <label>Tipo de usuario</label>
              <div className="role-options">
                <button
                  type="button"
                  className={`role-option ${
                    rol === "pasajero" ? "selected" : ""
                  }`}
                  onClick={() => {
                    setRol("pasajero");
                    setError("");
                    setMensaje("");
                  }}
                >
                  <span className="role-icon">○</span>
                  <span>
                    <strong>Pasajero</strong>
                    <small>Busco un cupo</small>
                  </span>
                </button>

                <button
                  type="button"
                  className={`role-option ${
                    rol === "conductor" ? "selected" : ""
                  }`}
                  onClick={() => {
                    setRol("conductor");
                    setError("");
                    setMensaje("");
                  }}
                >
                  <span className="role-icon">⌁</span>
                  <span>
                    <strong>Conductor</strong>
                    <small>Ofrezco un cupo</small>
                  </span>
                </button>
              </div>
            </div>

            {error && (
              <div className="login-error" role="alert">
                <span className="login-error-icon">!</span>
                <span>{error}</span>
              </div>
            )}

            {mensaje && (
              <div className="login-success" role="status">
                <span className="login-success-icon">✓</span>
                <span>{mensaje}</span>
                <button
                  type="button"
                  onClick={() => cambiarModo("login")}
                  style={{
                    display: "block",
                    marginTop: "12px",
                    padding: "8px 12px",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: "bold",
                  }}
                >
                  Ir a iniciar sesión
                </button>
              </div>
            )}

            <button
              type="submit"
              className="login-submit register-submit"
              disabled={cargando || Boolean(mensaje)}
            >
              {cargando ? "Creando cuenta..." : "Crear cuenta"}
            </button>
          </form>

          <div className="login-register">
            <span>¿Ya tienes una cuenta?</span>
            <button
              type="button"
              onClick={() => cambiarModo("login")}
            >
              Iniciar sesión
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default Login;
