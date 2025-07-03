// main_reportes.js
$(function(){
  const tipoVista = $('body').data('tipo') || 'fusion'; // 'fusion' o 'tendido'

  // 1) Cargar selects de Técnico y Zona
  function cargarSelect(url, $sel){
    $.get(url, items => {
      items.forEach(i => {
        $('<option>')
          .val(i.id)
          .text(i.descripcion || `${i.nombre} ${i.apellido}`)
          .appendTo($sel);
      });
    });
  }
  cargarSelect('/tecnicos', $('#filtro_tecnico'));
  cargarSelect('/zonas',    $('#filtro_zona'));

  // 2) Flatpickr en los inputs de fecha
  flatpickr('#fecha_desde', { dateFormat:'Y-m-d' });
  flatpickr('#fecha_hasta', { dateFormat:'Y-m-d' });

  // 3) Definir columnas según vista
  const colsFusion = [
    {data:'id_actividad'},{data:'actividad'},{data:'tecnico'},{data:'zona_trabajo'},
    {data:'tipo_trabajo'},{data:'estado'},{data:'fecha_inicio'},{data:'hora_inicio'},
    {data:'fecha_fin'},{data:'hora_fin'},{data:'coordenadas'},
    {data:'detalle_actividad'},{data:'observaciones'},{data:'mensaje_generado'}
  ];
  const colsTendido = [
    ...colsFusion.slice(0,10),    // hasta hora_fin
    {data:'fibra_solicitada'},
    {data:'fibra_utilizada'},
    ...colsFusion.slice(10)       // coordenadas en adelante
  ];
  const columns = tipoVista === 'tendido' ? colsTendido : colsFusion;

  // 4) Inicializar DataTable principal
  const table = $('#tablaReportes').DataTable({
    dom: 'rt',
    columns,
    buttons: [
      {
        extend: 'colvis',
        text:    '<i class="fas fa-list-ul"></i> Columnas',
        className:'btn btn-secondary',
        postfixButtons: ['colvisRestore']
      },
      {
        extend: 'print',
        text:   '<i class="fas fa-print"></i> Imprimir',
        className:'btn btn-secondary',
        exportOptions:{ columns:':visible' }
      },
      {
        extend: 'csvHtml5',
        text: '<i class="far fa-file-csv"></i> CSV',
        className:'btn btn-secondary',
        exportOptions:{ columns:':visible' }
      },
      {
        extend: 'excelHtml5',
        text: '<i class="far fa-file-excel"></i> Excel',
        className:'btn btn-secondary',
        exportOptions:{ columns:':visible' }
      },
      {
        extend: 'pdfHtml5',
        text: '<i class="far fa-file-pdf"></i> PDF',
        className:'btn btn-secondary',
        exportOptions:{ columns:':visible' }
      }
    ]
  });
  table.buttons().container().appendTo('#buttonsContainer');

  // 5) Función de recarga con filtros
  function recargar(filtros){
    $.get('/actividades', data => {
      // 5.1) Filtrar por tipo
      let arr = data.filter(a => {
        const isT = /tendido/i.test(a.actividad) || /tendido/i.test(a.tipo_trabajo);
        return tipoVista==='tendido' ? isT : !isT;
      });
      // 5.2) Aplicar filtros comunes
      arr = arr.filter(a => {
        if(filtros.estado    && a.estado            !== filtros.estado)      return false;
        if(filtros.tecnico   && a.tecnico_id        != filtros.tecnico)     return false;
        if(filtros.zona      && a.zona_trabajo_id   != filtros.zona)        return false;
        if(filtros.desde     && a.fecha_inicio      <  filtros.desde)       return false;
        if(filtros.hasta     && a.fecha_inicio      >  filtros.hasta)       return false;
        if(filtros.horadesde && a.hora_inicio       <  filtros.horadesde)  return false;
        if(filtros.horahasta && a.hora_inicio       >  filtros.horahasta)  return false;
        return true;
      });
      table.clear().rows.add(arr).draw();
    });
  }

  // 6) Botón Resumen
  $('#btn_resumen').on('click', () => {
    const filtros = {
      desde:      $('#fecha_desde').val(),
      hasta:      $('#fecha_hasta').val(),
      horadesde:  $('#hora_desde').val(),
      horahasta:  $('#hora_hasta').val(),
      tecnico:    $('#filtro_tecnico').val(),
      zona:       $('#filtro_zona').val(),
      estado:     $('#filtro_estado').val()
    };
    recargar(filtros);
  });

  // 7) Al cargar la página
  recargar({});

  // 8) === REPORTE RÁPIDO ===
  $('#btn_reporte_rapido').on('click', () => {
    const desde = $('#fecha_desde').val();
    const hasta = $('#fecha_hasta').val();
    if (!desde || !hasta) {
      return alert('Debe seleccionar Fecha Desde y Fecha Hasta.');
    }
    // obtengo todas las actividades
    $.get('/actividades', data => {
      // filtro sólo Fusión o Tendido según tipoVista
      let arr = data.filter(a => {
        const isT = /tendido/i.test(a.actividad) || /tendido/i.test(a.tipo_trabajo);
        return tipoVista==='tendido' ? isT : !isT;
      });
      // filtro sólo “Realizado” y rango de fechas
      arr = arr.filter(a =>
        a.estado === 'Realizado' &&
        a.fecha_inicio >= desde &&
        a.fecha_inicio <= hasta
      );
      // agrupo por técnico+fecha
      const grupos = {};
      arr.forEach(a => {
        const key = `${a.tecnico}|${a.fecha_inicio}`;
        if (!grupos[key]) {
          grupos[key] = {
            tecnico:     a.tecnico,
            fecha:       a.fecha_inicio,
            inicio:      a.hora_inicio,
            fin:         a.hora_fin,
            actividades: new Set(),
            zonas:       new Set()
          };
        }
        const g = grupos[key];
        if (a.hora_inicio < g.inicio) g.inicio = a.hora_inicio;
        if (a.hora_fin    > g.fin   ) g.fin    = a.hora_fin;
        g.actividades.add(a.actividad);
        g.zonas.add(a.zona_trabajo);
      });
      // preparo array para DataTable
      const rows = Object.values(grupos).map(g => ({
        tecnico:      g.tecnico,
        fecha:        g.fecha,
        inicio:       g.inicio,
        fin:          g.fin,
        actividades:  Array.from(g.actividades).join(', '),
        zonas:        Array.from(g.zonas).join(', ')
      }));
      // inicializo o recargo la tabla del modal
      if ($.fn.DataTable.isDataTable('#tablaReporteRapido')) {
        const dt = $('#tablaReporteRapido').DataTable();
        dt.clear().rows.add(rows).draw();
      } else {
        $('#tablaReporteRapido').DataTable({
          data:     rows,
          columns: [
            { data: 'tecnico'      },
            { data: 'fecha'        },
            { data: 'inicio'       },
            { data: 'fin'          },
            { data: 'actividades'  },
            { data: 'zonas'        }
          ],
          dom: 'Bfrtp',
          buttons: [
            { extend:'print',      text:'<i class="fas fa-print"></i> Imprimir' },
            { extend:'csvHtml5',   text:'<i class="far fa-file-csv"></i> CSV',    exportOptions:{columns:':visible'} },
            { extend:'excelHtml5', text:'<i class="far fa-file-excel"></i> Excel',exportOptions:{columns:':visible'} }
          ]
        });
      }
      // muestro el modal
      new bootstrap.Modal($('#modalReporteRapido')).show();
    });
  });
    // Para cada título de grupo, añade listener de click
  document.querySelectorAll('.menu-group-title').forEach(function(title) {
    title.addEventListener('click', function() {
      // Alterna clase 'open' en el LI contenedor
      this.parentElement.classList.toggle('open');
    });
  });
});
