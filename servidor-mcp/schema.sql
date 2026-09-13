-- Listinia — despensa em SQLite (Cloudflare D1)
-- Aplicar com:  npx wrangler d1 execute listinia --remote --file=./schema.sql
--
-- Este arquivo é o BOOTSTRAP: monta um banco vazio no estado que o código de
-- hoje espera. As `migracao-*.sql` são o histórico de como se chegou aqui e
-- só servem a um banco que já existe — não as rode em banco novo.
-- Conferido contra o schema do banco remoto em 13/09/2026.

-- ---------------------------------------------------------------- usuarios
-- Toda linha de dado pertence a uma pessoa. A identidade é (provedor, sub):
-- 'google' pelo OAuth, 'whatsapp' pelo telefone canonizado.
CREATE TABLE IF NOT EXISTS usuarios (
  id            TEXT PRIMARY KEY,           -- id interno, estável
  provedor      TEXT NOT NULL,              -- 'google', 'whatsapp', 'legado', ...
  provedor_sub  TEXT NOT NULL,              -- 'sub' do provedor
  email         TEXT,
  criado_em     TEXT NOT NULL,
  UNIQUE (provedor, provedor_sub)
);

-- ----------------------------------------------------------- tipos_negocio
CREATE TABLE IF NOT EXISTS tipos_negocio (
  tipo    TEXT PRIMARY KEY,
  rotulo  TEXT NOT NULL
);

INSERT OR IGNORE INTO tipos_negocio (tipo, rotulo) VALUES
  ('mercado',  'Supermercado'),
  ('farmacia', 'Farmácia');

-- --------------------------------------------------------- estabelecimentos
CREATE TABLE IF NOT EXISTS estabelecimentos (
  id                TEXT PRIMARY KEY,
  tipo              TEXT NOT NULL REFERENCES tipos_negocio(tipo),
  nome              TEXT NOT NULL,
  nome_normalizado  TEXT,
  cnpj              TEXT,
  cidade            TEXT,
  uf                TEXT,
  -- Nunca a chave em claro. Guardamos SHA-256; o lojista vê a chave uma vez.
  api_key_hash      TEXT UNIQUE,
  -- Quem administra a loja conversando com a Claude. A chave de API serve
  -- ao ERP; esta coluna serve à pessoa. Dois caminhos, um estabelecimento.
  dono_user_id      TEXT REFERENCES usuarios(id),
  ativo             INTEGER NOT NULL DEFAULT 1,
  criado_em         TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_estab_tipo      ON estabelecimentos(tipo, ativo);
CREATE INDEX IF NOT EXISTS idx_estab_dono      ON estabelecimentos(dono_user_id);
CREATE INDEX IF NOT EXISTS idx_estab_nome_norm ON estabelecimentos(nome_normalizado);

CREATE TABLE IF NOT EXISTS estabelecimento_apelidos (
  nome_normalizado   TEXT PRIMARY KEY,
  estabelecimento_id TEXT NOT NULL REFERENCES estabelecimentos(id) ON DELETE CASCADE,
  criado_em          TEXT NOT NULL
);

-- ---------------------------------------------------------------- produtos
CREATE TABLE IF NOT EXISTS produtos (
  user_id        TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  item           TEXT NOT NULL,              -- nome normalizado, chave natural
  categoria      TEXT NOT NULL,
  quantidade     REAL NOT NULL DEFAULT 0,
  unidade        TEXT NOT NULL DEFAULT 'un',
  consumo_medio  REAL,                       -- quanto costuma comprar por vez
  ultima_compra  TEXT,                       -- AAAA-MM-DD
  ultimo_preco   REAL,
  atualizado_em  TEXT NOT NULL,
  PRIMARY KEY (user_id, item)
);

CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON produtos(user_id, categoria);

-- ------------------------------------------------------------------- notas
CREATE TABLE IF NOT EXISTS notas (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id            TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  data               TEXT NOT NULL,          -- AAAA-MM-DD
  mercado            TEXT NOT NULL,
  total              REAL,
  chave              TEXT,                   -- chave de acesso da NFC-e
  estabelecimento_id TEXT REFERENCES estabelecimentos(id),
  criada_em          TEXT NOT NULL,
  -- A unicidade da chave é POR USUÁRIO. Global, a nota que uma pessoa
  -- registra bloqueia a mesma nota para quem divide a casa com ela.
  UNIQUE (user_id, chave)
);

CREATE INDEX IF NOT EXISTS idx_notas_data  ON notas(user_id, data);
CREATE INDEX IF NOT EXISTS idx_notas_estab ON notas(estabelecimento_id, data);

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

-- ---------------------------------------------------------------- encartes
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
CREATE INDEX IF NOT EXISTS idx_itens_encarte_produto ON itens_encarte(produto);
CREATE INDEX IF NOT EXISTS idx_itens_encarte_ean     ON itens_encarte(ean);

-- -------------------------------------------------------------- exposicoes
CREATE TABLE IF NOT EXISTS exposicoes (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id            TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  estabelecimento_id TEXT NOT NULL REFERENCES estabelecimentos(id) ON DELETE CASCADE,
  encarte_id         INTEGER NOT NULL REFERENCES encartes(id) ON DELETE CASCADE,
  produto            TEXT NOT NULL,
  ean                TEXT,
  preco_ofertado     REAL NOT NULL,
  contexto           TEXT NOT NULL,           -- 'lista' | 'busca'
  -- Foi a oferta mais barata mostrada para aquele item? Ganhar a lista é
  -- diferente de estar nela.
  venceu             INTEGER NOT NULL DEFAULT 0,
  momento            TEXT NOT NULL            -- ISO 8601
);

CREATE INDEX IF NOT EXISTS idx_expo_user    ON exposicoes(user_id, momento);
CREATE INDEX IF NOT EXISTS idx_expo_estab   ON exposicoes(estabelecimento_id, momento);
CREATE INDEX IF NOT EXISTS idx_expo_encarte ON exposicoes(encarte_id);

-- ------------------------------------------------------ portão de gasto/zap
-- Teto diário de turnos por pessoa no WhatsApp. Reseta por dia UTC.
CREATE TABLE IF NOT EXISTS uso_diario (
  user_id  TEXT    NOT NULL,
  dia      TEXT    NOT NULL,            -- AAAA-MM-DD, UTC
  turnos   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, dia)
);

-- Memória de conversa do agente no WhatsApp. Só TEXTO: foto de turno passado
-- entra como marcador. O porquê medido está em migracao-zap-conversa.sql.
CREATE TABLE IF NOT EXISTS conversa_zap (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id   TEXT NOT NULL,
  papel     TEXT NOT NULL,              -- 'user' ou 'assistant'
  texto     TEXT NOT NULL,
  criada_em TEXT NOT NULL               -- ISO 8601, UTC
);

CREATE INDEX IF NOT EXISTS idx_conversa_zap_pessoa ON conversa_zap (user_id, id);
