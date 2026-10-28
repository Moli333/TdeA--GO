
import { useEffect, useState } from "react";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

function RegistrarVehiculo({ usuarioId, onVehiculoRegistrado }) {
  const [tipo, setTipo] = useState("Automóvil");
  const [marcaModelo, setMarcaModelo] = useState("");
  const [placa, setPlaca] = useState("");
  const [color, setColor] = useState("");
  const [capacidadMaxima, setCapacidadMaxima] = useState("");

  const [vehiculo, setVehiculo] = useState(null);
  const [cargandoVehiculo, setCargandoVehiculo] = useState(true);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    let activo = true;

    async function consultarVehiculo() {
      setCargandoVehiculo(true);
      setError("");

      if (!usuarioId) {
        setVehiculo(null);
        setCargandoVehiculo(false);
        return;
      }

      try {
        const respuesta = await fetch(
          `${API_URL}/api/vehiculos/${usuarioId}`
        );
        const datos = await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(
            datos.mensaje || "No fue posible consultar el vehículo."
          );
        }

        if (!activo) return;

        const vehiculoEncontrado = datos.vehiculo || null;
        setVehiculo(vehiculoEncontrado);

        if (vehiculoEncontrado) {
          setTipo(vehiculoEncontrado.tipo || "Automóvil");
          setMarcaModelo(vehiculoEncontrado.marca_modelo || "");
          setPlaca(vehiculoEncontrado.placa || "");
          setColor(vehiculoEncontrado.color || "");
          setCapacidadMaxima(
            vehiculoEncontrado.capacidad_maxima != null
              ? String(vehiculoEncontrado.capacidad_maxima)
              : ""
          );
        }
      } catch (err) {
        if (activo) {
          console.error("Error al consultar el vehículo:", err);
          setError(
            err.message || "Ocurrió un error al consultar el vehículo."
          );
        }
      } finally {
        if (activo) setCargandoVehiculo(false);
      }
    }

    consultarVehiculo();

    return () => {
      activo = false;
    };
  }, [usuarioId]);

  const manejarEnvio = async (e) => {
    e.preventDefault();
    setError("");
    setMensaje("");

    if (!usuarioId) {
      setError("No se identificó al usuario. Inicia sesión nuevamente.");
      return;
    }

    if (
      !marcaModelo.trim() ||
      !placa.trim() ||
      !capacidadMaxima ||
      !Number.isInteger(Number(capacidadMaxima)) ||
      Number(capacidadMaxima) < 1
    ) {
      setError(
        "Completa la marca/modelo, la placa y una capacidad válida."
      );
      return;
    }

    try {
      setCargando(true);

      const respuesta = await fetch(`${API_URL}/api/vehiculos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conductor_id: usuarioId,
          tipo: tipo.trim(),
          marca_modelo: marcaModelo.trim(),
          placa: placa.trim().toUpperCase(),
          color: color.trim() || null,
          capacidad_maxima: Number(capacidadMaxima),
        }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.mensaje || "No fue posible guardar el vehículo."
        );
      }

      const vehiculoGuardado = datos.vehiculo;

      setVehiculo(vehiculoGuardado);
      setMensaje(
        "Vehículo " +
        (vehiculo ? "actualizado" : "registrado") +
        " correctamente."
      );

      if (onVehiculoRegistrado) {
        onVehiculoRegistrado(vehiculoGuardado);
      }
    } catch (err) {
      console.error("Error al guardar el vehículo:", err);
      setError(err.message || "Ocurrió un error en el servidor.");
    } finally {
      setCargando(false);
    }
  };

  const estiloEtiqueta = {
    display: "block",
    fontSize: "13px",
    fontWeight: "600",
    marginBottom: "5px",
    color: "#334155",
  };

  const estiloCampo = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "7px",
    border: "1px solid #cbd5e1",
    boxSizing: "border-box",
    fontSize: "14px",
    background: "#fff",
  };

  const estiloDato = {
    margin: "5px 0 12px",
    color: "#334155",
    fontSize: "14px",
    overflowWrap: "anywhere",
  };

  return (
    <section
      className="vehiculo-container"
      style={{
        padding: "20px",
        width: "100%",
        maxWidth: "460px",
        margin: "0 auto",
        boxSizing: "border-box",
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        boxShadow: "0 3px 12px rgba(15, 23, 42, 0.06)",
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: "8px", color: "#123b65" }}>
        Mi vehículo
      </h3>

      <p style={{ fontSize: "14px", color: "#64748b", lineHeight: 1.5 }}>
        Consulta y actualiza la información del vehículo que utilizas para
        publicar tus rutas.
      </p>

      {cargandoVehiculo ? (
        <p style={{ fontSize: "14px", color: "#64748b" }}>
          Consultando información del vehículo...
        </p>
      ) : vehiculo ? (
        <div
          style={{
            padding: "15px",
            margin: "16px 0",
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "9px",
          }}
        >
          <p
            style={{
              marginTop: 0,
              marginBottom: "14px",
              fontWeight: "700",
              color: "#123b65",
            }}
          >
            Vehículo registrado
          </p>

          <span style={estiloEtiqueta}>Tipo</span>
          <p style={estiloDato}>{vehiculo.tipo || "No especificado"}</p>

          <span style={estiloEtiqueta}>Marca y modelo</span>
          <p style={estiloDato}>
            {vehiculo.marca_modelo || "No especificado"}
          </p>

          <span style={estiloEtiqueta}>Placa</span>
          <p style={estiloDato}>{vehiculo.placa || "No especificada"}</p>

          <span style={estiloEtiqueta}>Color</span>
          <p style={estiloDato}>{vehiculo.color || "No especificado"}</p>

          <span style={estiloEtiqueta}>Capacidad máxima</span>
          <p style={{ ...estiloDato, marginBottom: 0 }}>
            {vehiculo.capacidad_maxima ?? "No especificada"} persona(s)
          </p>
        </div>
      ) : (
        <p
          style={{
            padding: "12px",
            background: "#f8fafc",
            borderRadius: "7px",
            color: "#64748b",
            fontSize: "14px",
          }}
        >
          No se encontró un vehículo registrado para este usuario.
        </p>
      )}

      <h4 style={{ color: "#123b65", marginBottom: "14px" }}>
        {vehiculo ? "Actualizar datos del vehículo" : "Registrar vehículo"}
      </h4>

      <form
        onSubmit={manejarEnvio}
        style={{ display: "flex", flexDirection: "column", gap: "13px" }}
      >
        <div>
          <label style={estiloEtiqueta}>Tipo de vehículo</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            style={estiloCampo}
            required
          >
            <option value="Automóvil">Automóvil</option>
            <option value="Moto">Moto</option>
            <option value="Camioneta">Camioneta</option>
          </select>
        </div>

        <div>
          <label style={estiloEtiqueta}>Marca y modelo</label>
          <input
            type="text"
            placeholder="Ej. Chevrolet Spark GT"
            value={marcaModelo}
            onChange={(e) => setMarcaModelo(e.target.value)}
            style={estiloCampo}
            required
          />
        </div>

        <div>
          <label style={estiloEtiqueta}>Placa</label>
          <input
            type="text"
            placeholder="Ej. ABC123"
            value={placa}
            onChange={(e) => setPlaca(e.target.value)}
            style={estiloCampo}
            required
          />
        </div>

        <div>
          <label style={estiloEtiqueta}>Color (opcional)</label>
          <input
            type="text"
            placeholder="Ej. Blanco"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            style={estiloCampo}
          />
        </div>

        <div>
          <label style={estiloEtiqueta}>
            Capacidad máxima de personas
          </label>
          <input
            type="number"
            min="1"
            step="1"
            placeholder="Ej. 4"
            value={capacidadMaxima}
            onChange={(e) => setCapacidadMaxima(e.target.value)}
            style={estiloCampo}
            required
          />
        </div>

        {error && (
          <p
            role="alert"
            style={{
              color: "#b91c1c",
              background: "#fef2f2",
              padding: "10px",
              borderRadius: "7px",
              fontSize: "13px",
              margin: 0,
            }}
          >
            {error}
          </p>
        )}

        {mensaje && (
          <p
            role="status"
            style={{
              color: "#166534",
              background: "#f0fdf4",
              padding: "10px",
              borderRadius: "7px",
              fontSize: "13px",
              margin: 0,
            }}
          >
            {mensaje}
          </p>
        )}

        <button
          type="submit"
          disabled={cargando || cargandoVehiculo}
          style={{
            background: "#0066cc",
            color: "#fff",
            padding: "12px",
            border: "none",
            borderRadius: "7px",
            cursor:
              cargando || cargandoVehiculo ? "wait" : "pointer",
            fontWeight: "600",
            fontSize: "14px",
            opacity: cargando || cargandoVehiculo ? 0.7 : 1,
          }}
        >
          {cargando
            ? "Guardando..."
            : vehiculo
              ? "Actualizar vehículo"
              : "Guardar vehículo"}
        </button>
      </form>
    </section>
  );
}

export default RegistrarVehiculo;
