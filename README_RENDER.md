
# Deploy no Render

## Passos para fazer deploy:

### 1. Criar conta no Render
- Acesse https://render.com
- Crie uma conta (pode usar GitHub)

### 2. Criar PostgreSQL Database
1. No dashboard do Render, clique em **New +** → **PostgreSQL**
2. Configure:
   - **Name**: `bot-central-db`
   - **Database**: `bot_central`
   - **User**: `bot_central_user`
   - **Region**: escolha a mais próxima (ex: Oregon USA)
   - **Plan**: Free
3. Clique em **Create Database**
4. **IMPORTANTE**: Copie a **External Database URL** (você vai precisar dela)

### 3. Fazer Push do Código para o GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin SEU_REPOSITORIO_GITHUB
git push -u origin main
```

### 4. Criar Web Service no Render
1. No dashboard, clique em **New +** → **Web Service**
2. Conecte seu repositório GitHub
3. Configure:
   - **Name**: `bot-central-pinger`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
   - **Plan**: Free

### 5. Configurar Variáveis de Ambiente
No painel do Web Service, vá em **Environment** e adicione:

- `NODE_ENV` = `production`
- `DATABASE_URL` = Cole a External Database URL que você copiou
- `BOT_TOKEN` = Seu token do Discord (opcional se não for usar notificações)

### 6. Deploy
- Clique em **Create Web Service**
- O Render vai fazer o build e deploy automaticamente
- Aguarde até aparecer "Your service is live 🎉"

### 7. Obter sua URL permanente
Após o deploy, você terá uma URL como:
```
https://bot-central-pinger.onrender.com
```

Esta URL é **permanente e gratuita**! ✅

### 8. Configurar no UptimeRobot
Use a URL de health check para manter o serviço ativo:
```
https://bot-central-pinger.onrender.com/health
```

## Observações importantes:

⚠️ **Plano Free do Render:**
- O serviço "dorme" após 15 minutos de inatividade
- Leva ~30 segundos para "acordar" na primeira requisição
- Por isso é ESSENCIAL configurar o UptimeRobot para fazer ping a cada 5 minutos

✅ **Vantagens:**
- URL permanente e gratuita
- SSL/HTTPS automático
- Deploy automático a cada git push
- Logs em tempo real
- Melhor que Replit para produção

## Dashboard
Acesse seu dashboard em: `https://bot-central-pinger.onrender.com`
