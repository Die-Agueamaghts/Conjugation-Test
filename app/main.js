const verbs = window.verbs || [];

const verbSelect = document.getElementById("verb-select");
const errorMsg = document.getElementById("error-msg");
const grid = document.getElementById("conjugation-grid");
const tenseButtons = document.getElementById("tense-buttons");
const loadingIndicator = document.getElementById("loading-indicator");

let currentVerbData = null;
let selectedModeFilters = ["alle"];
let selectedTenseFilters = ["alle"];

function init() {
  verbs.forEach((verb) => {
    verbSelect.appendChild(createOption(verb));
  });

  verbSelect.addEventListener("change", (e) => {
    if (e.target.value) {
      handleVerbChange(e.target.value);
    }
  });

  document
    .querySelectorAll('.quickstart input[type="checkbox"]')
    .forEach((input) => {
      input.addEventListener("change", (e) => {
        handleModeChange(e.target);
      });
    });

  if (verbs.length > 0) {
    verbSelect.value = verbs[0].id;
    handleVerbChange(verbs[0].id);
  }
}

function handleVerbChange(verbId) {
  if (loadingIndicator) loadingIndicator.style.display = "block";

  loadVerbData(verbId)
    .then((data) => {
      if (loadingIndicator) loadingIndicator.style.display = "none";
      renderConjugation(data);
      updateTenseButtons();
      applyFilters();
    })
    .catch((err) => {
      if (loadingIndicator) loadingIndicator.style.display = "none";
      errorMsg.style.display = "block";
      errorMsg.textContent = err.message;
    });
}

function createOption(verb) {
  const option = document.createElement("option");
  option.value = verb.id;
  option.textContent = verb.label;
  return option;
}

function handleModeChange(changedInput) {
  const mode = changedInput.dataset.mode;

  if (mode === "alle") {
    selectedModeFilters = ["alle"];
  } else {
    selectedModeFilters = selectedModeFilters.filter((m) => m !== "alle");
    if (changedInput.checked) {
      selectedModeFilters.push(mode);
    } else {
      selectedModeFilters = selectedModeFilters.filter((m) => m !== mode);
    }
    if (selectedModeFilters.length === 0) {
      selectedModeFilters = ["alle"];
    }
  }

  restoreModeCheckboxes();
  updateTenseButtons();
  applyFilters();
}

function restoreModeCheckboxes() {
  const modeInputs = document.querySelectorAll(
    '.quickstart input[type="checkbox"]',
  );
  const useAll = selectedModeFilters.includes("alle");
  modeInputs.forEach((input) => {
    input.checked = useAll
      ? input.dataset.mode === "alle"
      : selectedModeFilters.includes(input.dataset.mode);
  });
}

function updateTenseButtons() {
  if (!currentVerbData) return;

  tenseButtons.innerHTML = "";
  const uniqueTenses = new Set();

  for (const [mode, tenses] of Object.entries(currentVerbData.modes || {})) {
    if (
      selectedModeFilters.includes("alle") ||
      selectedModeFilters.includes(mode)
    ) {
      Object.keys(tenses).forEach((tense) => uniqueTenses.add(tense));
    }
  }

  if (uniqueTenses.size === 0) return;

  const allLabel = document.createElement("label");
  allLabel.dataset.tense = "alle";
  allLabel.innerHTML = `<input type="checkbox" data-tense="alle"> Alle Zeitformen`;
  tenseButtons.appendChild(allLabel);

  uniqueTenses.forEach((tense) => {
    const label = document.createElement("label");
    label.innerHTML = `<input type="checkbox" data-tense="${tense}"> ${tense}`;
    tenseButtons.appendChild(label);
  });

  tenseButtons.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    input.addEventListener("change", (e) => handleTenseChange(e.target));
  });

  selectedTenseFilters = selectedTenseFilters.filter(
    (t) => t === "alle" || uniqueTenses.has(t),
  );
  if (selectedTenseFilters.length === 0) selectedTenseFilters = ["alle"];

  restoreTenseCheckboxes();
}

