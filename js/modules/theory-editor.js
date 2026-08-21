import { showToast } from "./ui.js";
import { api } from "./utils.js";

const DRAFT_STORAGE_KEY = "examhub_theory_draft";

export function initTheoryEditor() {
  const container = document.getElementById("theoryEditorContainer");
  if (!container) return;

  container.innerHTML = `
    <div class="theory-editor-wrap" style="background: var(--color-card-bg); padding: 24px; border-radius: 16px; border: 1px solid var(--color-border);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
        <h2 style="margin: 0;">📖 Редактор Теории (Markdown / HTML / Формулы)</h2>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <button class="btn btn-outline" id="clearTheoryBtn" style="color: #ef4444; border-color: #fca5a5;">🗑️ Очистить текст</button>
          <button class="btn btn-outline" id="loadDraftTheoryBtn">📝 Загрузить черновик</button>
          <button class="btn btn-outline" id="previewStudentTheoryBtn">👁️ Глазами ученика</button>
          <button class="btn btn-primary" id="saveTheoryBtn">🚀 Опубликовать теорию в БД</button>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <!-- Controls & Textarea -->
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <div>
            <label style="display: block; font-weight: 600; margin-bottom: 6px;">Предмет</label>
            <select id="theorySubjectSelect" class="search-input" style="width: 100%;">
              <option value="biology">🧬 Биология</option>
              <option value="math">📐 Математика</option>
              <option value="russian">📚 Русский язык</option>
              <option value="chemistry">🧪 Химия</option>
              <option value="physics">⚡ Физика</option>
              <option value="informatics">💻 Информатика</option>
              <option value="social">👥 Обществознание</option>
              <option value="history">🏛️ История</option>
              <option value="literature">📖 Литература</option>
              <option value="geography">🌍 География</option>
            </select>
          </div>

          <div>
            <label style="display: block; font-weight: 600; margin-bottom: 6px;">Название темы</label>
            <input type="text" id="theoryTitleInput" class="search-input" placeholder="Например: Тригонометрические уравнения" style="width: 100%; box-sizing: border-box;" />
          </div>

          <div>
            <label style="display: block; font-weight: 600; margin-bottom: 6px;">Категория</label>
            <input type="text" id="theoryCategoryInput" class="search-input" placeholder="Например: Алгебра / Профильный уровень" style="width: 100%; box-sizing: border-box;" />
          </div>

          <!-- Quick Toolbar -->
          <div style="display: flex; gap: 6px; flex-wrap: wrap; background: var(--color-bg-secondary); padding: 8px; border-radius: 8px;">
            <button class="btn btn-outline toolbar-btn" data-tag="bold" style="padding: 4px 8px; font-weight: 700;">B</button>
            <button class="btn btn-outline toolbar-btn" data-tag="italic" style="padding: 4px 8px; font-style: italic;">I</button>
            <button class="btn btn-outline toolbar-btn" data-tag="h2" style="padding: 4px 8px;">H2</button>
            <button class="btn btn-outline toolbar-btn" data-tag="math" style="padding: 4px 8px;">Math</button>
            <button class="btn btn-outline toolbar-btn" data-tag="code" style="padding: 4px 8px;">Code</button>
            <button class="btn btn-outline toolbar-btn" data-tag="table" style="padding: 4px 8px;">Table</button>
            <button class="btn btn-outline toolbar-btn" data-tag="video" style="padding: 4px 8px;">Video</button>
            <button class="btn btn-outline toolbar-btn" data-tag="pdf" style="padding: 4px 8px;">PDF</button>
          </div>

          <div>
            <label style="display: block; font-weight: 600; margin-bottom: 6px;">Содержание (Markdown & HTML)</label>
            <textarea id="theoryContentTextarea" class="search-input" style="width: 100%; height: 320px; font-family: monospace; line-height: 1.5; box-sizing: border-box;" placeholder="Введите текст конспекта, формулы sin^2(x) + cos^2(x) = 1 или таблицы..."></textarea>
          </div>
        </div>

        <!-- Live Preview -->
        <div style="display: flex; flex-direction: column;">
          <label style="display: block; font-weight: 600; margin-bottom: 6px;">👁️ Предпросмотр в реальном времени</label>
          <div id="theoryLivePreview" style="flex: 1; background: var(--color-bg-secondary); padding: 20px; border-radius: 12px; border: 1px solid var(--color-border); overflow-y: auto; line-height: 1.6;">
            <div style="color: var(--color-text-secondary); text-align: center; margin-top: 40px;">Введите контент слева, чтобы увидеть предпросмотр...</div>
          </div>
        </div>
      </div>
    </div>
  `;

  const textarea = document.getElementById("theoryContentTextarea");
  const preview = document.getElementById("theoryLivePreview");

  textarea?.addEventListener("input", () => {
    updatePreview(textarea.value, preview);
    autoSaveDraft(textarea.value);
  });

  bindToolbar(textarea, preview);

  document.getElementById("clearTheoryBtn")?.addEventListener("click", () => {
    if (textarea) textarea.value = "";
    document.getElementById("theoryTitleInput").value = "";
    document.getElementById("theoryCategoryInput").value = "";
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    updatePreview("", preview);
    showToast("🗑️ Очищено", "Текст и черновик удалены");
  });

  document.getElementById("loadDraftTheoryBtn")?.addEventListener("click", () => {
    const draft = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (draft && textarea) {
      textarea.value = draft;
      updatePreview(draft, preview);
      showToast("📝 Черновик загружен", "Восстановлен сохраненный текст конспекта");
    } else {
      showToast("ℹ️ Черновик", "Сохраненный черновик не найден");
    }
  });

  document.getElementById("previewStudentTheoryBtn")?.addEventListener("click", () => {
    const title = document.getElementById("theoryTitleInput")?.value.trim() || "Без названия";
    const rawText = textarea?.value || "";
    let htmlContent;

    if (!rawText.trim()) {
      htmlContent = `<div style="padding: 20px; text-align: center; color: var(--color-text-secondary);">Конспект пуст</div>`;
    } else {
      htmlContent = `
        <div style="padding: 20px; font-family: var(--font-body); line-height: 1.6;">
          <h2 style="margin-top: 0; color: var(--color-text);">${title}</h2>
          <div style="border-top: 1px solid var(--color-border); padding-top: 16px; margin-top: 12px;">
            ${formatTheoryHTML(rawText)}
          </div>
        </div>
      `;
    }
    const modalBody = document.getElementById("adminModalBody");
    if (modalBody) {
      modalBody.innerHTML = htmlContent;
      import("./ui.js").then((m) => m.openModal("adminModal"));
    }
  });



  document.getElementById("saveTheoryBtn")?.addEventListener("click", async () => {
    const subjectId = document.getElementById("theorySubjectSelect")?.value;
    const title = document.getElementById("theoryTitleInput")?.value.trim();
    const category = document.getElementById("theoryCategoryInput")?.value.trim();
    const content = textarea?.value.trim();

    if (!title || !content) {
      showToast("⚠️ Ошибка", "Заполните название темы и текст теории");
      return;
    }

    try {
      const res = await api("/api/admin/theory", {
        method: "POST",
        body: JSON.stringify({ subjectId, title, category, theory: content }),
      });

      if (window.EXAM_DATA?.subjects?.[subjectId]) {
        const sub = window.EXAM_DATA.subjects[subjectId];
        if (!sub.topics) sub.topics = [];
        sub.topics.push({
          id: res.id || `top_${Date.now()}`,
          title: title,
          isPremium: false,
          duration: "45 мин",
          theory: formatTheoryHTML(content),
        });
      }

      localStorage.removeItem(DRAFT_STORAGE_KEY);
      showToast("🚀 Теория опубликована в БД!", `Тема "${title}" сохранена на сервере и доступна ученикам.`);
    } catch (err) {
      showToast("⚠️ Ошибка", err.message || "Не удалось сохранить теорию");
    }
  });
}

