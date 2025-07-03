#!/usr/bin/env python3
import sqlite3
import os
import sys

# ---------------------------------------
# 1) Detectamos la ruta absoluta al directorio
#    donde está este script
# ---------------------------------------
BASEDIR = os.path.abspath(os.path.dirname(__file__))

# ---------------------------------------
# 2) Construimos la ruta a database.sqlite3
#    (asumiendo que está en backend/db/database.sqlite3
#     y que este script lo colocas dentro de backend/)
# ---------------------------------------
DB_PATH = os.path.join(BASEDIR, "db", "database.sqlite3")

if not os.path.exists(DB_PATH):
    print(f"❌ No encontré la DB en:\n    {DB_PATH}")
    sys.exit(1)

print("🗄  Usando base de datos:", DB_PATH)

# 3) Abrimos conexión y obtenemos cursor
conn = sqlite3.connect(DB_PATH)
c    = conn.cursor()

# 4) Desactivamos temporalmente las foreign keys
c.execute("PRAGMA foreign_keys = OFF;")

# 5) Renombrar la tabla antigua
print("🔄 Renombrando tabla asistencia → asistencia_old")
c.execute("ALTER TABLE asistencia RENAME TO asistencia_old;")

# 6) Crear la nueva tabla con las columnas corregidas
print("➡️  Creando nueva tabla asistencia")
c.execute("""
CREATE TABLE asistencia (
  id             INTEGER PRIMARY KEY,
  tecnico_id     INTEGER NOT NULL REFERENCES tecnico(id),
  fecha_ingreso  TEXT    NOT NULL,   -- antes era 'fecha'
  hora_entrada   TEXT    NOT NULL,   -- antes era 'hora_entrada'
  fecha_salida   TEXT,                -- nueva columna
  hora_salida    TEXT,                -- nueva columna
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP
);
""")

# 7) Copiar los datos de la tabla vieja a la nueva
#    Aquí sólo copio los campos que existían: id, tecnico_id, fecha→fecha_ingreso, hora_entrada, created_at
#    Si tu vieja tabla también tenía salida, añádelo al SELECT.
print("📦 Copiando datos desde asistencia_old → asistencia")
c.execute("""
INSERT INTO asistencia (id, tecnico_id, fecha_ingreso, hora_entrada, created_at)
SELECT id, tecnico_id, fecha, hora_entrada, created_at
  FROM asistencia_old;
""")

# 8) Eliminamos la tabla antigua
print("🗑  Eliminando asistencia_old")
c.execute("DROP TABLE asistencia_old;")

# 9) Volvemos a activar foreign keys
c.execute("PRAGMA foreign_keys = ON;")

# 10) Confirmamos todo
conn.commit()
conn.close()
print("🎉 Migración completada con éxito!")
