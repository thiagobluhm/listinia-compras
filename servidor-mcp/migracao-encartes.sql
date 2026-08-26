-- Listinia — encartes (lado lojista) e ofertas (lado consumidor)
--
-- ⚠️  BACKUP ANTES:
--     npx wrangler d1 export listinia --remote --output=backup-antes-encartes.sql
--
--     npx wrangler d1 execute listinia --local  --file=./migracao-encartes.sql
--     npx wrangler d1 execute listinia --remote --file=./migracao-encartes.sql
--
-- Nada aqui reconstrói tabela existente: é tudo CREATE novo. A despensa não
-- é tocada.

-- ------------------------------------------------------- tipos de negócio
-- Lookup em vez de CHECK: um ramo novo é um INSERT, não uma migration.
CREATE TABLE IF NOT EXISTS tipos_negocio (
  tipo    TEXT PRIMARY KEY,
  rotulo  TEXT NOT NULL
);

INSERT OR IGNORE INTO tipos_negocio (tipo, rotulo) VALUES
  ('mercado',  'Supermercado'),
  ('farmacia', 'Farmácia');

-- --------------------------------------------------------- estabelecimentos
CREATE TABLE IF NOT EXISTS estabelecimentos (
  id            TEXT PRIMARY KEY,
  tipo          TEXT NOT NULL REFERENCES tipos_negocio(tipo),
  nome          TEXT NOT NULL,
  cnpj          TEXT,
  cidade        TEXT,
  uf            TEXT,
  -- Nunca a chave em claro. Guardamos SHA-256; o lojista vê a chave uma vez.
  api_key_hash  TEXT UNIQUE,
  -- Quem administra a loja conversando com a Claude. A chave de API serve
  -- ao ERP; esta coluna serve à pessoa. Dois caminhos, um estabelecimento.
  dono_user_id  TEXT REFERENCES usuarios(id),
  ativo         INTEGER NOT NULL DEFAULT 1,
  criado_em     TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_estab_tipo ON estabelecimentos(tipo, ativo);
CREATE INDEX IF NOT EXISTS idx_estab_dono ON estabelecimentos(dono_user_id);

-- ------------------------------------------------------------------ encartes
CREATE TABLE IF NOT EXISTS encartes (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  estabelecimento_id TEXT NOT NULL REFERENCES estabelecimentos(id) ON DELETE CASCADE,
  vigencia_inicio    TEXT NOT NULL,          -- AAAA-MM-DD
  vigencia_fim       TEXT NOT NULL,          -- AAAA-MM-DD
  -- ativo = 0 é o "apagar o anterior". Não é DELETE de propósito: o histórico
  -- de preço é o ativo mais valioso que este banco vai acumular. Some da
  -- vitrine, permanece no histórico. Engano de verdade se apaga com
  -- encarte_remover, que aí sim é DELETE.
  ativo              INTEGER NOT NULL DEFAULT 1,
  -- Retry de automação e clique duplo não geram encarte repetido.
  idempotency_key    TEXT,
  publicado_em       TEXT NOT NULL,
  UNIQUE (estabelecimento_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_encartes_vigentes
  ON encartes(estabelecimento_id, ativo, vigencia_fim);

-- ------------------------------------------------------------ itens_encarte
CREATE TABLE IF NOT EXISTS itens_encarte (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  encarte_id          INTEGER NOT NULL REFERENCES encartes(id) ON DELETE CASCADE,
  produto             TEXT NOT NULL,
  marca               TEXT,
  unidade             TEXT NOT NULL DEFAULT 'un',
  preco               REAL NOT NULL,
  preco_de            REAL,
  ean                 TEXT,
  categoria           TEXT,
  limite_por_cliente  INTEGER,
  observacao          TEXT
);

CREATE INDEX IF NOT EXISTS idx_itens_encarte_encarte ON itens_encarte(encarte_id);
-- Busca do consumidor por nome e por código de barras.
CREATE INDEX IF NOT EXISTS idx_itens_encarte_produto  ON itens_encarte(produto);
CREATE INDEX IF NOT EXISTS idx_itens_encarte_ean      ON itens_encarte(ean);
