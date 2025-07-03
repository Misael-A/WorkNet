import os
from flask import Blueprint, send_from_directory, current_app

uploads_bp = Blueprint('uploads', __name__)

@uploads_bp.route('/uploads/<path:filename>')
def uploaded_file(filename):
    return send_from_directory(current_app.config['UPLOAD_FOLDER'], filename)
