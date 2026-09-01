# features

Uma pasta por domínio de tela. Cada feature é autocontida e só importa de
`shared/` ou de si mesma — **nunca de outra feature**. Quando duas features
precisam da mesma coisa, ela sobe para `shared/`.

Forma de cada feature (subpastas só existem se tiverem conteúdo):

```
<feature>/
├── components/   # UI só desta feature
├── pages/        # componente de rota
├── hooks/        # hooks de react-query do domínio
├── services/     # chamadas à API, sobre shared/services/api.ts
├── store/        # estado de cliente, se houver
├── types/        # tipos do domínio
└── index.ts      # a superfície pública da feature
```

Preenchido na Fase 5, a partir do achatado `legacy/src/{pages,hooks,components}`.
