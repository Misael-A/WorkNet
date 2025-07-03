$(document).ready(function () {
  // 1) Función para llenar selects dinámicamente
  function cargarSelect(url, selectId, campo = 'descripcion') {
    $.get(url, data => {
      const $select = $(selectId);
      $select.empty().append('<option value="">Seleccione una opción</option>');
      data.forEach(item => {
        const texto = campo === 'nombre'
          ? `${item.nombre} ${item.apellido}`
          : item[campo];
        $select.append(`<option value="${item.id}">${texto}</option>`);
      });
    });
  }

  // 2) Carga de selects
  cargarSelect('/tipos-trabajo', '#tipo_trabajo');
  cargarSelect('/zonas',         '#zona_trabajo');
  cargarSelect('/tecnicos',      '#tecnico', 'nombre');

  // 3) Previsualizar imágenes
  $('#fotos').on('change', function () {
    const preview = $('#preview').empty();
    Array.from(this.files).forEach(file => {
      const reader = new FileReader();
      reader.onload = e => {
        $('<img>', {
          src: e.target.result,
          width: 100,
          class: 'border rounded me-2 mb-2'
        }).appendTo(preview);
      };
      reader.readAsDataURL(file);
    });
  });

  // 4) Envío de formulario
  $('#formTendido').submit(function (e) {
    e.preventDefault();
    const fd = new FormData(this);

    // <-- Aquí añadimos la categoría para que el backend sepa que es "tendido" -->
    fd.append('categoria', 'tendido');

    // Máximo 10 fotos
    Array.from(this.fotos.files)
      .slice(0,10)
      .forEach(f => fd.append('fotos', f));

    $.ajax({
      url: '/registro/tendido',
      method: 'POST',
      data: fd,
      processData: false,
      contentType: false,
      success: () => {
        alert('¡Tendido registrado correctamente!');
        // limpia el formulario en lugar de recargar la página
        this.reset();
        $('#preview').empty();
      },
      error: err => {
        console.error(err);
        alert('Error al registrar la actividad de tendido');
      }
    });
  });
});
