
This guide covers deploying the Meme Coin Aggregator to various platforms.


- Node.js 20+
- Redis server
- Git repository


Create a `.env` file with the following variables:

```env
PORT=4000
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
NODE_ENV=production
```

## Option 1: Render (Recommended)

### Step 1: Create Web Service

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: meme-aggregator
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free

### Step 2: Add Redis

1. Click "New +" → "Redis"
2. Name: meme-aggregator-redis
3. Plan: Free (25 MB)
4. Copy the Internal Redis URL

### Step 3: Environment Variables

Add these environment variables to your web service:

```
PORT=4000
REDIS_HOST=<redis-internal-url>
REDIS_PORT=6379
NODE_ENV=production
```

### Step 4: Deploy

Render will automatically deploy when you push to your main branch.

**Your API will be available at**: `https://meme-aggregator.onrender.com`

## Option 2: Railway

### Step 1: Install Railway CLI

```bash
npm install -g @railway/cli
railway login
```

### Step 2: Initialize Project

```bash
railway init
railway add redis
```

### Step 3: Deploy

```bash
railway up
railway open
```

Railway will automatically detect your Node.js app and Redis dependency.

## Option 3: Fly.io

### Step 1: Install Fly CLI

```bash
curl -L https://fly.io/install.sh | sh
flyctl auth login
```

### Step 2: Create fly.toml

```toml
app = "meme-aggregator"

[build]
  builder = "heroku/buildpacks:20"

[env]
  PORT = "8080"
  NODE_ENV = "production"

[[services]]
  http_checks = []
  internal_port = 8080
  processes = ["app"]
  protocol = "tcp"
  script_checks = []

  [services.concurrency]
    hard_limit = 25
    soft_limit = 20
    type = "connections"

  [[services.ports]]
    force_https = true
    handlers = ["http"]
    port = 80

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443

  [[services.tcp_checks]]
    grace_period = "1s"
    interval = "15s"
    restart_limit = 0
    timeout = "2s"
```

### Step 3: Add Redis

```bash
flyctl redis create
```

### Step 4: Deploy

```bash
flyctl deploy
```

## Testing Deployment

### Health Check

```bash
curl https://your-domain.com/health
```

Expected response:
```json
{"status":"ok"}
```

### Test Token Endpoint

```bash
curl https://your-domain.com/api/tokens?limit=5
```

### Test WebSocket

Use a WebSocket client or the following JavaScript:

```javascript
const socket = io('https://your-domain.com');

socket.on('connect', () => {
  console.log('Connected to WebSocket');
});

socket.on('token_update', (data) => {
  console.log('Token update:', data);
});
```

## Monitoring

### Logs

**Render:**
```bash
# View in dashboard or use CLI
render logs
```

**Railway:**
```bash
railway logs
```

**Fly.io:**
```bash
flyctl logs
```

### Health Monitoring

Set up uptime monitoring with:
- UptimeRobot (free)
- Pingdom
- StatusCake

Monitor the `/health` endpoint every 5 minutes.

## Performance Optimization

### For Production:

1. **Enable Compression**:
   ```javascript
   import compression from 'compression';
   app.use(compression());
   ```

2. **Add Rate Limiting**:
   ```javascript
   import rateLimit from 'express-rate-limit';
   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000,
     max: 100
   });
   app.use('/api/', limiter);
   ```

3. **Enable CORS with specific origins**:
   ```javascript
   app.use(cors({
     origin: ['https://your-frontend.com']
   }));
   ```

## Troubleshooting

### Redis Connection Issues

Check Redis connection:
```bash
redis-cli ping
```

Verify environment variables are set correctly.

### Port Issues

Make sure your app listens on the PORT environment variable:
```javascript
const PORT = process.env.PORT || 4000;
```

### Build Failures

Clear build cache:
```bash
npm clean-install
rm -rf node_modules package-lock.json
npm install
```

## Scaling

### Vertical Scaling
- Upgrade to paid plans for more CPU/Memory
- Render: Starter ($7/month)
- Railway: Developer ($5/month)

### Horizontal Scaling
- Add more instances behind a load balancer
- Use Redis Cluster for distributed caching
- Implement message queue (Bull/BullMQ) for background jobs

## Security

1. **Environment Variables**: Never commit `.env` files
2. **API Keys**: Store in environment variables
3. **Rate Limiting**: Implement per-IP rate limiting
4. **CORS**: Configure allowed origins
5. **Helmet**: Add security headers
   ```bash
   npm install helmet
   ```

## Backup

### Redis Data

Set up automatic backups:

**Render**: Automatic backups included in paid Redis plans

**Railway**: Use `redis-dump` command:
```bash
redis-cli --rdb backup.rdb
```

## CI/CD

### GitHub Actions Example

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test
      - run: npm run build
```

## Support

For deployment issues, check:
- Platform documentation
- GitHub Issues
- Community Discord/Slack channels
