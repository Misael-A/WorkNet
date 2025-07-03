// js/proyecto_detalle.js
document.addEventListener('DOMContentLoaded', () => {
  // — Configuración dinámica de “Tipo de trabajo” al editar —
  const tiposPorProyecto = {
    Residencial: ['Ampliación', 'Migración', 'Mantenimiento'],
    ISP        : ['Instalación', 'Mantenimiento', 'Avería']
  };

  let projects           = [];
  let tiposTrabajoList   = [];
  let categoriasList     = [];
  let allActivities      = [];
  let currentProjectId   = null;
  const zonasMap         = {};
  const tecnicosMap = {}; 

  // 0) Flatpickr en inputs de fecha (si está disponible)
  if (typeof flatpickr !== 'undefined') {
    flatpickr('#filter_desde',      { dateFormat: 'Y-m-d' });
    flatpickr('#filter_hasta',      { dateFormat: 'Y-m-d' });
    flatpickr('#edit_fecha_inicio', { dateFormat: 'Y-m-d' });
    flatpickr('#edit_fecha_fin',    { dateFormat: 'Y-m-d' });
  }

  // 1) Carga zonas y llena mapa + select de edición
  async function loadZonas() {
    try {
      const res = await fetch('/zonas');
      if (!res.ok) throw new Error(`Zonas: ${res.status}`);
      const zs = await res.json();
      zs.forEach(z => zonasMap[z.id] = z.descripcion);
      const selZona = document.getElementById('edit_zona');
      if (selZona) {
        selZona.innerHTML =
          '<option value="">— Seleccione —</option>' +
          zs.map(z => `<option value="${z.id}">${z.descripcion}</option>`).join('');
      }
    } catch (err) {
      console.error('Error cargando zonas:', err);
    }
  }
    // 1b) Carga todos los técnicos (id → "Nombre Apellido")
  async function loadTecnicos() {
    try {
      const res = await fetch('/tecnicos');
      if (!res.ok) throw new Error(`Técnicos: ${res.status}`);
      const tecs = await res.json();          // [{ id, nombre, apellido }, …]
      tecs.forEach(t => {
        tecnicosMap[t.id] = `${t.nombre} ${t.apellido}`;
      });
    } catch (err) {
      console.error('Error cargando técnicos:', err);
    }
  }


  // 2) Carga tipos de trabajo globales (para el modal “Agregar sub”) 
  async function loadTiposTrabajo() {
    try {
      const res = await fetch('/tipos-trabajo');
      if (!res.ok) throw new Error(`TiposTrabajo: ${res.status}`);
      tiposTrabajoList = await res.json();
    } catch (err) {
      console.error('Error cargando tipos de trabajo:', err);
    }
  }

  // 3) Carga todas las actividades (para filtros en “Agregar sub” y categorías)
  async function loadAllActivities() {
    try {
      const res = await fetch('/actividades');
      if (!res.ok) throw new Error(`Actividades: ${res.status}`);
      allActivities = await res.json();
      categoriasList = Array.from(new Set(allActivities.map(a => a.categoria)));
    } catch (err) {
      console.error('Error cargando actividades:', err);
    }
  }

  // 4) Carga proyectos y sus sub-actividades
  async function loadProjects() {
    try {
      const res = await fetch('/proyectos');
      if (!res.ok) throw new Error(`Proyectos: ${res.status}`);
      const projs = await res.json();
      await Promise.all(projs.map(async p => {
        const r2 = await fetch(`/proyectos/${p.id}/actividades`);
        if (!r2.ok) throw new Error(`ActividadesProyecto ${p.id}: ${r2.status}`);
        p.activities = await r2.json();
      }));
      projects = projs;
    } catch (err) {
      console.error('Error cargando proyectos:', err);
      alert('No se pudieron cargar los proyectos');
    }
  }

  // 5) Filtra actividades localmente según los filtros del modal “Agregar sub”
  function getFilteredActivities() {
    const cat   = document.getElementById('filter_category').value;
    const tipo  = document.getElementById('filter_tipo_trabajo').value;
    const desde = document.getElementById('filter_desde').value;
    const hasta = document.getElementById('filter_hasta').value;
    return allActivities.filter(a => {
      if (cat   && a.categoria    !== cat)   return false;
      if (tipo  && a.tipo_trabajo !== tipo)  return false;
      if (desde && a.fecha_inicio <  desde) return false;
      if (hasta && a.fecha_inicio >  hasta) return false;
      return true;
    });
  }

// 6) Dibuja la tabla principal de proyectos
function renderProjects() {
  const tbody = document.getElementById('projects-tbody');
  tbody.innerHTML = '';

  projects.forEach(p => {
    // Cálculo de progreso basado en estado === 'Realizado'
    const total     = p.activities.length;
    const doneCount = p.activities.filter(a => a.estado === 'Realizado').length;
    const pct       = total ? Math.round(doneCount * 100 / total) : 0;

    // Fila principal
    const tr = document.createElement('tr');

    // Toggle button
    const tdToggle = document.createElement('td');
    tdToggle.className = 'text-center';
    const btnToggle = document.createElement('button');
    btnToggle.className = 'btn btn-outline-primary btn-sm toggle-btn';
    btnToggle.dataset.id = p.id;
    btnToggle.textContent = '+';
    tdToggle.appendChild(btnToggle);
    tr.appendChild(tdToggle);

    // Nombre + código
    const tdName = document.createElement('td');
    tdName.innerHTML = `${p.nombre} <small class="text-muted">(${p.codigo})</small>`;
    tr.appendChild(tdName);

    // Tipo de proyecto
    const tdTipoProj = document.createElement('td');
    tdTipoProj.textContent = p.tipo_proyecto;
    tr.appendChild(tdTipoProj);

    // Responsable
    const tdResp = document.createElement('td');
    tdResp.textContent = p.responsable;
    tr.appendChild(tdResp);

    // Prioridad
    const tdPri = document.createElement('td');
    tdPri.textContent = p.prioridad;
    tr.appendChild(tdPri);

    // Estado
    const tdEst = document.createElement('td');
    tdEst.textContent = p.estado;
    tr.appendChild(tdEst);

    // Progreso (barra dinámica)
    const tdProg = document.createElement('td');
    tdProg.style.minWidth = '8rem';
    const divProg = document.createElement('div');
    divProg.className = 'progress';
    divProg.style.height = '1.5rem';
    const bar = document.createElement('div');
    bar.className = 'progress-bar';
    bar.style.width = `${pct}%`;
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-valuenow', pct);
    bar.setAttribute('aria-valuemin', 0);
    bar.setAttribute('aria-valuemax', 100);
    // Asignar color según porcentaje
    if (pct === 100)           bar.classList.add('bg-success');
    else if (pct > 0 && pct < 100) bar.classList.add('bg-warning');
    else                        bar.classList.add('bg-secondary');
    bar.textContent = `${pct}%`;
    divProg.appendChild(bar);
    tdProg.appendChild(divProg);
    tr.appendChild(tdProg);

    // Acciones
    const tdActions = document.createElement('td');
    tdActions.innerHTML = `
      <button class="btn btn-success btn-sm me-1 add-act"     data-id="${p.id}">➕ Agregar</button>
      <button class="btn btn-info    btn-sm me-1 view-proj"   data-id="${p.id}">👁 Ver</button>
      <button class="btn btn-primary btn-sm me-1 edit-proj"   data-id="${p.id}">✏️ Editar</button>
      <button class="btn btn-danger  btn-sm me-1 delete-proj" data-id="${p.id}">🗑 Eliminar</button>
      <button class="btn btn-outline-secondary btn-sm me-1 export-pdf"   data-id="${p.id}">📥 PDF</button>
      
    `;
    tr.appendChild(tdActions);

    tbody.appendChild(tr);

    // Fila oculta de subactividades
    const subTr = document.createElement('tr');
    subTr.classList.add('subactivities-row');
    subTr.dataset.parentId = p.id;
    const subTd = document.createElement('td');
    subTd.colSpan = 8;
    subTd.innerHTML = `
      <h5 class="mt-3">Subactividades</h5>
      <div class="table-responsive">
        <table class="table table-sm table-bordered mb-0">
          <thead class="table-light">
            <tr>
              <th>Categoría</th><th>Actividad</th><th>Técnico</th><th>Zona</th>
              <th>Estado</th><th>Fecha inicio</th><th>Fecha fin</th><th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${
              p.activities.length
                ? p.activities.map(a => `
                  <tr>
                    <td>${a.categoria}</td>
                    <td>${a.actividad}</td>
                    <td>${a.tecnico || '—'}</td>
                    <td>${a.zona    || '—'}</td>
                    <td>${a.estado}</td>
                    <td>${a.fecha_inicio}</td>
                    <td>${a.fecha_fin}</td>
                    <td>
                      <button class="btn btn-info btn-sm view-act"    data-proj-id="${p.id}" data-act-id="${a.id}">👁</button>
                      <button class="btn btn-primary btn-sm edit-act"  data-proj-id="${p.id}" data-act-id="${a.id}">✏️</button>
                      <button class="btn btn-danger btn-sm remove-act" data-proj-id="${p.id}" data-act-id="${a.id}">➖</button>
                    </td>
                  </tr>`).join('')
                : `<tr><td colspan="8" class="text-center">No hay subactividades.</td></tr>`
            }
          </tbody>
        </table>
      </div>`;
    subTr.appendChild(subTd);
    tbody.appendChild(subTr);
  });

  bindEvents();
}

  // 7) Conecta todos los botones y modales
  function bindEvents() {
    // a) Toggle de sub-actividades
    Array.from(document.querySelectorAll('.toggle-btn')).forEach(btn => {
      btn.addEventListener('click', () => {
        const row = document.querySelector(`.subactivities-row[data-parent-id="${btn.dataset.id}"]`);
        if (row.style.display === 'table-row') {
          row.style.display = 'none'; btn.textContent = '+';
        } else {
          row.style.display = 'table-row'; btn.textContent = '–';
        }
      });
    });

    // b) Abrir modal “➕ Agregar sub-actividades”
    Array.from(document.querySelectorAll('.add-act')).forEach(btn => {
      btn.addEventListener('click', () => {
        currentProjectId = btn.dataset.id;
        document.getElementById('formFilterSub').reset();
        document.querySelector('#tblSubactividadesModal tbody').innerHTML = '';
        updateAddSelectedButton();

        // Rellenar filtros
        document.getElementById('filter_category').innerHTML =
          `<option value="">— Todas —</option>` +
          categoriasList.map(c => `<option value="${c}">${c}</option>`).join('');
        document.getElementById('filter_tipo_trabajo').innerHTML =
          `<option value="">— Todos —</option>` +
          tiposTrabajoList.map(tt => `<option value="${tt.descripcion}">${tt.descripcion}</option>`).join('');

        new bootstrap.Modal(document.getElementById('modalAddSubactividades')).show();
      });
    });

    // c) Botón “🔍 Buscar” en ese modal
    document.getElementById('btnBuscarSub').addEventListener('click', () => {
      const lista = getFilteredActivities();
      populateModalSubactivities(lista);
    });

    // d) Botón “➕ Agregar seleccionadas” con validación de duplicados
    document.getElementById('btnAddSelectedSub').addEventListener('click', async () => {
      const checks = Array.from(document.querySelectorAll('#tblSubactividadesModal .chk-sub:checked'));
      if (!checks.length) return;
      const selIds = checks.map(c => c.dataset.actId);
      // IDs ya asignadas globalmente
      const assigned = new Set(projects.flatMap(p => p.activities.map(a => String(a.id))));
      const dup   = [], toAdd = [];
      selIds.forEach(id => assigned.has(id) ? dup.push(id) : toAdd.push(id));
      if (dup.length) {
        alert(`Ya agregadas (no se duplican): ${dup.join(', ')}`);
      }
      if (!toAdd.length) return;
      try {
        await Promise.all(toAdd.map(id =>
          fetch(`/proyectos/${currentProjectId}/actividades`, {
            method:'POST',
            headers:{ 'Content-Type':'application/json' },
            body: JSON.stringify({ actividad_id: id })
          })
        ));
        alert('Sub-actividades agregadas correctamente');
        bootstrap.Modal.getInstance(document.getElementById('modalAddSubactividades')).hide();
        await init();
      } catch (err) {
        console.error(err);
        alert('Error agregando sub-actividades');
      }
    });

    // e) “👁 Ver proyecto” → modal con detalle
Array.from(document.querySelectorAll('.view-proj')).forEach(btn => {
  btn.addEventListener('click', async () => {
    try {
      const res = await fetch(`/proyectos/${btn.dataset.id}`);
      if (!res.ok) throw new Error(res.statusText);
      const p = await res.json();

      console.log(p);  // <--- Para depurar

      document.getElementById('view_codigo').textContent        = p.codigo;
      document.getElementById('view_nombre').textContent        = p.nombre;
      document.getElementById('view_tipo_proyecto').textContent = p.tipo_proyecto;
      document.getElementById('view_tipo_trabajo').textContent  = p.tipo_trabajo;
      document.getElementById('view_responsable').textContent   = p.responsable;
      document.getElementById('view_fecha_inicio').textContent  = p.fecha_inicio;
      document.getElementById('view_fecha_fin').textContent     = p.fecha_fin;
      document.getElementById('view_prioridad').textContent     = p.prioridad;
      document.getElementById('view_estado').textContent        = p.estado;
      // ← Aquí el cambio:
      document.getElementById('view_zona').textContent          = p.zona || '—';
      document.getElementById('view_latitud').textContent       = p.latitud  || '';
      document.getElementById('view_longitud').textContent      = p.longitud || '';

      new bootstrap.Modal(document.getElementById('modalViewProyecto')).show();
    } catch (err) {
      console.error(err);
      alert('Error cargando detalle de proyecto');
    }
  });
});

    // f) “✏️ Editar proyecto” → modal con formulario
    Array.from(document.querySelectorAll('.edit-proj')).forEach(btn => {
      btn.addEventListener('click', async () => {
        currentProjectId = btn.dataset.id;
        try {
          const res = await fetch(`/proyectos/${currentProjectId}`);
          if (!res.ok) throw new Error(res.statusText);
          const p = await res.json();

          // 1) Rellenar campos básicos
          document.getElementById('edit_id').value            = p.id;
          document.getElementById('edit_codigo').value        = p.codigo;
          document.getElementById('edit_nombre').value        = p.nombre;
          document.getElementById('edit_tipo_proyecto').value = p.tipo_proyecto;

          // 2) Dinámico de tipo de trabajo según tipo de proyecto
          const ttSel = document.getElementById('edit_tipo_trabajo');
          const arr   = tiposPorProyecto[p.tipo_proyecto] || [];
          ttSel.innerHTML = '<option value="">— Seleccione —</option>' +
            arr.map(v => `<option value="${v}">${v}</option>`).join('');
          ttSel.value = p.tipo_trabajo;
          // Listener para cuando el usuario cambie el tipo de proyecto
          document.getElementById('edit_tipo_proyecto').onchange = function() {
            const arr2 = tiposPorProyecto[this.value] || [];
            ttSel.innerHTML = '<option value="">— Seleccione —</option>' +
              arr2.map(v => `<option value="${v}">${v}</option>`).join('');
          };

          // 3) Resto de campos
          document.getElementById('edit_responsable').value   = p.responsable;
          document.getElementById('edit_fecha_inicio').value  = p.fecha_inicio;
          document.getElementById('edit_fecha_fin').value     = p.fecha_fin;
          document.getElementById('edit_prioridad').value     = p.prioridad;
          document.getElementById('edit_estado').value        = p.estado;
          document.getElementById('edit_zona').value          = p.zona_id || '';
          document.getElementById('edit_latitud').value       = p.latitud  || '';
          document.getElementById('edit_longitud').value      = p.longitud || '';

          // 4) Inicializar o actualizar mapa en el modal
          if (!window.editMap) {
            window.editMap = L.map('edit_map').setView(
              p.latitud && p.longitud ? [p.latitud, p.longitud] : [-12.0464, -77.0428],
              p.latitud && p.longitud ? 14 : 12
            );
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '&copy; OpenStreetMap contributors'
            }).addTo(window.editMap);
            window.editMarker = L.marker(
              p.latitud && p.longitud ? [p.latitud, p.longitud] : [-12.0464, -77.0428],
              { draggable: true }
            ).addTo(window.editMap);
            window.editMarker.on('moveend', e => {
              const ll = e.target.getLatLng();
              document.getElementById('edit_latitud').value  = ll.lat.toFixed(6);
              document.getElementById('edit_longitud').value = ll.lng.toFixed(6);
            });
            window.editMap.on('click', e => {
              window.editMarker.setLatLng(e.latlng);
              document.getElementById('edit_latitud').value  = e.latlng.lat.toFixed(6);
              document.getElementById('edit_longitud').value = e.latlng.lng.toFixed(6);
            });
          } else {
            const ll = p.latitud && p.longitud
              ? [p.latitud, p.longitud]
              : window.editMap.getCenter();
            window.editMarker.setLatLng(ll);
            window.editMap.setView(ll, p.latitud && p.longitud ? 14 : 12);
          }

          // 5) Mostrar el modal y forzar redraw del mapa
          const mdl = new bootstrap.Modal(document.getElementById('modalEditProyecto'));
          mdl.show();
          setTimeout(() => window.editMap.invalidateSize(), 300);

        } catch (err) {
          console.error('Error cargando datos para editar:', err);
          alert('Error cargando datos para editar');
        }
      });
    });

    // g) Guardar cambios de edición
    const formEdit = document.getElementById('formEditProyecto');
    if (formEdit) {
      formEdit.addEventListener('submit', async e => {
        e.preventDefault();
        const id = document.getElementById('edit_id').value;
        const payload = {
          nombre        : document.getElementById('edit_nombre').value.trim(),
          tipo_proyecto : document.getElementById('edit_tipo_proyecto').value,
          tipo_trabajo  : document.getElementById('edit_tipo_trabajo').value,
          responsable   : document.getElementById('edit_responsable').value.trim(),
          fecha_inicio  : document.getElementById('edit_fecha_inicio').value,
          fecha_fin     : document.getElementById('edit_fecha_fin').value,
          prioridad     : document.getElementById('edit_prioridad').value,
          estado        : document.getElementById('edit_estado').value,
          zona_id       : +document.getElementById('edit_zona').value   || null,
          latitud       : +document.getElementById('edit_latitud').value || null,
          longitud      : +document.getElementById('edit_longitud').value|| null
        };
        try {
          const r = await fetch(`/proyectos/${id}`, {
            method:'PUT',
            headers:{ 'Content-Type':'application/json' },
            body: JSON.stringify(payload)
          });
          if (!r.ok) throw new Error(r.statusText);
          bootstrap.Modal.getInstance(document.getElementById('modalEditProyecto')).hide();
          await init();
          alert('Proyecto actualizado correctamente');
        } catch (err) {
          console.error('Error guardando cambios:', err);
          alert('Error al guardar cambios');
        }
      });
    }

    // h) (Aquí irían los handlers de eliminar proyecto, exportar, ver/editar/quitar sub-actividades…)
   // — Eliminar proyecto —
Array.from(document.querySelectorAll('.delete-proj')).forEach(btn => {
  btn.addEventListener('click', () => {
    currentProjectId = btn.dataset.id;
    const p = projects.find(x => x.id == currentProjectId);
    document.getElementById('delete_proj_name').textContent =
      p ? `${p.nombre} (${p.codigo})` : '';
    new bootstrap.Modal(document.getElementById('modalDeleteProyecto')).show();
  });
});

document.getElementById('btnConfirmDeleteProyecto').addEventListener('click', async () => {
  try {
    const res = await fetch(`/proyectos/${currentProjectId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Error en servidor');
    // cerrar modal y recargar
    bootstrap.Modal.getInstance(document.getElementById('modalDeleteProyecto')).hide();
    await init();
    alert('Proyecto eliminado correctamente');
  } catch (err) {
    console.error('Eliminar proyecto:', err);
    alert('Error eliminando proyecto');
  }
});

// — Exportar PDF —
Array.from(document.querySelectorAll('.export-pdf')).forEach(btn => {
  btn.addEventListener('click', () => {
    const id = btn.dataset.id;
    window.open(`/proyectos/${id}/export/pdf`, '_blank');
  });
});

  //  (e) “👁 Ver subactividad”
  Array.from(document.querySelectorAll('.view-act')).forEach(btn => {
    btn.addEventListener('click', () => {
      const actId = btn.dataset.actId;
      // busca en allActivities
      const act = allActivities.find(a => (a.id || a.id_actividad) === actId);
      if (!act) return alert('No se encontró la actividad');
      const ul = document.getElementById('viewAct_list');
      ul.innerHTML = `
        <li class="list-group-item"><strong>Categoría:</strong> ${act.categoria}</li>
        <li class="list-group-item"><strong>Actividad:</strong> ${act.actividad}</li>
        <li class="list-group-item"><strong>Técnico:</strong> ${act.tecnico || '—'}</li>
        <li class="list-group-item"><strong>Zona:</strong> ${act.zona_trabajo || act.zona || '—'}</li>
        <li class="list-group-item"><strong>Estado:</strong> ${act.estado}</li>
        <li class="list-group-item"><strong>Fecha inicio:</strong> ${act.fecha_inicio}</li>
        <li class="list-group-item"><strong>Fecha fin:</strong> ${act.fecha_fin}</li>
        <li class="list-group-item"><strong>Hora inicio:</strong> ${act.hora_inicio || '—'}</li>
        <li class="list-group-item"><strong>Hora fin:</strong> ${act.hora_fin || '—'}</li>
        <li class="list-group-item"><strong>Detalle:</strong> ${act.detalle_actividad || '—'}</li>
        <li class="list-group-item"><strong>Observaciones:</strong> ${act.observaciones || '—'}</li>
        <li class="list-group-item"><strong>Coordenadas:</strong> ${act.coordenadas || '—'}</li>
        <li class="list-group-item"><strong>Fibra solicitada:</strong> ${act.fibra_solicitada || '—'}</li>
        <li class="list-group-item"><strong>Fibra utilizada:</strong> ${act.fibra_utilizada || '—'}</li>
        <li class="list-group-item"><strong>Mensaje:</strong> ${act.mensaje_generado || '—'}</li>
      `;
      new bootstrap.Modal(document.getElementById('modalViewActividad')).show();
    });
  });

  //  (f) “✏️ Editar estado de subactividad”
  Array.from(document.querySelectorAll('.edit-act')).forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('edit_act_projId').value = btn.dataset.projId;
      document.getElementById('edit_act_id').value     = btn.dataset.actId;
      // preselecciona el estado actual
      const fila = btn.closest('tr');
      const estadoActual = fila.children[4].textContent.trim();
      document.getElementById('edit_act_estado').value = estadoActual;
      new bootstrap.Modal(document.getElementById('modalEditActividad')).show();
    });
  });

  // cuando envías el formulario de cambio de estado:
  document.getElementById('formEditActividad').addEventListener('submit', async e => {
    e.preventDefault();
    const projId = document.getElementById('edit_act_projId').value;
    const actId  = document.getElementById('edit_act_id').value;
    const nuevo  = document.getElementById('edit_act_estado').value;
    try {
      // enviamos como form-urlencoded para que el backend lo lea en request.form
      await fetch(`/actividades/${actId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ estado: nuevo }).toString()
      });
      // cierra modal y refresca la tabla
      bootstrap.Modal.getInstance(document.getElementById('modalEditActividad')).hide();
      await init(); 
      alert('Estado actualizado correctamente');
    } catch (err) {
      console.error(err);
      alert('Error actualizando estado');
    }
  });

  //  (g) “➖ Quitar subactividad del proyecto”
  Array.from(document.querySelectorAll('.remove-act')).forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('¿Quitar esta sub-actividad del proyecto?')) return;
      const projId = btn.dataset.projId;
      const actId  = btn.dataset.actId;
      try {
        const res = await fetch(`/proyectos/${projId}/actividades/${actId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error(res.statusText);
        // ocultar la fila en UI sin recargar todo
        btn.closest('tr').remove();
        // opcional: recalcular progreso
        await init();
      } catch (err) {
        console.error(err);
        alert('Error quitando sub-actividad');
      }
    });
  });

}

 // 8) Llena la tabla del modal “Agregar sub-actividades”
function populateModalSubactivities(list) {
  const tbody = document.querySelector('#tblSubactividadesModal tbody');
  tbody.innerHTML = '';
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center">No hay resultados.</td></tr>';
    return updateAddSelectedButton();
  }
  list.forEach(a => {
    const id      = a.id || a.id_actividad || a.idActividad;
    const tecName = tecnicosMap[a.tecnico_id]       || '';
    const zonaName= zonasMap[a.zona_trabajo_id]     || '';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="checkbox" class="chk-sub" data-act-id="${id}"></td>
      <td>${a.actividad}</td>
      <td>${tecName}</td>
      <td>${zonaName}</td>
      <td>${a.estado}</td>
      <td>${a.fecha_inicio}</td>
      <td>${a.fecha_fin}</td>
    `;
    tbody.appendChild(tr);
  });
  Array.from(document.querySelectorAll('#tblSubactividadesModal .chk-sub'))
    .forEach(chk => chk.addEventListener('change', updateAddSelectedButton));
  updateAddSelectedButton();
}


  // 9) Activa/desactiva botón “Agregar seleccionadas”
  function updateAddSelectedButton() {
    const any = !!document.querySelector('#tblSubactividadesModal .chk-sub:checked');
    document.getElementById('btnAddSelectedSub').disabled = !any;
  }

  // 10) Inicialización
  async function init() {
    await loadZonas();
    await loadTecnicos();
    await loadTiposTrabajo();
    await loadAllActivities();
    await loadProjects();
    renderProjects();
  }


  init();
});
