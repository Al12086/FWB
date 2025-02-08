function processMessage() {
    const inputText = document.getElementById('input').value;
    if (!inputText.trim()) {
      alert("Пожалуйста, вставьте сообщение FWB.");
      return;
    }
    
    // Разбиваем текст на строки и убираем лишние пробелы
    const lines = inputText.split('\n').map(line => line.trim()).filter(line => line !== "");
    
    // Определяем тип сообщения по строке, начинающейся с FLT/
    const fltLine = lines.find(line => line.startsWith("FLT/"));
    if (!fltLine) {
      alert("Не найдена строка FLT/!");
      return;
    }
    const fltParts = fltLine.split("/");
    const isTransfer = (fltParts.length > 3); // если больше одного полёта
    
    // Находим AWB-строку (обычно вторая строка, после FWB/...)
    let awbLine = "";
    if (lines[0].startsWith("FWB/") && lines.length > 1) {
      awbLine = lines[1];
    } else {
      awbLine = lines.find(line => line.match(/\d{3}-\d+/)) || "";
    }
    if (!awbLine) {
      alert("Не найдена AWB-строка!");
      return;
    }
    
    // Находим CT-фрахт (ищем строку, содержащую /CT)
    let ctMatch = inputText.match(/\/CT([\d.]+)/);
    let ctFreight = ctMatch ? parseFloat(ctMatch[1]).toFixed(2).replace(".", ",") : "";
    
    // Находим ACC (если строка ACC/ присутствует, иначе по умолчанию 100)
    let accLine = lines.find(line => line.startsWith("ACC/"));
    let acc = "100";
    if (accLine) {
      let parts = accLine.split("/");
      acc = parts[parts.length - 1] || "100";
    }
    
    // Функция для форматирования числа (замена точки на запятую)
    function formatNumber(num, decimals = 2) {
      return parseFloat(num).toFixed(decimals).replace(".", ",");
    }
    
    // Функция преобразования даты вида DDMMMYY -> DD/MM/YYYY
    function formatDate(dd, mmm, yy) {
      const monthMap = {
        "JAN": "01", "FEB": "02", "MAR": "03",
        "APR": "04", "MAY": "05", "JUN": "06",
        "JUL": "07", "AUG": "08", "SEP": "09",
        "OCT": "10", "NOV": "11", "DEC": "12"
      };
      let mm = monthMap[mmm.toUpperCase()] || "00";
      let yyyy = "20" + yy;
      return dd + "/" + mm + "/" + yyyy;
    }
    
    // Извлекаем дату из строки ISU
    const isuLine = lines.find(line => line.startsWith("ISU/"));
    let dateFormatted = "";
    let flightMonth = "";
    if (isuLine) {
      const isuMatch = isuLine.match(/ISU\/(\d{2})([A-Z]{3})(\d{2})/);
      if (isuMatch) {
        dateFormatted = formatDate(isuMatch[1], isuMatch[2], isuMatch[3]);
        flightMonth = (function() {
          const m = isuMatch[2].toUpperCase();
          const map = { JAN:"01", FEB:"02", MAR:"03", APR:"04", MAY:"05", JUN:"06", JUL:"07", AUG:"08", SEP:"09", OCT:"10", NOV:"11", DEC:"12" };
          return map[m] || "00";
        })();
      }
    }
    
    // Переменные для итоговых данных
    let awb = "";
    let shipper = "";
    let depCode = "";
    let destCode = "";
    let pieces = "";
    let actualWeight = "";
    let calcWeight = "";
    let mcTariff = "";
    
    if (!isTransfer) {
      // Обработка стандартного сообщения
      const awbMatch = awbLine.match(/^(\d{3}-\d{8,})/);
      let fullAwb = awbMatch ? awbMatch[1] : "";
      // Удаляем префикс "555-" для итогового вывода (оставляем только 8 цифр)
      awb = fullAwb.startsWith("555-") ? fullAwb.substring(4) : fullAwb;
      const rest = awbLine.slice(fullAwb.length);
      depCode = rest.substring(0,3);
      destCode = rest.substring(3,6);
      const tMatch = awbLine.match(/\/T(\d+)/);
      pieces = tMatch ? tMatch[1] : "";
      const kMatch = awbLine.match(/K(\d+)/);
      actualWeight = kMatch ? kMatch[1] : "";
      const rtdLine = lines.find(line => line.startsWith("RTD/"));
      if (rtdLine) {
        const tValMatch = rtdLine.match(/\/T([\d.]+)/);
        if (tValMatch) {
          let tVal = parseFloat(tValMatch[1]);
          calcWeight = Math.round(tVal/70).toString();
        }
      }
      const mcMatch = awbLine.match(/MC([\d.]+)/);
      mcTariff = mcMatch ? formatNumber(mcMatch[1], 2).replace(".", ",") : "";
      const shipperLine = lines.find(line => line.startsWith("/OOO"));
      if (shipperLine) {
        const sMatch = shipperLine.match(/^\/OOO\s+(\S+)/);
        shipper = sMatch ? sMatch[1] : "";
      }
      const fltParts = fltLine.split("/");
      let flightCode = "";
      if (fltParts.length >= 2) {
        flightCode = fltParts[1].replace(/[^\d]/g, "");
      }
      var flightNumbers = flightCode;
    } else {
      // Обработка сообщения с трансфером
      let awbTemp = awbLine.replace(/^555-/, "");
      const awbTransferMatch = awbTemp.match(/^(\d+)/);
      awb = awbTransferMatch ? awbTransferMatch[1] : "";
      let shpIndex = lines.findIndex(line => line === "SHP");
      if (shpIndex !== -1 && lines.length > shpIndex+1) {
        let possible = lines.slice(shpIndex+1).find(line => line.startsWith("/"));
        if (possible) {
          shipper = possible.replace(/^\//, "").trim();
        }
      }
      const awbAfter = awbTemp.slice(awb.length);
      depCode = awbAfter.substring(0,3);
      destCode = awbAfter.substring(3,6);
      const tMatch = awbLine.match(/\/T(\d+)/);
      pieces = tMatch ? tMatch[1] : "";
      const kMatch = awbLine.match(/K(\d+)/);
      actualWeight = kMatch ? kMatch[1] : "";
      calcWeight = actualWeight;
      const mcMatch = awbLine.match(/MC([\d.]+)/);
      mcTariff = mcMatch ? formatNumber(mcMatch[1], 2).replace(".", ",") : "";
      const fltParts = fltLine.split("/");
      let flightNumbers = "";
      let flightDates = "";
      if (fltParts.length >= 3) {
        let flt1 = fltParts[1];
        let day1 = fltParts[2];
        let num1 = flt1.replace(/[^\d]/g, "");
        flightNumbers = num1;
        flightDates = day1 + "." + flightMonth;
      }
      if (fltParts.length >= 5) {
        let flt2 = fltParts[3];
        let day2 = fltParts[4];
        let num2 = flt2.replace(/[^\d]/g, "");
        flightNumbers = flightNumbers + "/" + num2;
        flightDates = flightDates + "/" + day2 + "." + flightMonth;
      }
      var flightDatesField = flightDates;
      var flightNumbersField = flightNumbers;
    }
    
    // Формирование итоговой строки с разделителями табуляции
    let result = "";
    if (!isTransfer) {
      result = [
        awb,
        "1",
        shipper,
        depCode,
        destCode,
        ctFreight,
        pieces,
        actualWeight,
        calcWeight,
        mcTariff,
        acc,
        dateFormatted,
        typeof flightNumbers !== "undefined" ? flightNumbers : ""
      ].join("\t");
    } else {
      result = [
        awb,
        "1",
        shipper,
        depCode,
        destCode,
        ctFreight,
        pieces,
        actualWeight,
        calcWeight,
        mcTariff,
        acc,
        flightDatesField,
        flightNumbersField
      ].join("\t");
    }
    
    // Вывод результата, очищаем поле ввода
    document.getElementById("output").value = result;
    document.getElementById("input").value = "";
  }
  
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
  