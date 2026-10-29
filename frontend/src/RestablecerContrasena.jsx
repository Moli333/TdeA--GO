
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabase";
import "./RestablecerContrasena.css";

const cumplePoliticaContrasena = (contrasena) =>
  contrasena.length >= 8 &&
  /[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(contrasena) &&
  /\d/.test(contrasena) &&
  /[^A-Za-zÁÉÍÓÚáéíóúÑñ0-9\s]/.test(contrasena);

function RestablecerContrasena() {
  const navigate = useNavigate();

  const [contrasena, setContrasena] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [sesionRecuperacion, setSesionRecuperacion] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    let activa = true;

    const procesarEvento = (evento, sesion) => {
      if (!activa) return;

      if (evento === "PASSWORD_RECOVERY" && sesion) {
        setSesionRecuperacion(true);
        setError("");
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(procesarEvento);

    const comprobarSesion = async () => {
      try {
        const { data, error: errorSesion } =
          await supabase.auth.getSession();

        if (errorSesion) throw errorSesion;

        if (!activa) return;

        if (data.session) {
          setSesionRecuperacion(true);
        } else {
          setError(
            "El enlace no es válido o ha vencido. Solicita otro enlace desde «¿Olvidaste tu contraseña?»."
          );
        }
      } catch (errorSesion) {
        if (activa) {
          setError(
            errorSesion.message ||
            "No fue posible validar el enlace de recuperación."
          );
        }
      } finally {
        if (activa) setCargando(false);
      }
    };

    comprobarSesion();

    return () => {
      activa = false;
      subscription.unsubscribe();
    };
  }, []);

  const guardarNuevaContrasena = async (e) => {
    e.preventDefault();
    setError("");
    setMensaje("");

    if (!cumplePoliticaContrasena(contrasena)) {
      setError(
        "Usa al menos 8 caracteres e incluye una letra, un número y un símbolo."
      );
      return;
    }

    if (contrasena !== confirmacion) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    try {
      setGuardando(true);

      const { error: errorActualizacion } =
        await supabase.auth.updateUser({ password: contrasena });

      if (errorActualizacion) throw errorActualizacion;

      setContrasena("");
      setConfirmacion("");
      setMensaje(
        "Tu contraseña se actualizó correctamente. Ya puedes volver a TdeA GO e iniciar sesión con ella."
      );
      setSesionRecuperacion(false);

      await supabase.auth.signOut();
    } catch (errorActualizacion) {
      console.error(
        "Error al actualizar la contraseña:",
        errorActualizacion
      );
      setError(
        errorActualizacion.message ||
        "No fue posible cambiar la contraseña. Solicita un nuevo enlace e inténtalo otra vez."
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <main className="login-container">
      <div className="login-brand">
        <span className="login-brand-tdea">TdeA</span>
        <span className="login-brand-go">GO</span>
      </div>

      <div className="login-header">
        <h2>Nueva contraseña</h2>
        <p>Elige una contraseña segura para tu cuenta.</p>
      </div>

      {cargando ? (
        <p role="status">Validando el enlace de recuperación...</p>
      ) : mensaje ? (
        <>
          <div className="login-success" role="status">
            <span className="login-success-icon">✓</span>
            <span>{mensaje}</span>
          </div>
          <button
            type="button"
            className="login-submit"
            onClick={() => navigate("/")}
          >
            Volver a TdeA GO
          </button>
        </>
      ) : !sesionRecuperacion ? (
        <>
          <div className="login-error" role="alert">
            <span className="login-error-icon">!</span>
            <span>{error}</span>
          </div>
          <button
            type="button"
            className="login-submit"
            onClick={() => navigate("/")}
          >
            Volver a TdeA GO
          </button>
        </>
      ) : (
        <form className="login-form" onSubmit={guardarNuevaContrasena}>
          <div className="login-field">
            <label htmlFor="nuevaContrasena">Nueva contraseña</label>
            <div className="password-wrapper">
              <input
                id="nuevaContrasena"
                type={mostrarContrasena ? "text" : "password"}
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
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
            <small>
              Debe incluir una letra, un número y un símbolo.
            </small>
          </div>

          <div className="login-field">
            <label htmlFor="confirmarContrasena">
              Confirmar nueva contraseña
            </label>
            <input
              id="confirmarContrasena"
              type={mostrarContrasena ? "text" : "password"}
              value={confirmacion}
              onChange={(e) => setConfirmacion(e.target.value)}
              placeholder="Escribe nuevamente la contraseña"
              autoComplete="new-password"
              required
            />
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
            disabled={guardando}
          >
            {guardando ? "Guardando..." : "Guardar nueva contraseña"}
          </button>
        </form>
      )}
    </main>
  );
}

export default RestablecerContrasena;
