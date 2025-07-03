import os
import uuid
from datetime import datetime
from extensions import db

class Tecnico(db.Model):
    id       = db.Column(db.Integer, primary_key=True)
    nombre   = db.Column(db.String(100), nullable=False)
    apellido = db.Column(db.String(100), nullable=False)
    telefono = db.Column(db.String(20),  nullable=False)
    placa    = db.Column(db.String(20),  nullable=False)

class TipoTrabajo(db.Model):
    id          = db.Column(db.Integer, primary_key=True)
    descripcion = db.Column(db.String(100), nullable=False)

class ZonaTrabajo(db.Model):
    id          = db.Column(db.Integer, primary_key=True)
    descripcion = db.Column(db.String(100), nullable=False)

class Actividad(db.Model):
    id_actividad      = db.Column(db.String(36), primary_key=True)
    categoria         = db.Column(db.String(20))
    actividad         = db.Column(db.String(100))
    tipo_trabajo      = db.Column(db.Integer, db.ForeignKey('tipo_trabajo.id'))
    zona_trabajo      = db.Column(db.Integer, db.ForeignKey('zona_trabajo.id'))
    estado            = db.Column(db.String(50))
    coordenadas       = db.Column(db.String(100))
    detalle_actividad = db.Column(db.Text)
    tecnico           = db.Column(db.Integer, db.ForeignKey('tecnico.id'))
    fecha_inicio      = db.Column(db.String(20))
    fecha_fin         = db.Column(db.String(20))
    hora_inicio       = db.Column(db.String(10))
    hora_fin          = db.Column(db.String(10))
    fibra_solicitada  = db.Column(db.String(100))
    fibra_utilizada   = db.Column(db.String(100))
    observaciones     = db.Column(db.Text)
    mensaje_generado  = db.Column(db.Text)
    created_at        = db.Column(db.DateTime, default=datetime.utcnow)
    def __init__(self, **kwargs) -> None:
        """
        Permite pasar id_actividad, categoria, actividad, etc.
        como kwargs sin que Pylance dé error.
        """
        super().__init__(**kwargs)

class Foto(db.Model):
    id           = db.Column(db.Integer, primary_key=True)
    id_actividad = db.Column(db.String(36), db.ForeignKey('actividad.id_actividad'))
    filename     = db.Column(db.String(200))
    filepath     = db.Column(db.String(300))

class Recordatorio(db.Model):
    id          = db.Column(db.Integer, primary_key=True)
    titulo      = db.Column(db.String(200), nullable=False)
    descripcion = db.Column(db.Text)
    fecha       = db.Column(db.String(10), nullable=False)  # "YYYY-MM-DD"
    hora        = db.Column(db.String(5))                   # "HH:MM"
# models.py (fragmento de ejemplo)
from datetime import datetime
from extensions import db

class Asistencia(db.Model):
    __tablename__ = 'asistencia'

    id             = db.Column(db.Integer, primary_key=True)
    tecnico_id     = db.Column(db.Integer, db.ForeignKey('tecnico.id'), nullable=False)
    fecha_ingreso  = db.Column(db.String(10), nullable=False)   # "YYYY-MM-DD"
    hora_entrada   = db.Column(db.String(5),  nullable=False)   # "HH:MM"  (24 h)
    fecha_salida   = db.Column(db.String(10))                   # "YYYY-MM-DD"
    hora_salida    = db.Column(db.String(5))                    # "HH:MM"  (24 h)
    created_at     = db.Column(db.DateTime, default=datetime.utcnow)

# Tabla intermedia para la relación muchos-a-muchos
proyecto_actividad = db.Table(
    'proyecto_actividad',
    db.Column('proyecto_id',  db.Integer, db.ForeignKey('proyecto.id'),           primary_key=True),
    db.Column('actividad_id', db.String(36), db.ForeignKey('actividad.id_actividad'), primary_key=True)
)

class Proyecto(db.Model):
    __tablename__ = 'proyecto'

    id            = db.Column(db.Integer, primary_key=True)
    codigo        = db.Column(db.String(50), unique=True, nullable=False)
    nombre        = db.Column(db.String(200), nullable=False)
    tipo_proyecto = db.Column(db.String(50), nullable=False)  # "Residencial" | "ISP"
    tipo_trabajo  = db.Column(db.String(50), nullable=False)  # dinámico según tipo_proyecto
    responsable   = db.Column(db.String(200), nullable=False)
    fecha_inicio  = db.Column(db.String(10), nullable=False)  # "YYYY-MM-DD"
    fecha_fin     = db.Column(db.String(10), nullable=False)
    prioridad     = db.Column(db.String(10), nullable=False)  # "Alta","Media","Baja"
    estado        = db.Column(db.String(20), nullable=False)  # "Planeación","En curso","Cerrado"
    zona_id       = db.Column(db.Integer, db.ForeignKey('zona_trabajo.id'))
    latitud       = db.Column(db.Float)
    longitud      = db.Column(db.Float)

    # Relación con Actividad vía la tabla intermedia
    subactividades = db.relationship(
        'Actividad',
        secondary=proyecto_actividad,
        backref='proyectos'
    )

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<Proyecto {self.codigo} - {self.nombre}>"