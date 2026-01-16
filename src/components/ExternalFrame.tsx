import { useState, useEffect, useRef } from "react";
import { Loader2, ExternalLink, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExternalFrameProps {
  url: string;
  title: string;
}

export function ExternalFrame({ url, title }: ExternalFrameProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Check if iframe loaded successfully
  useEffect(() => {
    const checkIframeLoad = () => {
      const iframe = iframeRef.current;
      if (iframe) {
        try {
          // If we can't access contentWindow, it likely blocked by CORS/X-Frame-Options
          const doc = iframe.contentDocument || iframe.contentWindow?.document;
          if (!doc || doc.body?.innerHTML === '') {
            setLoadError(true);
          }
        } catch (e) {
          // Cross-origin error means the site loaded but blocked access
          // This is actually a success case for iframes
          setLoadError(false);
        }
      }
    };

    // Give iframe time to load
    const timer = setTimeout(checkIframeLoad, 3000);
    return () => clearTimeout(timer);
  }, [url]);

  const handleRefresh = () => {
    setIsLoading(true);
    setLoadError(false);
    if (iframeRef.current) {
      iframeRef.current.src = url;
    }
  };

  const handleOpenExternal = () => {
    window.open(url, "_blank");
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setLoadError(true);
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-card">
        <h2 className="font-semibold text-foreground">{title}</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenExternal}
            className="gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Abrir em nova aba
          </Button>
        </div>
      </div>

      {/* Loading indicator */}
      {isLoading && !loadError && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10 mt-12">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-muted-foreground">Carregando {title}...</span>
          </div>
        </div>
      )}

      {/* Error state - site blocks iframes */}
      {loadError && (
        <div className="flex-1 flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-4 max-w-md text-center p-6">
            <div className="p-4 rounded-full bg-destructive/10">
              <AlertTriangle className="h-12 w-12 text-destructive" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">
              Não foi possível carregar o site
            </h3>
            <p className="text-muted-foreground">
              O site <strong>{new URL(url).hostname}</strong> bloqueia a incorporação em frames por motivos de segurança.
            </p>
            <Button onClick={handleOpenExternal} className="gap-2 mt-2">
              <ExternalLink className="h-4 w-4" />
              Abrir {title} em nova aba
            </Button>
          </div>
        </div>
      )}

      {/* Iframe */}
      {!loadError && (
        <iframe
          ref={iframeRef}
          src={url}
          title={title}
          className="flex-1 w-full border-0"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
        />
      )}
    </div>
  );
}
