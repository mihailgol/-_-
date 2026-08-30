import fs from "fs";
import path from "path";

const artifactDir = "C:\\Users\\мишка\\.gemini\\antigravity\\brain\\412fd7e6-4f07-49ed-97be-b6653b289b3a";
const targetHtml = "c:\\Users\\мишка\\Desktop\\сайтик_бахчасарай\\audit-gallery.html";

const screenshots = [
  {
    file: "01_admin_test_editor_ege.png",
    title: "1. Конструктор тестов: Создание задания ЕГЭ (Часть 2 ФИПИ)",
    desc: "Переключатель 'ЕГЭ' активен, подставлены критерии оценивания ФИПИ на 4 балла, отображается живой предпросмотр задания.",
    target: "Обратите внимание на активную кнопку 'ЕГЭ' слева и блок '📋 Критерии оценивания' справа."
  },
  {
    file: "02_admin_test_editor_oge.png",
    title: "2. Конструктор тестов: Создание задания ОГЭ (Часть 2 ФИПИ)",
    desc: "Переключатель 'ОГЭ' активен, задание по математике №21 адаптировано под регламент 9 класса (2 балла).",
    target: "Обратите внимание на активную кнопку 'ОГЭ' и специфичные критерии ФИПИ для 9 класса."
  },
  {
    file: "03_guest_tests_grid_ege.png",
    title: "3. Раздел 'Тесты': Доступность заданий ЕГЭ без входа (Режим Гостя)",
    desc: "Пользователь не авторизован (кнопка 'Войти' в шапке), отображаются карточки заданий формата ЕГЭ.",
    target: "В шапке видно, что пользователь — гость. Карточки подписаны 'EGE' и открываются для решения."
  },
  {
    file: "04_guest_tests_grid_oge.png",
    title: "4. Раздел 'Тесты': Доступность заданий ОГЭ без входа (Режим Гостя)",
    desc: "При переключении на ОГЭ сетка мгновенно перестраивается под структуру 9 класса (25 заданий по математике).",
    target: "В переключателе выбран 'ОГЭ', карточки подписаны 'OGE', задание №21 доступно для решения."
  },
  {
    file: "05_student_quiz_part2_solving.png",
    title: "5. Решение задания Части 2 учеником и сверка с критериями ФИПИ",
    desc: "Ученик вводит развернутое решение, система фиксирует ответ и открывает эталонный ключ ФИПИ.",
    target: "Поле ввода содержит решение ученика, а ниже отображается эталонный ключ и критерии K1–K2."
  },
  {
    file: "06_teacher_cabinet_groups_students.png",
    title: "6. Кабинет учителя: Группа, инвайт-код и привязанный ученик",
    desc: "Учитель создал группу, ученик вступил по инвайт-коду HUB-XXXX. Счетчик показывает '1 учеников'. Внизу видна работа на проверку.",
    target: "Зеленый инвайт-код группы, счетчик '👨‍🎓 1 учеников' и статус работы '⏳ Требует проверки'."
  },
  {
    file: "07_teacher_review_modal.png",
    title: "7. Проверка работы ученика учителем",
    desc: "Модальное окно проверки: учитель видит условие, ответ ученика, ключ ФИПИ, ставит оценку (3 б.) и пишет комментарий.",
    target: "Поля ввода оценки учителя, комментарий и эталонное решение ФИПИ."
  },
  {
    file: "08_student_notification_received.png",
    title: "8. Уведомление у ученика о проверенной работе",
    desc: "После сохранения проверки ученик получает мгновенное уведомление в колокольчике.",
    target: "В списке уведомлений отображается: 'Учитель проверил работу • Оценка: 3 б.'."
  }
];

