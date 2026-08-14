# Persistência de dados — estratégia em camadas (fallback)

Este plugin gerencia quatro arquivos de dados, todos seguindo a MESMA
lógica de persistência, em cascata. Nunca pule uma camada sem checar —
cada uma só é usada se a anterior não estiver disponível.

| Arquivo | Conteúdo |
|---|---|
| `despensa.jsonl` | Log de eventos da despensa (compras, ajustes, checagens visuais) |
| `mercados.json` | Mercados preferidos cadastrados (skill `pesquisa-encartes-mercado`) |
| `config-habitos.json` | Frequência de compra e durações de categoria customizadas |
| `Listinia - Dashboard.md` | Dashboard em Markdown (skill `dashboard-despensa`) |

## Camada 1 — Google Drive (padrão, automático, omnichannel)

Se as ferramentas de Google Drive estiverem disponíveis nesta sessão
(usuário já conectou o conector): **esta é sempre a fonte de verdade.**
Funciona igual em qualquer canal — celular, web, desktop — porque depende
só da conta, não de nada estar fisicamente conectado.

1. Procure o arquivo pelo nome exato com `search_files` (ex.:
   `despensa.jsonl`, `mercados.json`).
2. Se encontrar: baixe com `download_file_content`/`read_file_content`,
   use o conteúdo real, e ao final grave de volta no MESMO arquivo
   (`update_file`, mesmo `file_id`) — nunca crie um segundo arquivo com o
   mesmo propósito.
3. Se não encontrar (primeira vez de verdade): avise o usuário que vai
   criar o arquivo no Drive dele agora, crie com `create_file` usando o
   nome exato da tabela acima, e prossiga.

**Nunca obrigue o usuário a conectar o Drive.** Se ele não tiver conectado,
caia para a Camada 2 — sem bloquear o uso do plugin.

## Camada 2 — Anexo manual (fallback universal, sem depender de conector)

Se o Google Drive não estiver disponível nesta sessão:

1. No início da conversa, pergunte se o usuário tem um arquivo salvo de
   uma conversa anterior (ex.: `despensa.jsonl`) pra anexar — se anexar,
   use o conteúdo dele como ponto de partida real, em vez de começar do
   zero.
2. Se ele não tiver ou for a primeira vez, comece do zero, mas avise
   claramente: **ao final da conversa, ofereça o arquivo atualizado para
   download (`SendUserFile`)** e diga explicitamente que ele precisa
   salvar esse arquivo e anexá-lo de novo na próxima conversa para
   continuar de onde parou. Deixe claro que esse processo é manual e tem
   mais chance de erro (esquecer de salvar, anexar versão antiga) do que
   conectar o Google Drive — e ofereça ajudar a conectar o Drive se o
   usuário quiser resolver isso de vez.

## Camada 3 — Só a sessão atual (nenhuma persistência)

Se não houver Drive nem o usuário quiser lidar com anexo manual: prossiga
normalmente, mas avise no início que nada vai sobreviver ao fim desta
conversa. Sempre ofereça o arquivo final para download como registro.

## Regra geral

Nunca prossiga silenciosamente sem deixar claro em qual camada você está
operando — o usuário precisa saber, na hora, se o que está sendo
criado/atualizado é permanente, semi-manual, ou temporário.
