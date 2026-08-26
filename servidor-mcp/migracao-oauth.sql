-- Listinia — migração para multi-usuário (pré-requisito do OAuth)
--
-- ⚠️  FAÇA BACKUP ANTES:
--     npx wrangler d1 export listinia --remote --output=backup-antes-oauth.sql
--
-- Testar primeiro no local:
--     npx wrangler d1 execute listinia --local  --file=./migracao-oauth.sql
-- Depois, só depois:
--     npx wrangler d1 execute listinia --remote --file=./migracao-oauth.sql
--
-- SQLite não altera PRIMARY KEY no lugar: as tabelas são reconstruídas.
-- Os dados de hoje são atribuídos ao usuário legado 'u_legado'.

PRAGMA defer_foreign_keys = true;

-- ------------------------------------------------------------------ usuários
CREATE TABLE IF NOT EXISTS usuarios (
  id            TEXT PRIMARY KEY,           -- id interno, estável
  provedor      TEXT NOT NULL,              -- 'google', 'legado', ...
  provedor_sub  TEXT NOT NULL,              -- 'sub' do provedor
  email         TEXT,
  criado_em     TEXT NOT NULL,
  UNIQUE (provedor, provedor_sub)
);

-- Id interno em vez do 'sub' do Google direto nas tabelas: trocar de provedor
-- depois vira uma linha em usuarios, não um UPDATE em todo o histórico.
INSERT OR IGNORE INTO usuarios (id, provedor, provedor_sub, email, criado_em)
VALUES ('u_legado', 'legado', 'chave-no-path', NULL, datetime('now'));

-- ------------------------------------------------------------------ produtos
CREATE TABLE produtos_novo (
  user_id        TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  item           TEXT NOT NULL,
  categoria      TEXT NOT NULL,
  quantidade     REAL NOT NULL DEFAULT 0,
  unidade        TEXT NOT NULL DEFAULT 'un',
  consumo_medio  REAL,
  ultima_compra  TEXT,
  ultimo_preco   REAL,
  atualizado_em  TEXT NOT NULL,
  PRIMARY KEY (user_id, item)
);

INSERT INTO produtos_novo
  (user_id, item, categoria, quantidade, unidade, consumo_medio, ultima_compra, ultimo_preco, atualizado_em)
SELECT 'u_legado', item, categoria, quantidade, unidade, consumo_medio, ultima_compra, ultimo_preco, atualizado_em
FROM produtos;

DROP TABLE produtos;
ALTER TABLE produtos_novo RENAME TO produtos;
CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON produtos(user_id, categoria);

-- --------------------------------------------------------------------- notas
CREATE TABLE notas_novo (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  data       TEXT NOT NULL,
  mercado    TEXT NOT NULL,
  total      REAL,
  chave      TEXT,
  criada_em  TEXT NOT NULL,
  -- A unicidade da chave passa a ser POR USUÁRIO. Global, a nota que uma
  -- pessoa registra bloqueia a mesma nota para quem divide a casa com ela.
  UNIQUE (user_id, chave)
);

INSERT INTO notas_novo (id, user_id, data, mercado, total, chave, criada_em)
SELECT id, 'u_legado', data, mercado, total, chave, criada_em FROM notas;

DROP TABLE notas;
ALTER TABLE notas_novo RENAME TO notas;
CREATE INDEX IF NOT EXISTS idx_notas_data ON notas(user_id, data);

-- itens_nota não muda: o dono vem por nota_id, com ON DELETE CASCADE.
