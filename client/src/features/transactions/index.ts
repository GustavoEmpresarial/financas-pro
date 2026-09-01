// Superficie publica da feature.
//
// Outras features importam daqui, nunca de um caminho interno. Se algo
// nao esta exportado neste arquivo, e detalhe interno e pode mudar.
//
// As rotas continuam importando as paginas pelo caminho direto, porque
// sao carregadas com lazy() e um barrel anularia o code splitting.
export { default as Transactions } from "./pages/Transactions";
export * from "./hooks/useTransactions";
