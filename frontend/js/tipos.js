// js/tipos.js
$(function() {
  // 1) Inicializa DataTable (oculta la columna ID)
  const tabla = $('#tablaTipos').DataTable({
    columnDefs: [{ targets: 0, visible: false }]
  });

  // 2) Función para cargar y pintar los tipos de trabajo
  async function loadTipos() {
    try {
      const res  = await fetch('/tipos-trabajo');
      if (!res.ok) throw new Error(res.statusText);
      const data = await res.json();
      tabla.clear();
      data.forEach(t => {
        tabla.row.add([
          t.id,
          t.descripcion,
          // botones con clases para event delegation
          `<button class="btn btn-sm btn-warning me-1 edit-tipo"
                   data-id="${t.id}"
                   data-desc="${t.descripcion}">
             ✏️
           </button>
           <button class="btn btn-sm btn-danger delete-tipo"
                   data-id="${t.id}">
             🗑️
           </button>`
        ]);
      });
      tabla.draw();
    } catch (err) {
      console.error('Error cargando tipos:', err);
      alert('No se pudo cargar la lista de tipos de trabajo.');
    }
  }
  loadTipos();

  // 3) Guardar nuevo tipo o actualizar existente
  $('#guardarTipo').click(async () => {
    const id   = $('#idTipo').val();
    const desc = $('#nombreTipo').val().trim();
    const url    = id ? `/tipos-trabajo/${id}` : '/tipos-trabajo';
    const method = id ? 'PUT'             : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descripcion: desc })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.msg || res.statusText);
      }
      // Cerrar modal y recargar tabla
      $('#formTipo')[0].reset();
      bootstrap.Modal.getInstance(document.getElementById('modalTipo')).hide();
      loadTipos();
    } catch (err) {
      console.error('Error guardando tipo:', err);
      alert(err.message);
    }
  });

  // 4) Abrir modal en modo edición (event delegation)
  $('body').on('click', '.edit-tipo', function() {
    const btn  = $(this);
    $('#idTipo').val(btn.data('id'));
    $('#nombreTipo').val(btn.data('desc'));
    new bootstrap.Modal(document.getElementById('modalTipo')).show();
  });

  // 5) Eliminar tipo (event delegation)
  $('body').on('click', '.delete-tipo', async function() {
    const id = $(this).data('id');
    if (!confirm('¿Eliminar este tipo de trabajo?')) return;
    try {
      const res = await fetch(`/tipos-trabajo/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(res.statusText);
      loadTipos();
    } catch (err) {
      console.error('Error eliminando tipo:', err);
      alert('No se pudo eliminar el tipo de trabajo.');
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
