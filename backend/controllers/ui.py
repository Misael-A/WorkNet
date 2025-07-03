# backend/controllers/ui.py

import os
from flask import Blueprint, send_from_directory, current_app, abort

ui_bp = Blueprint('ui', __name__)

@ui_bp.route('/', methods=['GET'])
def home():
    # current_app.static_folder es Optional[str], comprobamos que no sea None
    static_folder = current_app.static_folder
    if static_folder is None:
        abort(500, description="Static folder no configurado")
    return send_from_directory(static_folder, 'index.html')

@ui_bp.route('/<page>.html', methods=['GET'])
def serve_page(page):
    # current_app.template_folder es Optional[str], comprobamos que no sea None
    template_folder = current_app.template_folder
    if template_folder is None:
        abort(500, description="Template folder no configurado")
    # Aseguramos que la página pedida exista, opcionalmente podrías comprobar con os.path.exists
    return send_from_directory(template_folder, f'{page}.html')
