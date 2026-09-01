-- name: ListAudits :many
-- O legado NAO filtrava por dono aqui: bastava saber tabela e id para ler o
-- historico de qualquer registro, de qualquer usuario. O filtro por user_id
-- fecha isso. A tabela esta sempre vazia hoje (nada escreve auditoria), entao
-- na pratica nenhuma tela muda de comportamento.
SELECT * FROM record_audits
WHERE table_name = $1 AND record_id = $2 AND user_id = $3
ORDER BY created_at DESC
LIMIT 100;
