from flask import Blueprint, request, jsonify, abort
from extensions import db
from models     import Recordatorio

recordatorios_bp = Blueprint('recordatorios', __name__, url_prefix='/recordatorios')

@recordatorios_bp.route('', methods=['GET'])
def get_recordatorios():
    recs = Recordatorio.query.all()
    return jsonify([
        {'id': r.id, 'titulo': r.titulo, 'descripcion': r.descripcion,
         'fecha': r.fecha, 'hora': r.hora}
        for r in recs
    ]), 200

@recordatorios_bp.route('', methods=['POST'])
def add_recordatorio():
    d = request.get_json() or {}
    if not d.get('titulo') or not d.get('fecha'):
        return jsonify({'msg':'Título y fecha son obligatorios'}), 400

    # Instanciamos y asignamos campo a campo
    r = Recordatorio()
    r.titulo      = d['titulo']
    r.descripcion = d.get('descripcion','')
    r.fecha       = d['fecha']
    r.hora        = d.get('hora','')

    db.session.add(r)
    db.session.commit()
    return jsonify({'msg':'Recordatorio creado','id':r.id}), 201
