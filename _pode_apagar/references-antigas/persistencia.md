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

### ⚠️ `update_file` NÃO grava conteúdo — não use para salvar dados

A ferramenta `update_file` do Google Drive só altera **metadado**
(`title`, `parentId` — ou seja, renomear ou mover de pasta). Ela **não
tem** parâmetro de conteúdo. Chamá-la pensando que vai atualizar o texto
de um arquivo existente não funciona — na prática não salva nada, e é
uma causa comum de: (a) o usuário achar que salvou mas os dados sumiram
na conversa seguinte, e (b) a sessão ficar "pensando" por minutos tentando
alguma alternativa. **Nunca chame `update_file` para tentar persistir o
conteúdo de `despensa.jsonl`, `mercados.json`, `config-habitos.json` ou
`Listinia - Dashboard.md`.**

### Pasta dedicada (rapidez e precisão da busca)

Na primeira vez que esta skill rodar nesta conta, procure uma pasta
chamada exatamente `Listinia Compras`:

```
search_files: query = "title = 'Listinia Compras' and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
```

- Se existir, anote o `fileId` dela (é o `parentId` a usar daqui pra
  frente).
- Se não existir, crie com `create_file` (`mimeType`
  `application/vnd.google-apps.folder`, sem conteúdo) e anote o `fileId`.

Toda busca dos 4 arquivos de dados deve usar **esse `parentId` + nome
exato**, nunca `contains`/`fullText` livre — isso evita variação de
resultado e mantém a busca rápida e correta independente de quantos
arquivos existirem no Drive da pessoa:

```
search_files: query = "parentId = '<id da pasta>' and title = 'despensa.jsonl' and trashed = false"
```

### Como salvar (ler → recriar → substituir)

Como não existe uma operação de "sobrescrever conteúdo" no Drive
disponível aqui, salvar sempre significa **recriar o arquivo**:

1. Procure o arquivo com a query acima (pasta + nome exato).
2. Se encontrar: baixe com `download_file_content`/`read_file_content`,
   use o conteúdo real como ponto de partida, calcule o novo conteúdo
   completo, depois **apague o arquivo antigo com `trash_file`** (vai pra
   lixeira do Drive, reversível — não é apagar de vez) e **crie um
   arquivo novo com `create_file`**, mesmo `title` exato, mesmo
   `parentId` da pasta.
3. Se não encontrar (primeira vez de verdade): avise o usuário que vai
   criar o arquivo no Drive dele agora, e crie direto com `create_file`
   (nome exato da tabela acima, `parentId` da pasta) — sem precisar
   apagar nada antes.

O `fileId` muda a cada salvamento (é um arquivo novo) — por isso a busca
por pasta + nome exato do passo anterior é sempre o jeito de reencontrar o
arquivo certo, nunca guarde um `fileId` fixo entre uma conversa e outra.

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
