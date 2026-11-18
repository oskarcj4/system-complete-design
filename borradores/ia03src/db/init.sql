-- Corre una sola vez, como superusuario, cuando el volumen de PostgreSQL está vacío.
-- Dos bases en la misma instancia:
--   tienda:  clientes, pedidos y reembolsos viejos. Su dueño es el rol tienda.
--   soporte: lo del agente. Tickets, mensajes, acciones, políticas y checkpoints.

CREATE ROLE tienda         LOGIN PASSWORD 'tienda';
CREATE ROLE soporte_app    LOGIN PASSWORD 'app';
CREATE ROLE soporte_lector LOGIN PASSWORD 'lector' CONNECTION LIMIT 5;
CREATE ROLE soporte_actor  LOGIN PASSWORD 'actor'  CONNECTION LIMIT 2;
CREATE DATABASE tienda  OWNER tienda;
CREATE DATABASE soporte OWNER soporte_app;

REVOKE CONNECT ON DATABASE tienda, soporte FROM PUBLIC;
GRANT CONNECT ON DATABASE tienda TO soporte_lector, soporte_actor;

ALTER ROLE soporte_lector SET default_transaction_read_only = on;
ALTER ROLE soporte_lector SET statement_timeout = '3s';

\connect tienda
SET ROLE tienda;

CREATE TABLE clientes (
    id     int  PRIMARY KEY,
    nombre text NOT NULL,
    correo text NOT NULL UNIQUE
);

CREATE TABLE pedidos (
    id           int           PRIMARY KEY,
    cliente_id   int           NOT NULL REFERENCES clientes (id),
    creado_en    timestamptz   NOT NULL,
    estado       text          NOT NULL CHECK (estado IN ('pagado', 'enviado', 'entregado')),
    entregado_en timestamptz,
    total_usd    numeric(10,2) NOT NULL CHECK (total_usd > 0),
    direccion    text          NOT NULL
);

CREATE TABLE lineas (
    pedido_id  int           NOT NULL REFERENCES pedidos (id),
    producto   text          NOT NULL,
    cantidad   int           NOT NULL CHECK (cantidad > 0),
    precio_usd numeric(10,2) NOT NULL,
    PRIMARY KEY (pedido_id, producto)
);

-- Reembolsos ya conciliados con el proveedor. Los que hace el agente viven en soporte.acciones.
CREATE TABLE reembolsos (
    id        text          PRIMARY KEY,
    pedido_id int           NOT NULL REFERENCES pedidos (id),
    monto_usd numeric(10,2) NOT NULL CHECK (monto_usd > 0),
    creado_en timestamptz   NOT NULL
);

-- Row-level security: cada fila se ve solo si es del cliente de la sesión.
-- current_setting(..., true) devuelve NULL si la variable no está puesta, y NULL no es igual a nada.
ALTER TABLE clientes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE lineas     ENABLE ROW LEVEL SECURITY;
ALTER TABLE reembolsos ENABLE ROW LEVEL SECURITY;

CREATE POLICY propio ON clientes FOR SELECT
    USING (id = current_setting('app.cliente_id', true)::int);
CREATE POLICY propio ON pedidos FOR SELECT
    USING (cliente_id = current_setting('app.cliente_id', true)::int);
CREATE POLICY propio ON lineas FOR SELECT
    USING (EXISTS (SELECT 1 FROM pedidos p WHERE p.id = pedido_id));
CREATE POLICY propio ON reembolsos FOR SELECT
    USING (EXISTS (SELECT 1 FROM pedidos p WHERE p.id = pedido_id));

-- Las de arriba son solo para SELECT: si fueran para todo, se sumarían a esta (las políticas se combinan con OR)
-- y el actor podría cambiar un pedido ya enviado. El actor solo cambia la dirección de un pedido propio sin salir.
CREATE POLICY direccion ON pedidos FOR UPDATE TO soporte_actor
    USING (cliente_id = current_setting('app.cliente_id', true)::int AND estado = 'pagado')
    WITH CHECK (estado = 'pagado');

GRANT SELECT ON clientes, pedidos, lineas, reembolsos TO soporte_lector, soporte_actor;
GRANT UPDATE (direccion) ON pedidos TO soporte_actor;

\connect soporte
-- La extensión la crea el superusuario: pgvector no se puede instalar con un rol cualquiera.
CREATE EXTENSION IF NOT EXISTS vector;
SET ROLE soporte_app;

CREATE TABLE tickets (
    id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cliente_id    int           NOT NULL,
    origen        text          NOT NULL DEFAULT 'api' CHECK (origen IN ('api', 'cli', 'eval')),
    estado        text          NOT NULL DEFAULT 'abierto'
                                CHECK (estado IN ('abierto', 'esperando_aprobacion', 'cerrado')),
    modelo        text          NOT NULL,
    tokens_entrada int          NOT NULL DEFAULT 0,
    tokens_salida  int          NOT NULL DEFAULT 0,
    costo_usd     numeric(10,6) NOT NULL DEFAULT 0,
    creado_en     timestamptz   NOT NULL DEFAULT now()
);

CREATE TABLE mensajes (
    id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ticket_id bigint      NOT NULL REFERENCES tickets (id),
    autor     text        NOT NULL CHECK (autor IN ('cliente', 'agente', 'soporte')),
    texto     text        NOT NULL,
    camino    text,
    creado_en timestamptz NOT NULL DEFAULT now()
);

-- Cada efecto, con su clave. La fila se escribe antes de llamar al proveedor.
--   esperando: la política pidió una persona.  aprobada: se puede ejecutar.
--   hecha: el proveedor respondió.  pendiente: no respondió; se reintenta con la misma clave.
--   rechazada: una persona dijo que no. No reserva el monto.
CREATE TABLE acciones (
    clave        text          PRIMARY KEY,
    ticket_id    bigint        NOT NULL REFERENCES tickets (id),
    tipo         text          NOT NULL CHECK (tipo IN ('reembolso', 'direccion')),
    pedido_id    int           NOT NULL,
    monto_usd    numeric(10,2),
    args         jsonb         NOT NULL,
    estado       text          NOT NULL
                               CHECK (estado IN ('esperando', 'aprobada', 'hecha', 'pendiente', 'rechazada')),
    aprobado_por text,
    nota         text,
    resultado    jsonb,
    creada_en    timestamptz   NOT NULL DEFAULT now(),
    cambiada_en  timestamptz   NOT NULL DEFAULT now()
);
CREATE INDEX acciones_pedido ON acciones (pedido_id) WHERE estado <> 'rechazada';

CREATE TABLE politicas (
    archivo   text NOT NULL,
    seccion   text NOT NULL,
    texto     text NOT NULL,
    embedding vector(768) NOT NULL,
    PRIMARY KEY (archivo, seccion)
);
