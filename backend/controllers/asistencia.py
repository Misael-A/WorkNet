from flask import Blueprint, request, jsonify, abort
from extensions import db
from models import Asistencia, Tecnico

asistencia_bp = Blueprint('asistencia', __name__, url_prefix='/asistencias')

@asistencia_bp.route('', methods=['GET'])
def get_asistencias():
    recs = Asistencia.query.all()
    result = []
    for r in recs:
        tec = Tecnico.query.get(r.tecnico_id)
        result.append({
            'id'            : r.id,
            'tecnico_id'    : r.tecnico_id,
            'tecnico'       : f"{tec.nombre} {tec.apellido}" if tec else '—',
            'fecha_ingreso' : r.fecha_ingreso,
            'hora_entrada'  : r.hora_entrada,
            'fecha_salida'  : r.fecha_salida or '',
            'hora_salida'   : r.hora_salida or ''
        })
    return jsonify(result), 200

@asistencia_bp.route('', methods=['POST'])
def add_asistencia():
    d = request.get_json() or {}
    # Validación mínima
    if not d.get('tecnico_id') or not d.get('fecha_ingreso') or not d.get('hora_entrada'):
        return jsonify({'msg':'tecnico_id, fecha_ingreso y hora_entrada son obligatorios'}), 400

    # Creo instancia vacía y asigno uno a uno
    a = Asistencia()
    a.tecnico_id    = d['tecnico_id']
    a.fecha_ingreso = d['fecha_ingreso']
    a.hora_entrada  = d['hora_entrada']
    a.fecha_salida  = d.get('fecha_salida', '')
    a.hora_salida   = d.get('hora_salida', '')

    db.session.add(a)
    db.session.commit()
    return jsonify({'msg':'Asistencia creada','id':a.id}), 201

@asistencia_bp.route('/<int:id>', methods=['PUT'])
def update_asistencia(id):
    a = db.session.get(Asistencia, id) or abort(404)
    d = request.get_json() or {}
    # Actualizo sólo los campos que vengan en el JSON
    if 'fecha_ingreso' in d:
        a.fecha_ingreso = d['fecha_ingreso']
    if 'hora_entrada' in d:
        a.hora_entrada = d['hora_entrada']
    if 'fecha_salida' in d:
        a.fecha_salida = d['fecha_salida']
    if 'hora_salida' in d:
        a.hora_salida = d['hora_salida']
    db.session.commit()
    return jsonify({'msg':'Asistencia actualizada'}), 200

@asistencia_bp.route('/<int:id>', methods=['DELETE'])
def delete_asistencia(id):
    a = db.session.get(Asistencia, id) or abort(404)
    db.session.delete(a)
    db.session.commit()
    return jsonify({'msg':'Asistencia eliminada'}), 200
