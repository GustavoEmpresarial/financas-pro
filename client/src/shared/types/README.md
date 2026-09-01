# types — vazio de proposito

Os tipos do dominio estao declarados dentro dos hooks que os usam
(`features/<x>/hooks/use<X>.tsx`), que e onde nasceram.

**Quando preencher:** quando o mesmo tipo passar a ser importado por mais de uma
feature. Hoje isso nao acontece — cada feature fala com o seu proprio endpoint.

Vale notar que esses tipos sao escritos a mao e podem divergir do que o backend
devolve. Gerar a partir do backend Go e uma melhoria possivel; o teste de
contrato em `client/tests/contracts.test.ts` cobre parte do risco.
