# repository — vazio de proposito

Upload nao toca no banco: o arquivo vai para o disco (`UPLOAD_DIR`) e a URL
volta para o cliente, que a guarda no campo do registro correspondente
(`credit_cards.image_url`, `alt_investments.logo_url`, e por aí).

**Quando preencher:** se os anexos passarem a ter registro proprio — dono,
tamanho, data, para poder listar e apagar orfaos. Hoje nada sabe quais arquivos
existem no disco.
