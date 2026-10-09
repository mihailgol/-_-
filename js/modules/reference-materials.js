import { openModal } from "./ui.js";

const REFERENCE_DATA = {
  math: `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
      <div style="background: var(--color-card-bg); border: 1px solid var(--color-border); border-radius: 12px; padding: 16px;">
        <h4 style="color: var(--color-purple); margin-top: 0;">📐 Тригонометрия</h4>
        <div style="font-family: monospace; font-size: 0.9rem; line-height: 1.8;">
          • sin²α + cos²α = 1<br/>
          • tg α = sin α / cos α (cos α ≠ 0)<br/>
          • 1 + tg²α = 1 / cos²α<br/>
          • sin 2α = 2 sin α cos α<br/>
          • cos 2α = cos²α - sin²α = 2cos²α - 1 = 1 - 2sin²α<br/>
          • sin(α ± β) = sin α cos β ± cos α sin β<br/>
          • cos(α ± β) = cos α cos β ∓ sin α sin β
        </div>
      </div>

      <div style="background: var(--color-card-bg); border: 1px solid var(--color-border); border-radius: 12px; padding: 16px;">
        <h4 style="color: var(--color-purple); margin-top: 0;">📈 Таблица значений sin / cos / tg</h4>
        <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem; text-align: center;">
          <thead>
            <tr style="border-bottom: 1px solid var(--color-border);">
              <th style="padding: 4px;">Угол</th><th>0°</th><th>30° (π/6)</th><th>45° (π/4)</th><th>60° (π/3)</th><th>90° (π/2)</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid var(--color-border-light);">
              <td style="font-weight: 600; padding: 6px;">sin</td><td>0</td><td>1/2</td><td>√2/2</td><td>√3/2</td><td>1</td>
            </tr>
            <tr style="border-bottom: 1px solid var(--color-border-light);">
              <td style="font-weight: 600; padding: 6px;">cos</td><td>1</td><td>√3/2</td><td>√2/2</td><td>1/2</td><td>0</td>
            </tr>
            <tr>
              <td style="font-weight: 600; padding: 6px;">tg</td><td>0</td><td>√3/3</td><td>1</td><td>√3</td><td>—</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style="background: var(--color-card-bg); border: 1px solid var(--color-border); border-radius: 12px; padding: 16px;">
        <h4 style="color: var(--color-purple); margin-top: 0;">📊 Степени и логарифмы</h4>
        <div style="font-family: monospace; font-size: 0.9rem; line-height: 1.8;">
          • aᵐ · aⁿ = aᵐ⁺ⁿ, &nbsp; aᵐ / aⁿ = aᵐ⁻ⁿ<br/>
          • (aᵐ)ⁿ = aᵐⁿ, &nbsp; a⁻ⁿ = 1 / aⁿ<br/>
          • logₐ(x · y) = logₐ x + logₐ y<br/>
          • logₐ(x / y) = logₐ x - logₐ y<br/>
          • logₐ(xᵏ) = k · logₐ x<br/>
          • a^(logₐ b) = b (основное тождество)<br/>
          • logₐ b = log꜀ b / log꜀ a
        </div>
      </div>

      <div style="background: var(--color-card-bg); border: 1px solid var(--color-border); border-radius: 12px; padding: 16px;">
        <h4 style="color: var(--color-purple); margin-top: 0;">📏 Площади фигур и стереометрия</h4>
        <div style="font-family: monospace; font-size: 0.9rem; line-height: 1.8;">
          • S_тр = ½ a · hₐ = ½ ab sin γ<br/>
          • S_тр = √[p(p-a)(p-b)(p-c)] (Герон)<br/>
          • S_круг = πR², &nbsp; C = 2πR<br/>
          • S_трап = ½(a + b) · h<br/>
          • V_призмы = S_осн · h, &nbsp; V_пирамиды = ⅓ S_осн · h<br/>
          • V_цилиндра = πR²h, &nbsp; V_конуса = ⅓ πR²h<br/>
          • V_шара = 4/3 πR³, &nbsp; S_сферы = 4πR²
        </div>
      </div>
    </div>
  `,

  physics: `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
      <div style="background: var(--color-card-bg); border: 1px solid var(--color-border); border-radius: 12px; padding: 16px;">
        <h4 style="color: var(--color-purple); margin-top: 0;">⚙️ Физические константы</h4>
        <div style="font-family: monospace; font-size: 0.9rem; line-height: 1.8;">
          • g = 9.8 (10) м/с² (ускорение своб. падения)<br/>
          • G = 6.67 · 10⁻¹¹ Н·м²/кг²<br/>
          • c = 3 · 10⁸ м/с (скорость света)<br/>
          • N_A = 6.02 · 10²³ моль⁻¹<br/>
          • R = 8.31 Дж/(моль·К)<br/>
          • k = 1.38 · 10⁻²³ Дж/К (Больцман)<br/>
          • e = 1.6 · 10⁻¹⁹ Кл (элементарный заряд)<br/>
          • h = 6.63 · 10⁻³⁴ Дж·с (Планк)
        </div>
      </div>

      <div style="background: var(--color-card-bg); border: 1px solid var(--color-border); border-radius: 12px; padding: 16px;">
        <h4 style="color: var(--color-purple); margin-top: 0;">🚗 Механика</h4>
        <div style="font-family: monospace; font-size: 0.9rem; line-height: 1.8;">
          • v = v₀ + at, &nbsp; s = v₀t + at²/2<br/>
          • 2as = v² - v₀²<br/>
          • F = ma, &nbsp; F_тяж = mg, &nbsp; F_тр = μN<br/>
          • p = mv (импульс), &nbsp; FΔt = Δp<br/>
          • E_кин = mv²/2, &nbsp; E_пот = mgh<br/>
          • E_упр = kx²/2, &nbsp; A = Fs cos α, &nbsp; N = A/t
        </div>
      </div>

      <div style="background: var(--color-card-bg); border: 1px solid var(--color-border); border-radius: 12px; padding: 16px;">
        <h4 style="color: var(--color-purple); margin-top: 0;">🔥 МКТ и термодинамика</h4>
        <div style="font-family: monospace; font-size: 0.9rem; line-height: 1.8;">
          • p = nkT = ⅓ nm₀v²<br/>
          • pV = νRT = (m/M)RT (Менделеев-Клапейрон)<br/>
          • U = 3/2 νRT (внутр. энергия одн. газа)<br/>
          • A = pΔV (работа газа при p = const)<br/>
          • Q = ΔU + A (1-й закон термодинамики)<br/>
          • Q = cmΔT, &nbsp; Q = λm, &nbsp; Q = Lm, &nbsp; Q = qm<br/>
          • η = (Q_нагр - Q_хол) / Q_нагр
        </div>
      </div>

      <div style="background: var(--color-card-bg); border: 1px solid var(--color-border); border-radius: 12px; padding: 16px;">
        <h4 style="color: var(--color-purple); margin-top: 0;">⚡ Электродинамика</h4>
        <div style="font-family: monospace; font-size: 0.9rem; line-height: 1.8;">
          • I = q/t, &nbsp; I = U/R (закон Ома)<br/>
          • R = ρ · l / S<br/>
          • P = UI = I²R = U²/R<br/>
          • C = q/U, &nbsp; W_эл = CU²/2<br/>
          • F_л = qvB sin α (сила Лоренца)<br/>
          • F_а = IBL sin α (сила Ампера)<br/>
          • T = 2π√(LC) (формула Томсона)
        </div>
      </div>
    </div>
  `,

  chemistry: `
    <div style="display: flex; flex-direction: column; gap: 16px;">
      <div style="background: var(--color-card-bg); border: 1px solid var(--color-border); border-radius: 12px; padding: 16px;">
        <h4 style="color: var(--color-purple); margin-top: 0;">⚡ Электрохимический ряд напряжений металлов</h4>
        <div style="font-size: 0.95rem; line-height: 1.8; font-weight: 600; display: flex; flex-wrap: wrap; gap: 8px;">
          <span style="color: #ef4444;">Li → K → Ba → Ca → Na → Mg → Al → Mn → Zn → Cr → Fe → Co → Ni → Sn → Pb</span>
          <span style="color: #6366f1;">→ [H] →</span>
          <span style="color: #10b981;">Cu → Hg → Ag → Pt → Au</span>
        </div>
        <div style="font-size: 0.8rem; color: var(--color-text-secondary); margin-top: 6px;">
          Металлы до [H] вытесняют водород из растворов кислот-неокислителей (HCl, разб. H₂SO₄).
        </div>
      </div>

      <div style="background: var(--color-card-bg); border: 1px solid var(--color-border); border-radius: 12px; padding: 16px; overflow-x: auto;">
        <h4 style="color: var(--color-purple); margin-top: 0;">🧪 Таблица растворимости солей, кислот и оснований в воде</h4>
        <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem; text-align: center; min-width: 500px;">
          <thead>
            <tr style="border-bottom: 2px solid var(--color-border); background: var(--color-bg-secondary);">
              <th style="padding: 6px; text-align: left;">Ион</th><th>H⁺</th><th>Na⁺ / K⁺</th><th>Ba²⁺</th><th>Ca²⁺</th><th>Mg²⁺</th><th>Al³⁺</th><th>Fe²⁺</th><th>Cu²⁺</th><th>Ag⁺</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid var(--color-border-light);"><td style="text-align: left; font-weight: 600; padding: 4px;">OH⁻</td><td>—</td><td style="color:#10b981;">Р</td><td style="color:#10b981;">Р</td><td style="color:#f59e0b;">М</td><td style="color:#ef4444;">Н</td><td style="color:#ef4444;">Н</td><td style="color:#ef4444;">Н</td><td style="color:#ef4444;">Н</td><td>—</td></tr>
            <tr style="border-bottom: 1px solid var(--color-border-light);"><td style="text-align: left; font-weight: 600; padding: 4px;">Cl⁻</td><td style="color:#10b981;">Р</td><td style="color:#10b981;">Р</td><td style="color:#10b981;">Р</td><td style="color:#10b981;">Р</td><td style="color:#10b981;">Р</td><td style="color:#10b981;">Р</td><td style="color:#10b981;">Р</td><td style="color:#10b981;">Р</td><td style="color:#ef4444;">Н</td></tr>
            <tr style="border-bottom: 1px solid var(--color-border-light);"><td style="text-align: left; font-weight: 600; padding: 4px;">SO₄²⁻</td><td style="color:#10b981;">Р</td><td style="color:#10b981;">Р</td><td style="color:#ef4444;">Н</td><td style="color:#f59e0b;">М</td><td style="color:#10b981;">Р</td><td style="color:#10b981;">Р</td><td style="color:#10b981;">Р</td><td style="color:#10b981;">Р</td><td style="color:#f59e0b;">М</td></tr>
            <tr style="border-bottom: 1px solid var(--color-border-light);"><td style="text-align: left; font-weight: 600; padding: 4px;">CO₃²⁻</td><td style="color:#10b981;">Р</td><td style="color:#10b981;">Р</td><td style="color:#ef4444;">Н</td><td style="color:#ef4444;">Н</td><td style="color:#ef4444;">Н</td><td>—</td><td style="color:#ef4444;">Н</td><td>—</td><td style="color:#ef4444;">Н</td></tr>
            <tr><td style="text-align: left; font-weight: 600; padding: 4px;">NO₃⁻</td><td style="color:#10b981;">Р</td><td style="color:#10b981;">Р</td><td style="color:#10b981;">Р</td><td style="color:#10b981;">Р</td><td style="color:#10b981;">Р</td><td style="color:#10b981;">Р</td><td style="color:#10b981;">Р</td><td style="color:#10b981;">Р</td><td style="color:#10b981;">Р</td></tr>
          </tbody>
        </table>
        <div style="font-size: 0.8rem; color: var(--color-text-secondary); margin-top: 8px;">
          <span style="color: #10b981; font-weight: 700;">Р</span> — растворимо, <span style="color: #f59e0b; font-weight: 700;">М</span> — малорастворимо, <span style="color: #ef4444; font-weight: 700;">Н</span> — нерастворимо (осадок), <span style="font-weight: 700;">—</span> разлагается водой.
        </div>
      </div>
    </div>
  `,

  russian: `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
      <div style="background: var(--color-card-bg); border: 1px solid var(--color-border); border-radius: 12px; padding: 16px;">
        <h4 style="color: var(--color-purple); margin-top: 0;">🎯 Топ-ударения ФИПИ (Задание 4)</h4>
        <div style="font-size: 0.9rem; line-height: 1.8;">
          • балОванный, баловАть, избалОванный<br/>
          • бралА, влилАсь, гналАсь, ждалА, звалА<br/>
          • включИт, включЁн, вручИт, звонИт<br/>
          • договОр, дефИс, жалюзИ, каталОг, квартАл<br/>
          • красИвее, красИвейший, кремЕнь<br/>
          • мусоропровОд, газопровОд (но: электропрОвод)<br/>
          • начАв, отдАв, поднЯв, понЯв, прибЫв<br/>
          • оптОвый, слИвовый, свЁкла, тОрты, шарфЫ
        </div>
      </div>

      <div style="background: var(--color-card-bg); border: 1px solid var(--color-border); border-radius: 12px; padding: 16px;">
        <h4 style="color: var(--color-purple); margin-top: 0;">👥 Частые паронимы (Задание 5)</h4>
        <div style="font-size: 0.9rem; line-height: 1.8;">
          • <strong>Адресат</strong> (получатель) / <strong>Адресант</strong> (отправитель)<br/>
          • <strong>Одеть</strong> (кого-то: ребенка) / <strong>Надеть</strong> (что-то: пальто)<br/>
          • <strong>Глинистый</strong> (почва) / <strong>Глиняный</strong> (кувшин)<br/>
          • <strong>Дипломатичный</strong> (вежливый) / <strong>Дипломатический</strong> (паспорт)<br/>
          • <strong>Гордый</strong> (человек) / <strong>Горделивый</strong> (осанка, вид)<br/>
          • <strong>Экономичный</strong> (выгодный) / <strong>Экономический</strong> (кризис)
        </div>
      </div>
    </div>
  `,

  biology: `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
      <div style="background: var(--color-card-bg); border: 1px solid var(--color-border); border-radius: 12px; padding: 16px;">
        <h4 style="color: var(--color-purple); margin-top: 0;">🧬 Молекулярная биология</h4>
        <div style="font-family: monospace; font-size: 0.9rem; line-height: 1.8;">
          • Правило Чаргаффа: А = Т, &nbsp; Г = Ц (в ДНК)<br/>
          • Связи: А=Т (2 водородные), Г≡Ц (3 водородные)<br/>
          • В иРНК вместо Тимина (Т) — Урацил (У): А→У, Т→А, Г→Ц, Ц→Г<br/>
          • Длина одного нуклеотида = 0.34 нм<br/>
          • Масса одного нуклеотида ≈ 345 Да (г/моль)<br/>
          • 1 аминокислота кодируется 1 триплетом (3 нуклеотида)
        </div>
      </div>

      <div style="background: var(--color-card-bg); border: 1px solid var(--color-border); border-radius: 12px; padding: 16px;">
        <h4 style="color: var(--color-purple); margin-top: 0;">🔬 Фазы деления клетки</h4>
        <div style="font-size: 0.9rem; line-height: 1.8;">
          • <strong>Профаза</strong>: конденсация хромосом, распад ядерной оболочки (2n 4c)<br/>
          • <strong>Метафаза</strong>: выстраивание по экватору клетки (2n 4c)<br/>
          • <strong>Анафаза</strong>: расхождение сестринских хроматид к полюсам (4n 4c)<br/>
          • <strong>Телофаза</strong>: декон Outside деление цитоплазмы (цитокинез) (2n 2c)
        </div>
      </div>
    </div>
  `,

  informatics: `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
      <div style="background: var(--color-card-bg); border: 1px solid var(--color-border); border-radius: 12px; padding: 16px;">
        <h4 style="color: var(--color-purple); margin-top: 0;">🔢 Степени двойки</h4>
        <div style="font-family: monospace; font-size: 0.85rem; line-height: 1.8; display: grid; grid-template-columns: 1fr 1fr;">
          <span>2⁰ = 1</span><span>2⁸ = 256</span>
          <span>2¹ = 2</span><span>2⁹ = 512</span>
          <span>2² = 4</span><span>2¹⁰ = 1024</span>
          <span>2³ = 8</span><span>2¹¹ = 2048</span>
          <span>2⁴ = 16</span><span>2¹² = 4096</span>
          <span>2⁵ = 32</span><span>2¹³ = 8192</span>
          <span>2⁶ = 64</span><span>2¹⁴ = 16384</span>
          <span>2⁷ = 128</span><span>2¹⁶ = 65536</span>
        </div>
      </div>

      <div style="background: var(--color-card-bg); border: 1px solid var(--color-border); border-radius: 12px; padding: 16px;">
        <h4 style="color: var(--color-purple); margin-top: 0;">💾 Единицы информации и комбинаторика</h4>
        <div style="font-family: monospace; font-size: 0.9rem; line-height: 1.8;">
          • 1 байт = 8 бит<br/>
          • 1 Кбайт = 1024 байт = 2¹³ бит<br/>
          • 1 Мбайт = 1024 Кбайт = 2²³ бит<br/>
          • N = 2ⁱ (формула Хартли, мощность алфавита)<br/>
          • I = K · i (информационный объем сообщения)<br/>
          • Q = Mᴸ (кол-во слов длины L из алфавита M)
        </div>
      </div>
    </div>
  `,
};

