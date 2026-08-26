-- Listinia — despensa em SQLite (Cloudflare D1)
-- Aplicar com:  npx wrangler d1 execute listinia --remote --file=./schema.sql

CREATE TABLE IF NOT EXISTS produtos (
  item           TEXT PRIMARY KEY,           -- nome normalizado, chave natural
  categoria      TEXT NOT NULL,
  quantidade     REAL NOT NULL DEFAULT 0,
  unidade        TEXT NOT NULL DEFAULT 'un',
  consumo_medio  REAL,                       -- quanto costuma comprar por vez
  ultima_compra  TEXT,                       -- AAAA-MM-DD
  ultimo_preco   REAL,
  atualizado_em  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON produtos(categoria);

CREATE TABLE IF NOT EXISTS notas (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  data       TEXT NOT NULL,                  -- AAAA-MM-DD
  mercado    TEXT NOT NULL,
  total      REAL,
  chave      TEXT UNIQUE,                    -- chave de acesso da NFC-e (evita duplicata)
  criada_em  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notas_data ON notas(data);

CREATE TABLE IF NOT EXISTS itens_nota (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  nota_id         INTEGER NOT NULL REFERENCES notas(id) ON DELETE CASCADE,
  item            TEXT NOT NULL,
  categoria       TEXT NOT NULL,
  quantidade      REAL,
  unidade         TEXT,
  preco_unitario  REAL,
  preco_total     REAL
);

CREATE INDEX IF NOT EXISTS idx_itens_nota ON itens_nota(nota_id);
CREATE INDEX IF NOT EXISTS idx_itens_item ON itens_nota(item);
