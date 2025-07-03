# backend/controllers/proyectos.py
import io
import os
from flask import (
    Blueprint, request, jsonify, abort, send_file,
    current_app, Response
)
from reportlab.lib.pagesizes import landscape, letter
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Image, Table, TableStyle, Spacer
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle, ListStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
import pandas as pd
from extensions import db
from datetime import datetime
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from models    import Proyecto, Actividad, ZonaTrabajo, Tecnico

proyectos_bp = Blueprint('proyectos', __name__, url_prefix='/proyectos')


@proyectos_bp.route('', methods=['GET'])
def get_proyectos():
    proyectos = Proyecto.query.all()
    result = []
    for p in proyectos:
        # obtenemos de forma segura la descripción de la zona
        zona_obj = ZonaTrabajo.query.get(p.zona_id) if p.zona_id else None
        zona_desc = zona_obj.descripcion if zona_obj else '—'

        result.append({
            'id'            : p.id,
            'codigo'        : p.codigo,
            'nombre'        : p.nombre,
            'tipo_proyecto' : p.tipo_proyecto,
            'tipo_trabajo'  : p.tipo_trabajo,
            'responsable'   : p.responsable,
            'fecha_inicio'  : p.fecha_inicio,
            'fecha_fin'     : p.fecha_fin,
            'prioridad'     : p.prioridad,
            'estado'        : p.estado,
            'zona'          : zona_desc,
            'latitud'       : p.latitud,
            'longitud'      : p.longitud
        })
    return jsonify(result), 200


@proyectos_bp.route('', methods=['POST'])
def add_proyecto():
    d = request.get_json() or {}

    # 1) Generar código único: PROY-2025-001, PROY-2025-002, …
    year   = datetime.utcnow().year
    prefix = f"PROY-{year}-"
    last_code = (
        db.session
          .query(func.max(Proyecto.codigo))
          .filter(Proyecto.codigo.like(f"{prefix}%"))
          .scalar()
    )
    if last_code:
        try:
            n = int(last_code.rsplit('-', 1)[1])
        except ValueError:
            n = 0
        next_num = n + 1
    else:
        next_num = 1
    nuevo_codigo = f"{prefix}{next_num:03d}"

    # 2) Crear instancia y asignar el resto de campos
    p = Proyecto()
    p.codigo        = nuevo_codigo
    p.nombre        = d.get('nombre', '').strip()
    p.tipo_proyecto = d.get('tipo_proyecto', '').strip()
    p.tipo_trabajo  = d.get('tipo_trabajo', '').strip()
    p.responsable   = d.get('responsable', '').strip()
    p.fecha_inicio  = d.get('fecha_inicio', '').strip()
    p.fecha_fin     = d.get('fecha_fin', '').strip()
    p.prioridad     = d.get('prioridad', '').strip()
    p.estado        = d.get('estado', '').strip()
    p.zona_id       = d.get('zona_id')
    p.latitud       = d.get('latitud')
    p.longitud      = d.get('longitud')
    p.created_at    = datetime.utcnow()

    db.session.add(p)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({ 'msg': 'Ya existe un proyecto con ese código' }), 409

    return jsonify({ 'msg': 'Proyecto creado', 'id': p.id }), 201

@proyectos_bp.route('/<int:id>', methods=['GET'])
def get_proyecto(id):
    p = Proyecto.query.get_or_404(id)

    zona_obj = ZonaTrabajo.query.get(p.zona_id) if p.zona_id else None
    zona_desc = zona_obj.descripcion if zona_obj else '—'

    subs = []
    for a in p.subactividades:  # type: ignore
        tec_obj = Tecnico.query.get(a.tecnico)
        zona_sub = ZonaTrabajo.query.get(a.zona_trabajo)
        subs.append({
            'id'          : a.id_actividad,
            'categoria'   : a.categoria,
            'actividad'   : a.actividad,
            'tecnico'     : f"{tec_obj.nombre} {tec_obj.apellido}" if tec_obj else '—',
            'zona'        : zona_sub.descripcion if zona_sub else '—',
            'estado'      : a.estado,
            'fecha_inicio': a.fecha_inicio,
            'fecha_fin'   : a.fecha_fin
        })

    return jsonify({
        'id'            : p.id,
        'codigo'        : p.codigo,
        'nombre'        : p.nombre,
        'tipo_proyecto' : p.tipo_proyecto,
        'tipo_trabajo'  : p.tipo_trabajo,
        'responsable'   : p.responsable,
        'fecha_inicio'  : p.fecha_inicio,
        'fecha_fin'     : p.fecha_fin,
        'prioridad'     : p.prioridad,
        'estado'        : p.estado,
        'zona'          : zona_desc,
        'latitud'       : p.latitud,
        'longitud'      : p.longitud,
        'subactividades': subs
    }), 200


