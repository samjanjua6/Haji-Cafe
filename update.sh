#!/bin/bash
# ============================================================
# Haji Cafe — Update & Restart all services
# Run this every time you push new code to the server
# ============================================================
set -e

PROJECT_DIR=/home/ubuntu/Haji-Cafe
cd $PROJECT_DIR

echo "==> Pulling latest code from feature/livekit-chatbot..."
git fetch origin
git checkout feature/livekit-chatbot
git pull origin feature/livekit-chatbot

echo "==> Updating Python dependencies..."
source venv/bin/activate
pip install -r requirements.txt --quiet

echo "==> Regenerating Prisma client..."
prisma generate

echo "==> Rebuilding frontend..."
cd frontend
npm install --silent
cat > .env.production << 'ENVEOF'
NEXT_PUBLIC_API_URL=https://api.haji-cafe.mychatbot.codes
NEXT_PUBLIC_LIVEKIT_URL=wss://haji-cafe-5xzj5kq7.livekit.cloud
ENVEOF
npm run build
cd ..

echo "==> Configuring Caddy..."
cat << 'EOF' | sudo tee /etc/caddy/Caddyfile
haji-cafe.mychatbot.codes {
    reverse_proxy localhost:3000
}

api.haji-cafe.mychatbot.codes {
    reverse_proxy localhost:8000
}
EOF
sudo systemctl reload caddy

echo "==> Starting / restarting PM2 processes..."

# ── Backend (FastAPI) ─────────────────────────────────────────
pm2 describe backend > /dev/null 2>&1 && pm2 restart backend || \
  pm2 start "venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000" \
    --name backend \
    --cwd $PROJECT_DIR

# ── Frontend (Next.js) ────────────────────────────────────────
pm2 describe frontend > /dev/null 2>&1 && pm2 restart frontend || \
  pm2 start "npm run start" \
    --name frontend \
    --cwd $PROJECT_DIR/frontend

# ── LiveKit Voice Agent ───────────────────────────────────────
pm2 describe livekit-agent > /dev/null 2>&1 && pm2 restart livekit-agent || \
  pm2 start "venv/bin/python app/modules/chatbot/agent.py start" \
    --name livekit-agent \
    --cwd $PROJECT_DIR \
    --interpreter none

# Save PM2 process list so it survives reboots
pm2 save

echo ""
echo "==> All services running:"
pm2 list

echo ""
echo "==> Done! Site: https://haji-cafe.mychatbot.codes"
