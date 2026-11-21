const STORAGE_KEY_ALUMNOS = "uei_san_antonio_portal_v4";
const STORAGE_KEY_TASA = "uei_san_antonio_tasa_v4";

let alumnos = [];
let tasaBCV = TASA_BCV_INICIAL;
let alumnoSeleccionado = null;
let carrito = [];
let ultimoComprobante = null;

function normalizarAlumno(a) {
  const periodosLimpios = {};
  const sourcePeriodos = a.periodos || {};

  PERIODOS_ESCOLARES.forEach((per) => {
    const p = sourcePeriodos[per] || {};
    periodosLimpios[per] = {
      saldo: Number(p.saldo) || 0,
      saldoEnRevision: Boolean(p.saldoEnRevision),
      mesesPendientes: Array.isArray(p.mesesPendientes) ? [...p.mesesPendientes] : [],
      mesesEnRevision: Array.isArray(p.mesesEnRevision) ? [...p.mesesEnRevision] : []
    };
  });

  return {
    ...a,
    cedula: a.cedula || "",
    inscripcionPagada: Boolean(a.inscripcionPagada),
    inscripcionEnRevision: Boolean(a.inscripcionEnRevision),
    periodos: periodosLimpios
  };
}

function inicializar() {
  const guardados = localStorage.getItem(STORAGE_KEY_ALUMNOS);
  const tasaGuardada = localStorage.getItem(STORAGE_KEY_TASA);

  if (guardados) {
    alumnos = JSON.parse(guardados).map(normalizarAlumno);
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

function guardarEstado() {
  localStorage.setItem(STORAGE_KEY_ALUMNOS, JSON.stringify(alumnos));
  localStorage.setItem(STORAGE_KEY_TASA, String(tasaBCV));
}

function actualizarInfoMetodoPago() {
  const selectMetodo = document.getElementById("metodo-pago");
  const cajaInfo = document.getElementById("info-metodo-pago");
  const grupoRef = document.getElementById("grupo-referencia");
  const labelRef = document.getElementById("label-referencia");
  const inputRef = document.getElementById("referencia-pago");
  if (!selectMetodo || !cajaInfo) return;

  const metodo = selectMetodo.value;

  if (metodo === "Pago Móvil") {
    cajaInfo.innerHTML = `
      <strong style="color:#1e3a8a;display:block;margin-bottom:6px;">Datos para Pago Móvil:</strong>
      <div><strong>Titular:</strong> ${DATOS_PAGO_MOVIL.titular}</div>
      <div><strong>Banco / Código:</strong> ${DATOS_PAGO_MOVIL.banco}</div>
      <div><strong>RIF:</strong> ${DATOS_PAGO_MOVIL.rif}</div>
      <div><strong>Teléfono:</strong> ${DATOS_PAGO_MOVIL.telefono}</div>
    `;
    if (grupoRef) grupoRef.classList.remove("oculto");
    if (labelRef) labelRef.textContent = "Nro. de Referencia Pago Móvil (para conciliación)";
    if (inputRef) inputRef.placeholder = "Ej: 00984512";
  } else if (metodo === "Transferencia Bancaria") {
    cajaInfo.innerHTML = `
      <strong style="color:#1e3a8a;display:block;margin-bottom:6px;">Datos para Transferencia Bancaria:</strong>
      <div><strong>Titular:</strong> ${DATOS_TRANSFERENCIA.titular}</div>
      <div><strong>Banco:</strong> ${DATOS_TRANSFERENCIA.banco}</div>
      <div><strong>RIF:</strong> ${DATOS_TRANSFERENCIA.rif}</div>
      <div><strong>Teléfono:</strong> ${DATOS_TRANSFERENCIA.telefono}</div>
      <div><strong>Cuenta:</strong> ${DATOS_TRANSFERENCIA.cuenta}</div>
    `;
    if (grupoRef) grupoRef.classList.remove("oculto");
    if (labelRef) labelRef.textContent = "Nro. de Referencia Transferencia (para conciliación)";
    if (inputRef) inputRef.placeholder = "Ej: 77451209";
  } else if (metodo === "Efectivo USD ($)") {
    cajaInfo.innerHTML = `
      <strong style="color:#b45309;display:block;margin-bottom:4px;">Atención · Pago en Efectivo USD ($):</strong>
      <div class="small">Para realizar pagos en efectivo, debes <strong>dirigirte a la oficina de administración</strong> del colegio.</div>
    `;
    if (grupoRef) grupoRef.classList.add("oculto");
    if (inputRef) inputRef.value = "";
  } else if (metodo === "Cashea") {
    cajaInfo.innerHTML = `
      <strong style="color:#1e3a8a;display:block;margin-bottom:4px;">Atención · Pago con Cashea:</strong>
      <div class="small">Debes <strong>comunicarte al número telefónico de administración (+584248912975) o dirigirte a la oficina de administración</strong> para coordinar el proceso.</div>
    `;
    if (grupoRef) grupoRef.classList.add("oculto");
    if (inputRef) inputRef.value = "";
  } else if (metodo === "Punto de Venta") {
    cajaInfo.innerHTML = `
      <strong style="color:#b91c1c;display:block;margin-bottom:4px;">Atención · Pago por Punto de Venta:</strong>
      <div class="small">Para realizar pagos por punto de venta, debes dirigirte a la oficina de administración del colegio.</div>
    `;
    if (grupoRef) grupoRef.classList.add("oculto");
    if (inputRef) inputRef.value = "";
  }
}

function actualizarTasaBCV() {
  const inputTasa = document.getElementById("tasa-bcv-input");
  const valor = Number(inputTasa ? inputTasa.value : 0);
  if (!valor || valor <= 0) {
    alert("Ingresa una tasa BCV válida mayor a 0.");
    if (inputTasa) inputTasa.value = tasaBCV.toFixed(2);
    return;
  }
  tasaBCV = valor;
  guardarEstado();
  if (alumnoSeleccionado) {
    renderizarPanelAlumno();
    renderizarCarrito();
  }
}

async function consultarTasaBCVOnline() {
  const msg = document.getElementById("mensaje-busqueda");
  if (msg) msg.textContent = "Consultando tasa oficial BCV en línea...";
  try {
    const resp = await fetch("https://ve.dolarapi.com/v1/dolares/oficial");
    if (!resp.ok) throw new Error("No se pudo consultar");
    const data = await resp.json();
    if (data && data.promedio && Number(data.promedio) > 0) {
      tasaBCV = Number(data.promedio);
      const inputTasa = document.getElementById("tasa-bcv-input");
      if (inputTasa) inputTasa.value = tasaBCV.toFixed(2);
      guardarEstado();
      if (alumnoSeleccionado) {
        renderizarPanelAlumno();
        renderizarCarrito();
      }
      if (msg) msg.textContent = `Tasa oficial BCV actualizada: Bs. ${tasaBCV.toFixed(2)} por $1.`;
      return;
    }
    throw new Error("Dato inválido");
  } catch (err) {
    if (msg) {
      msg.textContent =
        "No se pudo obtener la tasa automáticamente. Escribe la tasa BCV del día manualmente.";
    }
  }
}

function formatearBs(montoUsd) {
  const bs = montoUsd * tasaBCV;
  return "Bs. " + bs.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function normalizarCedula(texto) {
  return String(texto || "").toUpperCase().replace(/[^0-9]/g, "");
}

function calcularDeudaAlumno(alumno) {
  const totalPeriodos = PERIODOS_ESCOLARES.reduce((acc, per) => {
    const p = alumno.periodos[per] || { saldo: 0, mesesPendientes: [] };
    return acc + (Number(p.saldo) || 0) + (p.mesesPendientes || []).length * PRECIO_MENSUALIDAD;
  }, 0);
  const deudaInsc = alumno.inscripcionPagada ? 0 : PRECIO_INSCRIPCION;
  return Number((totalPeriodos + deudaInsc).toFixed(2));
}

function tieneConceptosEnRevision(alumno) {
  if (alumno.inscripcionEnRevision) return true;
  return PERIODOS_ESCOLARES.some((per) => {
    const p = alumno.periodos[per];
    return p && (p.saldoEnRevision || (p.mesesEnRevision && p.mesesEnRevision.length > 0));
  });
}

function obtenerEstadoAlumno(alumno) {
  if (tieneConceptosEnRevision(alumno)) return "REVISION";
  return calcularDeudaAlumno(alumno) > 0 ? "MOROSO" : "SOLVENTE";
}

function buscarPorCedula(e) {
  if (e) e.preventDefault();
  const inputBuscador = document.getElementById("buscador-cedula");
  const panel = document.getElementById("panel-alumno");
  const msg = document.getElementById("mensaje-busqueda");
  const raw = inputBuscador ? inputBuscador.value.trim() : "";
  const numBuscado = normalizarCedula(raw);

  if (!numBuscado) {
    if (msg) msg.textContent = "Por favor escribe un número de cédula o matrícula válida.";
    if (panel) panel.classList.add("oculto");
    return;
  }

  const encontrado = alumnos.find(
    (a) =>
      String(a.matricula).trim().toUpperCase() === raw.toUpperCase() ||
      (a.cedula && normalizarCedula(a.cedula) === numBuscado)
  );

  if (!encontrado) {
    alumnoSeleccionado = null;
    carrito = [];
    if (panel) panel.classList.add("oculto");
    if (msg) msg.textContent = `No se encontró ningún registro asociado a "${raw}".`;
    return;
  }

  if (msg) {
    msg.textContent = `Registro localizado: ${encontrado.nombre} (Matrícula ${encontrado.matricula}).`;
  }
  seleccionarAlumno(encontrado.matricula);
}

function limpiarBusqueda() {
  const inputBuscador = document.getElementById("buscador-cedula");
  const panel = document.getElementById("panel-alumno");
  const msg = document.getElementById("mensaje-busqueda");

  if (inputBuscador) inputBuscador.value = "";
  if (msg) {
    msg.textContent =
      "Ingresa una cédula (ej: V-28110234, V-34901234, V-34729201, V-32456789) o matrícula (ej: 2024588, 2024226).";
  }
  alumnoSeleccionado = null;
  carrito = [];
  if (panel) panel.classList.add("oculto");
}

function seleccionarAlumno(matricula) {
  alumnoSeleccionado = alumnos.find((a) => a.matricula === matricula);
  if (!alumnoSeleccionado) return;

  carrito = [];
  const msgPago = document.getElementById("mensaje-pago");
  const panel = document.getElementById("panel-alumno");
  if (msgPago) msgPago.classList.add("oculto");
  if (panel) panel.classList.remove("oculto");

  renderizarPanelAlumno();
  renderizarCarrito();
}

function renderizarPanelAlumno() {
  const a = alumnoSeleccionado;
  if (!a) return;

  const deuda = calcularDeudaAlumno(a);
  const estado = obtenerEstadoAlumno(a);

  const periodosConDeuda = PERIODOS_ESCOLARES.filter((per) => {
    const p = a.periodos[per] || { saldo: 0, mesesPendientes: [] };
    return (Number(p.saldo) || 0) > 0 || (p.mesesPendientes && p.mesesPendientes.length > 0);
  });

  const resumenPeriodos =
    periodosConDeuda.length > 0 ? " · Período(s): " + periodosConDeuda.join(", ") : "";

  const nivelEl = document.getElementById("alumno-nivel");
  const nombreEl = document.getElementById("alumno-nombre");
  const metaEl = document.getElementById("alumno-meta");
  const pill = document.getElementById("alumno-estado-pill");

  if (nivelEl) nivelEl.textContent = a.anio;
  if (nombreEl) nombreEl.textContent = a.nombre;
  if (metaEl) {
    metaEl.textContent = `Matrícula: ${a.matricula} · Cédula: ${a.cedula || "No registrada"} · Representante: ${a.representante} (${a.telefono})${resumenPeriodos}`;
  }

  if (pill) {
    if (estado === "REVISION") {
      pill.textContent = `EN REVISIÓN · PENDIENTE: $${deuda.toFixed(2)}`;
      pill.className = "status-pill status-revision";
    } else if (estado === "SOLVENTE") {
      pill.textContent = "SOLVENTE ($0.00)";
      pill.className = "status-pill status-solvente";
    } else {
      pill.textContent = `PENDIENTE: $${deuda.toFixed(2)} (${formatearBs(deuda)})`;
      pill.className = "status-pill status-moroso";
    }
  }

  const cajaInsc = document.getElementById("caja-inscripcion");
  let tarjetasPeriodosHtml = "";

  PERIODOS_ESCOLARES.forEach((per) => {
    const p = a.periodos[per];
    if (p && p.saldo > 0) {
      const idClave = `SALDO_${per}`;
      const enCarrito = carrito.some((item) => item.id === idClave);
      if (p.saldoEnRevision) {
        tarjetasPeriodosHtml += `
          <div class="item-cuota en-revision">
            <div class="titulo-cuota">Período ${per}</div>
            <div class="monto-cuota">$${p.saldo.toFixed(2)} · ${formatearBs(p.saldo)}</div>
            <span class="tag-estado tag-revision">EN REVISIÓN</span>
          </div>
        `;
      } else {
        tarjetasPeriodosHtml += `
          <div class="item-cuota ${enCarrito ? "seleccionado" : "pendiente"}" onclick="toggleSaldoPeriodo('${per}')">
            <div class="titulo-cuota">Período ${per}</div>
            <div class="monto-cuota">$${p.saldo.toFixed(2)} · ${formatearBs(p.saldo)}</div>
            <span class="tag-estado ${enCarrito ? "tag-carrito" : "tag-pendiente"}">
              ${enCarrito ? "EN CARRITO ✓" : "POR PAGAR"}
            </span>
          </div>
        `;
      }
    }
  });

  const pRegular = a.periodos["2026-2027"] || { mesesPendientes: [], mesesEnRevision: [] };
  const esAlumnoRegular2627 =
    !a.inscripcionPagada ||
    pRegular.mesesPendientes.length > 0 ||
    pRegular.mesesEnRevision.length > 0;

  if (esAlumnoRegular2627) {
    const inscEnCarrito = carrito.some((item) => item.id === "INSCRIPCION");
    if (a.inscripcionPagada) {
      tarjetasPeriodosHtml += `
        <div class="item-cuota pagado">
          <div class="titulo-cuota">Inscripción</div>
          <div class="monto-cuota">$${PRECIO_INSCRIPCION}.00 · ${formatearBs(PRECIO_INSCRIPCION)}</div>
          <span class="tag-estado tag-pagado">PAGADA</span>
        </div>
      `;
    } else if (a.inscripcionEnRevision) {
      tarjetasPeriodosHtml += `
        <div class="item-cuota en-revision">
          <div class="titulo-cuota">Inscripción</div>
          <div class="monto-cuota">$${PRECIO_INSCRIPCION}.00 · ${formatearBs(PRECIO_INSCRIPCION)}</div>
          <span class="tag-estado tag-revision">EN REVISIÓN</span>
        </div>
      `;
    } else {
      tarjetasPeriodosHtml += `
        <div class="item-cuota ${inscEnCarrito ? "seleccionado" : "pendiente"}" onclick="toggleInscripcion()">
          <div class="titulo-cuota">Inscripción</div>
          <div class="monto-cuota">$${PRECIO_INSCRIPCION}.00 · ${formatearBs(PRECIO_INSCRIPCION)}</div>
          <span class="tag-estado ${inscEnCarrito ? "tag-carrito" : "tag-pendiente"}">
            ${inscEnCarrito ? "EN CARRITO ✓" : "POR PAGAR"}
          </span>
        </div>
      `;
    }
  }

  if (!tarjetasPeriodosHtml) {
    tarjetasPeriodosHtml = `<div class="muted small">Sin saldos pendientes por período.</div>`;
  }

  if (cajaInsc) cajaInsc.innerHTML = tarjetasPeriodosHtml;

  const cajaMeses = document.getElementById("caja-mensualidades");
  if (!cajaMeses) return;

  if (!esAlumnoRegular2627) {
    cajaMeses.innerHTML = `<div class="muted small">No aplica mensualidades vigentes en este registro.</div>`;
    return;
  }

  cajaMeses.innerHTML = MESES_ESCOLARES.map((mes) => {
    const enRev = pRegular.mesesEnRevision.includes(mes);
    const pendiente = pRegular.mesesPendientes.includes(mes);
    const idMes = `MES_${mes}`;
    const enCarrito = carrito.some((item) => item.id === idMes);

    if (enRev) {
      return `
        <div class="item-cuota en-revision">
          <div class="titulo-cuota">${mes}</div>
          <div class="monto-cuota">$${PRECIO_MENSUALIDAD}.00 · ${formatearBs(PRECIO_MENSUALIDAD)}</div>
          <span class="tag-estado tag-revision">EN REVISIÓN</span>
        </div>
      `;
    }

    if (!pendiente) {
      return `
        <div class="item-cuota pagado">
          <div class="titulo-cuota">${mes}</div>
          <div class="monto-cuota">$${PRECIO_MENSUALIDAD}.00 · ${formatearBs(PRECIO_MENSUALIDAD)}</div>
          <span class="tag-estado tag-pagado">PAGADO</span>
        </div>
      `;
    }

    return `
      <div class="item-cuota ${enCarrito ? "seleccionado" : "pendiente"}" onclick="toggleMes('${mes}')">
        <div class="titulo-cuota">${mes}</div>
        <div class="monto-cuota">$${PRECIO_MENSUALIDAD}.00 · ${formatearBs(PRECIO_MENSUALIDAD)}</div>
        <span class="tag-estado ${enCarrito ? "tag-carrito" : "tag-pendiente"}">
          ${enCarrito ? "EN CARRITO ✓" : "POR PAGAR"}
        </span>
      </div>
    `;
  }).join("");
}

function toggleSaldoPeriodo(per) {
  if (!alumnoSeleccionado) return;
  const p = alumnoSeleccionado.periodos[per];
  if (!p || p.saldo <= 0 || p.saldoEnRevision) return;

  const idClave = `SALDO_${per}`;
  const idx = carrito.findIndex((i) => i.id === idClave);
  if (idx >= 0) {
    carrito.splice(idx, 1);
  } else {
    carrito.push({
      id: idClave,
      tipo: "SALDO_PERIODO",
      periodo: per,
      nombre: `Saldo Período ${per}`,
      monto: Number(p.saldo)
    });
  }
  renderizarPanelAlumno();
  renderizarCarrito();
}

function toggleInscripcion() {
  if (!alumnoSeleccionado || alumnoSeleccionado.inscripcionPagada || alumnoSeleccionado.inscripcionEnRevision) return;
  const idClave = "INSCRIPCION";
  const idx = carrito.findIndex((i) => i.id === idClave);
  if (idx >= 0) {
    carrito.splice(idx, 1);
  } else {
    carrito.push({
      id: idClave,
      tipo: "INSCRIPCION",
      periodo: "2026-2027",
      nombre: "Inscripción",
      monto: PRECIO_INSCRIPCION
    });
  }
  renderizarPanelAlumno();
  renderizarCarrito();
}

function toggleMes(mes) {
  if (!alumnoSeleccionado) return;
  const pRegular = alumnoSeleccionado.periodos["2026-2027"];
  if (!pRegular.mesesPendientes.includes(mes) || pRegular.mesesEnRevision.includes(mes)) return;

  const idClave = `MES_${mes}`;
  const idx = carrito.findIndex((i) => i.id === idClave);
  if (idx >= 0) {
    carrito.splice(idx, 1);
  } else {
    carrito.push({
      id: idClave,
      tipo: "MENSUALIDAD",
      periodo: "2026-2027",
      nombre: mes,
      mesRaw: mes,
      monto: PRECIO_MENSUALIDAD
    });
  }
  renderizarPanelAlumno();
  renderizarCarrito();
}

function renderizarCarrito() {
  const lista = document.getElementById("lista-carrito");
  const cant = document.getElementById("cant-seleccionados");
  const totalUsdEl = document.getElementById("total-pagar-usd");
  const totalBsEl = document.getElementById("total-pagar-bs");

  if (!lista || !cant || !totalUsdEl || !totalBsEl) return;

  if (carrito.length === 0) {
    lista.innerHTML = `<li class="muted small">No has seleccionado conceptos todavía.</li>`;
    cant.textContent = "0";
    totalUsdEl.textContent = "$0.00";
    totalBsEl.textContent = formatearBs(0);
    return;
  }

  lista.innerHTML = carrito
    .map(
      (item) => `
      <li>
        <span>${item.nombre}</span>
        <strong>$${item.monto.toFixed(2)} (${formatearBs(item.monto)})</strong>
      </li>
    `
    )
    .join("");

  const total = carrito.reduce((acc, item) => acc + item.monto, 0);
  cant.textContent = String(carrito.length);
  totalUsdEl.textContent = `$${total.toFixed(2)}`;
  totalBsEl.textContent = formatearBs(total);
}

function procesarPago() {
  if (!alumnoSeleccionado) return;

  if (carrito.length === 0) {
    alert("Selecciona al menos un concepto pendiente para registrar el pago.");
    return;
  }

  const metodo = document.getElementById("metodo-pago").value;
  const requiereRef = metodo === "Pago Móvil" || metodo === "Transferencia Bancaria";
  const inputRef = document.getElementById("referencia-pago");
  const referencia = inputRef ? inputRef.value.trim() : "";

  if (requiereRef && !referencia) {
    alert(`Por favor ingresa el número de referencia de ${metodo} para facilitar la conciliación bancaria.`);
    if (inputRef) inputRef.focus();
    return;
  }

  let notaAtencion = "";
  if (metodo === "Efectivo USD ($)") {
    notaAtencion = "Dirigirse a la oficina de administración del colegio.";
  } else if (metodo === "Cashea") {
    notaAtencion = "Comunicarse al +584248912975 o dirigirte a la oficina de administración.";
  } else if (metodo === "Punto de Venta") {
    notaAtencion = "Para realizar pagos por punto de venta, debes dirigirte a la oficina de administración del colegio.";
  }

  const refFinal = requiereRef ? referencia : notaAtencion;
  const totalReportado = carrito.reduce((acc, item) => acc + item.monto, 0);
  const totalBs = formatearBs(totalReportado);
  const conceptosReportados = [...carrito];
  const codigoComprobante = "CMP-" + Date.now().toString().slice(-7);

  conceptosReportados.forEach((item) => {
    if (item.tipo === "SALDO_PERIODO") {
      alumnoSeleccionado.periodos[item.periodo].saldoEnRevision = true;
    } else if (item.tipo === "INSCRIPCION") {
      alumnoSeleccionado.inscripcionEnRevision = true;
    } else if (item.tipo === "MENSUALIDAD") {
      const pRegular = alumnoSeleccionado.periodos["2026-2027"];
      if (!pRegular.mesesEnRevision.includes(item.mesRaw)) {
        pRegular.mesesEnRevision.push(item.mesRaw);
      }
    }
  });

  alumnos = alumnos.map((a) =>
    a.matricula === alumnoSeleccionado.matricula ? normalizarAlumno(alumnoSeleccionado) : a
  );
  alumnoSeleccionado = alumnos.find((a) => a.matricula === alumnoSeleccionado.matricula);

  carrito = [];
  if (inputRef) inputRef.value = "";

  guardarEstado();
  renderizarPanelAlumno();
  renderizarCarrito();

  ultimoComprobante = {
    codigo: codigoComprobante,
    fecha: new Date().toLocaleString("es-VE"),
    alumno: { ...alumnoSeleccionado },
    conceptos: conceptosReportados,
    totalUsd: totalReportado,
    totalBs,
    tasa: tasaBCV,
    metodo,
    referencia: refFinal
  };

  const alerta = document.getElementById("mensaje-pago");
  if (alerta) {
    alerta.classList.remove("oculto");
    alerta.textContent = `EN REVISIÓN: Comprobante ${codigoComprobante} generado. Envíalo por WhatsApp junto con el capture a Administración.`;
  }

  mostrarComprobante(ultimoComprobante);
}

function mostrarComprobante(cmp) {
  const detalle = document.getElementById("detalle-recibo");
  const modal = document.getElementById("modal-recibo");
  if (!detalle || !modal) return;

  detalle.innerHTML = `
    <div class="recibo-banner-revision">
      ESTATUS: EN REVISIÓN · PENDIENTE POR VALIDACIÓN ADMINISTRATIVA
    </div>
    <p class="small"><strong>Nro. de Comprobante:</strong> ${cmp.codigo}</p>
    <p class="small"><strong>Fecha:</strong> ${cmp.fecha}</p>
    <p class="small"><strong>Alumno:</strong> ${cmp.alumno.nombre} (${cmp.alumno.anio})</p>
    <p class="small"><strong>Cédula / Matrícula:</strong> ${cmp.alumno.cedula || "No registrada"} · ${cmp.alumno.matricula}</p>
    <p class="small"><strong>Representante:</strong> ${cmp.alumno.representante} (${cmp.alumno.telefono})</p>
    <p class="small"><strong>Método:</strong> ${cmp.metodo}</p>
    <p class="small"><strong>Referencia / Observación:</strong> ${cmp.referencia}</p>
    <p class="small"><strong>Tasa BCV aplicada:</strong> Bs. ${cmp.tasa.toFixed(2)} / $</p>
    <hr class="divider" />
    <ul class="recibo-lista">
      ${cmp.conceptos
        .map(
          (c) =>
            `<li>
              <span>${c.nombre} (En revisión)</span><strong>$${c.monto.toFixed(2)} (${formatearBs(c.monto)})</strong>
            </li>`
        )
        .join("")}
    </ul>
    <div class="recibo-totales">
      <div>
        <strong>TOTAL REPORTADO USD:</strong>
        <strong>$${cmp.totalUsd.toFixed(2)}</strong>
      </div>
      <div class="recibo-total-bs">
        <strong>TOTAL REPORTADO BS (BCV):</strong>
        <strong>${cmp.totalBs}</strong>
      </div>
    </div>
    <p class="muted small" style="margin-top:10px;">
      * Envía este comprobante por WhatsApp a Administración y adjunta el capture de pago.
    </p>
  `;

  modal.classList.remove("oculto");
}

function enviarComprobanteWhatsApp() {
  if (!ultimoComprobante) return;
  const c = ultimoComprobante;
  const conceptosTexto = c.conceptos.map((item) => `- ${item.nombre}: $${item.monto.toFixed(2)}`).join("\n");

  const mensaje =
    `*COMPROBANTE DE PAGO (EN REVISIÓN) - U.E.I SAN ANTONIO C.A.*\n` +
    `Comprobante: *${c.codigo}*\n` +
    `Fecha: ${c.fecha}\n` +
    `Alumno: ${c.alumno.nombre}\n` +
    `Cédula: ${c.alumno.cedula || "No registrada"} | Matrícula: ${c.alumno.matricula}\n` +
    `Curso: ${c.alumno.anio}\n` +
    `Representante: ${c.alumno.representante} (${c.alumno.telefono})\n` +
    `Conceptos en revisión:\n${conceptosTexto}\n` +
    `Tasa BCV: Bs. ${c.tasa.toFixed(2)}\n` +
    `Total USD: *$${c.totalUsd.toFixed(2)}*\n` +
    `Total Bs: *${c.totalBs}*\n` +
    `Método: ${c.metodo}\n` +
    `Ref / Obs: ${c.referencia}\n` +
    `_Adjunto capture de pago para revisión y validación._`;

  const url = `https://wa.me/${WHATSAPP_ADMINISTRACION}?text=${encodeURIComponent(mensaje)}`;
  window.open(url, "_blank");
}

function cerrarRecibo() {
  const modal = document.getElementById("modal-recibo");
  if (modal) modal.classList.add("oculto");
}

window.addEventListener("DOMContentLoaded", inicializar);