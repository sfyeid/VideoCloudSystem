# Используйте подходящий образ Node.js
FROM node:20-alpine

# Установите рабочую директорию
WORKDIR /app

# Копируйте package.json и package-lock.json
COPY package*.json ./

# Установите зависимости
RUN npm install

# Копируйте весь проект
COPY . .

# Постройте проект
RUN npm run build

# Экспонируйте порт приложения
EXPOSE 3000

# Запустите приложение
CMD ["npm", "start"]
