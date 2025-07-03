import os
import uuid
from flask import Blueprint, request, jsonify, abort, current_app
from extensions import db
from models     import Actividad, Foto
from utils      import generar_mensaje

actividades_bp = Blueprint('actividades', __name__)

@actividades_bp.route('/registro/<tipo>', methods=['POST'])
def registro_actividades(tipo):
    form = request.form.to_dict()
    # Genera o reutiliza el id_actividad
    id_actividad = form.get('id_actividad') or uuid.uuid4().hex
    form['id_actividad'] = id_actividad

    # Crea el mensaje
    mensaje = generar_mensaje(form)

    # Instancia Actividad y asigna atributos uno a uno
    act = Actividad()
    act.id_actividad      = id_actividad
    act.categoria         = tipo
    act.actividad         = form.get('actividad')
    act.tipo_trabajo      = form.get('tipo_trabajo')
    act.zona_trabajo      = form.get('zona_trabajo')
    act.estado            = form.get('estado')
    act.coordenadas       = form.get('coordenadas')
    act.detalle_actividad = form.get('detalle_actividad')
    act.tecnico           = form.get('tecnico')
    act.fecha_inicio      = form.get('fecha_inicio')
    act.fecha_fin         = form.get('fecha_fin')
    act.hora_inicio       = form.get('hora_inicio')
    act.hora_fin          = form.get('hora_fin')
    act.fibra_solicitada  = form.get('fibra_solicitada')
    act.fibra_utilizada   = form.get('fibra_utilizada')
    act.observaciones     = form.get('observaciones')
    act.mensaje_generado  = mensaje

    db.session.add(act)

    # Guarda hasta 10 fotos
    for f in request.files.getlist('fotos')[:10]:
        fname = f"{uuid.uuid4().hex}_{f.filename}"
        path  = os.path.join(current_app.config['UPLOAD_FOLDER'], fname)
        f.save(path)

        foto = Foto()
        foto.id_actividad = act.id_actividad
        foto.filename     = fname
        foto.filepath     = path
        db.session.add(foto)

    db.session.commit()
    return jsonify({'msg': f'Actividad {tipo} registrada', 'id': act.id_actividad}), 201


@actividades_bp.route('/actividades', methods=['GET'])
def listar_actividades():
    # Import dinámico para evitar ciclos
    from models import Tecnico, ZonaTrabajo, TipoTrabajo

    result = []
    for a in Actividad.query.all():
        fotos   = [f.filename for f in Foto.query.filter_by(id_actividad=a.id_actividad)]
        tec_obj  = Tecnico.query.get(a.tecnico)       if a.tecnico       else None
        zona_obj = ZonaTrabajo.query.get(a.zona_trabajo)
        tipo_obj = TipoTrabajo.query.get(a.tipo_trabajo)

        result.append({
            'id_actividad'     : a.id_actividad,
            'categoria'        : a.categoria,
            'actividad'        : a.actividad,
            'tecnico_id'       : a.tecnico,
            'tecnico'          : f"{tec_obj.nombre} {tec_obj.apellido}" if tec_obj else '—',
            'zona_trabajo_id'  : a.zona_trabajo,
            'zona_trabajo'     : zona_obj.descripcion if zona_obj else '—',
            'tipo_trabajo_id'  : a.tipo_trabajo,
            'tipo_trabajo'     : tipo_obj.descripcion if tipo_obj else '—',
            'estado'           : a.estado,
            'fecha_inicio'     : a.fecha_inicio,
            'fecha_fin'        : a.fecha_fin,
            'hora_inicio'      : a.hora_inicio,
            'hora_fin'         : a.hora_fin,
            'coordenadas'      : a.coordenadas,
            'detalle_actividad': a.detalle_actividad,
            'observaciones'    : a.observaciones,
            'fibra_solicitada' : a.fibra_solicitada or "",
            'fibra_utilizada'  : a.fibra_utilizada or "",
            'mensaje_generado' : a.mensaje_generado,
            'fotos'            : fotos
        })
    return jsonify(result), 200


@actividades_bp.route('/actividades/<string:id>', methods=['PUT'])
def update_actividad(id):
    data = request.form.to_dict()
    act  = db.session.get(Actividad, id) or abort(404)

    # Actualiza solo los campos permitidos
    for field in (
        'actividad','tipo_trabajo','zona_trabajo','tecnico','estado',
        'coordenadas','detalle_actividad','observaciones',
        'fecha_inicio','fecha_fin','hora_inicio','hora_fin',
        'fibra_solicitada','fibra_utilizada'
    ):
        if field in data:
            setattr(act, field, data[field])

    # Elimina fotos solicitadas
    for fn in request.form.getlist('fotos_eliminar'):
        foto = Foto.query.filter_by(id_actividad=id, filename=fn).first()
        if foto:
            try:
                os.remove(foto.filepath)
            except OSError:
                pass
            db.session.delete(foto)

    # Añade nuevas fotos
    for f in request.files.getlist('fotos'):
        fname = f"{uuid.uuid4().hex}_{f.filename}"
        path  = os.path.join(current_app.config['UPLOAD_FOLDER'], fname)
        f.save(path)

        foto = Foto()
        foto.id_actividad = id
        foto.filename     = fname
        foto.filepath     = path
        db.session.add(foto)

    # Regenera el mensaje con los datos actuales
    mensaje_data = {
        **data,
        'tipo_trabajo': act.tipo_trabajo,
        'zona_trabajo': act.zona_trabajo,
        'tecnico'     : act.tecnico
    }
    act.mensaje_generado = generar_mensaje(mensaje_data)

    db.session.commit()
    return jsonify({'msg':'Actividad actualizada'}), 200


@actividades_bp.route('/actividades/<string:id>', methods=['DELETE'])
def delete_actividad(id):
    act = db.session.get(Actividad, id) or abort(404)
    Foto.query.filter_by(id_actividad=id).delete()
    db.session.delete(act)
    db.session.commit()
    return jsonify({'msg':'Actividad eliminada'}), 200
