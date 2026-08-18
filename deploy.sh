#!/bin/bash
# ============================================================
# Haji Cafe — Full Server Setup (run once on a fresh VPS)
# ============================================================
set -e

echo "==> Updating system packages..."
sudo apt-get update -y
sudo apt-get upgrade -y
sudo apt-get install -y curl git wget build-essential python3 python3-venv python3-pip libpq-dev

# ── Node.js ──────────────────────────────────────────────────
echo "==> Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# ── PostgreSQL ───────────────────────────────────────────────
echo "==> Installing PostgreSQL..."
sudo apt-get install -y postgresql postgresql-contrib
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD '12345';"
sudo -u postgres psql -c "CREATE DATABASE cafe_db;" || true

# ── PM2 ──────────────────────────────────────────────────────
echo "==> Installing PM2..."
sudo npm install -g pm2

# ── Caddy ────────────────────────────────────────────────────
echo "==> Installing Caddy..."
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg --yes
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy

# ── Clone repo ───────────────────────────────────────────────
echo "==> Cloning repository (feature/livekit-chatbot branch)..."
cd /home/ubuntu
if [ ! -d "Haji-Cafe" ]; then
  git clone -b feature/livekit-chatbot https://github.com/samjanjua6/Haji-Cafe.git
fi
cd Haji-Cafe
git checkout feature/livekit-chatbot
git pull origin feature/livekit-chatbot

# ── Python venv + dependencies ───────────────────────────────
echo "==> Setting up Python virtual environment..."
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
pip install google-genai prisma pydantic-settings

# Pre-download Silero VAD model (avoids first-request delay)
echo "==> Pre-loading Silero VAD model..."
python3 -c "from livekit.plugins import silero; silero.VAD.load(); print('Silero VAD model cached.')"

# ── Prisma ───────────────────────────────────────────────────
echo "==> Generating Prisma client..."
prisma generate
prisma db push --accept-data-loss || true

# ── Frontend ─────────────────────────────────────────────────
echo "==> Building Next.js frontend..."
cd frontend
npm install
cat > .env.production << 'ENVEOF'
NEXT_PUBLIC_API_URL=https://api.haji-cafe.mychatbot.codes
NEXT_PUBLIC_LIVEKIT_URL=wss://haji-cafe-5xzj5kq7.livekit.cloud
ENVEOF
npm run build
cd ..

# ── .env (backend) ───────────────────────────────────────────
echo ""
echo "==> IMPORTANT: Create /home/ubuntu/Haji-Cafe/.env with your secrets."
echo "    See .env.example for required variables."
echo "    Required additions for LiveKit:"
echo "      LIVEKIT_URL=wss://haji-cafe-5xzj5kq7.livekit.cloud"
echo "      LIVEKIT_API_KEY=..."
echo "      LIVEKIT_API_SECRET=..."
echo "      DEEPGRAM_API_KEY=..."
echo "      ELEVENLABS_API_KEY=..."
echo "      ELEVENLABS_VOICE_ID=..."
echo ""

echo "==> Setup complete! Now run update.sh to start all services."
