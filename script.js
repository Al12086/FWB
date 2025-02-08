document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("processButton").addEventListener("click", processMessage);
  document.getElementById("copyButton").addEventListener("click", copyResult);
  document.getElementById("clearButton").addEventListener("click", clearInput);
});

function processMessage() {
  const inputText = document.getElementById('input').value.trim();
  const errorMessage = document.getElementById('error-message');

  errorMessage.style.display = "none";

  if (!inputText) {
    showError("Поле ввода пустое. Вставьте сообщение FWB.");
    return;
  }

  if (!inputText.includes("FWB/") || !inputText.includes("FLT/") || !inputText.match(/\d{3}-\d+/)) {
    showError("Неверный формат сообщения FWB. Проверьте данные.");
    return;
  }

  const lines = inputText.split('\n').map(line => line.trim()).filter(line => line !== "");

  console.log("Разобранные строки:", lines);

  // Номер накладной (AWB)
  let awbLine = lines.find(line => line.match(/\d{3}-\d+/)) || "";
  let awbMatch = awbLine.match(/\d{3}-(\d{8})/);
  let awb = awbMatch ? awbMatch[1] : "";

  console.log("Номер накладной:", awb);

  // Код аэропортов
  let depCode = "", destCode = "";
  let awbRest = awbLine.slice(awb.length + 4);
  if (awbRest.length >= 6) {
    depCode = awbRest.substring(0, 3);
    destCode = awbRest.substring(3, 6);
  }

  console.log("Код отправления:", depCode, "Код назначения:", destCode);

  // **Извлечение отправителя (Shipper)**
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
  let actualWeight = weightMatch ? parseFloat(weightMatch[1]) : 0;

  // **Объёмный вес (Volume Weight)**
  let mcMatch = awbLine.match(/MC([\d.]+)/);
  let volume = mcMatch ? parseFloat(mcMatch[1]) : 0;
  let volumeWeight = Math.ceil(volume * 166.666 * 2) / 2; // Округление вверх до 0.5

  // **Платный вес (Chargeable Weight)**
  let chargeableWeight = Math.max(actualWeight, volumeWeight);

  console.log("Фактический вес:", actualWeight, "Объёмный вес:", volumeWeight, "Платный вес:", chargeableWeight);

  // **Форматирование чисел (замена точки на запятую)**
  let formattedChargeableWeight = chargeableWeight.toFixed(1).replace(".", ",");
  let formattedVolume = volume.toFixed(2).replace(".", ",");

  // Фрахт (CT)
  let ctMatch = inputText.match(/\/CT([\d.]+)/);
  let ctFreight = ctMatch ? ctMatch[1].replace(".", ",") : "0,00";

  // ACC (по умолчанию 100)
  let accLine = lines.find(line => line.startsWith("ACC/"));
  let acc = accLine ? accLine.split("/").pop() : "100";

  // **Извлечение дат полётов и рейсов (трансфер)**
  const fltLine = lines.find(line => line.startsWith("FLT/"));
  let flightNumbers = [];
  let flightDates = [];
  let isTransfer = false;

  if (fltLine) {
    let flightParts = fltLine.split("/");
    for (let i = 1; i < flightParts.length; i += 2) {
      if (flightParts[i].match(/[A-Z]{2}\d+/)) {
        flightNumbers.push(flightParts[i].replace(/[^\d]/g, ""));
      }
    }
    if (flightNumbers.length > 1) {
      isTransfer = true;
    }
  }

  console.log("Номера рейсов:", flightNumbers);

  // **Определение дат для трансфера**
  const isuLine = lines.find(line => line.startsWith("ISU/"));
  let baseDate = "";

  if (isuLine) {
    const isuMatch = isuLine.match(/ISU\/(\d{2})([A-Z]{3})(\d{2})/);
    if (isuMatch) {
      let baseDay = parseInt(isuMatch[1]);
      let month = isuMatch[2];

      if (isTransfer) {
        flightDates.push(`${baseDay}.${monthToNumber(month)}`);
        flightDates.push(`${baseDay + 1}.${monthToNumber(month)}`);
      } else {
        flightDates.push(`${baseDay}.${monthToNumber(month)}`);
      }
    }
  }

  console.log("Даты полётов:", flightDates);

  // **Формирование строки**
  let result = [
    awb,                // Номер накладной (8 цифр)
    "1",                // Фиксированное значение
    shipper,            // Отправитель (Shipper)
    depCode,            // Аэропорт отправления
    destCode,           // Аэропорт назначения
    ctFreight,          // Фрахт
    pieces,             // Количество мест
    actualWeight,       // Фактический вес
    formattedChargeableWeight, // Платный вес (с запятой)
    formattedVolume,    // Объём (MC) с запятой
    acc,                // ACC
    flightDates.join("/"), // Даты рейсов (разделены "/")
    flightNumbers.join("/") // Номера рейсов (разделены "/")
  ].join("\t");

  // Вывод результата
  document.getElementById("output").value = result;
}

function copyResult() {
  const outputEl = document.getElementById("output");

  if (!outputEl.value.trim()) {
    showError("Нет данных для копирования!");
    return;
  }

  navigator.clipboard.writeText(outputEl.value)
    .then(() => {
      showNotification("Результат скопирован в буфер обмена!");
    })
    .catch(err => {
      console.error("Ошибка копирования:", err);
      showError("Не удалось скопировать. Разрешите доступ к буферу обмена.");
    });
}

function clearInput() {
  document.getElementById("input").value = "";
  document.getElementById("output").value = "";
  document.getElementById("error-message").style.display = "none";
}

function showNotification(message) {
  const notification = document.getElementById("notification");
  notification.textContent = message;
  notification.classList.add("show");

  setTimeout(() => {
    notification.classList.remove("show");
  }, 3000);
}

function showError(message) {
  const errorMessage = document.getElementById("error-message");
  errorMessage.textContent = message;
  errorMessage.style.display = "block";
}

function monthToNumber(mmm) {
  const monthMap = {
    "JAN": "01", "FEB": "02", "MAR": "03",
    "APR": "04", "MAY": "05", "JUN": "06",
    "JUL": "07", "AUG": "08", "SEP": "09",
    "OCT": "10", "NOV": "11", "DEC": "12"
  };
  return monthMap[mmm.toUpperCase()] || "00";
}
