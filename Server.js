const express = require('express'); // Імпортуємо бібліотеку express
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const app = express(); // Ініціалізуємо express
const port = 80;

app.use(express.json()); // Включаємо middleware для обробки JSON

// Абсолютний шлях до файлу ips.json
const filePath = path.join(__dirname, 'ips.json');

// Обслуговування статичних файлів (HTML, CSS, JS)
app.use(express.static(__dirname)); // Це дозволяє доступ до index.html

// Функція для отримання реальної IP-адреси через сторонній сервіс (якщо потрібно)
async function getPublicIp(req) {
  try {
    const response = await axios.get('https://api.ipify.org?format=json');
    return response.data.ip; // Публічний IP-адрес користувача
  } catch (error) {
    console.error('Не вдалося отримати публічний IP:', error);
    return null;
  }
}

// Endpoint для отримання IP-адреси
app.get('/get-ip', async (req, res) => {
  try {
    // Отримуємо публічний IP за допомогою стороннього сервісу
    const ip = await getPublicIp(req);
    
    // Якщо не вдалося отримати публічний IP через сторонній сервіс, використовуємо локальний
    const realIp = ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    console.log(`IP отримано: ${realIp}`);

    fs.readFile(filePath, 'utf8', (err, data) => {
      let ips = [];
      if (err) {
        if (err.code === 'ENOENT') {
          console.log('Файл ips.json не знайдено. Створюється новий файл.');
          ips = [];
        } else {
          console.error('Помилка при читанні файлу:', err);
          return res.status(500).send('Помилка при читанні файлу IP');
        }
      } else {
        try {
          ips = JSON.parse(data);
        } catch (parseErr) {
          console.error('Помилка парсингу файлу:', parseErr);
          return res.status(500).send('Помилка парсингу файлу IP');
        }
      }

      // Додавання IP у масив
      ips.push(realIp);

      // Запис оновленого масиву у файл ips.json
      fs.writeFile(filePath, JSON.stringify(ips, null, 2), (writeErr) => {
        if (writeErr) {
          console.error('Помилка запису у файл:', writeErr);
          return res.status(500).send('Помилка при збереженні IP');
        }
        res.status(200).send('IP успішно збережено');
      });
    });
  } catch (error) {
    console.error('Загальна помилка:', error);
    res.status(500).send('Помилка при обробці запиту');
  }
});

// Запуск сервера
app.listen(port, () => {
  console.log(`Сервер запущено на http://localhost:${port}`);
});
