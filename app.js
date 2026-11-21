function inicializar() {
  const guardados = localStorage.getItem(STORAGE_KEY_ALUMNOS);
  const tasaGuardada = localStorage.getItem(STORAGE_KEY_TASA);

  if (guardados) {
    try {
      const parsed = JSON.parse(guardados);
      const listaAlumnos = Array.isArray(parsed)
        ? parsed
        : parsed && Array.isArray(parsed.alumnos)
        ? parsed.alumnos
        : null;

      alumnos = listaAlumnos
        ? listaAlumnos.map(normalizarAlumno)
        : JSON.parse(JSON.stringify(ALUMNOS_INICIALES)).map(normalizarAlumno);
    } catch (e) {
      alumnos = JSON.parse(JSON.stringify(ALUMNOS_INICIALES)).map(normalizarAlumno);
    }
  } else {
    alumnos = JSON.parse(JSON.stringify(ALUMNOS_INICIALES)).map(normalizarAlumno);
    guardarEstado();
  }

  tasaBCV = tasaGuardada && Number(tasaGuardada) > 0 ? Number(tasaGuardada) : TASA_BCV_INICIAL;

  const inputTasa = document.getElementById("tasa-bcv-input");
  if (inputTasa) inputTasa.value = tasaBCV.toFixed(2);

  const msg = document.getElementById("mensaje-busqueda");
  if (msg) {
    msg.textContent =
      "Ingresa una cédula o matrícula";
  }

  actualizarInfoMetodoPago();
}