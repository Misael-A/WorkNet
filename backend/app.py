import os
from flask import Flask, render_template, request, redirect, url_for, session
from config import Config
from extensions import db, cors
from flask_migrate import Migrate

# — Monkey-patch para OpenPyXL y NumPy —
import numpy as np
# Asegurar que numpy.short existe (como alias de int16 o, si no, de int)
if not hasattr(np, 'short'):        # type: ignore
    setattr(
        np,
        'short',
        getattr(np, 'int16', int)    # type: ignore
    )
# Importar blueprints
from controllers.ui import ui_bp
from controllers.tecnicos import tecnicos_bp
from controllers.zonas import zonas_bp
from controllers.tipos_trabajo import tipos_trabajo_bp
from controllers.actividades import actividades_bp
from controllers.recordatorios import recordatorios_bp
from controllers.uploads import uploads_bp
from controllers.proyectos import proyectos_bp
from controllers.asistencia import asistencia_bp  # <-- añadido

# Directorio de frontend (igual que antes)
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
FRONTEND_DIR = os.path.abspath(os.path.join(BASE_DIR, '../frontend'))

def create_app():
    app = Flask(
        __name__,
        static_folder=FRONTEND_DIR,
        static_url_path='',
        template_folder=os.path.join(FRONTEND_DIR, 'templates')  # Apunta correctamente a templates/
    )
    app.config.from_object(Config)
    app.secret_key = 'mysecretkey'  # Se debe cambiar a una clave segura

    migrate = Migrate(app, db)
    # Inicializar extensiones
    db.init_app(app)
    cors(app)

    # Registrar todos los blueprints, incluyendo asistencia_bp
    for bp in (
        ui_bp,
        tecnicos_bp,
        zonas_bp,
        tipos_trabajo_bp,
        actividades_bp,
        recordatorios_bp,
        uploads_bp,
        proyectos_bp,
        asistencia_bp
    ):
        app.register_blueprint(bp)

    # Crear BD y carpeta uploads
    with app.app_context():
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
        db.create_all()

    # Agregar las rutas para login y control de sesión
    @app.route('/login', methods=['GET', 'POST'])
    def login():
        if request.method == 'POST':
            username = request.form['username']
            password = request.form['password']
            # Validación simple de usuario y contraseña
            if username == 'Pext' and password == 'Pext933057':
                session['logged_in'] = True  # Usuario autenticado
                return redirect(url_for('index'))
            else:
                error = 'Usuario o contraseña incorrectos.'
                return render_template('login.html', error=error)
        return render_template('login.html')

    @app.route('/index')
    def index():
        if not session.get('logged_in'):
            return redirect(url_for('login'))
        return render_template('index.html')  # Ahora Flask puede encontrar index.html correctamente

    # Ruta para cerrar sesión
    @app.route('/logout')
    def logout():
        session.pop('logged_in', None)  # Elimina la sesión del usuario
        return redirect(url_for('login'))  # Redirige al login

    return app


if __name__ == '__main__':
    create_app().run(debug=True)
