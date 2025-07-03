from flask import Blueprint, request, jsonify, abort
from extensions import db
from models     import ZonaTrabajo

zonas_bp = Blueprint('zonas', __name__, url_prefix='/zonas')

@zonas_bp.route('', methods=['GET'])
def get_zonas():
    data = [{'id': z.id, 'descripcion': z.descripcion} for z in ZonaTrabajo.query.all()]
    return jsonify(data),200

@zonas_bp.route('', methods=['POST'])
def add_zona():
    d    = request.get_json() or {}
    desc = d.get('descripcion','').strip()
    if not desc: return jsonify({'msg':'Descripción requerida'}),400

    z = ZonaTrabajo()
    z.descripcion = desc

    db.session.add(z)
    db.session.commit()
    return jsonify({'msg':'Zona creada','id':z.id}),201

@zonas_bp.route('/<int:id>', methods=['PUT'])
def update_zona(id):
    z    = db.session.get(ZonaTrabajo, id) or abort(404)
    desc = (request.get_json() or {}).get('descripcion','').strip()
    if not desc: return jsonify({'msg':'Descripción requerida'}),400
    z.descripcion = desc
    db.session.commit()
    return jsonify({'msg':'Zona actualizada'}),200

@zonas_bp.route('/<int:id>', methods=['DELETE'])
def delete_zona(id):
    z = db.session.get(ZonaTrabajo, id) or abort(404)
    db.session.delete(z)
    db.session.commit()
    return jsonify({'msg':'Zona eliminada'}),200
