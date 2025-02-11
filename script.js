document.addEventListener("DOMContentLoaded", function () {
  const processButton = document.getElementById("processButton");
  const copyButton = document.getElementById("copyButton");
  const clearButton = document.getElementById("clearButton");

  if (processButton) processButton.addEventListener("click", processMessage);
  if (copyButton) copyButton.addEventListener("click", copyResult);
  if (clearButton) clearButton.addEventListener("click", clearInput);
});

function processMessage() {
  const inputText = document.getElementById("input").value.trim();
  const errorMessage = document.getElementById("error-message");
  const outputField = document.getElementById("output");

  errorMessage.style.display = "none";
  outputField.value = ""; // Очищаем предыдущее значение

  if (!inputText) {
    showError("❌ Поле ввода пустое. Вставьте сообщение FWB.");
    return;
  }

  if (!inputText.includes("FWB/") || !inputText.includes("FLT/") || !inputText.match(/\d{3}-\d+/)) {
    showError("⚠ Неверный формат сообщения FWB. Проверьте данные.");
    return;
  }

  const lines = inputText.split("\n").map(line => line.trim()).filter(line => line !== "");

  console.log("Разобранные строки:", lines);

  // Извлечение номера накладной (AWB)
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

  // Извлечение отправителя (Shipper)
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

  // Объёмный вес (Volume Weight)
  let mcMatch = awbLine.match(/MC([\d.]+)/);
  let volume = mcMatch ? parseFloat(mcMatch[1]) : 0;
  let volumeWeight = Math.ceil(volume * 166.666 * 2) / 2;

  // Платный вес (Chargeable Weight)
  let chargeableWeight = Math.max(actualWeight, volumeWeight);

  // Минимальный платный вес - 25 кг
  if (chargeableWeight < 25) {
    chargeableWeight = 25;
  }

  console.log("Физический вес:", actualWeight, "Объёмный вес:", volumeWeight, "Платный вес:", chargeableWeight);

  // Форматирование чисел (замена точки на запятую)
  let formattedActualWeight = actualWeight.toFixed(1).replace(".", ",");
  let formattedChargeableWeight = chargeableWeight.toFixed(1).replace(".", ",");
  let formattedVolume = volume.toFixed(2).replace(".", ",");

  // Фрахт (CT)
  let ctMatch = inputText.match(/\/CT([\d.]+)/);
  let ctFreight = ctMatch ? ctMatch[1].replace(".", ",") : "0,00";

  // Извлечение триггера (SPH)
  let sphLine = lines.find(line => line.startsWith("SPH/"));
  let sphTrigger = sphLine ? sphLine.replace("SPH/", "").trim() : "Неизвестно";

  console.log("Триггер SPH:", sphTrigger);

  // Извлечение рейсов и дат полётов
  const fltLine = lines.find(line => line.startsWith("FLT/"));
  let flightNumbers = [];
  let flightDates = [];

  if (fltLine) {
    let flightParts = fltLine.split("/");
    for (let i = 1; i < flightParts.length; i += 2) {
      if (flightParts[i].match(/[A-Z]{2}\d+/)) {
        flightNumbers.push(flightParts[i].replace(/[^\d]/g, "")); // Извлекаем номер рейса
        if (flightParts[i + 1]) {
          flightDates.push(flightParts[i + 1]); // Извлекаем дату (день полёта)
        }
      }
    }
  }

  console.log("Номера рейсов:", flightNumbers);
  console.log("Даты полётов (дни):", flightDates);

  // Извлечение месяца и года из ISU
  const isuLine = lines.find(line => line.startsWith("ISU/"));
  let monthYear = "";

  if (isuLine) {
    const isuMatch = isuLine.match(/ISU\/\d{2}([A-Z]{3})(\d{2})/);
    if (isuMatch) {
      monthYear = `${monthToNumber(isuMatch[1])}.${isuMatch[2]}`; // Преобразуем в "02.25"
    }
  }

  console.log("Месяц и год полёта:", monthYear);

  // Формирование дат с месяцем и годом
  let formattedFlightDates = flightDates.map(date =>
    flightDates.length > 1 ? `${date}.${monthYear.split(".")[0]}` : `${date}.${monthYear}`
  ).join("/");

  console.log("Финальная дата полёта:", formattedFlightDates);

  // Формирование строки
  let result = [
    awb, "1", shipper, depCode, destCode, ctFreight, pieces,
    formattedActualWeight, formattedChargeableWeight, formattedVolume, sphTrigger,
    formattedFlightDates, flightNumbers.join("/")
  ].join("\t");

  // Вывод результата
  outputField.value = result;
}

// Функция копирования результата
function copyResult() {
  const outputEl = document.getElementById("output");

  if (!outputEl.value.trim()) {
    showError("❌ Нет данных для копирования!");
    return;
  }

  navigator.clipboard.writeText(outputEl.value)
    .then(() => {
      showSuccess("✅ Результат скопирован в буфер обмена!");
    })
    .catch(err => {
      console.error("Ошибка копирования:", err);
      showError("❌ Не удалось скопировать. Разрешите доступ к буферу обмена.");
    });
}

// Функция очистки ввода
function clearInput() {
  document.getElementById("input").value = "";
  document.getElementById("output").value = "";
  document.getElementById("error-message").style.display = "none";
}

// Функция отображения ошибки
function showError(message) {
  const errorMessage = document.getElementById("error-message");
  errorMessage.textContent = message;
  errorMessage.style.display = "block";
}

// Функция отображения успешного сообщения
function showSuccess(message) {
  const notification = document.getElementById("notification");
  notification.textContent = message;
  notification.classList.add("show");

  setTimeout(() => {
    notification.classList.remove("show");
  }, 3000);
}

// Функция преобразования месяца в число
function monthToNumber(mmm) {
  const months = { "JAN": "01", "FEB": "02", "MAR": "03", "APR": "04", "MAY": "05", "JUN": "06", "JUL": "07", "AUG": "08", "SEP": "09", "OCT": "10", "NOV": "11", "DEC": "12" };
  return months[mmm.toUpperCase()] || "00";
}
