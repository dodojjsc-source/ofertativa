import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, Download, Share } from "lucide-react";
import { useRegisterSW } from "virtual:pwa-register/react";

export const PWAPrompt = () => {
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log("SW Registered: " + r);
    },
    onRegisterError(error) {
      console.log("SW registration error", error);
    },
  });

  useEffect(() => {
    // Check if user is on iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;

    // Track visit count for install prompt (show on 2nd visit)
    const visitCount = parseInt(localStorage.getItem("pwa-visit-count") || "0");
    localStorage.setItem("pwa-visit-count", (visitCount + 1).toString());

    // Handle Android install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Show prompt on 2nd visit or later
      if (visitCount >= 1 && !isStandalone) {
        setShowInstallPrompt(true);
      }
    };

    // Show iOS instructions on 2nd visit
    if (isIOS && !isStandalone && visitCount >= 1) {
      setShowIOSInstructions(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      console.log("PWA installed");
    }
    
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleUpdateClick = () => {
    updateServiceWorker(true);
  };

  // Update available banner
  if (needRefresh) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-md">
        <Card className="p-4 bg-card border-border">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-semibold text-sm mb-1">Atualização Disponível</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Uma nova versão do aplicativo está disponível.
              </p>
              <Button 
                onClick={handleUpdateClick} 
                size="sm" 
                className="w-full"
              >
                Recarregar Agora
              </Button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setNeedRefresh(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // iOS install instructions
  if (showIOSInstructions) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-md">
        <Card className="p-4 bg-card border-border">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Download className="h-5 w-5 text-accent" />
                <h3 className="font-semibold text-sm">Instalar OfertAtiva</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Para instalar o app na tela inicial:
              </p>
              <ol className="text-xs space-y-2 text-muted-foreground mb-3">
                <li className="flex items-start gap-2">
                  <Share className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Toque no botão <strong>Compartilhar</strong> no Safari</span>
                </li>
                <li className="flex items-start gap-2">
                  <Download className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Selecione <strong>"Adicionar à Tela de Início"</strong></span>
                </li>
              </ol>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setShowIOSInstructions(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Android install prompt
  if (showInstallPrompt && deferredPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-md">
        <Card className="p-4 bg-card border-border">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Download className="h-5 w-5 text-accent" />
                <h3 className="font-semibold text-sm">Instalar OfertAtiva</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Instale o app na tela inicial para acesso rápido e funcionamento offline.
              </p>
              <div className="flex gap-2">
                <Button 
                  onClick={handleInstallClick} 
                  size="sm" 
                  className="flex-1"
                >
                  Instalar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowInstallPrompt(false)}
                >
                  Agora não
                </Button>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setShowInstallPrompt(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return null;
};
