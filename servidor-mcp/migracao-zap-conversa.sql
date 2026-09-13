-- Memória de conversa do WhatsApp, por pessoa.
--
-- Por que existe: até 12/09/2026 o harness mandava ao modelo UMA mensagem só,
-- sem histórico nenhum. Todo turno era o turno zero, e isso quebrava em
-- silêncio o desenho que a própria casa tinha construído — o júri da loja
-- PERGUNTA à pessoa qual é o nome certo, e a resposta dela chegava sem
-- contexto do que havia sido perguntado.
--
-- Medido no primeiro teste real (transcript de 12/09, 23:13-23:17): o modelo
-- leu os 22 itens corretamente, pediu a confirmação do nome do mercado, e o
-- dono respondeu TRÊS vezes ("E cometa", "Supermercado Cometa", "Sim as
-- compras que acabamos de ler a nota"). As três se perderam, e a última
-- resposta do bot foi "não identifiquei nenhuma nota que a gente tenha lido
-- junto nessa conversa". A nota nunca foi gravada.
--
-- Guarda TEXTO, nunca imagem. Foto antiga entra como marcador ("[foto de nota
-- fiscal]"): base64 no banco custaria caro e o modelo não precisa rever a foto
-- para lembrar do que já leu — ele tem a própria leitura no histórico.
CREATE TABLE IF NOT EXISTS conversa_zap (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id   TEXT NOT NULL,
  papel     TEXT NOT NULL,              -- 'user' ou 'assistant'
  texto     TEXT NOT NULL,
  criada_em TEXT NOT NULL               -- ISO 8601, UTC
);

-- (user_id, id) porque toda leitura é "as últimas N desta pessoa".
CREATE INDEX IF NOT EXISTS idx_conversa_zap_pessoa ON conversa_zap (user_id, id);
