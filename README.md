# Gestión de Actividades – Planta Externa

Una aplicación web para la gestión integral de actividades de fusión y tendido de fibra óptica, con módulos de:

- **CRUD** de Zonas, Tipos de Trabajo, Técnicos.  
- **Registro** de actividades de Fusión y Tendido (con subida de fotos).  
- **Reportes** de Fusión y Tendido con filtros y gráficos.  
- **Mi Agenda** de actividades.  
- **Control de Asistencia** y **Cálculo de Horas Extras**.  
- **Dashboard** con métricas clave y gráficos interactivos.

---

## 📁 Estructura del proyecto
        mi-proyecto-gestion-actividades/
        ├── backend/
        │ ├── app.py # Crear y arrancar la app Flask
        │ ├── config.py # Configuración global
        │ ├── extensions.py # SQLAlchemy, CORS…
        │ ├── models.py # Definición de tablas (ORM)
        │ ├── utils.py # Funciones auxiliares (ej. generar mensaje)
        │ └── controllers/ # Blueprints por recurso
        │ ├── ui.py
        │ ├── tecnicos.py
        │ ├── zonas.py
        │ ├── tipos_trabajo.py
        │ ├── actividades.py
        │ ├── recordatorios.py
        │ ├── asistencia.py
        │ └── uploads.py
        ├── frontend/
        │ ├── index.html # Página principal (dashboard)
        │ ├── asistencia.html # Módulo Asistencia
        │ ├── asistencia_extras.html# Horas Extras
        │ ├── css/
        │ │ └── dashboard.css
        │ ├── js/
        │ │ ├── main.js
        │ │ ├── chart_actividades.js
        │ │ ├── asistencia.js
        │ │ └── reporte_horas_extras.js
        │ └── assets/ # Imágenes, videos, logo…
        └── README.md # Este archivo

 ---

## ⚙️ Requisitos

- **Python** ≥ 3.8  
- **pip**  
- **Git**  
- Navegador moderno (Chrome, Firefox…)

---

## 🚀 Instalación

1. **Clona el repositorio**  
   ```bash
   git clone https://github.com/Misael-A/mi-proyecto-gestion-actividades.git
   cd mi-proyecto-gestion-actividades/backend
Crea y activa un entorno virtual

    python -m venv venv
    source venv/bin/activate      # Linux / macOS
    venv\Scripts\activate         # Windows
Instala dependencias

    pip install -r requirements.txt
(Opcional) Variables de entorno
Puedes crear un archivo .env con:

     FLASK_APP=app.py
    FLASK_ENV=development
    
🏃 Uso
Levanta el servidor Flask

    cd backend
    flask run
Se servirá la API y el frontend estático en http://127.0.0.1:5000/.

Abre el navegador
Navega a http://127.0.0.1:5000/ y utiliza el menú lateral para acceder a:

    Agregar: Zonas, Tipos de Trabajo, Técnicos
   
    Registro: Registro Fusión, Registro Tendido
   
    Reportes: Reporte Fusión, Reporte Tendido
   
    Validar Extras: Asistencia, Horas Extras
   
    Actividades, Mi Agenda, Dashboard

Explora

    CRUD completo con validaciones.
    
    Gráficos interactivos con Chart.js.
    
    Tablas dinámicas y exportables con DataTables.
    
    Pantalla de carga inicial.

🤝 Contribuir
Haz un fork.

    Crea una rama: git checkout -b feature/nombre-feature.
    
    Realiza tus cambios y haz commit.
    
    Envía un PR a main.

📄 Licencia
   Este proyecto está bajo MIT License.

© 2025 Ing. Andy Tafur | Desarrollado por Misael-A
