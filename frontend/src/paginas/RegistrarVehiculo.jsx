import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function RegistrarVehiculo({ usuarioId, onVehiculoRegistrado }) {
  const [tipo, setTipo] = useState("Automóvil");
  const [marcaModelo, setMarcaModelo] = useState("");
  const [placa, setPlaca] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const manejarEnvio = async (e) => {
    e.preventDefault();
    setError("");
    setMensaje("");

    if (!marcaModelo.trim() || !placa.trim()) {
      setError("Por favor completa la marca/modelo y la placa.");
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
        }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || "No fue posible registrar el vehículo.");
      }

      setMensaje("¡Vehículo registrado con éxito!");
      setMarcaModelo("");
      setPlaca("");

      if (onVehiculoRegistrado) {
        onVehiculoRegistrado(datos.vehiculo);
      }
    } catch (err) {
      console.error("Error al registrar vehículo:", err);
      setError(err.message || "Ocurrió un error en el servidor.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="vehiculo-container" style={{ padding: "20px", maxWidth: "400px", margin: "0 auto", background: "#fff", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
      <h3>Registra tu vehículo</h3>
      <p style={{ fontSize: "14px", color: "#666" }}>Esta información aparecerá en tus rutas publicadas.</p>

      <form onSubmit={manejarEnvio} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div>
          <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", marginBottom: "4px" }}>Tipo de vehículo</label>
          <select 
            value={tipo} 
            onChange={(e) => setTipo(e.target.value)}
            style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
          >
            <option value="Automóvil">Automóvil</option>
            <option value="Moto">Moto</option>
            <option value="Camioneta">Camioneta</option>
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", marginBottom: "4px" }}>Marca y Modelo</label>
          <input 
            type="text" 
            placeholder="Ej. Chevrolet Spark GT" 
            value={marcaModelo}
            onChange={(e) => setMarcaModelo(e.target.value)}
            style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", marginBottom: "4px" }}>Placa</label>
          <input 
            type="text" 
            placeholder="Ej. ABC-123" 
            value={placa}
            onChange={(e) => setPlaca(e.target.value)}
            style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
          />
        </div>

        {error && <p style={{ color: "red", fontSize: "13px", margin: "0" }}>{error}</p>}
        {mensaje && <p style={{ color: "green", fontSize: "13px", margin: "0" }}>{mensaje}</p>}

        <button 
          type="submit" 
          disabled={cargando}
          style={{ background: "#0066cc", color: "#fff", padding: "10px", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}
        >
          {cargando ? "Guardando..." : "Guardar Vehículo"}
        </button>
      </form>
    </div>
  );
}

export default RegistrarVehiculo;