export function openReferenceMaterials(subjectId) {
  let subKey = "math";
  const raw = String(subjectId || "").toLowerCase();
  if (raw.includes("chem") || raw.includes("хим")) subKey = "chemistry";
  else if (raw.includes("phys") || raw.includes("физ")) subKey = "physics";
  else if (raw.includes("rus") || raw.includes("рус")) subKey = "russian";
  else if (raw.includes("bio") || raw.includes("био")) subKey = "biology";
  else if (raw.includes("inf") || raw.includes("инф")) subKey = "informatics";

  switchRefTab(subKey);
  openModal("referenceMaterialsModal");
}

export function switchRefTab(subjectKey) {
  const container = document.getElementById("refModalContent");
  if (!container) return;

  const content = REFERENCE_DATA[subjectKey] || REFERENCE_DATA.math;
  container.innerHTML = content;

  document.querySelectorAll(".ref-tab-btn").forEach((btn) => {
    if (btn.getAttribute("data-ref-subject") === subjectKey) {
      btn.classList.add("active");
      btn.style.borderColor = "var(--color-purple)";
      btn.style.color = "var(--color-purple)";
      btn.style.background = "var(--color-purple-light)";
    } else {
      btn.classList.remove("active");
      btn.style.borderColor = "var(--color-border)";
      btn.style.color = "var(--color-text-secondary)";
      btn.style.background = "transparent";
    }
  });
}

export function initReferenceMaterialsEvents() {
  document.querySelectorAll(".ref-tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const sub = btn.getAttribute("data-ref-subject");
      switchRefTab(sub);
    });
  });

  const quizRefBtn = document.getElementById("quizReferenceBtn");
  if (quizRefBtn) {
    quizRefBtn.addEventListener("click", () => {
      const activeSubject = window.appState?.activeSubjectId || "math";
      openReferenceMaterials(activeSubject);
    });
  }
}
