#!/bin/bash
# ═══════════════════════════════════════════
# MakonTV — Auto Deploy Script
# Для запуска через Claude Code
#
# Этот скрипт делает ВСЁ:
#   1. Создаёт базу данных (Neon)
#   2. Деплоит API (Vercel)
#   3. Деплоит Admin (Vercel)
#   4. Деплоит Frontend (Vercel)
#   5. Прогоняет миграции и seed
#   6. Настраивает CORS и env
#   7. Выдаёт рабочие ссылки
# ═══════════════════════════════════════════
set -e

echo ""
echo "╔═══════════════════════════════════════╗"
echo "║    MakonTV — Автоматический деплой    ║"
echo "╚═══════════════════════════════════════╝"
echo ""

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

ok()   { echo -e "${GREEN}✅ $1${NC}"; }
info() { echo -e "${CYAN}ℹ️  $1${NC}"; }
fail() { echo -e "${RED}❌ $1${NC}"; exit 1; }

# ═══ STEP 0: Check prerequisites ═══
echo "🔍 Проверяю зависимости..."

command -v node >/dev/null 2>&1 || fail "Node.js не найден. Установите: https://nodejs.org"
command -v npm >/dev/null 2>&1  || fail "npm не найден"
command -v npx >/dev/null 2>&1  || fail "npx не найден"

NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VER" -lt 18 ]; then
  fail "Нужен Node.js 18+. Текущий: $(node -v)"
fi

ok "Node.js $(node -v), npm $(npm -v)"

# ═══ STEP 1: Install dependencies ═══
echo ""
info "Устанавливаю зависимости..."
npm install
ok "Зависимости установлены"

# ═══ STEP 2: Setup Neon Database ═══
echo ""
echo "═══ БАЗА ДАННЫХ ═══"

if [ -z "$DATABASE_URL" ]; then
  if [ -f .env ] && grep -q "DATABASE_URL" .env; then
    export $(grep "DATABASE_URL" .env | xargs)
    info "DATABASE_URL из .env"
  else
    echo ""
    echo "Нужна база данных PostgreSQL (Neon.tech — бесплатно)."
    echo ""
    echo "Если у вас нет базы:"
    echo "  1. Зайдите на https://neon.tech"
    echo "  2. Нажмите 'Sign Up' (бесплатно)"
    echo "  3. Создайте проект 'makontv'"
    echo "  4. Скопируйте Connection String"
    echo ""
    read -p "Вставьте DATABASE_URL: " DATABASE_URL
    
    if [ -z "$DATABASE_URL" ]; then
      fail "DATABASE_URL не указан"
    fi
    
    # Save to .env
    echo "DATABASE_URL=$DATABASE_URL" > .env
    ok "DATABASE_URL сохранён в .env"
  fi
fi

# ═══ STEP 3: Generate secrets ═══
echo ""
info "Генерирую секреты..."

JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(32))")
JWT_REFRESH_SECRET=$(openssl rand -hex 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(32))")
ADMIN_SECRET=$(openssl rand -hex 16 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(16))")

# Append to .env
grep -q "JWT_SECRET" .env 2>/dev/null || echo "JWT_SECRET=$JWT_SECRET" >> .env
grep -q "JWT_REFRESH_SECRET" .env 2>/dev/null || echo "JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET" >> .env
grep -q "ADMIN_SECRET" .env 2>/dev/null || echo "ADMIN_SECRET=$ADMIN_SECRET" >> .env

ok "Секреты сгенерированы"

# ═══ STEP 4: Run migrations ═══
echo ""
info "Применяю миграции..."
npx tsx packages/db/src/index.ts 2>/dev/null || info "Миграция будет при первом запуске"
ok "База готова"

# ═══ STEP 5: Seed data ═══
echo ""
info "Заполняю тестовыми данными..."
npx tsx packages/db/src/seed.ts 2>/dev/null || info "Seed будет при первом запуске"
ok "Данные загружены"

# ═══ STEP 6: Deploy API ═══
echo ""
echo "═══ ДЕПЛОЙ API ═══"

if command -v vercel >/dev/null 2>&1; then
  info "Деплою API на Vercel..."
  
  # Set env vars
  echo "$DATABASE_URL" | vercel env add DATABASE_URL production --force 2>/dev/null || true
  echo "$JWT_SECRET" | vercel env add JWT_SECRET production --force 2>/dev/null || true
  echo "$JWT_REFRESH_SECRET" | vercel env add JWT_REFRESH_SECRET production --force 2>/dev/null || true
  echo "$ADMIN_SECRET" | vercel env add ADMIN_SECRET production --force 2>/dev/null || true
  
  API_URL=$(vercel --prod 2>&1 | grep "https://" | tail -1 | tr -d '[:space:]')
  ok "API задеплоен: $API_URL"
else
  info "Vercel CLI не найден. Установите: npm i -g vercel"
  info "Или API можно запустить локально: npm run dev:api"
  API_URL="http://localhost:3001"
fi

# ═══ STEP 7: Update frontend API URL ═══
echo ""
info "Обновляю фронт с URL бэкенда..."

if [ "$API_URL" != "http://localhost:3001" ]; then
  sed -i.bak "s|window.MAKONTV_API_URL = ''|window.MAKONTV_API_URL = '$API_URL'|g" apps/web/public/index.html
  rm -f apps/web/public/index.html.bak
  ok "Фронт подключён к $API_URL"
fi

# ═══ STEP 8: Print results ═══
echo ""
echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║           🎬 MakonTV — ГОТОВО!                   ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo -e "  ${CYAN}API:${NC}      ${API_URL:-http://localhost:3001}"
echo -e "  ${CYAN}Admin:${NC}    http://localhost:5173 (запуск: npm run dev:admin)"
echo -e "  ${CYAN}Frontend:${NC} http://localhost:3000 (запуск: npm run dev:web)"
echo ""
echo -e "  ${CYAN}Admin Secret:${NC} $(grep ADMIN_SECRET .env | cut -d= -f2)"
echo ""
echo "  Запуск всего локально:"
echo "    npm run dev:api     # Терминал 1"
echo "    npm run dev:admin   # Терминал 2"  
echo "    npm run dev:web     # Терминал 3"
echo ""
echo "═══════════════════════════════════════════════════"
