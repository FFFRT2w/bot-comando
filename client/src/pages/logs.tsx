import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { PingLog } from "@shared/schema";
import type { Bot } from "@shared/schema";

interface LogWithBot extends PingLog {
  bot: Bot;
}

export default function Logs() {
  const { data: logs, isLoading } = useQuery<LogWithBot[]>({
    queryKey: ["/api/logs"],
  });

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Logs de Atividade</h1>
        <p className="text-sm text-muted-foreground">
          Histórico de pings e atividades do sistema
        </p>
      </div>

      {!logs || logs.length === 0 ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Clock className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-1">Nenhuma atividade ainda</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Os logs de ping aparecerão aqui assim que o sistema começar a monitorar
                seus bots.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => {
            const isSuccess = log.status === "online";
            const Icon = isSuccess ? CheckCircle2 : XCircle;
            const iconColor = isSuccess
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400";

            return (
              <Card key={log.id} data-testid={`log-entry-${log.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`mt-0.5 ${iconColor}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">
                            {isSuccess ? "Ping bem-sucedido" : "Ping falhou"}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {log.bot.name}
                          </p>
                        </div>
                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(log.timestamp), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                        <span className="font-mono">{log.bot.url}</span>
                        {log.responseTime && (
                          <span className="text-muted-foreground">
                            {log.responseTime}ms
                          </span>
                        )}
                      </div>
                      {log.errorMessage && (
                        <div className="mt-2 p-2 bg-destructive/10 rounded-md">
                          <p className="text-xs text-destructive font-mono">
                            {log.errorMessage}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