function handleTenseChange(changedInput) {
  const tense = changedInput.dataset.tense;

  if (tense === "alle") {
    selectedTenseFilters = ["alle"];
  } else {
    selectedTenseFilters = selectedTenseFilters.filter((t) => t !== "alle");
    if (changedInput.checked) {
      selectedTenseFilters.push(tense);
    } else {
      selectedTenseFilters = selectedTenseFilters.filter((t) => t !== tense);
    }
    if (selectedTenseFilters.length === 0) selectedTenseFilters = ["alle"];
  }

  restoreTenseCheckboxes();
  applyFilters();
}

function restoreTenseCheckboxes() {
  const tenseInputs = document.querySelectorAll(
    '#tense-buttons input[type="checkbox"]',
  );
  if (tenseInputs.length === 0) return;

  const useAll = selectedTenseFilters.includes("alle");
  tenseInputs.forEach((input) => {
    if (input.dataset.tense === "alle") {
      input.checked = useAll;
    } else {
      input.checked = useAll
        ? false
        : selectedTenseFilters.includes(input.dataset.tense);
    }
  });
}

function applyFilters() {
  const cards = document.querySelectorAll(".grid .card");
  cards.forEach((card) => {
    const mode = card.dataset.mode;
    const modeVisible =
      selectedModeFilters.includes("alle") ||
      selectedModeFilters.includes(mode);

    let dynamicTenseVisibleCount = 0;
    const tables = card.querySelectorAll(".tense-table");

    tables.forEach((table) => {
      const tbody = table.querySelector("tbody");
      const tense = tbody.dataset.tense;
      const tenseVisible =
        selectedTenseFilters.includes("alle") ||
        selectedTenseFilters.includes(tense);

      if (tenseVisible && modeVisible) {
        table.style.display = "";
        dynamicTenseVisibleCount++;
      } else {
        table.style.display = "none";
      }
    });

    if (dynamicTenseVisibleCount > 0 && modeVisible) {
      card.style.display = "";
    } else {
      card.style.display = "none";
    }
  });
}

