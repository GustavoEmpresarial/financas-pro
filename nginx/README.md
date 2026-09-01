# nginx — RESERVADO (vazio)

Sem uso hoje. O binário Go já serve a SPA e os uploads direto na porta 9101, e
o `docker-compose` publica em `9000`. Para uso pessoal em rede local isso basta.

**Quando preencher:** expor o app na internet. Aí o nginx entra na frente para
TLS, HTTP/2, gzip/brotli e cache de assets estáticos com hash.

- `includes/` — snippets de `proxy_pass` para o container `app`
- `certs/` — certificados (Let's Encrypt). **Nunca commitar chave privada aqui.**
