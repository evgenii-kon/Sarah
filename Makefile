.PHONY: install run-backend run-frontend dev

# Установка зависимостей
install:
	cd backend && pip install -r requirements.txt
	cd frontend && npm install

# Запуск бэкенда
run-backend:
	cd backend && ../venv/bin/uvicorn main:app --reload --port 8000

# Запуск фронтенда
run-frontend:
	cd frontend && npm run dev

# Запуск всего одной командой
dev:
	ollama serve & \
	cd backend && ../venv/bin/uvicorn main:app --reload --port 8000 & \
	cd frontend && npm run dev