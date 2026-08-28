const verbs = window.verbs || [];

const verbSelect = document.getElementById("verb-select");
const errorMsg = document.getElementById("error-msg");
const grid = document.getElementById("conjugation-grid");
const tenseButtons = document.getElementById("tense-buttons");
const loadingIndicator = document.getElementById("loading-indicator");
const themeToggle = document.getElementById("theme-toggle");

let currentVerbData = null;
let selectedModeFilters = ["alle"];
let selectedTenseFilters = ["alle"];

function init() {
  initTheme();

  verbs.forEach((verb) => {
    verbSelect.appendChild(createOption(verb));
  });

  verbSelect.addEventListener("change", (e) => {
    if (e.target.value) {
      updateVerbNavigation();
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

  document
    .getElementById("btn-previous-verb")
    .addEventListener("click", showPreviousVerb);
  document
    .getElementById("btn-next-verb")
    .addEventListener("click", showNextVerb);

  bindGoToTopButton();

  if (verbs.length > 0) {
    verbSelect.value = verbs[0].id;
    updateVerbNavigation();
    handleVerbChange(verbs[0].id);
  }
}

function initTheme() {
  const darkMode = localStorage.getItem("theme") === "dark";
  document.documentElement.classList.toggle("dark-mode", darkMode);
  updateThemeToggle(darkMode);
  themeToggle.addEventListener("click", () => {
    const isDark = !document.documentElement.classList.contains("dark-mode");
    document.documentElement.classList.toggle("dark-mode", isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
    updateThemeToggle(isDark);
  });
  const updateScrollState = () => {
    themeToggle.classList.toggle("is-scrolling", window.scrollY > 0);
  };
  window.addEventListener("scroll", updateScrollState, { passive: true });
  updateScrollState();
}

function updateThemeToggle(isDark) {
  themeToggle.textContent = isDark ? "☀" : "☾";
  themeToggle.setAttribute(
    "aria-label",
    isDark ? "Hellen Modus aktivieren" : "Nachtmodus aktivieren",
  );
  themeToggle.title = isDark
    ? "Hellen Modus aktivieren"
    : "Nachtmodus aktivieren";
}

function bindGoToTopButton() {
  const goToTopButton = document.getElementById("go-to-top-btn");
  if (!goToTopButton) return;

  const updateGoToTopVisibility = () => {
    goToTopButton.classList.toggle("show", window.scrollY > 300);
  };

  window.addEventListener("scroll", updateGoToTopVisibility, {
    passive: true,
  });
  goToTopButton.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  updateGoToTopVisibility();
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

function showPreviousVerb() {
  navigateVerb(-1);
}

function showNextVerb() {
  navigateVerb(1);
}

function navigateVerb(direction) {
  const options = [...verbSelect.options];
  if (options.length === 0) return;

  const currentIndex = options.findIndex(
    (option) => option.value === verbSelect.value,
  );
  const nextIndex =
    (currentIndex + direction + options.length) % options.length;
  verbSelect.value = options[nextIndex].value;
  updateVerbNavigation();
  handleVerbChange(options[nextIndex].value);
}

function updateVerbNavigation() {
  const options = [...verbSelect.options];
  const previousButton = document.getElementById("btn-previous-verb");
  const nextButton = document.getElementById("btn-next-verb");
  if (options.length === 0 || !previousButton || !nextButton) return;

  const currentIndex = options.findIndex(
    (option) => option.value === verbSelect.value,
  );
  const previousIndex = (currentIndex - 1 + options.length) % options.length;
  const nextIndex = (currentIndex + 1) % options.length;

  previousButton.textContent = `← ${options[previousIndex].textContent}`;
  nextButton.textContent = `${options[nextIndex].textContent} →`;
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
  const fileName = verbId.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const url = `./data/${fileName}.js`;
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
        const [pronoun, verbForm] = splitPronoun(form);
        row.innerHTML = `
            <td class="pronoun" style="font-weight:600; width:35%;">${pronoun}</td>
            <td class="verb-form" style="font-weight:700;">${verbForm}</td>
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

function splitPronoun(form) {
  const match = form.match(
    /^((?:que\s+)?j'|(?:que\s+)?qu'|(?:que\s+)?(?:je|tu|il|elle|on|nous|vous|ils|elles)(?=\s+|$))/i,
  );
  if (!match) return ["", form.trim()];

  return [match[1], form.substring(match[0].length).trim()];
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
