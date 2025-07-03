// js/navbar.js
document.addEventListener('DOMContentLoaded', () => {
  // Carga el fragmento HTML del navbar
  fetch('/templates/navbar.html')
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.text();
    })
    .then(html => {
      // Inserta el navbar en el placeholder
      const placeholder = document.getElementById('navbar-placeholder');
      if (!placeholder) {
        console.error('No se encontró #navbar-placeholder en el DOM');
        return;
      }
      placeholder.innerHTML = html;

      // Inicializa Offcanvas de Bootstrap
      document.querySelectorAll('.offcanvas').forEach(el => {
        new bootstrap.Offcanvas(el);
      });

      // Agrega el toggle para submenús
      document.querySelectorAll('.menu-group-title').forEach(title => {
        title.addEventListener('click', () => {
          title.parentElement.classList.toggle('open');
        });
      });
    })
    .catch(err => {
      console.error('Error cargando navbar:', err);
    });
});
