from flask import Blueprint, request, jsonify, abort
from extensions import db
from models     import TipoTrabajo

tipos_trabajo_bp = Blueprint('tipos_trabajo', __name__, url_prefix='/tipos-trabajo')

@tipos_trabajo_bp.route('', methods=['GET'])
def get_tipos():
    data = [{'id': t.id, 'descripcion': t.descripcion} for t in TipoTrabajo.query.all()]
    return jsonify(data),200

@tipos_trabajo_bp.route('', methods=['POST'])
def add_tipo():
    d    = request.get_json() or {}
    desc = d.get('descripcion','').strip()
    if not desc: return jsonify({'msg':'Descripción requerida'}),400

    tp = TipoTrabajo()
    tp.descripcion = desc

    db.session.add(tp)
    db.session.commit()
    return jsonify({'msg':'Tipo creado','id':tp.id}),201

@tipos_trabajo_bp.route('/<int:id>', methods=['PUT'])
def update_tipo(id):
    tp   = db.session.get(TipoTrabajo, id) or abort(404)
    desc = (request.get_json() or {}).get('descripcion','').strip()
    if not desc: return jsonify({'msg':'Descripción requerida'}),400
    tp.descripcion = desc
    db.session.commit()
    return jsonify({'msg':'Tipo actualizado'}),200

@tipos_trabajo_bp.route('/<int:id>', methods=['DELETE'])
def delete_tipo(id):
    tp = db.session.get(TipoTrabajo, id) or abort(404)
    db.session.delete(tp)
    db.session.commit()
    return jsonify({'msg':'Tipo eliminado'}),200