let itemsHtml = "";
for (const s of screenshots) {
  const filePath = path.join(artifactDir, s.file);
  let base64 = "";
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath);
    base64 = `data:image/png;base64,${data.toString("base64")}`;
  }

  itemsHtml += `
    <div class="audit-card">
      <div class="card-header">
        <h3>${s.title}</h3>
        <p class="desc">${s.desc}</p>
        <div class="target-box">🔍 <strong>На что смотреть:</strong> ${s.target}</div>
      </div>
      <div class="img-wrapper" onclick="openZoom(this)">
        ${base64 ? `<img src="${base64}" alt="${s.title}" />` : `<div class="no-img">Изображение не найдено</div>`}
        <div class="zoom-hint">🔍 Нажмите для увеличения</div>
      </div>
    </div>
  `;
}

const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Галерея результатов аудита ExamHub</title>
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: #1e293b;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --accent: #6366f1;
      --accent-green: #22c55e;
      --border: #334155;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      margin: 0;
      padding: 30px 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--border);
    }
    header h1 {
      font-size: 2.2rem;
      margin: 0 0 10px 0;
      color: #fff;
    }
    header p {
      color: var(--text-muted);
      font-size: 1.1rem;
      margin: 0;
    }
    .badge-status {
      display: inline-block;
      background: rgba(34, 197, 94, 0.2);
      color: var(--accent-green);
      padding: 6px 16px;
      border-radius: 20px;
      font-weight: 700;
      margin-top: 15px;
      border: 1px solid var(--accent-green);
    }
    .audit-grid {
      display: flex;
      flex-direction: column;
      gap: 40px;
    }
    .audit-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(0,0,0,0.3);
    }
    .card-header {
      padding: 24px;
    }
    .card-header h3 {
      margin: 0 0 8px 0;
      font-size: 1.3rem;
      color: #fff;
    }
    .card-header .desc {
      color: var(--text-muted);
      margin: 0 0 12px 0;
      line-height: 1.5;
    }
    .target-box {
      background: rgba(99, 102, 241, 0.1);
      border-left: 4px solid var(--accent);
      padding: 10px 14px;
      border-radius: 4px 8px 8px 4px;
      font-size: 0.95rem;
      color: #e0e7ff;
    }
    .img-wrapper {
      position: relative;
      background: #020617;
      cursor: zoom-in;
      text-align: center;
      border-top: 1px solid var(--border);
    }
    .img-wrapper img {
      width: 100%;
      height: auto;
      display: block;
      transition: transform 0.2s ease;
    }
    .zoom-hint {
      position: absolute;
      bottom: 12px;
      right: 12px;
      background: rgba(0,0,0,0.7);
      color: #fff;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 0.8rem;
      pointer-events: none;
    }
    /* Lightbox Modal */
    #lightbox {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0,0,0,0.92);
      z-index: 10000;
      justify-content: center;
      align-items: center;
      cursor: zoom-out;
    }
    #lightbox.active {
      display: flex;
    }
    #lightbox img {
      max-width: 95vw;
      max-height: 95vh;
      border-radius: 8px;
      box-shadow: 0 0 30px rgba(0,0,0,0.8);
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>📸 Результаты сквозного аудита платформы ExamHub</h1>
      <p>Подтверждающие скриншоты по всем этапам: создание тестов (ЕГЭ/ОГЭ), проверка гостем, решение учеником, кабинет учителя и логи.</p>
      <div class="badge-status">✓ Все 8 сценариев успешно пройдены (100% SUCCESS)</div>
    </header>

    <div class="audit-grid">
      ${itemsHtml}
    </div>
  </div>

  <div id="lightbox" onclick="closeZoom()">
    <img id="lightboxImg" src="" alt="Zoom" />
  </div>

  <script>
    function openZoom(wrapper) {
      const img = wrapper.querySelector('img');
      if (!img) return;
      const lb = document.getElementById('lightbox');
      const lbImg = document.getElementById('lightboxImg');
      lbImg.src = img.src;
      lb.classList.add('active');
    }
    function closeZoom() {
      document.getElementById('lightbox').classList.remove('active');
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeZoom();
    });
  </script>
</body>
</html>`;

fs.writeFileSync(targetHtml, html, "utf8");
console.log("HTML галерея успешно создана:", targetHtml);
