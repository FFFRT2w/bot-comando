import { useQuery } from "@tanstack/react-query";
import { Activity, Server, Clock, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Bot } from "@shared/schema";

interface Stats {
  totalBots: number;
  onlineBots: number;
  offlineBots: number;
  avgResponseTime: number;
}

export default function Dashboard() {
  const { data: bots, isLoading: botsLoading } = useQuery<Bot[]>({
    queryKey: ["/api/bots"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ["/api/stats"],
  });

  if (botsLoading || statsLoading) {
    return (
      <div className="p-8 space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const metricCards = [
    {
      title: "Total de Bots",
      value: stats?.totalBots || 0,
      icon: Server,
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      title: "Bots Online",
      value: stats?.onlineBots || 0,
      icon: Activity,
      color: "text-green-600 dark:text-green-400",
    },
    {
      title: "Bots Offline",
      value: stats?.offlineBots || 0,
      icon: Server,
      color: "text-red-600 dark:text-red-400",
    },
    {
      title: "Tempo Médio",
      value: stats?.avgResponseTime ? `${stats.avgResponseTime}ms` : "N/A",
      icon: Zap,
      color: "text-amber-600 dark:text-amber-400",
    },
  ];

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Visão geral do status de todos os seus bots
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((metric) => (
          <Card key={metric.title} data-testid={`card-metric-${metric.title.toLowerCase().replace(/\s+/g, "-")}`}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.title}
              </CardTitle>
              <metric.icon className={`w-4 h-4 ${metric.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" data-testid={`text-${metric.title.toLowerCase().replace(/\s+/g, "-")}`}>
                {metric.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!bots || bots.length === 0 ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Server className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-1">Nenhum bot configurado</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Adicione seu primeiro bot para começar a monitorar. O sistema fará ping
                automaticamente no intervalo configurado.
              </p>
            </div>
            <a
              href="/bots"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground h-9 px-4 hover-elevate active-elevate-2"
              data-testid="button-add-first-bot"
            >
              Adicionar Primeiro Bot
            </a>
          </div>
        </Card>
      ) : (
        <div>
          <h2 className="text-lg font-medium mb-4">Bots Recentes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bots.slice(0, 6).map((bot) => (
              <Card
                key={bot.id}
                className="hover-elevate cursor-pointer"
                data-testid={`card-bot-${bot.id}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base font-medium truncate mb-1">
                        {bot.name}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground font-mono truncate">
                        {bot.url}
                      </p>
                    </div>
                    <StatusBadge status={bot.status as any} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>
                      {bot.lastPing
                        ? formatDistanceToNow(new Date(bot.lastPing), {
                            addSuffix: true,
                            locale: ptBR,
                          })
                        : "Nunca"}
                    </span>
                  </div>
                  {bot.responseTime && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Zap className="w-3 h-3" />
                      <span>{bot.responseTime}ms</span>
                    </div>
                  )}
                  {bot.guildId && (
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">Guild ID:</span>{" "}
                      <span className="font-mono">{bot.guildId}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
