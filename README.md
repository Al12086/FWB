# ✈️ FWB Parser – Инструмент для обработки авиагрузовых накладных (FWB)

**FWB Parser** – это веб-приложение для автоматического **разбора и обработки авиационных грузовых накладных (FWB)**.  
Программа **извлекает данные из FWB-сообщения**, включая **номер накладной, аэропорты, вес, стоимость, рейсы, даты** и **форматирует их для Excel**.  

🔹 **Работает прямо в браузере** (без установки дополнительных программ).  
🔹 **Поддержка трансферных рейсов и правильных дат**.  
🔹 **Позволяет мгновенно копировать результат** в буфер обмена.  
🔹 **Обрабатывает ошибки и выводит уведомления**.  

---

## 📌 **Функциональность**
✔ **Автоматическое извлечение данных** из FWB-сообщения.  
✔ **Поддержка трансферных рейсов** (с несколькими датами полётов).  
✔ **Корректная обработка дат** (день берётся из `FLT/`, месяц и год из `ISU/`).  
✔ **Форматирование чисел для Excel** (замена `.` на `,`).  
✔ **Копирование результата в буфер** для быстрой вставки в таблицу.  
✔ **Очистка полей и обработка ошибок**.  

---

## 📂 **Структура проекта**
Проект состоит из **трёх файлов**:

📌 **`index.html`** – Структура веб-страницы (интерфейс).  
📌 **`style.css`** – Оформление формы.  
📌 **`script.js`** – Основная логика обработки FWB.  

---

## 🛠 **Установка и запуск**
🚀 **Этот проект не требует установки – просто откройте `index.html` в браузере!**  

### **Запуск в браузере (локально)**
1. **Скачайте файлы** (`index.html`, `style.css`, `script.js`).  
2. Откройте **`index.html`** в любом современном браузере (Chrome, Firefox, Edge и т. д.).  
3. Вставьте сообщение **FWB** в поле ввода.  
4. Нажмите **"Обработать"** – и получите готовый результат!  
5. Нажмите **"Копировать"**, чтобы вставить результат в Excel.  

---

## ✨ **Пример входных данных**
Программа принимает **FWB-сообщения** следующего формата:
FWB/16 555-11111111OVBKHV/T3K18.0MC0.15 FLT/FV6835/10 ISU/09FEB25/KJA SPH/460


✅ **Что извлекается из текста?**  
- **Номер накладной** (`555-11111111` → `11111111`).  
- **Аэропорты** (`OVB` → Новосибирск, `KHV` → Хабаровск).  
- **Вес (физический и платный)** (`K18.0`, `MC0.15`).  
- **Дата рейса** (`10.02.25`, где `10` из `FLT/`, а `02.25` из `ISU/`).  
- **Триггер SPH** (`460`).  

---

## 🔧 **Как работает `script.js`?**
Программа **разбирает FWB-сообщение**, извлекает **ключевые данные**, форматирует их и выводит в удобном виде.

### **Основные этапы обработки данных**
1. **Разбивка текста на строки**:
```js
const lines = inputText.split('\n').map(line => line.trim()).filter(line => line !== "");
```

Извлечение номера накладной (AWB):

```js
let awbMatch = awbLine.match(/\d{3}-(\d{8})/);
let awb = awbMatch ? awbMatch[1] : "";
```

Поиск номеров рейсов и дат полётов:

```js
const fltLine = lines.find(line => line.startsWith("FLT/"));
let flightNumbers = [];
let flightDates = [];

if (fltLine) {
  let flightParts = fltLine.split("/");
  for (let i = 1; i < flightParts.length; i += 2) {
    if (flightParts[i].match(/[A-Z]{2}\d+/)) {
      flightNumbers.push(flightParts[i].replace(/[^\d]/g, ""));
      if (flightParts[i + 1]) {
        flightDates.push(flightParts[i + 1]);
      }
    }
  }
}
```

Форматирование даты рейса:

```js
const isuLine = lines.find(line => line.startsWith("ISU/"));
let monthYear = "";

if (isuLine) {
  const isuMatch = isuLine.match(/ISU\/\d{2}([A-Z]{3})(\d{2})/);
  if (isuMatch) {
    monthYear = `${monthToNumber(isuMatch[1])}.${isuMatch[2]}`;
  }
}
let formattedFlightDates = flightDates.map(date => `${date}.${monthYear}`).join("/");
```

Копирование в буфер обмена:

```js
navigator.clipboard.writeText(outputEl.value)
  .then(() => {
    showNotification("Результат скопирован в буфер обмена!");
  })
  .catch(err => {
    showError("Не удалось скопировать. Разрешите доступ к буферу обмена.");
  });
```

## ⚠ Ошибки и уведомления

| 🔴 **Ошибка**                  | 📌 **Причина**                                          |
|--------------------------------|--------------------------------------------------------|
| **"Поле ввода пустое"**       | Ничего не введено.                                    |
| **"Неверный формат сообщения"** | Вставлен не FWB-текст.                                |
| **"Нет данных для копирования"** | Нажата кнопка копирования при пустом поле.           |
| ✅ **"Результат скопирован в буфер"** | Успешное копирование.                        |


🚀 Разработка и обновления

Как внести изменения в код?  
Открыть код в любом текстовом редакторе (VS Code, Notepad++ и т. д.).
Внести правки в script.js (например, добавить новую обработку данных).
Обновить страницу в браузере.

🎯 **Итог**  
✅ Готовый инструмент для обработки авиагрузовых накладных FWB.  
✅ Работает в браузере без установки.  
✅ Поддержка трансферных рейсов и правильных дат.  
✅ Готовый результат для Excel.  
✅ Мгновенное копирование.  


🔥 Используйте и экономьте время! 🚀😃
