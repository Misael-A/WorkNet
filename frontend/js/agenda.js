document.addEventListener('DOMContentLoaded', function() {
  // Referencias
  const calendarEl = document.getElementById('calendar');
  const modalRec   = new bootstrap.Modal(document.getElementById('modalRecordatorio'));
  const modalAct   = new bootstrap.Modal(document.getElementById('modalActividadDetalle'));
  const formRec    = document.getElementById('formRecordatorio');
  const detalleTit = document.getElementById('detalleTitulo');
  const detalleCon = document.getElementById('detalleContenido');

  // 1) Carga y conversión de eventos
  async function fetchEvents(fetchInfo, successCallback, failureCallback) {
    try {
      let data    = await (await fetch('/actividades')).json();
      const recs  = await (await fetch('/recordatorios')).json();

      // Actividades pendientes/inconclusas
      const evActs = data
        .filter(a => a.estado !== 'Realizado')
        .map(a => ({
          id: a.id_actividad,
          title: a.actividad,
          start: `${a.fecha_inicio}T${a.hora_inicio}`,
          end:   `${a.fecha_fin}T${a.hora_fin}`,
          color: '#0d6efd',
          extendedProps: {
            estado:          a.estado,
            tecnico:         a.tecnico,
            tipo_trabajo:    a.tipo_trabajo,
            zona:            a.zona_trabajo,
            coordenadas:     a.coordenadas,
            detalle:         a.detalle_actividad,
            observaciones:   a.observaciones,
            mensaje:         a.mensaje_generado
          }
        }));

      // Recordatorios
      const evRecs = recs.map(r => ({
        id:  `rec-${r.id}`,
        title: r.titulo,
        start: r.fecha + (r.hora?`T${r.hora}`:""),
        allDay: !r.hora,
        color: '#dc3545'
      }));

      successCallback([...evActs, ...evRecs]);
    } catch(err) {
      console.error(err);
      failureCallback(err);
    }
  }

  // 2) Inicializa FullCalendar
  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    events: fetchEvents,
    selectable: true,
    select: info => {
      // abrir modal de recordatorio…
      document.getElementById('rec_fecha').value = info.startStr;
      document.getElementById('rec_hora').value  = info.startStr.slice(11,16) || "";
      formRec.reset();
      modalRec.show();
    },
    eventClick: info => {
      const e = info.event;
      const p = e.extendedProps;
      // Título
      detalleTit.textContent = e.title;
      // Contenido
      detalleCon.innerHTML = `
        <div class="col-12"><strong>Estado:</strong> ${p.estado}</div>
        <div class="col-6"><strong>Técnico:</strong> ${p.tecnico}</div>
        <div class="col-6"><strong>Tipo:</strong> ${p.tipo_trabajo}</div>
        <div class="col-6"><strong>Zona:</strong> ${p.zona}</div>
        <div class="col-6"><strong>Coordenadas:</strong> ${p.coordenadas}</div>
        <div class="col-6"><strong>Inicio:</strong> ${e.start.toLocaleString()}</div>
        <div class="col-6"><strong>Fin:</strong> ${e.end.toLocaleString()}</div>
        <div class="col-12"><strong>Detalle:</strong> ${p.detalle}</div>
        <div class="col-12"><strong>Observaciones:</strong> ${p.observaciones}</div>
        <div class="col-12"><strong>Mensaje:</strong><pre>${p.mensaje}</pre></div>
      `;
      modalAct.show();
    }
  });

  calendar.render();

  // 3) Guardar recordatorio…
  formRec.addEventListener('submit', async e => {
    e.preventDefault();
    const payload = {
      titulo:      document.getElementById('rec_titulo').value.trim(),
      descripcion: document.getElementById('rec_descripcion').value.trim(),
      fecha:       document.getElementById('rec_fecha').value,
      hora:        document.getElementById('rec_hora').value
    };
    const res = await fetch('/recordatorios',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    if(res.ok){
      modalRec.hide();
      calendar.refetchEvents();
    } else {
      alert((await res.json()).msg || 'Error al guardar');
    }
  });
    // Para cada título de grupo, añade listener de click
  document.querySelectorAll('.menu-group-title').forEach(function(title) {
    title.addEventListener('click', function() {
      // Alterna clase 'open' en el LI contenedor
      this.parentElement.classList.toggle('open');
    });
  });
});
