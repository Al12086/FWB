function processMessage() {
    const inputText = document.getElementById('input').value.trim();
    const errorMessage = document.getElementById('error-message');
    
    // Очистка предыдущих сообщений об ошибке
    errorMessage.style.display = "none";
  
    if (!inputText) {
      showError("Поле ввода пустое. Вставьте сообщение FWB.");
      return;
    }
  
    // Проверяем, содержит ли текст строки FWB, FLT и AWB (примерная валидация)
    if (!inputText.includes("FWB/") || !inputText.includes("FLT/") || !inputText.match(/\d{3}-\d+/)) {
      showError("Неверный формат сообщения FWB. Проверьте данные.");
      return;
    }
  
    // Разбиваем текст на строки и убираем лишние пробелы
    const lines = inputText.split('\n').map(line => line.trim()).filter(line => line !== "");
  
    // Определяем тип сообщения по строке FLT/
    const fltLine = lines.find(line => line.startsWith("FLT/"));
    const isTransfer = fltLine && fltLine.split("/").length > 3;
  
    // Находим строку AWB
    let awbLine = lines.find(line => line.match(/\d{3}-\d+/)) || "";
  
    // Извлекаем номер накладной (удаляем "555-" и оставляем 8 цифр)
    let awbMatch = awbLine.match(/\d{3}-(\d{8})/);
    let awb = awbMatch ? awbMatch[1] : "";
  
    // Проверяем, найден ли AWB
    if (!awb) {
      showError("Ошибка: не удалось найти номер накладной.");
      return;
    }
  
    // Пример данных (замените на свою логику)
    let result = [
      awb,
      "1",
      "SKS",
      "KJA",
      "SVO",
      "2872,50",
      "1",
      "18",
      "25",
      "0,08",
      "100",
      "07/02/2025",
      "1483"
    ].join("\t");
  
    // Вывод результата
    document.getElementById("output").value = result;
    document.getElementById("input").value = ""; // Очищаем ввод
  }
  
  // Функция очистки ввода
  function clearInput() {
    document.getElementById("input").value = "";
    document.getElementById("error-message").style.display = "none"; // Скрыть ошибку
  }
  
  // Функция копирования результата
  function copyResult() {
    const outputEl = document.getElementById("output");
    outputEl.select();
    document.execCommand("copy");
  
    const notification = document.getElementById("notification");
    notification.classList.add("show");
  
    setTimeout(() => {
      notification.classList.remove("show");
    }, 3000);
  }
  
  // Функция показа ошибки
  function showError(message) {
    const errorMessage = document.getElementById('error-message');
    errorMessage.textContent = message;
    errorMessage.style.display = "block";
  }
  