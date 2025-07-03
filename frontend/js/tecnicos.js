// js/tecnicos.js
$(function () {
  const tabla = $("#tablaTecnicos").DataTable({
    columnDefs: [{ targets: 0, visible: false }]  // ocultar ID
  });

  // 1) Cargo y dibujo la lista de técnicos
  async function loadTecnicos() {
    try {
      const res  = await fetch("/tecnicos");
      if (!res.ok) throw new Error(res.statusText);
      const data = await res.json();
      tabla.clear();
      data.forEach(t => {
        tabla.row.add([
          t.id,
          t.nombre,
          t.apellido,
          t.telefono,
          t.placa,
          // botones sin onclick inline, para usar event delegation
          `<button class="btn btn-sm btn-warning me-1 edit-tecnico"
                   data-id="${t.id}"
                   data-nombre="${t.nombre}"
                   data-apellido="${t.apellido}"
                   data-telefono="${t.telefono}"
                   data-placa="${t.placa}">
             ✏️
           </button>
           <button class="btn btn-sm btn-danger delete-tecnico"
                   data-id="${t.id}">
             🗑️
           </button>`
        ]);
      });
      tabla.draw();
    } catch (err) {
      console.error("Error al cargar técnicos:", err);
      alert("No se pudo cargar la lista de técnicos.");
    }
  }
  loadTecnicos();

  // 2) Guardar (nuevo o edición)
  $("#guardarTecnico").click(async () => {
    const id       = $("#idTecnico").val();
    const nombre   = $("#nombreTec").val().trim();
    const apellido = $("#apellidoTec").val().trim();
    const telefono = $("#telefonoTec").val().trim();
    const placa    = $("#placaTec").val().trim();

    const payload = { nombre, apellido, telefono, placa };
    const url    = id ? `/tecnicos/${id}` : "/tecnicos";
    const method = id ? "PUT"            : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.msg || res.statusText);
      }
      // cerrar modal y recargar tabla
      $("#formTecnico")[0].reset();
      // si usas jQuery plugin de Bootstrap 5:
      // $("#modalTecnico").modal('hide');
      // o con API nativa:
      const modalEl = document.getElementById("modalTecnico");
      bootstrap.Modal.getInstance(modalEl).hide();
      loadTecnicos();
    } catch (err) {
      console.error("Error guardando técnico:", err);
      alert(err.message);
    }
  });

  // 3) Delegated listener para editar
  $("body").on("click", ".edit-tecnico", function () {
    const btn = $(this);
    $("#idTecnico").val(btn.data("id"));
    $("#nombreTec").val(btn.data("nombre"));
    $("#apellidoTec").val(btn.data("apellido"));
    $("#telefonoTec").val(btn.data("telefono"));
    $("#placaTec").val(btn.data("placa"));
    // instanciar y mostrar modal pasando elemento DOM
    const modalEl = document.getElementById("modalTecnico");
    const modal   = new bootstrap.Modal(modalEl);
    modal.show();
  });

  // 4) Delegated listener para eliminar
  $("body").on("click", ".delete-tecnico", async function () {
    const id = $(this).data("id");
    if (!confirm("¿Eliminar este técnico?")) return;
    try {
      const res = await fetch(`/tecnicos/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(res.statusText);
      loadTecnicos();
    } catch (err) {
      console.error("Error borrando técnico:", err);
      alert("No se pudo eliminar el técnico.");
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
