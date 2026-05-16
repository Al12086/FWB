(function() {
  const inputArea = document.getElementById('input');
  const outputArea = document.getElementById('output');
  const processBtn = document.getElementById('processButton');
  const copyBtn = document.getElementById('copyButton');
  const clearBtn = document.getElementById('clearButton');
  const errorContainer = document.getElementById('error-message-container');
  const toastEl = document.getElementById('toastMessage');
  const toastTextSpan = document.getElementById('toastText');

  function escapeHtml(str) {
    return str.replace(/[&<>]/g, function(m) {
      if (m === '&') return '&amp;';
      if (m === '<') return '&lt;';
      if (m === '>') return '&gt;';
      return m;
    });
  }

  function showError(message) {
    errorContainer.innerHTML = `
      <div class="alert alert-error">
        <i class="fas fa-exclamation-triangle"></i> 
        <span>${escapeHtml(message)}</span>
      </div>
    `;
    setTimeout(() => {
      if (errorContainer.children[0]?.innerText.includes(message)) {
        if (errorContainer.innerHTML.includes(message)) clearErrorOnly();
      }
    }, 5000);
  }

  function clearErrorOnly() {
    if (errorContainer.innerHTML.trim() !== '') errorContainer.innerHTML = '';
  }

  function clearErrorsAndNotifications() {
    errorContainer.innerHTML = '';
  }

  function showSuccessToast(message) {
    toastTextSpan.innerText = message;
    toastEl.classList.add('show');
    setTimeout(() => toastEl.classList.remove('show'), 2800);
  }

  function monthToNumber(mmm) {
    const months = { "JAN":"01","FEB":"02","MAR":"03","APR":"04","MAY":"05","JUN":"06","JUL":"07","AUG":"08","SEP":"09","OCT":"10","NOV":"11","DEC":"12" };
    return months[mmm.toUpperCase()] || "01";
  }

  function extractMonthYearFromISU(textLines) {
    const isuLine = textLines.find(line => line.startsWith("ISU/"));
    if (!isuLine) return "";
    const match = isuLine.match(/ISU\/\d{2}([A-Z]{3})(\d{2})/i);
    if (match) {
      const monthStr = monthToNumber(match[1]);
      const yearShort = match[2];
      return `${monthStr}.${yearShort}`;
    }
    return "";
  }

  function processMessage() {
    clearErrorsAndNotifications();
    const rawText = inputArea.value;
    if (!rawText.trim()) {
      showError("❌ Поле ввода пустое. Вставьте сообщение FWB.");
      outputArea.value = "";
      return;
    }

    if (!rawText.includes("FWB/") || !rawText.includes("FLT/")) {
      showError("⚠️ Сообщение не содержит обязательных маркеров FWB/ или FLT/. Убедитесь в корректности.");
      outputArea.value = "";
      return;
    }

    const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(l => l !== "");
    
    let awbLine = lines.find(l => l.match(/\d{3}-\d+/) && (l.includes("FWB") || l.match(/\d{3}-\d{8}/))) || "";
    if (!awbLine) awbLine = lines.find(l => l.match(/\d{3}-\d+/)) || "";
    let awbMatch = awbLine.match(/\d{3}-(\d{8})/);
    let awb = awbMatch ? awbMatch[1] : "";
    if (!awb) {
      showError("❌ Не удалось извлечь номер AWB (ожидается формат 000-12345678)");
      outputArea.value = "";
      return;
    }

    let depCode = "", destCode = "";
    let restAfterAwb = awbLine.slice(awb.length + 4);
    if (restAfterAwb.length >= 6) {
      depCode = restAfterAwb.substring(0, 3).toUpperCase();
      destCode = restAfterAwb.substring(3, 6).toUpperCase();
    } else {
      const anyDep = lines.find(l => l.match(/DEP\/[A-Z]{3}/i));
      if (anyDep) {
        const depMatch = anyDep.match(/DEP\/([A-Z]{3})/i);
        if (depMatch) depCode = depMatch[1].toUpperCase();
      }
      const anyDest = lines.find(l => l.match(/DEST\/[A-Z]{3}/i));
      if (anyDest) {
        const destMatch = anyDest.match(/DEST\/([A-Z]{3})/i);
        if (destMatch) destCode = destMatch[1].toUpperCase();
      }
    }

    let shipper = "Неизвестно";
    const shipperIdx = lines.findIndex(l => l.startsWith("SHP"));
    if (shipperIdx !== -1 && shipperIdx + 1 < lines.length) {
      let rawShipper = lines[shipperIdx + 1].replace(/\//g, "").trim();
      if (rawShipper) shipper = rawShipper;
    } else {
      const shipperInline = lines.find(l => l.match(/^SHP\/.+$/));
      if (shipperInline) {
        let val = shipperInline.replace(/^SHP\//, "").trim();
        if (val) shipper = val;
      }
    }

    let piecesMatch = awbLine.match(/\/T(\d+)/);
    let pieces = piecesMatch ? piecesMatch[1] : "1";
    
    let weightMatch = awbLine.match(/K([\d.]+)/);
    let actualWeight = weightMatch ? parseFloat(weightMatch[1]) : 0;
    
    let mcMatch = awbLine.match(/MC([\d.]+)/);
    let volume = mcMatch ? parseFloat(mcMatch[1]) : 0;
    let volumeWeight = Math.ceil(volume * 166.666 * 2) / 2;
    
    let chargeableWeight = Math.max(actualWeight, volumeWeight);
    if (chargeableWeight < 25) chargeableWeight = 25;
    
    const formattedActualWeight = actualWeight.toFixed(1).replace(".", ",");
    const formattedChargeableWeight = chargeableWeight.toFixed(1).replace(".", ",");
    const formattedVolume = volume.toFixed(2).replace(".", ",");
    
    let ctMatch = rawText.match(/\/CT([\d.]+)/);
    let ctFreight = ctMatch ? ctMatch[1].replace(".", ",") : "0,00";
    
    let sphLine = lines.find(l => l.startsWith("SPH/"));
    let sphTrigger = sphLine ? sphLine.replace("SPH/", "").trim() : "Нет";
    
    const fltLine = lines.find(l => l.startsWith("FLT/"));
    let flightNumbers = [];
    let flightDays = [];
    
    if (fltLine) {
      let parts = fltLine.split("/");
      for (let i = 1; i < parts.length; i++) {
        let segment = parts[i].trim();
        if (segment.match(/[A-Z]{2,3}\d+/i)) {
          let numOnly = segment.replace(/[^\d]/g, "");
          if (numOnly) flightNumbers.push(numOnly);
          if (i+1 < parts.length && /^\d{1,2}$/.test(parts[i+1].trim())) {
            flightDays.push(parts[i+1].trim());
            i++;
          } else if (i+1 < parts.length && parts[i+1].trim().match(/^\d{1,2}[A-Z]{3}/i)) {
            let complexDate = parts[i+1].trim();
            let dayMatch = complexDate.match(/^(\d{1,2})/);
            if (dayMatch) flightDays.push(dayMatch[1]);
            i++;
          }
        } else if (/^\d{1,2}$/.test(segment) && flightNumbers.length > flightDays.length) {
          flightDays.push(segment);
        }
      }
      if (flightDays.length === 0) {
        const dayLine = lines.find(l => l.match(/DAY\/(\d{1,2})/i));
        if (dayLine) {
          const dayMatch = dayLine.match(/DAY\/(\d{1,2})/i);
          if (dayMatch) flightDays.push(dayMatch[1]);
        }
      }
    }
    
    let monthYear = extractMonthYearFromISU(lines);
    let monthOnly = monthYear ? monthYear.split('.')[0] : "";
    let yearOnly = monthYear ? monthYear.split('.')[1] : "";
    
    let formattedFlightDates = "";
    if (flightDays.length === 1) {
      const day = flightDays[0];
      if (monthYear) {
        formattedFlightDates = `${day}.${monthYear}`;
      } else {
        formattedFlightDates = `${day}.??`;
      }
    } else if (flightDays.length >= 2) {
      if (monthOnly) {
        formattedFlightDates = flightDays.map(day => `${day}.${monthOnly}`).join("/");
      } else {
        formattedFlightDates = flightDays.join("/");
      }
    } else {
      formattedFlightDates = "XX";
    }
    
    let flightNumbersStr = flightNumbers.length ? flightNumbers.join("/") : "";
    if (flightNumbersStr === "" && fltLine) {
      let fallbackMatch = fltLine.match(/\b([A-Z]{2,3}\d+)\b/i);
      if (fallbackMatch) flightNumbersStr = fallbackMatch[1].replace(/[^\d]/g, "");
    }
    
    const resultRow = [
      awb, "1", shipper,
      depCode || "XXX", destCode || "XXX",
      ctFreight, pieces,
      formattedActualWeight, formattedChargeableWeight, formattedVolume,
      sphTrigger, formattedFlightDates, flightNumbersStr || "0"
    ].join("\t");
    
    outputArea.value = resultRow;
    if (!resultRow.trim()) {
      showError("⚠️ Результат пуст, возможно недостаточно данных в FWB.");
    }
  }
  
  function copyResult() {
    if (!outputArea.value.trim()) {
      showError("❌ Нечего копировать. Сначала обработайте сообщение.");
      return;
    }
    navigator.clipboard.writeText(outputArea.value).then(() => {
      showSuccessToast("✅ Результат скопирован в буфер!");
    }).catch(() => {
      showError("❌ Ошибка доступа к буферу обмена.");
    });
  }
  
  function clearAll() {
    inputArea.value = "";
    outputArea.value = "";
    clearErrorsAndNotifications();
  }
  
  function onKeyHandler(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      processMessage();
    }
  }
  
  function init() {
    processBtn.addEventListener('click', processMessage);
    copyBtn.addEventListener('click', copyResult);
    clearBtn.addEventListener('click', clearAll);
    inputArea.addEventListener('keydown', onKeyHandler);
    inputArea.addEventListener('input', () => {
      if (errorContainer.innerHTML.trim() !== "") clearErrorsAndNotifications();
    });
  }
  
  init();
})();
