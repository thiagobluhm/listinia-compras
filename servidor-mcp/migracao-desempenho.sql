-- Listinia — o loop de atribuição: oferta mostrada → lista → nota fiscal
--
-- ⚠️  BACKUP ANTES:
--     npx wrangler d1 export listinia --remote --output=backup-antes-desempenho.sql
--     npx wrangler d1 execute listinia --local  --file=./migracao-desempenho.sql
--     npx wrangler d1 execute listinia --remote --file=./migracao-desempenho.sql
--
-- Isto é o que separa "vender atenção" de "vender atribuição". Sem a tabela
-- de exposições não existe numerador; sem o vínculo nota↔estabelecimento não
-- existe denominador.

-- --------------------------------------------------------------- exposições
-- Uma linha por oferta efetivamente mostrada a uma pessoa.
--
-- contexto = 'lista'  → a pessoa tinha aquele item na lista de compras.
--                        É a impressão qualificada: intenção declarada pelo
--                        consumo real, não olho em banner.
-- contexto = 'busca'  → ela procurou o produto. Vale menos, e é reportado
--                        separado — juntar os dois infla a métrica.
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

CREATE INDEX IF NOT EXISTS idx_expo_estab   ON exposicoes(estabelecimento_id, momento);
CREATE INDEX IF NOT EXISTS idx_expo_encarte ON exposicoes(encarte_id);
CREATE INDEX IF NOT EXISTS idx_expo_user    ON exposicoes(user_id, momento);

-- ------------------------------------------------- vínculo nota ↔ loja
-- A nota do consumidor traz o nome do mercado digitado do cupom. Para
-- atribuir uma compra a um estabelecimento cadastrado é preciso ligar os
-- dois — e ligar ERRADO é pior que não ligar: atribui venda de um lojista a
-- outro. Por isso o casamento é por nome normalizado exato, nunca aproximado.
ALTER TABLE notas ADD COLUMN estabelecimento_id TEXT REFERENCES estabelecimentos(id);
CREATE INDEX IF NOT EXISTS idx_notas_estab ON notas(estabelecimento_id, data);

ALTER TABLE estabelecimentos ADD COLUMN nome_normalizado TEXT;
CREATE INDEX IF NOT EXISTS idx_estab_nome_norm ON estabelecimentos(nome_normalizado);

-- Apelidos: um mercado aparece na nota como "BOM PRECO COM DE ALIM LTDA" e se
-- chama "Mercado Bom Preço - Centro". O lojista cadastra como o cupom dele
-- sai, uma vez, e as compras passam a ser atribuídas.
CREATE TABLE IF NOT EXISTS estabelecimento_apelidos (
  nome_normalizado   TEXT PRIMARY KEY,
  estabelecimento_id TEXT NOT NULL REFERENCES estabelecimentos(id) ON DELETE CASCADE,
  criado_em          TEXT NOT NULL
);
