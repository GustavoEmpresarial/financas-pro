import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import App from "@/app/routes/AppRoutes";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary";
import { installGlobalErrorHandlers } from "@/shared/services/errorReporter";
import "./index.css";

// Antes de qualquer render: um erro no boot (import de modulo quebrado,
// polyfill faltando) tem que ser pego tambem, nao so os que acontecem depois
// que a arvore ja montou.
installGlobalErrorHandlers();

// fullScreen: este e o boundary mais externo, fora de qualquer provider —
// se ele disparar, nao ha sidebar nem layout nenhum ao redor para preencher
// a tela sozinho.
createRoot(document.getElementById("root")!).render(
  <ErrorBoundary fullScreen>
    <App />
  </ErrorBoundary>,
);

// A splash nativa (ver capacitor.config.ts, launchAutoHide:false) fica de pe
// ate aqui: sem isso, o Capacitor a esconderia sozinho cedo demais e a tela
// branca do WebView ficaria visivel enquanto o bundle ainda inicializa numa
// rede mais lenta. requestAnimationFrame espera o primeiro paint real do
// React acontecer antes de tirar a splash -- assim a transicao e direto de
// "logo" para "app", nunca passa por um flash em branco no meio.
if (Capacitor.isNativePlatform()) {
  requestAnimationFrame(() => {
    import("@capacitor/splash-screen").then(({ SplashScreen }) => SplashScreen.hide());
  });
}
