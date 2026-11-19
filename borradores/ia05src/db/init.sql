-- La base de la documentación: una tabla de trozos con su embedding y su texto para buscar por palabras.
-- Corre una sola vez, como superusuario, cuando el volumen de PostgreSQL está vacío.
CREATE DATABASE docs;
\connect docs

-- La extensión la crea el superusuario: pgvector no se puede instalar con un rol cualquiera.
CREATE EXTENSION IF NOT EXISTS vector;

-- Dos roles: el que indexa escribe; el que contesta preguntas solo lee.
CREATE ROLE docs_indexador LOGIN PASSWORD 'indexador';
CREATE ROLE docs_lector LOGIN PASSWORD 'lector';

-- Un trozo de una página del curso. La cita es pagina#ancla: la sección donde empieza el trozo.
CREATE TABLE trozos (
    id          bigserial PRIMARY KEY,
    estrategia  text NOT NULL CHECK (estrategia IN ('seccion', 'fijo')),
    prefijo     boolean NOT NULL,          -- si el embedding se calculó con "search_document: "
    pagina      text NOT NULL,             -- m25
    ancla       text NOT NULL,             -- durable
    parte       integer NOT NULL,          -- el número de trozo dentro de la página o de la sección
    titulo      text NOT NULL,
    texto       text NOT NULL,
    embedding   vector(768) NOT NULL,      -- nomic-embed-text: 768 números
    tsv         tsvector GENERATED ALWAYS AS (to_tsvector('spanish', titulo || ' ' || texto)) STORED,
    UNIQUE (estrategia, prefijo, pagina, ancla, parte)
);

-- Un índice HNSW por variante: filtrar antes de buscar, no después.
CREATE INDEX trozos_seccion_con ON trozos USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64) WHERE estrategia = 'seccion' AND prefijo;
CREATE INDEX trozos_seccion_sin ON trozos USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64) WHERE estrategia = 'seccion' AND NOT prefijo;
CREATE INDEX trozos_fijo_con ON trozos USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64) WHERE estrategia = 'fijo' AND prefijo;
CREATE INDEX trozos_fijo_sin ON trozos USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64) WHERE estrategia = 'fijo' AND NOT prefijo;

-- La búsqueda por palabras usa un índice invertido sobre el tsvector.
CREATE INDEX trozos_tsv ON trozos USING gin (tsv);

GRANT CONNECT ON DATABASE docs TO docs_indexador, docs_lector;
GRANT SELECT, INSERT, DELETE ON trozos TO docs_indexador;
GRANT USAGE ON SEQUENCE trozos_id_seq TO docs_indexador;
GRANT SELECT ON trozos TO docs_lector;
