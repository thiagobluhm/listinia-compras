# Contratos de handoff entre os agentes

Todo subagente do Listinia começa com contexto frio: ele não vê a conversa,
não vê as fotos anexadas e não sabe o que já foi decidido. O orquestrador é
quem carrega o contexto — cada delegação tem que ser um briefing completo.

Cada subagente devolve **um bloco de texto curto para o usuário** + **um bloco
`DADOS:` em JSON** que o orquestrador usa para encadear o próximo passo. O
orquestrador nunca mostra o bloco `DADOS:` ao usuário.

---

## Regras que valem para todos

- **Fonte única de verdade: o MCP `listinIA`.** Não existe arquivo JSONL,
  planilha-fonte, Google Drive, sincronização local↔Drive nem `notas-hash`.
  A despensa vive no servidor; quem quiser saber o estado, pergunta a ele.
- **Só o `listinia-despensor` escreve.** Todos os outros agentes são somente
  leitura. Se um agente concluir que algo precisa ser gravado, ele devolve a
  proposta no `DADOS:` e o orquestrador decide.
- **Nunca invente número.** Preço, quantidade ou nome que não foi lido com
  clareza volta como `null` e é sinalizado em `pendencias`, nunca chutado.
- **Cálculo é do MCP.** Dias restantes, status e categoria vêm de
  `despensa_status` / `nota_registrar`. Nenhum agente recalcula isso de
  cabeça nem reimplementa a tabela de validade.

---

## `listinia-leitor-visual` → orquestrador

```
DADOS:
{
  "origem": "qr" | "foto" | "geladeira",
  "url_nfce": "https://..." | null,
  "mercado": "string" | null,
  "data": "AAAA-MM-DD" | null,
  "total": number | null,
  "itens": [{"item": "", "quantidade": 0, "unidade": "un", "preco_unitario": null, "preco_total": null}],
  "visiveis": ["leite", "ovos"],
  "pendencias": ["não li o preço do item 4", "foto parece ser só metade do cupom"],
  "falhou": true | false
}
```

`origem: "qr"` devolve só `url_nfce` — quem abre a página é o
`listinia-navegador`.

## `listinia-navegador` → orquestrador

```
DADOS:
{
  "modo": "nfce" | "encartes",
  "mercado": "string" | null,
  "data": "AAAA-MM-DD" | null,
  "total": number | null,
  "itens": [...],                       // modo nfce
  "ofertas": [{"mercado": "", "produto": "", "preco": 0, "unidade": ""}],  // modo encartes
  "mercados_sem_dados": ["Mercado X"],
  "falhou": true | false,
  "motivo": "string" | null
}
```

## `listinia-despensor` → orquestrador

```
DADOS:
{
  "acao": "registrou_nota" | "ajustou_produto" | "removeu" | "leu_estado" | "exportou",
  "duplicada": true | false,
  "itens_gravados": 0,
  "total": number | null,
  "estado": [{"item": "", "quantidade": 0, "unidade": "", "categoria": "", "dias_restantes": 0, "status": ""}],
  "arquivo": "caminho/despensa.xlsx" | null
}
```

## `listinia-listador` → orquestrador

```
DADOS:
{
  "frequencia_dias": 7,
  "lista": [{"item": "", "quantidade_sugerida": 0, "unidade": "", "urgencia": "crítica|alta|normal", "dias_restantes": 0}],
  "despensa_abastecida": true | false,
  "arquivo": "caminho/lista-de-compras.xlsx" | null
}
```

## `listinia-analista-gastos` → orquestrador

```
DADOS:
{
  "periodo": "2026-08",
  "total_mes": 0,
  "notas_mes": 0,
  "variacao_mes_anterior": 0.0 | null,
  "arquivo": "caminho/Listinia - Dashboard.md",
  "secoes_vazias": ["histórico de gasto"]
}
```
