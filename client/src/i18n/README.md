# i18n — RESERVADO (vazio)

Sem uso hoje. Todo o texto do app é português hardcoded direto nos componentes,
e não há nenhuma lib de i18n no `package.json`.

**Quando preencher:** se o app precisar de um segundo idioma. É um app de
finanças pessoais em BRL, então a chance é baixa — mas a extração das strings
é a parte cara e vale saber onde ela moraria.

**Nota:** `index.html` declara `lang="en"` com conteúdo em pt-BR. Isso é bug de
scaffold e deve ser corrigido para `pt-BR` na Fase 5, independentemente de i18n.
