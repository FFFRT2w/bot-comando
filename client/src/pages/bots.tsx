import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { BotFormDialog } from "@/components/bot-form-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Bot } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

export default function Bots() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBot, setEditingBot] = useState<Bot | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [botToDelete, setBotToDelete] = useState<Bot | null>(null);
  const { toast } = useToast();

  const { data: bots, isLoading } = useQuery<Bot[]>({
    queryKey: ["/api/bots"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/bots/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bots"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Bot removido",
        description: "O bot foi removido com sucesso.",
      });
      setDeleteDialogOpen(false);
      setBotToDelete(null);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível remover o bot.",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (bot: Bot) => {
    setEditingBot(bot);
    setDialogOpen(true);
  };

  const handleDelete = (bot: Bot) => {
    setBotToDelete(bot);
    setDeleteDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingBot(null);
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Gerenciar Bots</h1>
          <p className="text-sm text-muted-foreground">
            Configure e monitore todos os seus bots
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} data-testid="button-add-bot">
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Bot
        </Button>
      </div>

      {!bots || bots.length === 0 ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Plus className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-1">Nenhum bot configurado</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Clique no botão acima para adicionar seu primeiro bot. Você pode adicionar
                quantos bots quiser, incluindo o próprio bot central para auto-ping.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bots.map((bot) => (
            <Card key={bot.id} data-testid={`card-bot-${bot.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base font-medium mb-1">
                      {bot.name}
                    </CardTitle>
                    <StatusBadge status={bot.status as any} />
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(bot)}
                      data-testid={`button-edit-${bot.id}`}
                      aria-label="Editar bot"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(bot)}
                      data-testid={`button-delete-${bot.id}`}
                      aria-label="Remover bot"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">URL do Bot</p>
                  <p className="text-xs font-mono break-all">{bot.url}</p>
                </div>

                {bot.guildId && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Guild ID</p>
                    <p className="text-xs font-mono">{bot.guildId}</p>
                  </div>
                )}

                {bot.clientId && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Client ID</p>
                    <p className="text-xs font-mono">{bot.clientId}</p>
                  </div>
                )}

                <div className="pt-2 space-y-2 border-t">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>
                      Ping a cada <strong>{bot.pingInterval} min</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>
                      Último:{" "}
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
                </div>

                {bot.notes && (
                  <div className="space-y-1 pt-2 border-t">
                    <p className="text-xs text-muted-foreground">Notas</p>
                    <p className="text-xs">{bot.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <BotFormDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        bot={editingBot}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar remoção</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o bot <strong>{botToDelete?.name}</strong>?
              Todos os logs de ping deste bot também serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => botToDelete && deleteMutation.mutate(botToDelete.id)}
              data-testid="button-confirm-delete"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
