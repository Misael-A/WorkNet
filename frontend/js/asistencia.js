// js/asistencia.js
$(document).ready(function() {

  // —— Util: formatea string de hora a HH:mm (24 h) ——————————————
  function format24(timeStr) {
    if (!timeStr) return '';
    const [h, m = '00'] = timeStr.split(':');
    const hh = h.padStart(2, '0');
    const mm = m.slice(0,2).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  // —— Referencias al DOM ——————————————————————————————————————
  const $selTec      = $('#sel_tecnico');
  const $inpFechaIn  = $('#inp_fecha_ingreso');
  const $inpHoraIn   = $('#inp_hora_ingreso');
  const $inpFechaOut = $('#inp_fecha_salida');
  const $inpHoraOut  = $('#inp_hora_salida');
  const $btnReg      = $('#btn_registrar_asistencia');

  const $fDesde      = $('#filtro_desde');
  const $fHasta      = $('#filtro_hasta');
  const $fTec        = $('#filtro_tecnico');
  const $btnRepo     = $('#btn_reporte');

  // —— Inicializa DataTable ————————————————————————————————
  const table = $('#tablaAsistencias').DataTable({
    columns: [
      { data: 'id' },
      { data: 'tecnico' },
      { data: 'fecha_ingreso' },
      { data: 'hora_entrada' },
      { data: 'fecha_salida' },
      { data: 'hora_salida' },
      {
        data: null,
        orderable: false,
        render: (_, __, row) => `
          <button class="btn btn-sm btn-success btn-salida" data-id="${row.id}">Salida</button>
          <button class="btn btn-sm btn-primary btn-editar" data-id="${row.id}">Editar</button>
          <button class="btn btn-sm btn-danger btn-borrar"  data-id="${row.id}">Eliminar</button>
        `
      }
    ]
  });

  // —— Carga técnicos en selects —————————————————————————————
  function loadTecnicos() {
    fetch('/tecnicos')
      .then(res => {
        if (!res.ok) throw new Error('Error cargando técnicos');
        return res.json();
      })
      .then(data => {
        const options = data
          .map(t => `<option value="${t.id}">${t.nombre} ${t.apellido}</option>`)
          .join('');
        $selTec.html('<option value="">Seleccione…</option>' + options);
        $fTec.html('<option value="">Todos</option>' + options);
      })
      .catch(err => {
        console.error(err);
        alert('No se pudieron cargar los técnicos.');
      });
  }

  // —— Carga asistencias (con manejo de errores) ——————————————
  function loadAsistencias() {
    fetch('/asistencias')
      .then(res => {
        if (!res.ok) throw new Error('Error cargando asistencias');
        return res.json();
      })
      .then(data => {
        const rows = data.map(r => ({
          id             : r.id,
          tecnico        : r.tecnico,
          tecnico_id     : r.tecnico_id,
          fecha_ingreso  : r.fecha_ingreso,
          hora_entrada   : format24(r.hora_entrada),
          fecha_salida   : r.fecha_salida || '',
          hora_salida    : format24(r.hora_salida || '')
        }));
        table.clear().rows.add(rows).draw();
      })
      .catch(err => {
        console.error(err);
        alert('No se pudieron cargar las asistencias.');
      });
  }

  // —— Registrar nueva asistencia ——————————————————————————————
  $btnReg.on('click', () => {
    const tecnico  = $selTec.val();
    const fechaIn  = $inpFechaIn.val();
    const horaIn   = $inpHoraIn.val();
    if (!tecnico || !fechaIn || !horaIn) {
      return alert('Seleccione técnico, fecha y hora de ingreso.');
    }
    const payload = {
      tecnico_id    : tecnico,
      fecha_ingreso : fechaIn,
      hora_entrada  : horaIn
    };
    if ($inpFechaOut.val()) payload.fecha_salida = $inpFechaOut.val();
    if ($inpHoraOut.val())  payload.hora_salida  = $inpHoraOut.val();

    fetch('/asistencias', {
      method:  'POST',
      headers: {'Content-Type':'application/json'},
      body:    JSON.stringify(payload)
    })
    .then(res => {
      if (!res.ok) throw new Error('Error al registrar asistencia');
      return res.json();
    })
    .then(() => {
      $inpFechaIn.val('');
      $inpHoraIn.val('');
      $inpFechaOut.val('');
      $inpHoraOut.val('');
      loadAsistencias();
    })
    .catch(err => {
      console.error(err);
      alert(err.message);
    });
  });

  // —— Botón “Salida” ——————————————————————————————————————
  $('#tablaAsistencias tbody').on('click', '.btn-salida', function() {
    const id   = $(this).data('id');
    const now  = new Date();
    const payload = {
      fecha_salida: now.toISOString().slice(0,10),
      hora_salida : now.getHours().toString().padStart(2,'0')
                  + ':' + now.getMinutes().toString().padStart(2,'0')
    };
    fetch(`/asistencias/${id}`, {
      method:  'PUT',
      headers: {'Content-Type':'application/json'},
      body:    JSON.stringify(payload)
    })
    .then(res => {
      if (!res.ok) throw new Error('Error marcando salida');
      loadAsistencias();
    })
    .catch(err => {
      console.error(err);
      alert('No se pudo marcar la salida.');
    });
  });

  // —— Botón “Eliminar” ————————————————————————————————————
  $('#tablaAsistencias tbody').on('click', '.btn-borrar', function() {
    const id = $(this).data('id');
    if (!confirm('¿Eliminar asistencia?')) return;
    fetch(`/asistencias/${id}`, { method: 'DELETE' })
      .then(res => {
        if (!res.ok) throw new Error('Error eliminando asistencia');
        loadAsistencias();
      })
      .catch(err => {
        console.error(err);
        alert('No se pudo eliminar la asistencia.');
      });
  });

  // —— Modal “Editar” ——————————————————————————————————————
  const modalEditar = new bootstrap.Modal($('#modalEditarAsistencia'));
  $('#tablaAsistencias tbody').on('click', '.btn-editar', function() {
    const row = table.row($(this).closest('tr')).data();
    $('#edit_id').val(row.id);
    $('#edit_tecnico').val(row.tecnico);
    $('#edit_fecha_ingreso').val(row.fecha_ingreso);
    $('#edit_hora_ingreso').val(row.hora_entrada);
    $('#edit_fecha_salida').val(row.fecha_salida);
    $('#edit_hora_salida').val(row.hora_salida);
    modalEditar.show();
  });

  // —— Guardar cambios de edición ————————————————————————————
  $('#formEditarAsistencia').on('submit', function(e) {
    e.preventDefault();
    const id = $('#edit_id').val();
    const payload = {
      fecha_ingreso : $('#edit_fecha_ingreso').val(),
      hora_entrada  : $('#edit_hora_ingreso').val(),
      fecha_salida  : $('#edit_fecha_salida').val(),
      hora_salida   : $('#edit_hora_salida').val()
    };
    fetch(`/asistencias/${id}`, {
      method:  'PUT',
      headers: {'Content-Type':'application/json'},
      body:    JSON.stringify(payload)
    })
    .then(res => {
      if (!res.ok) throw new Error('Error guardando cambios');
      modalEditar.hide();
      loadAsistencias();
    })
    .catch(err => {
      console.error(err);
      alert('No se pudieron guardar los cambios.');
    });
  });

  // —— Generar reporte filtrado ——————————————————————————————
  $btnRepo.on('click', () => {
    const desde = $fDesde.val(),
          hasta = $fHasta.val(),
          tec   = $fTec.val();

    fetch('/asistencias')
      .then(res => {
        if (!res.ok) throw new Error('Error generando reporte');
        return res.json();
      })
      .then(data => {
        const filt = data
          .filter(r =>
            (!desde || r.fecha_ingreso >= desde) &&
            (!hasta || r.fecha_ingreso <= hasta) &&
            (!tec   || r.tecnico_id == tec)
          )
          .map(r => ({
            id             : r.id,
            tecnico        : r.tecnico,
            fecha_ingreso  : r.fecha_ingreso,
            hora_entrada   : format24(r.hora_entrada),
            fecha_salida   : r.fecha_salida || '',
            hora_salida    : format24(r.hora_salida || '')
          }));
        table.clear().rows.add(filt).draw();
      })
      .catch(err => {
        console.error(err);
        alert('No se pudo generar el reporte.');
      });
  });

  // —— Inicialización —————————————————————————————————————————————
  loadTecnicos();
  loadAsistencias();
});
