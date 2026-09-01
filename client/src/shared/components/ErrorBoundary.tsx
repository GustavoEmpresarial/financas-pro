import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { reportBoundaryError } from "@/shared/services/errorReporter";

interface Props {
  children: ReactNode;
  // true no boundary de fora de tudo (main.tsx), que precisa preencher a
  // tela inteira porque nao ha layout nenhum ao redor ainda. false (padrao)
  // no boundary por pagina, que já vive dentro do AppLayout — min-h-screen
  // ali empilharia com a altura do layout e sobraria espaco vazio embaixo.
  fullScreen?: boolean;
}

interface State {
  error: Error | null;
}

// Sem isto, um erro de render em qualquer tela vira uma pagina branca muda —
// o React desmonta a arvore inteira e nao sobra nem o menu para o usuario
// voltar. getDerivedStateFromError so pode existir numa classe (nao ha
// equivalente em hook ainda), entao esta e uma das poucas class components
// do projeto de proposito, nao por estilo antigo.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportBoundaryError(error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      const heightClass = this.props.fullScreen ? "min-h-screen" : "min-h-[60vh]";
      return (
        <div className={`flex ${heightClass} flex-col items-center justify-center gap-4 p-6 text-center`}>
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-expense/10 text-expense">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Algo deu errado</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              O erro já foi registrado. Tentar recarregar costuma resolver.
            </p>
          </div>
          <Button onClick={() => window.location.reload()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Recarregar
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
