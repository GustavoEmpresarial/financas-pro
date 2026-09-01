# providers — vazio de proposito

Os provedores da aplicacao (QueryClientProvider, AuthProvider, ThemeProvider,
TooltipProvider) ainda estao montados dentro de `../routes/AppRoutes.tsx`, que
e o antigo `App.tsx`.

**Quando preencher:** ao separar `AppRoutes` em "quem provê contexto" e "quem
declara rota". Vale a pena quando entrar um provedor novo ou quando os testes
precisarem montar a arvore de contexto sem o roteador junto.
