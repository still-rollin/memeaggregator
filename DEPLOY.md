# Deployment Guide - Render

This guide will help you deploy the Meme Aggregator to Render (free tier).

## Prerequisites

- GitHub account with your code pushed to a repository
- Render account (sign up at https://render.com - it's free!)

## Quick Deploy to Render

### Option 1: Blueprint Deploy (Recommended - Easiest)

1. **Push the `render.yaml` file to your GitHub repo**
   ```bash
   git add render.yaml
   git commit -m "Add Render deployment configuration"
   git push
   ```

2. **Deploy via Render Dashboard**
   - Go to https://dashboard.render.com
   - Click "New +" → "Blueprint"
   - Connect your GitHub repository
   - Select your `meme-aggregator` repository
   - Render will automatically detect `render.yaml`
   - Click "Apply" to deploy both the API and Redis

3. **Wait for deployment** (~5-10 minutes for first deploy)
   - Render will install dependencies, build TypeScript, and start the server
   - You'll get a public URL like: `https://meme-aggregator-api.onrender.com`

### Option 2: Manual Deploy

If Blueprint doesn't work, deploy manually:

#### Step 1: Create Redis Instance

1. Go to https://dashboard.render.com
2. Click "New +" → "Redis"
3. Configure:
   - **Name**: `meme-aggregator-redis`
   - **Plan**: Free
   - **Max Memory Policy**: `allkeys-lru`
4. Click "Create Redis"
5. **Copy the Internal Redis URL** (you'll need this)

#### Step 2: Create Web Service

1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name**: `meme-aggregator-api`
   - **Environment**: Node
   - **Region**: Choose closest to you
   - **Branch**: `main`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free

4. **Add Environment Variables**:
   - `NODE_ENV` = `production`
   - `PORT` = `10000` (Render's default)
   - `REDIS_URL` = Paste the Internal Redis URL from Step 1

5. Click "Create Web Service"

## Verify Deployment

Once deployed, test your API:

### Health Check
```bash
curl https://your-app-url.onrender.com/health
```
Should return: `{"status":"ok"}`

### Test Token Endpoint
```bash
curl https://your-app-url.onrender.com/api/token/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
```

### Test WebSocket
Open browser console at your deployed URL and run:
```javascript
const socket = io('https://your-app-url.onrender.com');
socket.on('token_update', (data) => console.log('Update:', data));
```

## Important Notes

### Free Tier Limitations
- **Spin Down**: Free services sleep after 15 minutes of inactivity
- **First Request**: May take 30-60 seconds to wake up
- **Redis**: 25 MB storage limit
- **Bandwidth**: Sufficient for testing/demos

### Keep Service Alive (Optional)
To prevent spin-down, use a service like [UptimeRobot](https://uptimerobot.com):
- Ping your `/health` endpoint every 14 minutes
- Free tier allows 50 monitors

### Cold Start Optimization
The scheduler warms the cache on startup, so initial requests will be fast once the service is awake.

## Troubleshooting

### Build Fails
- Check that `render.yaml` is in the root directory
- Verify `package.json` has correct scripts
- Check build logs in Render dashboard

### Redis Connection Errors
- Verify `REDIS_URL` environment variable is set
- Ensure Redis instance is running
- Check Redis is in the same region as web service

### API Returns 404
- Verify the service is deployed and running
- Check the correct URL (Render provides this)
- Review application logs in dashboard

### WebSocket Not Connecting
- Ensure CORS is enabled (it is by default)
- Check browser console for errors
- Verify Socket.io client version compatibility

## Monitoring

### View Logs
```bash
# In Render Dashboard
1. Go to your web service
2. Click "Logs" tab
3. View real-time logs
```

### Check Redis Stats
```bash
# In Render Dashboard
1. Go to your Redis instance
2. View metrics (memory usage, connections)
```

## Update Deployment

To deploy changes:
```bash
git add .
git commit -m "Your changes"
git push
```

Render will automatically detect the push and redeploy!

## Get Your Public URL

After deployment, you'll receive a URL like:
- API: `https://meme-aggregator-api.onrender.com`
- Add this to your README.md

## Next Steps

1. ✅ Deploy to Render
2. 📝 Update README with public URL
3. 🧪 Test all endpoints
4. 🎥 Record demo video
5. 📤 Share with the world!

## Alternative Free Hosting Options

If Render doesn't work:
- **Railway**: https://railway.app (similar to Render)
- **Fly.io**: https://fly.io (requires Docker)
- **Cyclic**: https://cyclic.sh (Serverless)
