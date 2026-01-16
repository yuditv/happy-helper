import { useState } from "react";
import { Loader2, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExternalFrameProps {
  url: string;
  title: string;
}

export function ExternalFrame({ url, title }: ExternalFrameProps) {
  const [isLoading, setIsLoading] = useState(true);

  const handleRefresh = () => {
    setIsLoading(true);
    const iframe = document.querySelector(`iframe[src="${url}"]`) as HTMLIFrameElement;
    if (iframe) {
      iframe.src = url;
    }
  };

  const handleOpenExternal = () => {
    window.open(url, "_blank");
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
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10 mt-12">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-muted-foreground">Carregando {title}...</span>
          </div>
        </div>
      )}

      {/* Iframe */}
      <iframe
        src={url}
        title={title}
        className="flex-1 w-full border-0"
        onLoad={() => setIsLoading(false)}
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
      />
    </div>
  );
}