function loadVerbData(verbId) {
  const url = `./js/${verbId}.js`;
  errorMsg.style.display = "none";
  grid.innerHTML = "";
  document.getElementById("verb-infinitiv").textContent = "Lade...";
  document.getElementById("verb-auxiliaire").textContent = "...";
  document.getElementById("verb-groupe").textContent = "...";

  return fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Ladefehler: ${response.status} für ${url}`);
      }
      return response.text();
    })
    .then((text) => {
      const jsonText = text
        .replace(/^\s*(?:const\s+verbDaten|window\.verbDaten)\s*=\s*/i, "")
        .replace(/;\s*$/, "");
      try {
        return JSON.parse(jsonText);
      } catch (err) {
        throw new Error("Fehler beim Parsen der JS-Datei");
      }
    })
    .catch((fetchErr) => {
      return loadVerbDataByScript(url).catch((scriptErr) => {
        throw new Error(`${fetchErr.message}; ${scriptErr.message}`);
      });
    });
}

function loadVerbDataByScript(url) {
  return new Promise((resolve, reject) => {
    const existingData = window.verbDaten;
    if (existingData !== undefined) delete window.verbDaten;

    const script = document.createElement("script");
    script.src = url;
    script.onload = () => {
      const data = window.verbDaten;
      script.remove();
      if (existingData !== undefined) window.verbDaten = existingData;
      else delete window.verbDaten;

      if (data) resolve(data);
      else reject(new Error(`Keine Daten in ${url}.`));
    };
    script.onerror = () => {
      script.remove();
      if (existingData !== undefined) window.verbDaten = existingData;
      reject(new Error(`Fehler beim Laden der Skriptdatei ${url}.`));
    };
    document.head.appendChild(script);
  });
}

function renderConjugation(data) {
  currentVerbData = data;
  document.getElementById("verb-title").textContent = data.verbe;
  renderTranslations(verbSelect.value);
  document.getElementById("verb-infinitiv").textContent = data.infinitif || "–";
  document.getElementById("verb-auxiliaire").textContent =
    data.auxiliaire || "–";
  document.getElementById("verb-groupe").textContent = data.groupe || "–";

  grid.innerHTML = "";

  for (const [mode, tenses] of Object.entries(data.modes || {})) {
    const card = document.createElement("div");
    card.className = "card";
    card.dataset.mode = mode;

    const title = document.createElement("h3");
    title.textContent = mode;
    card.appendChild(title);

    for (const [tense, forms] of Object.entries(tenses)) {
      const table = document.createElement("table");
      table.className = "tense-table";

      const tbody = document.createElement("tbody");
      tbody.dataset.tense = tense;

      const headerRow = document.createElement("tr");
      const tenseClass = normalizeCssClass(tense);
      headerRow.className = `tense-heading tense-${tenseClass}`;
      headerRow.innerHTML = `
                <td colspan="2">
                    <span>${tense}</span>
                    <span class="tts-controls">
                        <button type="button" class="tts-button play-button" aria-label="${tense} vorlesen">▶</button>
                        <button type="button" class="tts-button pause-button" aria-label="Vorlesen pausieren">⏸</button>
                        <button type="button" class="tts-button stop-button" aria-label="Vorlesen stoppen">⏹</button>
                    </span>
                </td>
            `;

      headerRow
        .querySelector(".play-button")
        .addEventListener("click", () => playSpeech(mode, tense, forms));
      headerRow
        .querySelector(".pause-button")
        .addEventListener("click", () => pauseSpeech());
      headerRow
        .querySelector(".stop-button")
        .addEventListener("click", () => stopSpeech());

      tbody.appendChild(headerRow);

      forms.forEach((form) => {
        const row = document.createElement("tr");
        const splitIndex = findPronounSplit(form);
        const pronoun = form.substring(0, splitIndex).trim();
        const verbForm = form.substring(splitIndex).trim();
        row.innerHTML = `
                    <td class="pronoun" style="font-weight:600; width:35%; color:#7f8c8d;">${pronoun}</td>
                    <td class="verb-form" style="font-weight:700; color:#2c3e50;">${verbForm}</td>
                `;
        tbody.appendChild(row);
      });
      table.appendChild(tbody);
      card.appendChild(table);
    }
    grid.appendChild(card);
  }
}

function renderTranslations(verbId) {
  const container = document.getElementById("translation-icons");
  if (!container) return;

  const translationKey = verbId
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
  const translations = window.verbTranslations?.[translationKey];
  container.innerHTML = "";
  if (!translations) return;

  [
    ["ar", "AR"],
    ["de", "DE"],
    ["en", "EN"],
  ].forEach(([language, label]) => {
    const icon = document.createElement("button");
    icon.type = "button";
    icon.className = "translation-icon";
    icon.textContent = label;
    icon.dataset.translation = translations[language] || "Keine Übersetzung";
    icon.setAttribute("aria-label", `${label}: ${icon.dataset.translation}`);
    container.appendChild(icon);
  });
}

function normalizeCssClass(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function findPronounSplit(form) {
  const apostropheIndex = form.indexOf("'");
  if (apostropheIndex > 0) {
    return apostropheIndex + 1;
  }
  const firstSpace = form.indexOf(" ");
  return firstSpace < 0 ? form.length : firstSpace;
}

let currentUtterance = null;

function playSpeech(mode, tense, forms) {
  if (!window.speechSynthesis) {
    alert("Text-to-Speech wird von diesem Browser nicht unterstützt.");
    return;
  }
  if (window.speechSynthesis.paused && window.speechSynthesis.speaking) {
    window.speechSynthesis.resume();
    return;
  }
  const text = `${mode}, ${tense}. ${forms.join(". ")}`;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "fr-FR";
  utterance.onend = () => {
    currentUtterance = null;
  };
  currentUtterance = utterance;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function pauseSpeech() {
  if (!window.speechSynthesis) return;
  if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
    window.speechSynthesis.pause();
  }
}

function stopSpeech() {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}

document.addEventListener("DOMContentLoaded", init);