function formatTheoryHTML(rawText) {
  return rawText
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/^## (.*$)/gim, "<h2>$1</h2>")
    .replace(/^# (.*$)/gim, "<h1>$1</h1>")
    .replace(/\*\*(.*)\*\*/gim, "<strong>$1</strong>")
    .replace(/\*(.*)\*/gim, "<em>$1</em>")
    .replace(/\\\[(.*?)\\\]/gim, '<div style="background: rgba(99,102,241,0.1); padding: 8px 12px; border-radius: 8px; font-family: monospace; color: #6366f1; margin: 8px 0;">[ $1 ]</div>')
    .replace(/`([^`]+)`/gim, "<code style=\"background: var(--color-card-bg); padding: 2px 6px; border-radius: 4px;\">$1</code>")
    .replace(/\n/gim, "<br/>");
}


function updatePreview(rawText, previewEl) {
  if (!previewEl) return;
  if (!rawText.trim()) {
    previewEl.innerHTML = `<div style="color: var(--color-text-secondary); text-align: center; margin-top: 40px;">Введите контент слева, чтобы увидеть предпросмотр...</div>`;
    return;
  }

  let parsed = rawText
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/^## (.*$)/gim, "<h2>$1</h2>")
    .replace(/^# (.*$)/gim, "<h1>$1</h1>")
    .replace(/\*\*(.*)\*\*/gim, "<strong>$1</strong>")
    .replace(/\*(.*)\*/gim, "<em>$1</em>")
    .replace(/\\\[(.*?)\\\]/gim, '<div style="background: rgba(99,102,241,0.1); padding: 8px 12px; border-radius: 8px; font-family: monospace; color: #6366f1; margin: 8px 0;">[ $1 ]</div>')

    .replace(/`([^`]+)`/gim, "<code style=\"background: var(--color-card-bg); padding: 2px 6px; border-radius: 4px;\">$1</code>")
    .replace(/\n/gim, "<br/>");

  previewEl.innerHTML = parsed;
}

function autoSaveDraft(text) {
  if (text && text.length > 5) {
    localStorage.setItem(DRAFT_STORAGE_KEY, text);
  }
}

function bindToolbar(textarea, previewEl) {
  const btns = document.querySelectorAll(".toolbar-btn");
  btns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tag = btn.getAttribute("data-tag");
      if (!textarea) return;

      let insert = "";
      if (tag === "bold") insert = "**Жирный текст**";
      if (tag === "italic") insert = "*Курсив*";
      if (tag === "h2") insert = "\n## Заголовок темы\n";
      if (tag === "math") insert = "\n\\[ \\sin^2(x) + \\cos^2(x) = 1 \\]\n";
      if (tag === "code") insert = "\n```js\n// Ваш код здесь\n```\n";
      if (tag === "table") insert = "\n| Таблица | Значение |\n|---|---|\n| Параметр A | 100 |\n";
      if (tag === "video") insert = '\n<iframe width="100%" height="240" src="https://www.youtube.com/embed/dQw4w9WgXcQ" frameborder="0"></iframe>\n';
      if (tag === "pdf") insert = '\n<embed src="sample.pdf" type="application/pdf" width="100%" height="300px" />\n';

      const start = textarea.selectionStart;
      textarea.value = textarea.value.substring(0, start) + insert + textarea.value.substring(textarea.selectionEnd);
      textarea.focus();
      updatePreview(textarea.value, previewEl);
    });
  });
}
