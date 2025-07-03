// js/reporte_horas_extras.js

$(document).ready(function() {
  // — Helper: convierte cadenas 12h/24h a formato "HH:mm" 24 h —
  function format24(timeStr) {
    if (!timeStr) return '';
    const m = timeStr.match(/(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
    if (!m) return timeStr;
    let h   = parseInt(m[1], 10),
        min = parseInt(m[2], 10),
        ampm = m[3];
    if (ampm) {
      if (/PM/i.test(ampm) && h < 12) h += 12;
      if (/AM/i.test(ampm) && h === 12) h = 0;
    }
    return `${h.toString().padStart(2,'0')}:${min.toString().padStart(2,'0')}`;
  }

  // — Calcula minutos extra según reglas dadas —
  function computeExtraMinutes(startDT, endDT) {
    if (endDT <= startDT) throw new Error('La fecha de fin debe ser posterior a la de inicio');
    const HOR_INI = 8 * 60, HOR_FIN = 18 * 60;
    let totalMin = 0;
    let cursor   = new Date(startDT);

    while (cursor < endDT) {
      const day    = cursor.getDay(),                   // 0=domingo … 6=sábado
            dayEnd = new Date(cursor);
      dayEnd.setHours(24,0,0,0);
      const segmentEnd = endDT < dayEnd ? endDT : dayEnd;

      if (day === 0) {
        // Domingo: todo extra
        totalMin += (segmentEnd - cursor) / 60000;
      } else {
        // Antes de 08:00
        const morEnd = new Date(cursor); morEnd.setHours(8,0,0,0);
        if (cursor < morEnd) {
          const mEnd = segmentEnd < morEnd ? segmentEnd : morEnd;
          totalMin += Math.max(0, (mEnd - cursor) / 60000);
        }
        // Después de 18:00
        const eveStart = new Date(cursor); eveStart.setHours(18,0,0,0);
        if (segmentEnd > eveStart) {
          const eStart = cursor > eveStart ? cursor : eveStart;
          totalMin += Math.max(0, (segmentEnd - eStart) / 60000);
        }
      }

      cursor = segmentEnd;
    }

    return Math.round(totalMin);
  }

  // — Referencias al DOM —
  const $reTec         = $('#re_tec');
  const $reDesde       = $('#re_desde');
  const $reHasta       = $('#re_hasta');
  const $btnAsist      = $('#re_add_asistencia');
  const $btnAct        = $('#re_add_actividad');
  const $btnGen        = $('#btn_generar_reporte_extras');
  const $tablaSelAsist = $('#tablaSelAsistencias tbody');
  const $tablaSelActiv = $('#tablaSelActividades tbody');

  // — DataTables de selección en modales —
  const dtAsistModal = $('#tablaModalAsistencias').DataTable({
    columnDefs: [{ targets: 0, orderable: false }],
    order: [[1, 'asc']]
  });
  const dtActModal = $('#tablaModalActividades').DataTable({
    columnDefs: [{ targets: 0, orderable: false }],
    order: [[1, 'asc']]
  });


// — DataTable final con export y estilo personalizado —
const dtReporte = $('#tablaReporteExtras').DataTable({
  dom: 'Bfrtip',
  buttons: [
    'csv',
    'excel',

    // PDF
    {
      extend: 'pdfHtml5',
      text: 'PDF',
      title: 'Reporte Horas Extras',
      messageTop: function() {
        const tec   = $reTec.find(':selected').text();
        const desde = $reDesde.val();
        const hasta = $reHasta.val();
        return [
          `Técnico: ${tec}`,
          `Periodo: ${desde} – ${hasta}`,
          'Detalle de horas extras'
        ];
      },
      orientation: 'landscape',
      pageSize: 'A4',
      customize: function(doc) {
        // Fuente general de tabla y cuerpo: 10pt
        doc.defaultStyle = doc.defaultStyle || {};
        doc.defaultStyle.fontSize = 10;
        // Título: 22pt, centrado
        doc.styles.title = {
          fontSize: 22,
          alignment: 'center'
        };
        // Subtítulo (messageTop): 18pt, centrado
        doc.styles.messageTop = {
          fontSize: 18,
          margin: [0, 8, 0, 15],
          alignment: 'center'
        };
        // Anchos de columna (suman ≈100%)
        doc.content[1].table.widths = [
          '6%',  // Fecha Ingreso
          '6%',  // Fecha Salida
          '10%', // Lugar
          '10%', // Técnico
          '6%',  // Categoría
          '12%', // Actividad
          '24%', // Detalle Actividad
          '6%',  // Hora Ingreso
          '6%',  // Primera Actividad
          '6%',  // Fin Última Actividad
          '6%',  // Hora Salida
          '6%'   // Total Horas Extras
        ];
        // Alineaciones
        doc.styles.tableHeader.alignment = 'center';
        doc.styles.tableBodyEven.alignment = 'left';
        doc.styles.tableBodyOdd.alignment  = 'left';
      }
    },

    // Imprimir
    {
      extend: 'print',
      text: 'Imprimir',
      title: '',
      messageTop: function() {
        const tec   = $reTec.find(':selected').text();
        const desde = $reDesde.val();
        const hasta = $reHasta.val();
        return `
          <h1>Reporte Horas Extras</h1>
          <div><strong>Técnico:</strong> ${tec}</div>
          <div><strong>Periodo:</strong> ${desde} – ${hasta}</div>
          <h2>Detalle de horas extras</h2>
        `;
      },
      customize: function(win) {
        // Forzar A4 Landscape
        $(win.document.head).append(
          '<style>@page { size: A4 landscape; }</style>'
        );
        // Cuerpo y tabla en 10pt, ancho completo
        $(win.document.body)
          .css('font-size', '10pt')
          .find('table')
            .css({ width: '100%', 'border-collapse': 'collapse' })
            .find('th, td')
              .css({ padding: '4px', 'font-size': '10pt', 'border': '1px solid #ddd' });
        // Título h1 (22pt) y centrado
        $(win.document.body).find('h1')
          .css({ 'font-size': '22pt', 'text-align': 'center', margin: '0 0 10px' });
        // Subtítulo h2 (18pt) y centrado
        $(win.document.body).find('h2')
          .css({ 'font-size': '18pt',  margin: '0 0 15px' });
      }
    }
  ],
  columns: [
    { data: 'fecha_ingreso',        title: 'Fecha Ingreso'         },
    { data: 'fecha_salida',         title: 'Fecha Salida'          },
    { data: 'lugar',                title: 'Lugar'                 },
    { data: 'tecnico',              title: 'Técnico'               },
    { data: 'categoria',            title: 'Categoría'             },
    { data: 'actividad',            title: 'Actividad'             },
    { data: 'detalle',              title: 'Detalle Actividad'     },
    { data: 'hora_ingreso',         title: 'Hora Ingreso'          },
    { data: 'primera_actividad',    title: 'Primera Actividad'     },
    { data: 'fin_ultima_actividad', title: 'Fin Última Actividad'  },
    { data: 'hora_salida',          title: 'Hora Salida'           },
    { data: 'total_extras',         title: 'Total Horas Extras'    }
  ]
});

  // — Instancias de los modales Bootstrap —
  const modalAsist = new bootstrap.Modal($('#modalSelAsistencias'));
  const modalAct   = new bootstrap.Modal($('#modalSelActividades'));

  // — Carga la lista de técnicos en el <select> —
  function loadTecnicos() {
    fetch('/tecnicos')
      .then(res => res.json())
      .then(data => {
        const ops = data.map(t =>
          `<option value="${t.id}">${t.nombre} ${t.apellido}</option>`
        ).join('');
        $reTec.html(`<option value="">— Seleccione —</option>${ops}`);
      })
      .catch(console.error);
  }

  // — Abrir modal Asistencias filtradas —
  $btnAsist.on('click', () => {
    const tec   = $reTec.val(),
          desde = $reDesde.val(),
          hasta = $reHasta.val();
    if (!tec || !desde || !hasta) {
      return alert('Debe seleccionar técnico y rango de fechas.');
    }
    fetch('/asistencias')
      .then(res => res.json())
      .then(data => {
        const rows = data
          .filter(r =>
            r.tecnico_id == tec &&
            r.fecha_ingreso >= desde &&
            r.fecha_ingreso <= hasta
          )
          .map(r => [
            `<input type="checkbox" class="chk-asist" value="${r.id}">`,
            r.id,
            r.fecha_ingreso,
            format24(r.hora_entrada),
            (r.fecha_salida || r.fecha_ingreso),
            format24(r.hora_salida || '')
          ]);
        dtAsistModal.clear().rows.add(rows).draw();
        modalAsist.show();
      })
      .catch(() => alert('Error cargando asistencias'));
  });

  // — Confirmar selección de Asistencias, sin duplicados —
  $('#btnSelAsistConfirm').on('click', () => {
    dtAsistModal.rows().every(function() {
      const $n = $(this.node());
      if (!$n.find('.chk-asist:checked').length) return;
      const d = this.data();
      if ($tablaSelAsist.find(`tr[data-id="${d[1]}"]`).length) return;
      $tablaSelAsist.append(`
        <tr data-id="${d[1]}">
          <td>${ $reTec.find(':selected').text() }</td>
          <td>${ d[2] }</td>
          <td>${ d[3] }</td>
          <td>${ d[4] }</td>
          <td>${ d[5] }</td>
          <td><button class="btn btn-sm btn-danger btn-remove-asist">X</button></td>
        </tr>
      `);
    });
    modalAsist.hide();
  });

  $tablaSelAsist.on('click', '.btn-remove-asist', function() {
    $(this).closest('tr').remove();
  });

  // — Abrir modal Actividades filtradas —
  $btnAct.on('click', () => {
    const tec   = $reTec.val(),
          desde = $reDesde.val(),
          hasta = $reHasta.val();
    if (!tec || !desde || !hasta) {
      return alert('Debe seleccionar técnico y rango de fechas.');
    }
    fetch('/actividades')
      .then(res => res.json())
      .then(data => {
        const rows = data
          .filter(a =>
            a.tecnico_id == tec &&
            a.fecha_inicio >= desde &&
            a.fecha_inicio <= hasta
          )
          .map(a => [
            `<input type="checkbox" class="chk-act" value="${a.id_actividad}">`,
            a.id_actividad,
            a.fecha_inicio,
            a.categoria,
            a.actividad,
            a.detalle_actividad,
            format24(a.hora_inicio),
            format24(a.hora_fin),
            a.zona_trabajo
          ]);
        dtActModal.clear().rows.add(rows).draw();
        modalAct.show();
      })
      .catch(() => alert('Error cargando actividades'));
  });

  // — Confirmar selección de Actividades, sin duplicados —
  $('#btnSelActConfirm').on('click', () => {
    dtActModal.rows().every(function() {
      const $n = $(this.node());
      if (!$n.find('.chk-act:checked').length) return;
      const d = this.data();
      if ($tablaSelActiv.find(`tr[data-id="${d[1]}"]`).length) return;
      $tablaSelActiv.append(`
        <tr data-id="${d[1]}" data-fecha="${d[2]}">
          <td>${ d[2] }</td>
          <td>${ d[3] }</td>
          <td>${ d[4] }</td>
          <td>${ d[5] }</td>
          <td>${ d[6] }</td>
          <td>${ d[7] }</td>
          <td>${ d[8] }</td>
          <td><button class="btn btn-sm btn-danger btn-remove-act">X</button></td>
        </tr>
      `);
    });
    modalAct.hide();
  });

  $tablaSelActiv.on('click', '.btn-remove-act', function() {
    $(this).closest('tr').remove();
  });

  // — Generar Reporte Horas Extras —
  $btnGen.on('click', () => {
    // 1) Asistencias seleccionadas
    const selAsist = [];
    $tablaSelAsist.find('tr').each((_, tr) => {
      const td = $(tr).find('td');
      selAsist.push({
        tecnico       : td.eq(0).text(),
        fecha_ingreso : td.eq(1).text(),
        hora_ingreso  : td.eq(2).text(),
        fecha_salida  : td.eq(3).text(),
        hora_salida   : td.eq(4).text()
      });
    });

    // 2) Actividades seleccionadas
    const selAct = [];
    $tablaSelActiv.find('tr').each((_, tr) => {
      const td = $(tr).find('td');
      selAct.push({
        fecha       : td.eq(0).text(),
        categoria   : td.eq(1).text(),
        actividad   : td.eq(2).text(),
        detalle     : td.eq(3).text(),
        hora_inicio : td.eq(4).text(),
        hora_fin    : td.eq(5).text(),
        zona        : td.eq(6).text()
      });
    });

    // 3) Cruzar y calcular extras
    const reporte = selAsist.map(a => {
      const acts = selAct.filter(x =>
        x.fecha >= a.fecha_ingreso && x.fecha <= a.fecha_salida
      );

      const lugares     = [...new Set(acts.map(x => x.zona))].join(', ')      || '—';
      const categorias  = [...new Set(acts.map(x => x.categoria))].join(', ') || '—';
      const actividades = [...new Set(acts.map(x => x.actividad))].join(', ') || '—';
      const detalles    = [...new Set(acts.map(x => x.detalle))].join(' | ')   || '—';

      // --- Parseo y orden real por fecha+hora ---
function pad(n){ return n.toString().padStart(2,'0'); }

// Array de Date para hora de inicio
const iniDates = acts.map(x =>
  new Date(`${x.fecha}T${x.hora_inicio}`)
);
iniDates.sort((d1, d2) => d1 - d2);
const primeraAct = iniDates.length
  ? `${pad(iniDates[0].getHours())}:${pad(iniDates[0].getMinutes())}`
  : a.hora_ingreso;

// Array de Date para hora de fin
const finDates = acts.map(x =>
  new Date(`${x.fecha}T${x.hora_fin}`)
);
finDates.sort((d1, d2) => d1 - d2);
const finUltimaAct = finDates.length
  ? `${pad(finDates[finDates.length-1].getHours())}:${pad(finDates[finDates.length-1].getMinutes())}`
  : a.hora_salida;


      const startDT = new Date(`${a.fecha_ingreso}T${a.hora_ingreso}`);
      const endDT   = new Date(`${a.fecha_salida}T${a.hora_salida}`);
      let extraMin  = 0;
      try { extraMin = computeExtraMinutes(startDT, endDT); }
      catch(e) { alert('Error en cálculo de extras: ' + e.message); }

      const h = Math.floor(extraMin / 60),
            m = extraMin % 60,
            totalStr = `${h} h ${m} min`;

      return {
        fecha_ingreso        : a.fecha_ingreso,
        fecha_salida         : a.fecha_salida,
        lugar                : lugares,
        tecnico              : a.tecnico,
        categoria            : categorias,
        actividad            : actividades,
        detalle              : detalles,
        hora_ingreso         : a.hora_ingreso,
        primera_actividad    : primeraAct,
        fin_ultima_actividad : finUltimaAct,
        hora_salida          : a.hora_salida,
        total_extras         : totalStr
      };
    });

    // 4) Renderizar en la tabla
    dtReporte.clear().rows.add(reporte).draw();
  });

   // — Inicializar —
  loadTecnicos();
});