@proyectos_bp.route('/<int:id>', methods=['PUT'])
def update_proyecto(id):
    p = Proyecto.query.get_or_404(id)
    d = request.get_json() or {}
    for field in (
        'codigo','nombre','tipo_proyecto','tipo_trabajo',
        'responsable','fecha_inicio','fecha_fin',
        'prioridad','estado','zona_id','latitud','longitud'
    ):
        if field in d:
            setattr(p, field, d[field])
    db.session.commit()
    return jsonify({'msg':'Proyecto actualizado'}), 200


@proyectos_bp.route('/<int:id>', methods=['DELETE'])
def delete_proyecto(id):
    p = Proyecto.query.get_or_404(id)
    db.session.delete(p)
    db.session.commit()
    return jsonify({'msg':'Proyecto eliminado'}), 200


@proyectos_bp.route('/<int:id>/actividades', methods=['POST'])
def add_subactividad(id):
    p = Proyecto.query.get_or_404(id)
    d = request.get_json() or {}
    act_id = d.get('actividad_id')
    if not act_id:
        return jsonify({'msg':'actividad_id es obligatorio'}), 400
    a = Actividad.query.get_or_404(act_id)
    if a not in p.subactividades:  # type: ignore
        p.subactividades.append(a)
        db.session.commit()
    return jsonify({'msg':'Subactividad añadida'}), 200


@proyectos_bp.route('/<int:id>/actividades/<string:aid>', methods=['DELETE'])
def delete_subactividad(id, aid):
    p = Proyecto.query.get_or_404(id)
    a = Actividad.query.get_or_404(aid)
    if a in p.subactividades:  # type: ignore
        p.subactividades.remove(a)
        db.session.commit()
    return jsonify({'msg':'Subactividad quitada'}), 200


@proyectos_bp.route('/<int:id>/actividades', methods=['GET'])
def list_subactividades(id):
    p = Proyecto.query.get_or_404(id)
    subs = []
    for a in p.subactividades:  # type: ignore
        tec_obj = Tecnico.query.get(a.tecnico)
        zona_obj = ZonaTrabajo.query.get(a.zona_trabajo)
        subs.append({
            'id'          : a.id_actividad,
            'categoria'   : a.categoria,
            'actividad'   : a.actividad,
            'tecnico'     : f"{tec_obj.nombre} {tec_obj.apellido}" if tec_obj else '—',
            'zona'        : zona_obj.descripcion if zona_obj else '—',
            'estado'      : a.estado,
            'fecha_inicio': a.fecha_inicio,
            'fecha_fin'   : a.fecha_fin
        })
    return jsonify(subs), 200


