PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE itens_nota (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  nota_id         INTEGER NOT NULL REFERENCES notas(id) ON DELETE CASCADE,
  item            TEXT NOT NULL,
  categoria       TEXT NOT NULL,
  quantidade      REAL,
  unidade         TEXT,
  preco_unitario  REAL,
  preco_total     REAL
);
CREATE TABLE usuarios (
  id            TEXT PRIMARY KEY,           -- id interno, estável
  provedor      TEXT NOT NULL,              -- 'google', 'legado', ...
  provedor_sub  TEXT NOT NULL,              -- 'sub' do provedor
  email         TEXT,
  criado_em     TEXT NOT NULL,
  UNIQUE (provedor, provedor_sub)
);
INSERT INTO "usuarios" ("id","provedor","provedor_sub","email","criado_em") VALUES('u_legado','google','111004676499390112450','thiagobluhm@gmail.com','2026-08-26 03:28:19');
CREATE TABLE IF NOT EXISTS "produtos" (
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
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Coxão Mole em Cubos','carnes & aves',0.372,'kg',0.372,'2026-03-04',64.99,'2026-08-25T20:52:18.175Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Bife de Patinho','carnes & aves',1.108,'kg',0.328,'2026-08-24',75.59,'2026-08-25T21:26:46.483Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Carne Moída Primeira','carnes & aves',0.6,'kg',0.352,'2026-08-24',78.99,'2026-08-25T21:26:46.483Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Iogurte Minas Itambé','laticínios',1,'un',1,'2026-03-04',12.35,'2026-08-25T20:52:18.175Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Peito de Peru Sadia','carnes & aves',0.1,'kg',0.1,'2026-03-04',59.99,'2026-08-25T20:52:18.175Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Leite UHT Betânia','laticínios',17,'un',3,'2026-08-24',6.89,'2026-08-25T21:26:46.483Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Manteiga Framilk','laticínios',1,'un',1,'2026-03-04',23.55,'2026-08-25T20:52:18.175Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Composto Lácteo Ninho','laticínios',1,'un',1,'2026-03-04',25.59,'2026-08-25T20:52:18.175Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Catchup Cepêra Zero','mercearia',1,'un',1,'2026-03-04',16.99,'2026-08-25T20:52:18.175Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Molho de Tomate Pomarola','mercearia',4,'un',1,'2026-08-24',20.89,'2026-08-25T21:26:46.483Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Iogurte Nestlé Grego','laticínios',1,'un',1,'2026-03-04',11.29,'2026-08-25T20:52:18.175Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Iogurte Nestlé Bicamada','laticínios',2,'un',2,'2026-03-04',3.49,'2026-08-25T20:52:18.175Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Iogurte Danone Natural','laticínios',6,'un',4,'2026-08-11',4.45,'2026-08-25T21:22:17.080Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Suco Polar de Polpa','bebidas',1,'un',1,'2026-03-04',13.65,'2026-08-25T20:52:18.175Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Polpa Pomar','congelados',2,'un',1,'2026-08-11',14.99,'2026-08-25T21:22:17.080Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Polpa Frosty Graviola','congelados',2,'un',2,'2026-03-04',12.69,'2026-08-25T20:52:18.175Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Café 3 Corações','bebidas',7,'un',2,'2026-08-24',37.49,'2026-08-25T21:26:46.483Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Café Santa Clara','bebidas',2,'un',1,'2026-04-14',24.99,'2026-08-25T21:01:10.831Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Chá Leãozinho','bebidas',1,'un',1,'2026-03-04',15.19,'2026-08-25T20:52:18.175Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Chá Horizonte Cidreira','bebidas',1,'un',1,'2026-03-04',6.2,'2026-08-25T20:52:18.175Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Achocolatado em Pó Duomal','bebidas',1,'un',1,'2026-03-04',15.99,'2026-08-25T20:52:18.175Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Aveia Jasmine em Flocos','mercearia',1,'un',1,'2026-03-04',3.75,'2026-08-25T20:52:18.175Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Biscoito Jasmine sem Sal','biscoitos & salgadinhos',1,'un',1,'2026-03-04',5.85,'2026-08-25T20:52:18.175Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Biscoito Vitalin Cookie','biscoitos & salgadinhos',8,'un',4,'2026-04-07',3.89,'2026-08-25T20:54:49.037Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Biscoito Fit Food de Arroz','biscoitos & salgadinhos',2,'un',2,'2026-03-04',10.49,'2026-08-25T20:52:18.175Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Flocos de Milho','mercearia',1,'un',1,'2026-03-04',3.49,'2026-08-25T20:52:18.175Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Biscoito Piraquê Salgado','biscoitos & salgadinhos',1,'un',1,'2026-03-04',4.99,'2026-08-25T20:52:18.175Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Óleo de Coco Adel','mercearia',1,'un',1,'2026-03-04',16.99,'2026-08-25T20:52:18.175Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Morango Serra Sul','hortifrúti',4,'un',1,'2026-08-24',9.98,'2026-08-25T21:26:46.483Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Brócolis Serra Sul','hortifrúti',2,'un',1,'2026-08-24',9.98,'2026-08-25T21:26:46.483Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Abobrinha Italiana','hortifrúti',1.1099999999999999,'kg',0.285,'2026-08-24',6.79,'2026-08-25T21:26:46.483Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Limão Galego','hortifrúti',0.21,'kg',0.21,'2026-03-04',5.98,'2026-08-25T20:52:18.175Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Coentro com Cebolinha','hortifrúti',2,'un',2,'2026-03-04',2.49,'2026-08-25T20:52:18.175Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Alface Crespa Verde','hortifrúti',2,'un',1,'2026-08-24',4.79,'2026-08-25T21:26:46.483Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Pão de Hambúrguer Panco','padaria',5,'un',2,'2026-08-24',7.99,'2026-08-25T21:26:46.483Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Papel Toalha Scala','limpeza',1,'un',1,'2026-03-04',6.15,'2026-08-25T20:52:18.175Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Banana Passas','mercearia',2,'un',1,'2026-04-07',11.99,'2026-08-25T20:54:49.037Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Batata Congelada McCain','congelados',1,'un',1,'2026-04-07',9.99,'2026-08-25T20:54:49.037Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Pão Lanche Gostão','padaria',1,'un',1,'2026-04-07',19.89,'2026-08-25T20:54:49.037Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Alcatra Suína','carnes & aves',0.46,'kg',0.46,'2026-04-07',39.99,'2026-08-25T20:54:49.037Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Coxão Mole Strogonoff','carnes & aves',0.368,'kg',0.368,'2026-04-07',63.01,'2026-08-25T20:54:49.037Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Coxão Mole em Bife','carnes & aves',0.359,'kg',0.359,'2026-04-07',62.9,'2026-08-25T20:54:49.037Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Sobrecoxa de Frango','carnes & aves',2,'un',1,'2026-08-24',13.59,'2026-08-25T21:26:46.483Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Creme de Leite Itambé','laticínios',2,'un',2,'2026-04-07',3.59,'2026-08-25T20:54:49.037Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Molho de Tomate Heinz','mercearia',1,'un',1,'2026-04-07',15.99,'2026-08-25T20:54:49.037Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Uva Passas','mercearia',1,'un',1,'2026-04-07',9.9,'2026-08-25T20:54:49.037Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Mostarda Heinz','mercearia',1,'un',1,'2026-04-07',19.29,'2026-08-25T20:54:49.037Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Ketchup Heinz','mercearia',1,'un',1,'2026-04-07',10.39,'2026-08-25T20:54:49.037Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Atum Coqueiro Ralado','mercearia',2,'un',2,'2026-04-07',10.89,'2026-08-25T20:54:49.037Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Milho para Pipoca Yoki','mercearia',4,'un',2,'2026-08-11',6.69,'2026-08-25T21:22:17.080Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Arroz Emoções Branco','mercearia',1,'un',1,'2026-04-07',3.98,'2026-08-25T20:54:49.037Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Açúcar Precioso','mercearia',1,'un',1,'2026-04-07',10.19,'2026-08-25T20:54:49.037Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Café Solúvel 3 Corações','bebidas',1,'un',1,'2026-04-07',7.99,'2026-08-25T20:54:49.037Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Pimentão Verde','hortifrúti',0.5249999999999999,'kg',0.18,'2026-08-24',10.99,'2026-08-25T21:26:46.483Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Beterraba','hortifrúti',1.49,'kg',0.675,'2026-08-11',8.49,'2026-08-25T21:22:17.080Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Cebola Roxa','hortifrúti',0.915,'kg',0.475,'2026-08-24',11.99,'2026-08-25T21:26:46.483Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Cenoura','hortifrúti',1.475,'kg',0.46,'2026-08-24',11.29,'2026-08-25T21:26:46.483Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Coentro Comum','hortifrúti',6,'un',2,'2026-08-11',2.55,'2026-08-25T21:22:17.080Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Pimentão Amarelo','hortifrúti',0.62,'kg',0.305,'2026-08-11',29.99,'2026-08-25T21:22:17.080Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Acelga','hortifrúti',0.278,'kg',0.278,'2026-04-07',9.98,'2026-08-25T20:54:49.037Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Batata Inglesa','hortifrúti',1.285,'kg',0.58,'2026-08-11',9.98,'2026-08-25T21:22:17.080Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Tomate','hortifrúti',2.275,'kg',0.705,'2026-08-11',8.99,'2026-08-25T21:22:17.080Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Milho Verde','hortifrúti',0.692,'kg',0.692,'2026-04-07',10.98,'2026-08-25T20:54:49.037Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Brócolis Horfelix','hortifrúti',1,'un',1,'2026-04-07',12.68,'2026-08-25T20:54:49.037Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Filé de Peito de Frango','carnes & aves',2,'un',1,'2026-08-11',17.99,'2026-08-25T21:22:17.080Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Cubo Bovino Dianteiro','carnes & aves',0.28,'kg',0.28,'2026-04-14',62.99,'2026-08-25T21:01:10.831Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Patinho Bovino','carnes & aves',0.282,'kg',0.282,'2026-04-14',59.99,'2026-08-25T21:01:10.831Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Massa Barilla Capellini','mercearia',2,'un',2,'2026-04-14',20.75,'2026-08-25T21:01:10.831Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Massa Barilla Farfalle','mercearia',1,'un',1,'2026-04-14',23.15,'2026-08-25T21:01:10.831Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Água de Coco Aquaviva','bebidas',1,'un',1,'2026-04-14',15.99,'2026-08-25T21:01:10.831Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Iogurte Batavo Pense Zero','laticínios',1,'un',1,'2026-04-14',13.99,'2026-08-25T21:01:10.831Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Iogurte Nestlé Chambinho','laticínios',3,'un',3,'2026-04-14',3.59,'2026-08-25T21:01:10.831Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Leite Fermentado Chamyto','laticínios',1,'un',1,'2026-04-14',7.99,'2026-08-25T21:01:10.831Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Manteiga Isis com Sal','laticínios',1,'un',1,'2026-04-14',25.99,'2026-08-25T21:01:10.831Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Leite em Pó Itambé','laticínios',2,'un',1,'2026-08-11',7.89,'2026-08-25T21:22:17.080Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Molho de Tomate Heinz Pelado','mercearia',2,'un',2,'2026-04-14',3.99,'2026-08-25T21:01:10.831Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Café 3 Corações Gourmet','bebidas',2,'un',1,'2026-08-11',23.99,'2026-08-25T21:22:17.080Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Alface Americana','hortifrúti',1,'un',1,'2026-04-14',4.95,'2026-08-25T21:01:10.831Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Pera Danjur','hortifrúti',0.62,'kg',0.62,'2026-04-14',24.49,'2026-08-25T21:01:10.831Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Mix de Nozes Duonorte','mercearia',1,'un',1,'2026-04-14',20.49,'2026-08-25T21:01:10.831Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Tangerina Clemenules','hortifrúti',0.625,'kg',0.625,'2026-04-14',27.49,'2026-08-25T21:01:10.831Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Granola Biosoft','mercearia',1,'un',1,'2026-04-14',11.75,'2026-08-25T21:01:10.831Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Barra Nuts Banana','mercearia',4,'un',4,'2026-04-14',4.89,'2026-08-25T21:01:10.831Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Torrada Equilíbrio','padaria',2,'un',2,'2026-04-14',3.69,'2026-08-25T21:01:10.831Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Biscoito Jasmine','biscoitos & salgadinhos',1,'un',1,'2026-04-14',5.99,'2026-08-25T21:01:10.831Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Aveia Allnutri em Flocos','mercearia',1,'un',1,'2026-04-14',4.49,'2026-08-25T21:01:10.831Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Goiaba Vermelha','hortifrúti',0.525,'kg',0.525,'2026-04-14',6.98,'2026-08-25T21:01:10.831Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Mamão Formosa','hortifrúti',0.616,'kg',0.616,'2026-04-14',7.69,'2026-08-25T21:01:10.831Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Melão Japonês','hortifrúti',1.6320000000000001,'kg',0.262,'2026-08-24',17.99,'2026-08-25T21:26:46.483Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Manga Tommy','hortifrúti',0.465,'kg',0.465,'2026-04-14',6.99,'2026-08-25T21:01:10.831Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Morango Rio Sul','hortifrúti',1,'un',1,'2026-04-14',9.99,'2026-08-25T21:01:10.831Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Melancia Cortada','hortifrúti',1.944,'kg',1.944,'2026-04-14',2.88,'2026-08-25T21:01:10.831Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Ovos Emapé Brancos','mercearia',1,'un',1,'2026-04-14',13.99,'2026-08-25T21:01:10.831Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Sabonete Protex 85g','higiene & perfumaria',2,'un',2,'2026-04-14',3.55,'2026-08-25T21:01:10.831Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Creme Dental Oral-B','higiene & perfumaria',1,'un',1,'2026-04-14',9.99,'2026-08-25T21:01:10.831Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Coxinha da Asa de Frango','carnes & aves',1.396,'kg',0.396,'2026-08-24',24.99,'2026-08-25T21:26:46.483Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Coxão Mole Moído','carnes & aves',0.32,'kg',0.32,'2026-08-11',89.99,'2026-08-25T21:22:17.080Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Músculo Bovino','carnes & aves',0.456,'kg',0.456,'2026-08-11',54.99,'2026-08-25T21:22:17.080Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Salsicha Suara Hot Dog','carnes & aves',1,'un',1,'2026-08-11',10.25,'2026-08-25T21:22:17.080Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Polpa de Acerola Lessa 500g','congelados',1,'un',1,'2026-08-11',6.99,'2026-08-25T21:22:17.080Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Ovos Emapé Vermelhos','mercearia',2,'un',2,'2026-08-11',21.39,'2026-08-25T21:22:17.080Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Ameixa Seca Excelência','mercearia',1,'un',1,'2026-08-11',13.9,'2026-08-25T21:22:17.080Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Ervas Finas Bombay House','mercearia',1,'un',1,'2026-08-11',8.89,'2026-08-25T21:22:17.080Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Páprica Bombay House','mercearia',2,'un',2,'2026-08-11',8.89,'2026-08-25T21:22:17.080Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Iogurte Batavo Grego','laticínios',6,'un',3,'2026-08-24',3.85,'2026-08-25T21:26:46.483Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Iogurte Nestlé Zero','laticínios',1,'un',1,'2026-08-11',15.49,'2026-08-25T21:22:17.080Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Manteiga Itacolomy','laticínios',1,'un',1,'2026-08-11',26.99,'2026-08-25T21:22:17.080Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Molho de Tomate Cepêra','mercearia',2,'un',2,'2026-08-11',5.99,'2026-08-25T21:22:17.080Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Café Solúvel Santa Clara','bebidas',2,'un',2,'2026-08-11',5.49,'2026-08-25T21:22:17.080Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Macarrão Fortaleza','mercearia',1,'un',1,'2026-08-11',2.99,'2026-08-25T21:22:17.080Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Feijão Verde Lessa','mercearia',1,'un',1,'2026-08-11',12.99,'2026-08-25T21:22:17.080Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Arroz Alteza Branco','mercearia',1,'un',1,'2026-08-11',4.59,'2026-08-25T21:22:17.080Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Achocolatado em Pó','bebidas',1,'un',1,'2026-08-11',10.79,'2026-08-25T21:22:17.080Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Maçã Nacional','hortifrúti',0.455,'kg',0.455,'2026-08-11',8.98,'2026-08-25T21:22:17.080Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Laranja Pera','hortifrúti',0.805,'kg',0.805,'2026-08-11',4.48,'2026-08-25T21:22:17.080Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Banana Prata','hortifrúti',1.9849999999999999,'kg',1.105,'2026-08-24',6.99,'2026-08-25T21:26:46.483Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Biscoito Lovcuçar Wafer','biscoitos & salgadinhos',3,'un',2,'2026-08-24',10.69,'2026-08-25T21:26:46.483Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Canjica Okoshi','mercearia',3,'un',2,'2026-08-24',5.99,'2026-08-25T21:26:46.483Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Biscoito Natural Life','biscoitos & salgadinhos',1,'un',1,'2026-08-11',17.15,'2026-08-25T21:22:17.080Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Tomate Bombom 180g','hortifrúti',1,'un',1,'2026-08-11',9.98,'2026-08-25T21:22:17.080Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Tangerina Murcô','hortifrúti',0.74,'kg',0.74,'2026-08-11',9.99,'2026-08-25T21:22:17.080Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Pitaya','hortifrúti',0.505,'kg',0.505,'2026-08-11',69.99,'2026-08-25T21:22:17.080Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Iogurte Betânia Desnatado','laticínios',1,'un',1,'2026-08-24',14.65,'2026-08-25T21:26:46.483Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Patinho Strogonoff','carnes & aves',0.282,'kg',0.282,'2026-08-24',75.59,'2026-08-25T21:26:46.483Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Torrada Crocantíssima','padaria',2,'un',2,'2026-08-24',2.99,'2026-08-25T21:26:46.483Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Gel Dental Condor 50g','higiene & perfumaria',1,'un',1,'2026-08-24',9.99,'2026-08-25T21:26:46.483Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Sabonete Granado Bebê','higiene & perfumaria',1,'un',1,'2026-08-24',8.25,'2026-08-25T21:26:46.483Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Escova de Dente Condor','higiene & perfumaria',1,'un',1,'2026-08-24',16.15,'2026-08-25T21:26:46.483Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Uva Vitória Lessa','hortifrúti',1,'un',1,'2026-08-24',4.88,'2026-08-25T21:26:46.483Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Barra de Cereal Nutry','mercearia',1,'un',1,'2026-08-24',6.45,'2026-08-25T21:26:46.483Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Iogurte Nestlé Chamyto','laticínios',1,'un',1,'2026-08-24',5.25,'2026-08-25T21:26:46.483Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Ativador de Cachos Bonnavie','higiene & perfumaria',1,'un',1,'2026-08-24',15.39,'2026-08-25T21:26:46.483Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Pepino','hortifrúti',0.42,'kg',0.42,'2026-08-24',1.98,'2026-08-25T21:26:46.483Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Berinjela','hortifrúti',0.12,'kg',0.12,'2026-08-24',8.98,'2026-08-25T21:26:46.483Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Polpa Sabor Nativo','congelados',1,'un',1,'2026-08-24',16.69,'2026-08-25T21:26:46.483Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Polpa Frosty Morango','congelados',1,'un',1,'2026-08-24',16.19,'2026-08-25T21:26:46.483Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Polpa Frosty Tangerina','congelados',1,'un',1,'2026-08-24',10.99,'2026-08-25T21:26:46.483Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Maçã Argentina','hortifrúti',0.535,'kg',0.535,'2026-08-24',24.49,'2026-08-25T21:26:46.483Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Limão Taiti','hortifrúti',0.275,'kg',0.275,'2026-08-24',11.98,'2026-08-25T21:26:46.483Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Tomate Red Grape','hortifrúti',1,'un',1,'2026-08-24',6.98,'2026-08-25T21:26:46.483Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Melão Japonês Inteiro','hortifrúti',1.565,'kg',1.565,'2026-08-24',3.98,'2026-08-25T21:26:46.483Z');
INSERT INTO "produtos" ("user_id","item","categoria","quantidade","unidade","consumo_medio","ultima_compra","ultimo_preco","atualizado_em") VALUES('u_legado','Morango Serra Sul Grande','hortifrúti',1,'un',1,'2026-08-24',19.98,'2026-08-25T21:26:46.483Z');
CREATE TABLE IF NOT EXISTS "notas" (
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
INSERT INTO "notas" ("id","user_id","data","mercado","total","chave","criada_em") VALUES(2,'u_legado','2026-03-04','Supermercados Cometa',601.21,'COMETA-20260304-CTRL107416','2026-08-25T20:52:18.175Z');
INSERT INTO "notas" ("id","user_id","data","mercado","total","chave","criada_em") VALUES(3,'u_legado','2026-04-07','Supermercados Cometa',479.94,'COMETA-20260407-CTRL042873','2026-08-25T20:54:49.037Z');
INSERT INTO "notas" ("id","user_id","data","mercado","total","chave","criada_em") VALUES(4,'u_legado','2026-04-14','Supermercados Cometa',478.1,'COMETA-20260414-CTRL094298','2026-08-25T21:01:10.831Z');
INSERT INTO "notas" ("id","user_id","data","mercado","total","chave","criada_em") VALUES(5,'u_legado','2026-08-11','Supermercados Cometa',615.27,'COMETA-20260811-CTRL054899','2026-08-25T21:22:17.080Z');
INSERT INTO "notas" ("id","user_id","data","mercado","total","chave","criada_em") VALUES(6,'u_legado','2026-08-24','Supermercados Cometa',509.25,'COMETA-20260824-CTRL097830','2026-08-25T21:26:46.483Z');
DELETE FROM sqlite_sequence;
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('itens_nota',235);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('notas',6);
CREATE INDEX idx_itens_nota ON itens_nota(nota_id);
CREATE INDEX idx_itens_item ON itens_nota(item);
CREATE INDEX idx_produtos_categoria ON produtos(user_id, categoria);
CREATE INDEX idx_notas_data ON notas(user_id, data);
