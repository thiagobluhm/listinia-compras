-- Teto de uso do WhatsApp, por usuário e por dia.
--
-- Por que existe: o número do bot é público por natureza — está num QR Code na
-- parede do mercado, no perfil, na conversa de quem indicou. Quem descobrir o
-- número gasta token nosso à vontade, e o turno roda em `waitUntil`, sem
-- ninguém olhando. Sem teto, um único contato hostil (ou um loop de app mal
-- comportado) vira fatura.
--
-- Conta TURNOS, não tokens: é o que se mede sem ambiguidade e sem depender do
-- provider. Se um dia a conta precisar ser em dinheiro, esta tabela vira a
-- base — a chave já é (usuário, dia).
CREATE TABLE IF NOT EXISTS uso_diario (
  user_id  TEXT    NOT NULL,
  dia      TEXT    NOT NULL,            -- AAAA-MM-DD, UTC
  turnos   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, dia)
);
