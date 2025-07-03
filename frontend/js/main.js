// js/main.js

document.addEventListener("DOMContentLoaded", () => {
  // Elementos comunes
  const tipoTrabajoSelect = document.getElementById("tipo_trabajo");
  const zonaTrabajoSelect = document.getElementById("zona_trabajo");
  const tecnicoSelect     = document.getElementById("tecnico");
  const form              = document.getElementById("formFusion");
  const preview           = document.getElementById("preview");
  const fotosInput        = document.getElementById("fotos");
  const preloader         = document.getElementById("preloader");
  const loadingVideo      = document.getElementById("loading-video");
  const mainContent       = document.getElementById("main-content");

  /**
   * Carga un <select> desde un endpoint JSON.
   */
  const cargarSelect = (url, select, formatter) => {
    if (!select) return;
    select.innerHTML = `<option value="">Seleccione...</option>`;
    fetch(url)
      .then(res => res.json())
      .then(data => {
        data.forEach(opt => {
          const o = document.createElement("option");
          o.value = opt.id;
          if (formatter) {
            o.textContent = formatter(opt);
          } else if (opt.descripcion) {
            o.textContent = opt.descripcion;
          } else {
            o.textContent = `${opt.nombre || ""} ${opt.apellido || ""}`.trim();
          }
          select.appendChild(o);
        });
      })
      .catch(console.error);
  };

  // Carga de selects
  cargarSelect("/tipos-trabajo", tipoTrabajoSelect);
  cargarSelect("/zonas",          zonaTrabajoSelect);
  cargarSelect("/tecnicos",       tecnicoSelect, t => `${t.nombre} ${t.apellido}`);

  // Flatpickr para fechas
  if (typeof flatpickr !== "undefined") {
    flatpickr("#fecha_inicio", { dateFormat: "Y-m-d" });
    flatpickr("#fecha_fin",    { dateFormat: "Y-m-d" });
  }

  // Previsualización de imágenes
  if (fotosInput && preview) {
    fotosInput.addEventListener("change", e => {
      preview.innerHTML = "";
      Array.from(e.target.files).forEach(file => {
        const img = document.createElement("img");
        img.src = URL.createObjectURL(file);
        img.style.width = "100px";
        img.classList.add("me-2", "mb-2");
        preview.appendChild(img);
      });
    });
  }

  // Envío de formulario de registro de fusión
  if (form) {
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const formData = new FormData(form);
      const fotos = fotosInput?.files || [];
      for (let i = 0; i < fotos.length && i < 10; i++) {
        formData.append("fotos", fotos[i]);
      }
      formData.append("id_actividad", crypto.randomUUID());
      try {
        const res    = await fetch("/registro/fusion", { method: "POST", body: formData });
        const result = await res.json();
        if (res.ok) {
          alert(result.msg || "¡Actividad de fusión registrada correctamente!");
          form.reset();
          preview && (preview.innerHTML = "");
          if (typeof flatpickr !== "undefined") {
            flatpickr("#fecha_inicio").clear();
            flatpickr("#fecha_fin").clear();
          }
        } else {
          alert(result.msg || "Error al registrar la actividad.");
        }
      } catch (err) {
        console.error("Error al registrar:", err);
        alert("Error al registrar actividad.");
      }
    });
  }

  // === DASHBOARD (solo en index-page) ===
  if (document.body.id === "index-page") {
    function renderDashboard() {
      fetch("/actividades")
        .then(res => res.json())
        .then(data => {
          document.getElementById('totalActividades').textContent       = data.length;
          document.getElementById('actividadesRealizadas').textContent  = data.filter(a => a.estado === 'Realizado').length;
          document.getElementById('actividadesInconcluso').textContent  = data.filter(a => a.estado === 'Inconcluso').length;
          document.getElementById('actividadesNoRealizado').textContent = data.filter(a => a.estado === 'No realizado').length;

          const countBy = field => data.reduce((acc, a) => {
            const key = a[field] || '—';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
          }, {});

          const renderList = (obj, selector) => {
            const ul = document.querySelector(selector);
            if (!ul) return;
            ul.innerHTML = '';
            Object.entries(obj).forEach(([key, val]) => {
              const li = document.createElement('li');
              li.className = 'list-group-item d-flex justify-content-between align-items-center';
              li.innerHTML = `${key} <span class="badge bg-primary rounded-pill">${val}</span>`;
              ul.appendChild(li);
            });
          };

          renderList(countBy('tecnico'),      '#listaPorTecnico');
          renderList(countBy('zona_trabajo'), '#listaPorZona');
          renderList(countBy('tipo_trabajo'), '#listaPorTipo');
        })
        .catch(console.error);
    }
    renderDashboard();
    setInterval(renderDashboard, 60000);
  }

  // === Preloader & fade-out ===
  if (preloader && loadingVideo && mainContent) {
    loadingVideo.addEventListener("ended", startFadeOut);
    setTimeout(startFadeOut, 2000);
    function startFadeOut() {
      loadingVideo.removeEventListener("ended", startFadeOut);
      preloader.classList.add("fade-out");
      loadingVideo.addEventListener("transitionend", () => {
        preloader.style.display   = "none";
        mainContent.style.display = "block";
        void mainContent.offsetWidth;
        mainContent.style.opacity = "1";
      }, { once: true });
    }
  }

  // === Quick Projects (solo si existe la tabla) ===
  const tblQuick = document.getElementById('tblQuickProjects');
  if (tblQuick) {
    const selPriEl   = document.getElementById('filterPriority');
    const selEstEl   = document.getElementById('filterEstado');
    const upComingEl = document.getElementById('filterUpcoming');
    const tbody      = tblQuick.querySelector('tbody');

    async function loadQuickProjects() {
      const res   = await fetch('/proyectos');
      const projs = await res.json();
      await Promise.all(projs.map(async p => {
        const r2 = await fetch(`/proyectos/${p.id}/actividades`);
        p.activities = r2.ok ? await r2.json() : [];
      }));

      // Obtener valores de filtros con null-check
      const selPri   = selPriEl   ? selPriEl.value : '';
      const selEst   = selEstEl   ? selEstEl.value : '';
      const upComing = upComingEl ? upComingEl.checked : false;
      const hoy      = new Date();
      const in7      = new Date(); in7.setDate(hoy.getDate()+7);

      let list = projs.filter(p => {
        if (selPri   && p.prioridad !== selPri)    return false;
        if (selEst   && p.estado    !== selEst)    return false;
        if (upComing && new Date(p.fecha_fin) > in7) return false;
        return true;
      });

      // Ordenar: Alta→Media→Baja y luego fecha asc.
      const orderPrio = { 'Alta':1, 'Media':2, 'Baja':3 };
      list.sort((a,b) => {
        if (orderPrio[a.prioridad] !== orderPrio[b.prioridad]) {
          return orderPrio[a.prioridad] - orderPrio[b.prioridad];
        }
        return new Date(a.fecha_fin) - new Date(b.fecha_fin);
      });

      // Pintar tabla (máx. 10)
      tbody.innerHTML = '';
      list.slice(0,10).forEach(p => {
        const total     = p.activities.length;
        const doneCount = p.activities.filter(a => a.estado === 'Realizado').length;
        const pct       = total ? Math.round(doneCount*100/total) : 0;
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.innerHTML = `
          <td>${p.nombre} <small class="text-muted">(${p.codigo})</small></td>
          <td>${p.prioridad}</td>
          <td>${p.estado}</td>
          <td>${p.fecha_fin}</td>
          <td>
            <div class="progress" style="height:1rem;">
              <div
                class="progress-bar ${pct===100?'bg-success':pct>0?'bg-warning':'bg-secondary'}"
                role="progressbar"
                style="width:${pct}%"
                aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"
              >${pct}%</div>
            </div>
          </td>
        `;
        tr.addEventListener('click', () => {
          window.location.href = `proyecto_detalle.html?id=${p.id}`;
        });
        tbody.appendChild(tr);
      });
    }

    // Conectar filtros (si existen)
    selPriEl   && selPriEl.addEventListener('change', loadQuickProjects);
    selEstEl   && selEstEl.addEventListener('change', loadQuickProjects);
    upComingEl && upComingEl.addEventListener('change', loadQuickProjects);

    // Carga inicial
    loadQuickProjects();
  }


});