# — Exportar PDF en horizontal sin logo —
@proyectos_bp.route('/<int:id>/export/pdf', methods=['GET'])
def export_proyecto_pdf(id: int) -> Response:
    p = Proyecto.query.get_or_404(id)
    actividades = list(p.subactividades)  # type: ignore

    # --- Preparar documento ---
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(letter),
        title=f"Proyecto {p.codigo}",
        leftMargin=36, rightMargin=36, topMargin=72, bottomMargin=72
    )

    # --- Estilos ---
    styles       = getSampleStyleSheet()
    title_style  = ParagraphStyle(
        'Title2Col', parent=styles['Heading1'], fontSize=18,
        alignment=TA_CENTER, spaceAfter=6
    )
    info_style   = ParagraphStyle(
        'Info', parent=styles['Normal'], fontSize=12, leading=14,
        leftIndent=8, bulletIndent=0
    )
    normal       = styles['Normal']
    subtitle_st  = ParagraphStyle(
        'SubTitle', parent=styles['Heading2'], fontSize=14,
        alignment=TA_LEFT, spaceBefore=12, spaceAfter=6
    )
    footer_style = ParagraphStyle(
        'Footer', parent=styles['Normal'], fontSize=10,
        alignment=TA_RIGHT
    )

    elements = []

    # --- Letterhead de fondo ---
    def draw_letterhead(canvas, doc):
        memb_path = os.path.join(current_app.static_folder or '', 'assets', 'letterhead.png')
        if os.path.exists(memb_path):
            w, h = landscape(letter)
            canvas.drawImage(memb_path, 0, 0, width=w, height=h, preserveAspectRatio=True)

    # --- Título centrado (sin logo) ---
    elements.append(Paragraph(
        f"📋 <b>Detalle del Proyecto</b><br/>{p.nombre} ({p.codigo})",
        title_style
    ))
    elements.append(Spacer(1, 12))

    # --- Información general en dos columnas con viñetas ---
    z_obj     = ZonaTrabajo.query.get(p.zona_id) if p.zona_id else None
    zona_desc = z_obj.descripcion if z_obj else '—'
    info = [
        ("Código",        p.codigo),
        ("Nombre",        p.nombre),
        ("Tipo Proyecto", p.tipo_proyecto),
        ("Tipo Trabajo",  p.tipo_trabajo),
        ("Responsable",   p.responsable),
        ("Fecha Inicio",  p.fecha_inicio),
        ("Fecha Fin",     p.fecha_fin),
        ("Prioridad",     p.prioridad),
        ("Estado",        p.estado),
        ("Zona",          zona_desc),
        ("Coordenadas",   f"{p.latitud}, {p.longitud}")
    ]
    rows = []
    for i in range(0, len(info), 2):
        left  = info[i]
        right = info[i+1] if i+1 < len(info) else ("", "")
        pleft  = Paragraph(f"• <b>{left[0]}:</b> {left[1]}", info_style)
        pright = Paragraph(f"• <b>{right[0]}:</b> {right[1]}", info_style)
        rows.append([pleft, pright])
    info_tbl = Table(rows, colWidths=[doc.width/2.0]*2)
    info_tbl.setStyle(TableStyle([
        ('VALIGN',       (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING',  (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
    ]))
    elements.append(info_tbl)
    elements.append(Spacer(1,18))

    # --- Subtítulo para subactividades ---
    elements.append(Paragraph(
        "Las siguientes actividades fueron realizadas para la ejecución del proyecto:",
        subtitle_st
    ))
    elements.append(Spacer(1,6))

    # --- Tabla de subactividades centrada y ajustada ---
    headers = ["Categoría","Actividad","Técnico","Zona","Estado","Inicio","Fin"]
    tbl_data = [[Paragraph(f"<b>{h}</b>", normal) for h in headers]]
    for a in actividades:
        tec_obj = Tecnico.query.get(a.tecnico) if a.tecnico else None
        z_obj   = ZonaTrabajo.query.get(a.zona_trabajo) if a.zona_trabajo else None
        tbl_data.append([
            Paragraph(a.categoria or '—', normal),
            Paragraph(a.actividad or '—', normal),
            Paragraph(f"{tec_obj.nombre} {tec_obj.apellido}" if tec_obj else '—', normal),
            Paragraph(z_obj.descripcion if z_obj else '—', normal),
            Paragraph(a.estado or '—', normal),
            Paragraph(a.fecha_inicio or '—', normal),
            Paragraph(a.fecha_fin or '—', normal),
        ])
    sub_tbl = Table(tbl_data, hAlign='CENTER', repeatRows=1, colWidths=[
        doc.width*0.12, doc.width*0.24, doc.width*0.14,
        doc.width*0.14, doc.width*0.10, doc.width*0.13, doc.width*0.13
    ])
    sub_tbl.setStyle(TableStyle([
        ('BACKGROUND',  (0,0), (-1,0), colors.HexColor('#ECEFF1')),
        ('TEXTCOLOR',   (0,0), (-1,0), colors.darkblue),
        ('GRID',        (0,0), (-1,-1), 0.5, colors.grey),
        ('FONTNAME',    (0,0), (-1,0), 'Helvetica-Bold'),
        ('VALIGN',      (0,0), (-1,-1), 'TOP'),
        ('ALIGN',       (0,0), (-1,0), 'CENTER'),
        ('LEFTPADDING',  (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
    ]))
    elements.append(sub_tbl)
    elements.append(Spacer(1,24))

    # --- Pie de página con firma (alineada a la derecha) ---
    elements.append(Paragraph(
        "🖊️ Firma Ing. de Red: ________________________________",
        footer_style
    ))

    # --- Generar y retornar PDF con fondo en cada página ---
    doc.build(
        elements,
        onFirstPage = draw_letterhead,
        onLaterPages= draw_letterhead
    )
    buffer.seek(0)
    return send_file(
        buffer,
        as_attachment=True,
        download_name=f"Proyecto_{p.codigo}.pdf",
        mimetype='application/pdf'
    )



