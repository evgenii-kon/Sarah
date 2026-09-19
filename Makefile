.PHONY: install run-backend run-frontend run dev

# Установка зависимостей
install:
	cd backend && pip install -r requirements.txt
	cd frontend && npm install

# Запуск бэкенда
run-backend:
	cd backend && uvicorn main:app --reload --port 8000

# Запуск фронтенда
run-frontend:
	cd frontend && npm run dev

# Запуск обоих одновременно
dev:
	make run-backend & make run-frontend