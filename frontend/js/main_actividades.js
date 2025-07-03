// js/main_actividades.js

$(document).ready(function () {
  // ----------------------------------------------------
  // 0. Opciones comunes para DataTables + botón estático de Columnas
  // ----------------------------------------------------
  const commonOpts = {
    dom: 'Bfrtip',  // B = botones, f = filtro, r = processing, t = tabla, i = info, p = paginación
    buttons: [
      { extend: 'colvis', text: 'Columnas' }  // solo visibilidad de columnas
    ],
    language: {
      url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json'
    },
    lengthMenu: [[10, 25, 50, -1], [10, 25, 50, 'Todos']]
  };

  // ----------------------------------------------------
  // 1. Inicializa DataTables ocultando columna ID,
  //    ordenando por ID descendente y moviendo los botones
  // ----------------------------------------------------
  const tablaFusion = $('#tablaFusion').DataTable($.extend(true, {}, commonOpts, {
    order: [[0, 'desc']],
    columnDefs: [{ targets: 0, visible: false }]
  }));
  tablaFusion.buttons().container().appendTo('#buttonsFusion');

  const tablaTendido = $('#tablaTendido').DataTable($.extend(true, {}, commonOpts, {
    order: [[0, 'desc']],
    columnDefs: [{ targets: 0, visible: false }]
  }));
  tablaTendido.buttons().container().appendTo('#buttonsTendido');

  // ----------------------------------------------------
  // 2. Variables de estado
  // ----------------------------------------------------
  let actividades = [];
  let fotosEliminar = [];

  // ----------------------------------------------------
  // 3. Carga de datos y renderizado de tablas
  // ----------------------------------------------------
  function cargarDatos() {
    $.get('/actividades', data => {
      actividades = data;
      tablaFusion.clear();
      tablaTendido.clear();

      data.forEach(act => {
        const cat = (act.categoria || '').toLowerCase();
        const tipo = cat === 'tendido' ? 'Tendido' : 'Fusión';
        const acciones = `
          <button class="btn btn-sm btn-info editar"   data-id="${act.id_actividad}">Editar</button>
          <button class="btn btn-sm btn-danger eliminar" data-id="${act.id_actividad}">Eliminar</button>
        `;
        const filaBase = [
          act.id_actividad,
          tipo,
          act.actividad,
          act.tecnico,
          act.zona_trabajo,
          act.tipo_trabajo,
          act.estado,
          act.fecha_inicio,
          act.hora_inicio,
          act.fecha_fin,
          act.hora_fin,
          act.coordenadas,
          act.detalle_actividad,
          act.observaciones,
          act.mensaje_generado,
          act.fotos.join(', '),
          acciones
        ];

        if (cat === 'tendido') {
          tablaTendido.row.add([
            filaBase[0], filaBase[1], filaBase[2], filaBase[3], filaBase[4], filaBase[5],
            filaBase[6], filaBase[7], filaBase[8],
            act.fibra_solicitada, act.fibra_utilizada,
            filaBase[9], filaBase[10], filaBase[11], filaBase[12],
            filaBase[13], filaBase[14], filaBase[15], filaBase[16]
          ]);
        } else {
          tablaFusion.row.add(filaBase);
        }
      });

      tablaFusion.draw();
      tablaTendido.draw();
    });
  }

  // ----------------------------------------------------
  // 4. Carga los selects del modal con datos del backend
  // ----------------------------------------------------
  function cargarOpcionesModal(act) {
    const selectores = {
      '/tecnicos':      { id: '#modal_tecnico', texto: t => `${t.nombre} ${t.apellido}`, valor: 'id', actual: act.tecnico_id },
      '/zonas':         { id: '#modal_zona',    texto: z => z.descripcion,          valor: 'id', actual: act.zona_trabajo_id },
      '/tipos-trabajo': { id: '#modal_tipo',    texto: t => t.descripcion,          valor: 'id', actual: act.tipo_trabajo_id }
    };
    Object.entries(selectores).forEach(([url, cfg]) => {
      $.get(url, items => {
        const $sel = $(cfg.id).empty();
        items.forEach(item => {
          const opt = $('<option>', { value: item[cfg.valor], text: cfg.texto(item) });
          if (item[cfg.valor] === cfg.actual) opt.prop('selected', true);
          $sel.append(opt);
        });
      });
    });
  }

  // ----------------------------------------------------
  // 5. Llena y muestra el modal de detalle/edición
  // ----------------------------------------------------
  function abrirModal(act) {
    fotosEliminar = [];

    // Mostrar u ocultar grupo de fibra
    $('#grupo_fibra').toggle((act.categoria || '').toLowerCase() === 'tendido');

    cargarOpcionesModal(act);

    // Rellenar campos
    $('#modal_id').val(act.id_actividad);
    $('#modal_actividad').val(act.actividad);
    $('#modal_estado').val(act.estado);
    $('#modal_fecha_inicio').val(act.fecha_inicio);
    $('#modal_hora_inicio').val(act.hora_inicio);
    $('#modal_fecha_fin').val(act.fecha_fin);
    $('#modal_hora_fin').val(act.hora_fin);
    $('#modal_coordenadas').val(act.coordenadas);
    $('#modal_detalle').val(act.detalle_actividad);
    $('#modal_observaciones').val(act.observaciones);
    $('#modal_fibra_solicitada').val(act.fibra_solicitada);
    $('#modal_fibra_utilizada').val(act.fibra_utilizada);
    $('#modal_mensaje').text(act.mensaje_generado);

    // Fotos existentes
    $('#modal_imagenes').empty();
    (act.fotos || []).forEach(fn => {
      $('#modal_imagenes').append(`
        <div class="foto-wrapper position-relative m-2 d-inline-block">
          <img src="/uploads/${fn}" width="100" class="border rounded" />
          <button class="btn btn-sm btn-danger eliminar-foto position-absolute top-0 end-0"
                  data-filename="${fn}">×</button>
        </div>`);
    });

    $('#modal_fotos').val('');
    $('#btnGuardar').hide();
    $('#btnEditar').show();
    $('#formActividad').find('input,textarea,select').prop('disabled', true);
    $('#modal_fotos').prop('disabled', true);

    $('#modalActividad').modal('show');
  }

  // ----------------------------------------------------
  // 6. Event handlers
  // ----------------------------------------------------

  // a) Click en fila → edita, salvo que el click venga de un botón
  $('#tablaFusion tbody, #tablaTendido tbody').on('click', 'tr', function (e) {
    if ($(e.target).closest('button').length) return;  // ignora clicks en botones
    const table = $(this).closest('table').is('#tablaFusion') ? tablaFusion : tablaTendido;
    const data = table.row(this).data();
    if (!data) return;
    const act = actividades.find(a => a.id_actividad === data[0]);
    if (act) abrirModal(act);
  });

  // b) Botón Editar
  $('body').on('click', '.editar', function (e) {
    e.stopPropagation();
    const id = $(this).data('id');
    const act = actividades.find(a => a.id_actividad === id);
    if (act) abrirModal(act);
  });

  // c) Botón Eliminar
  $('body').on('click', '.eliminar', function (e) {
    e.stopPropagation();
    const id = $(this).data('id');
    if (confirm('¿Seguro eliminar esta actividad?')) {
      $.ajax({
        url: `/actividades/${id}`,
        type: 'DELETE',
        success: cargarDatos,
        error: () => alert('Error eliminando actividad')
      });
    }
  });

  // d) Habilitar edición en modal
  $('#btnEditar').click(() => {
    $('#formActividad').find('input,textarea,select').prop('disabled', false);
    $('#modal_fotos').prop('disabled', false);
    $('#btnEditar').hide();
    $('#btnGuardar').show();
  });

  // e) Marcar fotos para eliminar
  $('body').on('click', '.eliminar-foto', function () {
    fotosEliminar.push($(this).data('filename'));
    $(this).parent().remove();
  });

  // f) Guardar cambios
  $('#btnGuardar').click(() => {
    const id = $('#modal_id').val();
    const formData = new FormData();
    const campos = [
      'actividad', 'tecnico', 'zona', 'tipo', 'estado',
      'fecha_inicio', 'hora_inicio', 'fecha_fin', 'hora_fin',
      'coordenadas', 'detalle', 'observaciones',
      'fibra_solicitada', 'fibra_utilizada'
    ];
    const fieldMap = {
      tecnico: 'tecnico',
      zona: 'zona_trabajo',
      tipo: 'tipo_trabajo',
      detalle: 'detalle_actividad'
    };
    campos.forEach(f => {
      const key = fieldMap[f] || f;
      formData.append(key, $(`#modal_${f}`).val());
    });
    fotosEliminar.forEach(fn => formData.append('fotos_eliminar', fn));
    Array.from($('#modal_fotos')[0].files).forEach(f => formData.append('fotos', f));

    $.ajax({
      url: `/actividades/${id}`,
      type: 'PUT',
      data: formData,
      processData: false,
      contentType: false,
      success: () => {
        $('#modalActividad').modal('hide');
        cargarDatos();
      },
      error: () => alert('Error al actualizar actividad')
    });
  });

  // g) Limpiar al cerrar el modal
  $('#modalActividad').on('hidden.bs.modal', () => {
    fotosEliminar = [];
    $('#formActividad')[0].reset();
  });

  // h) Toggle de submenús en sidebar
  document.querySelectorAll('.menu-group-title').forEach(title => {
    title.addEventListener('click', () => {
      title.parentElement.classList.toggle('open');
    });
  });

  // ----------------------------------------------------
  // 7. Iniciar carga de datos
  // ----------------------------------------------------
  cargarDatos();
});
