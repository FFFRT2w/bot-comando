import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { insertBotSchema, type InsertBot, type Bot } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useEffect } from "react";

interface BotFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bot?: Bot | null;
}

export function BotFormDialog({ open, onOpenChange, bot }: BotFormDialogProps) {
  const { toast } = useToast();

  const form = useForm<InsertBot>({
    resolver: zodResolver(insertBotSchema),
    defaultValues: {
      name: "",
      url: "",
      guildId: "",
      clientId: "",
      notes: "",
      pingInterval: 5,
      isActive: true,
    },
  });

  useEffect(() => {
    if (bot) {
      form.reset({
        name: bot.name,
        url: bot.url,
        guildId: bot.guildId || "",
        clientId: bot.clientId || "",
        notes: bot.notes || "",
        pingInterval: bot.pingInterval,
        isActive: bot.isActive,
      });
    } else {
      form.reset({
        name: "",
        url: "",
        guildId: "",
        clientId: "",
        notes: "",
        pingInterval: 5,
        isActive: true,
      });
    }
  }, [bot, form]);

  const createMutation = useMutation({
    mutationFn: async (data: InsertBot) => {
      return apiRequest("POST", "/api/bots", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bots"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Bot adicionado",
        description: "O bot foi adicionado com sucesso.",
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o bot.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: InsertBot) => {
      return apiRequest("PUT", `/api/bots/${bot?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bots"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Bot atualizado",
        description: "O bot foi atualizado com sucesso.",
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o bot.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertBot) => {
    if (bot) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{bot ? "Editar Bot" : "Adicionar Novo Bot"}</DialogTitle>
          <DialogDescription>
            Configure as informações do bot que será monitorado. O sistema fará ping
            automaticamente no intervalo configurado.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Bot *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Bot Música Servidor X"
                      {...field}
                      data-testid="input-bot-name"
                    />
                  </FormControl>
                  <FormDescription>
                    Nome para identificar facilmente este bot
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL do Bot *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://meubot.onrender.com/health"
                      {...field}
                      data-testid="input-bot-url"
                    />
                  </FormControl>
                  <FormDescription>
                    URL completa do endpoint que será pingado (geralmente /health)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pingInterval"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Intervalo de Ping (minutos) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={60}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 5)}
                      data-testid="input-ping-interval"
                    />
                  </FormControl>
                  <FormDescription>
                    A cada quantos minutos o sistema deve pingar este bot (1-60 minutos)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="guildId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Guild ID (opcional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="123456789012345678"
                        {...field}
                        data-testid="input-guild-id"
                      />
                    </FormControl>
                    <FormDescription>ID do servidor Discord</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client ID (opcional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="987654321098765432"
                        {...field}
                        data-testid="input-client-id"
                      />
                    </FormControl>
                    <FormDescription>ID do cliente do bot</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Anotações sobre este bot..."
                      className="resize-none"
                      rows={3}
                      {...field}
                      data-testid="input-notes"
                    />
                  </FormControl>
                  <FormDescription>
                    Informações adicionais ou lembretes sobre este bot
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
                data-testid="button-cancel"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending} data-testid="button-submit">
                {isPending ? "Salvando..." : bot ? "Atualizar" : "Adicionar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
