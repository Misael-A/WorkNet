// frontend/js/proyecto.js
$(function() {
  // — Variables globales —
  const tiposPorProyecto = {
    Residencial: ['Ampliación', 'Migración', 'Mantenimiento'],
    ISP        : ['Instalación', 'Mantenimiento', 'Avería']
  };
  // Inicialización de los flatpickr
  const fpFini = flatpickr("#inp_fini", { dateFormat: "Y-m-d" });
  const fpFfin = flatpickr("#inp_ffin", { dateFormat: "Y-m-d" });
  const params     = new URLSearchParams(window.location.search);
  const proyectoId = params.get("id");
  const zonasMap   = {};
  let marker, map, proyectosTable;

  // — 1) Carga zonas para el <select> y para mostrar en la tabla —
  function loadZonas() {
    return fetch("/zonas")
      .then(r => r.json())
      .then(zs => {
        const ops = zs.map(z =>
          `<option value="${z.id}">${z.descripcion}</option>`
        );
        $("#sel_zona").html(
          "<option value=''>— Seleccione —</option>" + ops.join("")
        );
        zs.forEach(z => zonasMap[z.id] = z.descripcion);
      })
      .catch(err => console.error("Error cargando zonas:", err));
  }

  // — 2) Carga y pinta proyectos en la DataTable —
  function loadProyectos() {
    return fetch("/proyectos")
      .then(r => {
        if (!r.ok) throw new Error(`Error ${r.status} al cargar proyectos`);
        return r.json();
      })
      .then(data => {
        if (!proyectosTable) {
          proyectosTable = $('#tblProyectos').DataTable({
            data,
                columns: [
                    { data: 'codigo',         title: 'Código'        },
                    { data: 'nombre',         title: 'Nombre'        },
                    { data: 'tipo_proyecto',  title: 'Tipo Proyecto' },
                    { data: 'tipo_trabajo',   title: 'Tipo Trabajo'  },
                    { data: 'responsable',    title: 'Responsable'   },
                    { data: 'fecha_inicio',   title: 'Fecha Inicio'  },
                    { data: 'fecha_fin',      title: 'Fecha Fin'     },
                    { data: 'prioridad',      title: 'Prioridad'     },
                    { data: 'estado',         title: 'Estado'        },
                    { data: 'zona',           title: 'Zona', defaultContent: '—'  },  // ← aquí
                    { data: 'latitud',        title: 'Latitud'       },
                    { data: 'longitud',       title: 'Longitud'      }
                ],
            responsive: true,
            pageLength: 10
          });
        } else {
          proyectosTable.clear();
          proyectosTable.rows.add(data);
          proyectosTable.draw(false);
        }
      })
      .catch(err => {
        console.error("No se pudieron cargar proyectos:", err);
        $('#tblProyectos tbody').html(`
          <tr>
            <td colspan="12" class="text-center text-muted">
              ⚠️ No se pudieron cargar los proyectos.
            </td>
          </tr>
        `);
      });
  }

  // — 3) Mapa Leaflet para ubicación —
  function initMap() {
    const centro = [-12.0464, -77.0428];
    map = L.map("map").setView(centro, 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);
    marker = L.marker(centro, { draggable: true }).addTo(map);
    marker.on("moveend", e => updateCoords(e.target.getLatLng()));
    map.on("click", e => {
      marker.setLatLng(e.latlng);
      updateCoords(e.latlng);
    });
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(p => {
        const ll = [p.coords.latitude, p.coords.longitude];
        map.setView(ll, 14);
        marker.setLatLng(ll);
        updateCoords({ lat: ll[0], lng: ll[1] });
      });
    }
    updateCoords(marker.getLatLng());
  }
  function updateCoords(latlng) {
    $("#inp_latitud").val(latlng.lat.toFixed(6));
    $("#inp_longitud").val(latlng.lng.toFixed(6));
  }

  // — 4) Si estamos editando, carga los datos en el formulario —
  function populateForm(p) {
    $("#inp_codigo").val(p.codigo).prop("disabled", true);
    $("#inp_nombre").val(p.nombre);
    $("#sel_tipo_proy").val(p.tipo_proyecto).trigger("change");
    setTimeout(() => $("#sel_tipo_trab").val(p.tipo_trabajo), 0);
    $("#inp_responsable").val(p.responsable);
    fpFini.setDate(p.fecha_inicio, true);
    fpFfin.setDate(p.fecha_fin,   true);
    $("#sel_prioridad").val(p.prioridad);
    $("#sel_estado").val(p.estado);
    $("#sel_zona").val(p.zona_id);
    if (p.latitud && p.longitud) {
      const ll = [p.latitud, p.longitud];
      marker.setLatLng(ll);
      map.setView(ll, 14);
      updateCoords({ lat: p.latitud, lng: p.longitud });
    }
  }
  function loadForm() {
    return fetch(`/proyectos/${proyectoId}`)
      .then(r => r.ok ? r.json() : Promise.reject("No encontrado"))
      .then(populateForm)
      .catch(err => {
        console.error(err);
        alert("No se pudieron cargar los datos del proyecto.");
      });
  }

  // — 5) Submit: crea o actualiza y luego recarga la tabla —
  $("#frmProyecto").on("submit", function(e) {
    e.preventDefault();
    const z = $("#sel_zona").val();
    const payload = {
      codigo        : $("#inp_codigo").val().trim(),
      nombre        : $("#inp_nombre").val().trim(),
      tipo_proyecto : $("#sel_tipo_proy").val(),
      tipo_trabajo  : $("#sel_tipo_trab").val(),
      responsable   : $("#inp_responsable").val().trim(),
      fecha_inicio  : $("#inp_fini").val(),
      fecha_fin     : $("#inp_ffin").val(),
      prioridad     : $("#sel_prioridad").val(),
      estado        : $("#sel_estado").val(),
      zona_id       : z ? +z : null,
      latitud       : +$("#inp_latitud").val(),
      longitud      : +$("#inp_longitud").val()
    };
    const url    = proyectoId ? `/proyectos/${proyectoId}` : `/proyectos`;
    const method = proyectoId ? "PUT" : "POST";

    fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload)
    })
    .then(async r => {
      const txt = await r.text();
      const d   = (() => { try { return JSON.parse(txt) } catch { return { msg: txt } } })();
      if (!r.ok) throw new Error(d.msg || r.statusText);
      return d;
    })
    .then(d => {
      if (proyectoId) {
        alert("Proyecto actualizado correctamente");
      } else {
        alert(`Proyecto creado con ID: ${d.id}`);
        // Limpiar formulario solo en modo “nuevo”
        $("#frmProyecto")[0].reset();
        fpFini.clear(); fpFfin.clear();
        $("#inp_codigo").prop("disabled", false);
        $("#sel_tipo_trab").html(
          "<option value=''>— Primero elija tipo de proyecto —</option>"
        );
      }
      // recarga la tabla
      if ($("#tblProyectos").length) {
        loadProyectos();
      }
    })
    .catch(err => {
      console.error(err);
      alert(`¡Ups! ${err.message}`);
    });
  });

  // — 6) Dinámica de “Tipo de trabajo” —
  $("#sel_tipo_proy").on("change", function() {
    const arr  = tiposPorProyecto[this.value] || [];
    const opts = arr.map(v => `<option value="${v}">${v}</option>`).join("");
    $("#sel_tipo_trab").html(
      "<option value=''>— Seleccione —</option>" + opts
    );
  });

  // — 7) Botón “Cancelar” —
  $("#btn_cancelar").on("click", () => window.history.back());

  // — 8) Inicio: primero zonas → luego mapa, formulario y listado —
  loadZonas().then(() => {
    if ($("#map").length)         initMap();
    if (proyectoId)               loadForm();
    if ($("#tblProyectos").length) loadProyectos();
  });
  // Para cada título de grupo, añade listener de click
  document.querySelectorAll('.menu-group-title').forEach(function(title) {
    title.addEventListener('click', function() {
      // Alterna clase 'open' en el LI contenedor
      this.parentElement.classList.toggle('open');
    });
  });
});
