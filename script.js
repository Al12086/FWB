function processMessage() {
    const inputText = document.getElementById('input').value.trim();
    const errorMessage = document.getElementById('error-message');
  
    // Очистка предыдущих сообщений об ошибке
    errorMessage.style.display = "none";
  
    if (!inputText) {
      showError("Поле ввода пустое. Вставьте сообщение FWB.");
      return;
    }
  
    // Проверяем, есть ли ключевые слова
    if (!inputText.includes("FWB/") || !inputText.includes("FLT/") || !inputText.match(/\d{3}-\d+/)) {
      showError("Неверный формат сообщения FWB. Проверьте данные.");
      return;
    }
  
    // Разбиваем текст на строки
    const lines = inputText.split('\n').map(line => line.trim()).filter(line => line !== "");
  
    console.log("Разобранные строки:", lines);
  
    // Номер рейса
    const fltLine = lines.find(line => line.startsWith("FLT/"));
    let flightNumber = "";
    if (fltLine) {
      let flightParts = fltLine.split("/");
      if (flightParts.length >= 2) {
        flightNumber = flightParts[1].replace(/[^\d]/g, ""); // Убираем буквы, оставляем только цифры
      }
    }
  
    console.log("Извлечённый номер рейса:", flightNumber);
  
    // Номер накладной (AWB)
    let awbLine = lines.find(line => line.match(/\d{3}-\d+/)) || "";
    let awbMatch = awbLine.match(/\d{3}-(\d{8})/);
    let awb = awbMatch ? awbMatch[1] : "";
  
    console.log("Номер накладной:", awb);
  
    // Определяем код аэропортов (отправления и назначения)
    let depCode = "", destCode = "";
    let awbRest = awbLine.slice(awb.length + 4);
    if (awbRest.length >= 6) {
      depCode = awbRest.substring(0, 3);
      destCode = awbRest.substring(3, 6);
    }
  
    console.log("Код отправления:", depCode, "Код назначения:", destCode);
  
    // **Исправленное извлечение отправителя (Shipper)**
    let shipper = "Неизвестно";
    let shipperIndex = lines.findIndex(line => line.startsWith("SHP"));
  
    if (shipperIndex !== -1 && shipperIndex + 1 < lines.length) {
      shipper = lines[shipperIndex + 1].replace("/", "").trim();
    }
  
    console.log("Shipper:", shipper);
  
    // Количество мест (T)
    let piecesMatch = awbLine.match(/\/T(\d+)/);
    let pieces = piecesMatch ? piecesMatch[1] : "1";
  
    // Фактический вес (Kilos)
    let weightMatch = awbLine.match(/K([\d.]+)/);
    let actualWeight = weightMatch ? weightMatch[1] : "0";
  
    // Расчётный вес (из строки RTD/)
    let rtdLine = lines.find(line => line.startsWith("RTD/"));
    let calcWeight = actualWeight;
    if (rtdLine) {
      let tMatch = rtdLine.match(/\/T([\d.]+)/);
      if (tMatch) {
        let tVal = parseFloat(tMatch[1]);
        calcWeight = Math.round(tVal).toString();
      }
    }
  
    // Минимальный тариф (MC)
    let mcMatch = awbLine.match(/MC([\d.]+)/);
    let mcTariff = mcMatch ? mcMatch[1].replace(".", ",") : "0,00";
  
    // Фрахт (CT)
    let ctMatch = inputText.match(/\/CT([\d.]+)/);
    let ctFreight = ctMatch ? ctMatch[1].replace(".", ",") : "0,00";
  
    // ACC (по умолчанию 100)
    let accLine = lines.find(line => line.startsWith("ACC/"));
    let acc = accLine ? accLine.split("/").pop() : "100";
  
    // Дата отправления (из строки ISU)
    const isuLine = lines.find(line => line.startsWith("ISU/"));
    let dateFormatted = "";
    if (isuLine) {
      const isuMatch = isuLine.match(/ISU\/(\d{2})([A-Z]{3})(\d{2})/);
      if (isuMatch) {
        dateFormatted = formatDate(isuMatch[1], isuMatch[2], isuMatch[3]);
      }
    }
  
    // **Формирование строки**
    let result = [
      awb,        // Номер накладной (8 цифр)
      "1",        // Фиксированное значение
      shipper,    // Отправитель (Shipper)
      depCode,    // Аэропорт отправления
      destCode,   // Аэропорт назначения
      ctFreight,  // Фрахт
      pieces,     // Количество мест
      actualWeight, // Фактический вес
      calcWeight, // Расчётный вес
      mcTariff,   // Минимальный тариф
      acc,        // ACC
      dateFormatted, // Дата отправления
      flightNumber  // Номер рейса
    ].join("\t");
  
    // Вывод результата
    document.getElementById("output").value = result;
  }
  
  // **Функция очистки поля ввода (исправлено)**
  function clearInput() {
    document.getElementById("input").value = ""; // Очищаем поле ввода
    document.getElementById("output").value = ""; // Очищаем поле вывода
    document.getElementById("error-message").style.display = "none"; // Скрываем сообщение об ошибке
  }
  
  // **Функция копирования результата**
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
  
  // **Функция показа ошибки**
  function showError(message) {
    const errorMessage = document.getElementById('error-message');
    errorMessage.textContent = message;
    errorMessage.style.display = "block";
  }
  
  // **Форматирование даты**
  function formatDate(dd, mmm, yy) {
    const monthMap = { "JAN": "01", "FEB": "02", "MAR": "03", "APR": "04", "MAY": "05", "JUN": "06",
      "JUL": "07", "AUG": "08", "SEP": "09", "OCT": "10", "NOV": "11", "DEC": "12" };
    return `${dd}/${monthMap[mmm.toUpperCase()]}/20${yy}`;
  }
  