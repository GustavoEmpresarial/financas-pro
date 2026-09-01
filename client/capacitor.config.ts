import type { CapacitorConfig } from "@capacitor/cli";

// webDir aponta para o build feito com VITE_API_BASE_URL setado (ver
// package.json, script "build:apk") -- os arquivos ficam locais no
// dispositivo, e o fetch/API chama o servidor real por essa URL absoluta.
const config: CapacitorConfig = {
  appId: "app.financaspro.mobile",
  appName: "FinançasPro",
  webDir: "dist-capacitor",
  android: {
    // O backend ainda nao tem dominio/TLS proprio (so IP:porta). O
    // network_security_config.xml do projeto Android libera cleartext so
    // para esse host especifico -- nao para qualquer origem.
  },
  plugins: {
    SplashScreen: {
      // Fica visivel ate o codigo chamar SplashScreen.hide() explicitamente
      // (ver src/main.tsx) -- sem isso o Capacitor esconde a splash sozinho
      // rapido demais e sobra uma tela branca em branco enquanto o bundle
      // ainda carrega, especialmente numa rede mais lenta ate o IP real do
      // servidor. launchAutoHide:false desliga o timer automatico.
      launchAutoHide: false,
      backgroundColor: "#0f1419",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
  },
  server: {
    // "https" (o default do Capacitor) faz o app carregar a partir de
    // https://localhost e depois tentar chamar http://IP:9000 -- isso e
    // "conteudo misto" (subrecurso inseguro numa pagina que se diz segura),
    // e o WebView bloqueia por padrao independente do network security
    // config, que so libera cleartext NO NIVEL DE REDE, nao no nivel de
    // mixed-content do WebView. Com "http" aqui, a origem local tambem e
    // http, os dois lados batem e o fetch funciona. E o motivo exato de
    // login/qualquer request terem falhado no celular real.
    androidScheme: "http",
  },
};

export default config;
