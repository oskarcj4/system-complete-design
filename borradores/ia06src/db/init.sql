-- La agenda del consultorio. Corre una sola vez, cuando el volumen está vacío.
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE profesionales (
    id     text PRIMARY KEY,
    nombre text NOT NULL
);

CREATE TABLE citas (
    id          bigserial PRIMARY KEY,
    profesional text NOT NULL REFERENCES profesionales (id),
    franja      tstzrange NOT NULL,
    paciente    text NOT NULL,
    estado      text NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'cancelada')),
    clave       text NOT NULL UNIQUE,
    creada      timestamptz NOT NULL DEFAULT now(),
    CHECK (upper(franja) - lower(franja) = interval '30 minutes'),
    CONSTRAINT sin_choque EXCLUDE USING gist (profesional WITH =, franja WITH &&)
        WHERE (estado = 'activa')
);

-- El rol con el que entra el agente: lee, agrega y cambia el estado. No borra nada.
CREATE ROLE agenda_bot LOGIN PASSWORD 'agenda_bot';
GRANT CONNECT ON DATABASE consultorio TO agenda_bot;
GRANT USAGE ON SCHEMA public TO agenda_bot;
GRANT SELECT ON profesionales TO agenda_bot;
GRANT SELECT, INSERT ON citas TO agenda_bot;
GRANT UPDATE (estado) ON citas TO agenda_bot;
GRANT USAGE ON SEQUENCE citas_id_seq TO agenda_bot;

INSERT INTO profesionales (id, nombre) VALUES
    ('ruiz', 'la doctora Ruiz'),
    ('paz', 'el doctor Paz');
