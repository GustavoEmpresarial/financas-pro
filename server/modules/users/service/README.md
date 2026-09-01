# service — vazio de proposito

A regra deste modulo cabe no repositorio: e acesso a dados com um pouco de
orquestracao, sem decisao de negocio que valha uma camada propria. Um service
que so repassasse chamada para o repositorio adicionaria um salto de leitura
sem esconder nada.

**Quando preencher:** na primeira regra que nao seja "ler ou gravar" — um
calculo, uma decisao que dependa de mais de uma tabela, um efeito colateral.
Veja `server/modules/transactions/service` como referencia da forma.
