import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Server, Info } from "lucide-react";

export default function Settings() {
  const healthUrl = `${window.location.origin}/health`;

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Informações e configurações do sistema
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-primary" />
            <CardTitle>Endpoint de Health Check</CardTitle>
          </div>
          <CardDescription>
            Use esta URL no UptimeRobot para manter o bot central sempre ativo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-md">
            <p className="font-mono text-sm break-all" data-testid="text-health-url">
              {healthUrl}
            </p>
          </div>
          <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-md border border-blue-200 dark:border-blue-900">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="space-y-2 text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-100">
                Como configurar o UptimeRobot:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-blue-800 dark:text-blue-200">
                <li>Copie a URL acima</li>
                <li>Acesse sua conta no UptimeRobot</li>
                <li>Adicione um novo monitor do tipo "HTTP(s)"</li>
                <li>Cole a URL copiada no campo de URL</li>
                <li>Configure o intervalo de monitoramento (recomendado: 5 minutos)</li>
                <li>Salve o monitor</li>
              </ol>
              <p className="text-blue-800 dark:text-blue-200 mt-3">
                <strong>Dica:</strong> Você também pode adicionar este próprio bot central na
                lista de bots para que ele faça auto-ping, mantendo-se ativo mesmo sem o
                UptimeRobot (mas ainda é recomendado usar o UptimeRobot como backup).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sobre o Sistema</CardTitle>
          <CardDescription>
            Informações sobre o funcionamento do bot central
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="font-medium mb-1">Sistema de Ping Automático</p>
            <p className="text-muted-foreground">
              O sistema verifica automaticamente todos os bots configurados no intervalo
              especificado para cada um. Os resultados são armazenados no banco de dados
              e podem ser visualizados no dashboard e nos logs.
            </p>
          </div>
          <div>
            <p className="font-medium mb-1">Status dos Bots</p>
            <p className="text-muted-foreground">
              Os bots são marcados como "Online" quando respondem com sucesso (status HTTP
              200-299) ou "Offline" quando não respondem ou retornam erro. O tempo de
              resposta também é registrado para cada ping.
            </p>
          </div>
          <div>
            <p className="font-medium mb-1">Intervalo Personalizável</p>
            <p className="text-muted-foreground">
              Cada bot pode ter seu próprio intervalo de ping (1-60 minutos). Isso permite
              que você monitore bots críticos com mais frequência e bots menos importantes
              com intervalos maiores.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
