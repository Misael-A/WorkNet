// js/zonas.js
$(function() {
  // Inicializa DataTable (oculta columna ID)
  const tabla = $('#tablaZonas').DataTable({
    columnDefs: [{ targets: 0, visible: false }]
  });

  // 1) Carga y dibuja las zonas
  async function loadZonas() {
    try {
      const res  = await fetch('/zonas');
      if (!res.ok) throw new Error(res.statusText);
      const data = await res.json();
      tabla.clear();
      data.forEach(z => {
        tabla.row.add([
          z.id,
          z.descripcion,
          // botones con clases para event delegation
          `<button class="btn btn-sm btn-warning me-1 edit-zona"
                   data-id="${z.id}"
                   data-desc="${z.descripcion}">
             ✏️
           </button>
           <button class="btn btn-sm btn-danger delete-zona"
                   data-id="${z.id}">
             🗑️
           </button>`
        ]);
      });
      tabla.draw();
    } catch (err) {
      console.error('Error cargando zonas:', err);
      alert('No se pudo cargar la lista de zonas.');
    }
  }
  loadZonas();

  // 2) Guardar nueva zona o editar existente
  $('#guardarZona').click(async () => {
    const id   = $('#idZona').val();
    const desc = $('#nombreZona').val().trim();
    const url    = id ? `/zonas/${id}` : '/zonas';
    const method = id ? 'PUT'          : 'POST';

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
      // cerrar modal
      $('#formZona')[0].reset();
      const modalEl = document.getElementById('modalZona');
      bootstrap.Modal.getInstance(modalEl).hide();
      loadZonas();
    } catch (err) {
      console.error('Error guardando zona:', err);
      alert(err.message);
    }
  });

  // 3) Delegated listener para editar zona
  $('body').on('click', '.edit-zona', function() {
    const btn = $(this);
    $('#idZona').val(btn.data('id'));
    $('#nombreZona').val(btn.data('desc'));
    const modalEl = document.getElementById('modalZona');
    new bootstrap.Modal(modalEl).show();
  });

  // 4) Delegated listener para eliminar zona
  $('body').on('click', '.delete-zona', async function() {
    const id = $(this).data('id');
    if (!confirm('¿Eliminar esta zona?')) return;
    try {
      const res = await fetch(`/zonas/${id}`, { method:'DELETE' });
      if (!res.ok) throw new Error(res.statusText);
      loadZonas();
    } catch (err) {
      console.error('Error borrando zona:', err);
      alert('No se pudo eliminar la zona.');
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
