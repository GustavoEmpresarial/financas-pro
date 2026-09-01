# storage

Dados em disco, fora do banco. **Nada aqui vai para o git** (ver `.gitignore`).

- `uploads/` — anexos enviados via `POST /api/upload`. É o `UPLOAD_DIR` default
  quando se roda fora do Docker. **Em uso.** No Docker, é um volume nomeado.
- `backups/` — RESERVADO. Destino dos dumps de `scripts/database/`. Vazio até o
  primeiro backup rodar.
- `media/` — RESERVADO. Separado de `uploads/` para o dia em que houver asset
  derivado (thumbnail, avatar redimensionado) que possa ser regerado e por isso
  não precisa entrar no backup.
