import uuid
from models import TipoTrabajo, ZonaTrabajo, Tecnico

def generar_mensaje(form: dict) -> str:
    tipo = TipoTrabajo.query.get(form.get('tipo_trabajo'))
    zona = ZonaTrabajo.query.get(form.get('zona_trabajo'))
    tec  = Tecnico.query.get(form.get('tecnico'))
    lines = [
        f"✅ Actividad: {form.get('actividad','')}",
        f"🔧 Tipo de trabajo: {tipo.descripcion if tipo else ''}",
        f"📍 Zona: {zona.descripcion if zona else ''}",
        f"📋 Estado: {form.get('estado','')}",
        f"📝 Detalle: {form.get('detalle_actividad','')}",
        f"👷 Técnico: {tec.nombre + ' ' + tec.apellido if tec else ''}",
        f"📍 Coordenadas: {form.get('coordenadas','')}",
        f"📅 Fecha: {form.get('fecha_inicio','')} - {form.get('fecha_fin','')}"
    ]
    if form.get('observaciones','').strip():
        lines.append(f"🗒️ Observaciones: {form['observaciones']}")
    if form.get('fibra_solicitada','').strip():
        lines.append(f"📦 Fibra solicitada: {form['fibra_solicitada']}")
    if form.get('fibra_utilizada','').strip():
        lines.append(f"📦 Fibra utilizada: {form['fibra_utilizada']}")
    return "\n".join(lines)
