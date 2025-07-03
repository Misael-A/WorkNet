// js/chart_actividades.js
document.addEventListener('DOMContentLoaded', () => {
  const ctx = document.getElementById('actividadesChart').getContext('2d');
  let currentUnit = 'month'; // escala inicial ('day', 'week' o 'month')

  // Inicializa el Chart.js vacío
  const actividadesChart = new Chart(ctx, {
    type: 'line',
    data: { labels: [], datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: { display: true, text: 'Tiempo' },
          grid: { display: false },
          ticks: { color: '#333' }
        },
        y: {
          title: { display: true, text: 'Cantidad de Actividades' },
          grid: { color: '#eee' },
          ticks: { color: '#333', beginAtZero: true, precision: 0 }
        }
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: { boxWidth: 12, padding: 16 }
        },
        tooltip: { mode: 'index', intersect: false }
      },
      elements: {
        line: { tension: 0.3, borderWidth: 2 },
        point: { radius: 3 }
      }
    }
  });

  // Función para agrupar y renderizar según unidad
  async function fetchAndRender(unit) {
    try {
      const res  = await fetch('/actividades');
      const data = await res.json();

      // 1) Colecciones de etiquetas y tipos
      const labelsSet = new Set();
      const tiposSet  = new Set();

      // 2) Primer pase: capturar todas las etiquetas y tipos
      data.forEach(a => {
        tiposSet.add(a.tipo_trabajo);
        const d = new Date(`${a.fecha_inicio}T${a.hora_inicio}`);
        let lbl;
        if (unit === 'day') {
          lbl = d.toISOString().slice(0,10);        // YYYY-MM-DD
        } else if (unit === 'week') {
          // semana empieza lunes
          const day = d.getDay();
          const diff = d.getDate() - ((day + 6) % 7);
          const mon  = new Date(d.setDate(diff));
          lbl = mon.toISOString().slice(0,10);
        } else { // month
          lbl = d.toLocaleString('default', { month:'short', year:'numeric' });
        }
        labelsSet.add(lbl);
      });

      // 3) Orden cronológico de etiquetas
      const labels = Array.from(labelsSet)
        .sort((a, b) => new Date(a) - new Date(b));

      // 4) Inicializar conteo[tipo][label] = 0
      const conteo = {};
      tiposSet.forEach(tipo => {
        conteo[tipo] = {};
        labels.forEach(lbl => { conteo[tipo][lbl] = 0; });
      });

      // 5) Segundo pase: contar
      data.forEach(a => {
        const d = new Date(`${a.fecha_inicio}T${a.hora_inicio}`);
        let lbl;
        if (unit === 'day') {
          lbl = d.toISOString().slice(0,10);
        } else if (unit === 'week') {
          const day = d.getDay();
          const diff = d.getDate() - ((day + 6) % 7);
          const mon  = new Date(d.setDate(diff));
          lbl = mon.toISOString().slice(0,10);
        } else {
          lbl = d.toLocaleString('default', { month:'short', year:'numeric' });
        }
        if (conteo[a.tipo_trabajo] && conteo[a.tipo_trabajo][lbl] !== undefined) {
          conteo[a.tipo_trabajo][lbl] += 1;
        }
      });

      // 6) Construir datasets
      const datasets = Array.from(tiposSet).map((tipo, idx) => ({
        label: tipo,
        data: labels.map(lbl => conteo[tipo][lbl]),
        borderColor: `hsl(${(idx * 60) % 360}, 70%, 50%)`,
        backgroundColor: 'transparent'
      }));

      // 7) Actualizar el chart
      actividadesChart.data.labels    = labels;
      actividadesChart.data.datasets  = datasets;
      actividadesChart.options.scales.x.time = undefined; // no usamos time scale
      actividadesChart.update();

    } catch (err) {
      console.error("Error cargando actividades:", err);
    }
  }

  // Conectar botones de escala
  document.querySelectorAll('.btn-group button[data-unit]').forEach(btn => {
    btn.addEventListener('click', () => {
      // ajustar estilo activo
      document.querySelectorAll('.btn-group .btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      // cambiar unidad y re-render
      currentUnit = btn.getAttribute('data-unit');
      fetchAndRender(currentUnit);
    });
  });

  // Render inicial
  fetchAndRender(currentUnit);

  // Actualizar periódicamente
  setInterval(() => fetchAndRender(currentUnit), 60000);
  
});
