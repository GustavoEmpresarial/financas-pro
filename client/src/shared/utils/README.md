# utils — vazio de proposito

As funcoes utilitarias estao em `../lib/` (`utils.ts`, `uuid.ts`), que e onde o
shadcn/ui espera encontrar o `cn()` — mover quebraria os componentes gerados.

Esta pasta existe na estrutura para separar, no futuro, "helpers do projeto" de
"o que o shadcn precisa em lib/". Enquanto forem tres funcoes, dividir custa
mais do que ajuda.
