from flask import Blueprint, request, jsonify, abort
from extensions import db
from models     import Tecnico

tecnicos_bp = Blueprint('tecnicos', __name__, url_prefix='/tecnicos')

@tecnicos_bp.route('', methods=['GET'])
def get_tecnicos():
    data = [
        {'id': t.id, 'nombre': t.nombre, 'apellido': t.apellido,
         'telefono': t.telefono, 'placa': t.placa}
        for t in Tecnico.query.all()
    ]
    return jsonify(data), 200

@tecnicos_bp.route('', methods=['POST'])
def add_tecnico():
    d = request.get_json() or {}
    for f in ('nombre','apellido','telefono','placa'):
        if not d.get(f,'').strip():
            return jsonify({'msg':f'Campo {f} obligatorio'}), 400

    t = Tecnico()
    t.nombre   = d['nombre'].strip()
    t.apellido = d['apellido'].strip()
    t.telefono = d['telefono'].strip()
    t.placa    = d['placa'].strip()

    db.session.add(t)
    db.session.commit()
    return jsonify({'msg':'Técnico creado','id':t.id}), 201

@tecnicos_bp.route('/<int:id>', methods=['PUT'])
def update_tecnico(id):
    t = db.session.get(Tecnico, id) or abort(404)
    d = request.get_json() or {}
    if 'nombre'   in d: t.nombre   = d['nombre']
    if 'apellido' in d: t.apellido = d['apellido']
    if 'telefono' in d: t.telefono = d['telefono']
    if 'placa'    in d: t.placa    = d['placa']
    db.session.commit()
    return jsonify({'msg':'Técnico actualizado'}),200

@tecnicos_bp.route('/<int:id>', methods=['DELETE'])
def delete_tecnico(id):
    t = db.session.get(Tecnico, id) or abort(404)
    db.session.delete(t)
    db.session.commit()
    return jsonify({'msg':'Técnico eliminado'}),200
