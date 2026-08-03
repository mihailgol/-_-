import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { db, transaction, initSchema } from "./db.js";

export function seedContent() {
  const src = readFileSync(resolve(config.root, "js/data.js"), "utf8");
  const sandbox = { window: {} };
  vm.runInNewContext(src, sandbox, { filename: "data.js" });

  const data = sandbox.window.EXAM_DATA;
  if (!data?.subjects) return;

  const insSubject = db.prepare(
    `INSERT INTO subjects (id, title, icon, color, color_hex, bg_gradient, is_active, is_other, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, 1, 0, ?)
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title,
       icon = excluded.icon,
       color = excluded.color,
       color_hex = excluded.color_hex,
       bg_gradient = excluded.bg_gradient,
       is_active = excluded.is_active,
       sort_order = excluded.sort_order`
  );
  const insTopic = db.prepare(
    `INSERT INTO topics (id, subject_id, title, is_premium, duration, theory, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       subject_id = excluded.subject_id,
       title = excluded.title,
       is_premium = excluded.is_premium,
       duration = excluded.duration,
       theory = excluded.theory,
       sort_order = excluded.sort_order`
  );
  const insVideo = db.prepare(
    `INSERT INTO videos (id, topic_id, title, instructor, duration, youtube_id, views, thumbnail, description)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(topic_id) DO UPDATE SET
       id = excluded.id,
       title = excluded.title,
       instructor = excluded.instructor,
       duration = excluded.duration,
       youtube_id = excluded.youtube_id,
       views = excluded.views,
       thumbnail = excluded.thumbnail,
       description = excluded.description`
  );
  const insQuestion = db.prepare(
    `INSERT INTO questions (id, topic_id, type, question, options_json, correct_index, explanation, sort_order, points, correct_answer_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       topic_id = excluded.topic_id,
       type = excluded.type,
       question = excluded.question,
       options_json = excluded.options_json,
       correct_index = excluded.correct_index,
       explanation = excluded.explanation,
       sort_order = excluded.sort_order,
       points = excluded.points,
       correct_answer_json = excluded.correct_answer_json`
  );
  const insMockExam = db.prepare(
    `INSERT INTO mock_exams (id, subject_id, title, exam_type, duration_minutes, total_questions, is_premium, questions_json, conversion_table_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       subject_id = excluded.subject_id,
       title = excluded.title,
       exam_type = excluded.exam_type,
       duration_minutes = excluded.duration_minutes,
       total_questions = excluded.total_questions,
       is_premium = excluded.is_premium,
       questions_json = excluded.questions_json,
       conversion_table_json = excluded.conversion_table_json`
  );

  transaction(() => {
    Object.values(data.subjects).forEach((subject, si) => {
      insSubject.run(subject.id, subject.title, subject.icon, subject.color, subject.colorHex, subject.bgGradient, si);

      subject.topics.forEach((topic, ti) => {
        insTopic.run(topic.id, subject.id, topic.title, topic.isPremium ? 1 : 0, topic.duration, topic.theory, ti);

        if (topic.video) {
          const v = topic.video;
          insVideo.run(
            v.id || `${topic.id}_video`,
            topic.id,
            v.title,
            v.instructor,
            v.duration,
            v.youtubeId,
            String(v.views ?? "0"),
            v.thumbnail,
            v.description || ""
          );
        }

        (topic.questions || []).forEach((q, qi) => {
          const correctAnswerJson =
            q.correctAnswer != null
              ? JSON.stringify(q.correctAnswer)
              : q.correct_answer_json
                ? typeof q.correct_answer_json === "string"
                  ? q.correct_answer_json
                  : JSON.stringify(q.correct_answer_json)
                : null;

          insQuestion.run(
            q.id,
            topic.id,
            q.type || "single",
            q.question,
            JSON.stringify(q.options),
            q.correctIndex ?? 0,
            q.explanation || "",
            qi,
            q.points ?? 1,
            correctAnswerJson
          );
        });
      });
    });

    const ogeConversion = JSON.stringify({ "0": 2, "1": 2, "2": 3, "3": 3, "4": 4, "5": 5 });
    const egeConversion = JSON.stringify({ "0": 0, "1": 20, "2": 40, "3": 60, "4": 80, "5": 100 });

    const bioOgeQuestions = [
      { id: "bq1", question: "Какой орган растения отвечает за фотосинтез?", type: "single", options: ["Корень", "Лист", "Стебель", "Цветок"], correctIndex: 1, explanation: "Лист содержит хлоропласты, где происходит фотосинтез.", points: 1 },
      { id: "bq2", question: "Какая органелла является силовой станцией клетки?", type: "single", options: ["Ядро", "Митохондрия", "Рибосома", "Лизосома"], correctIndex: 1, explanation: "Митохондрии синтезируют АТФ.", points: 1 },
      { id: "bq3", question: "Сколько камер в сердце человека?", type: "single", options: ["2", "3", "4", "5"], correctIndex: 2, explanation: "У человека четырехкамерное сердце.", points: 1 },
      { id: "bq4", question: "Какая ткань осуществляет покровную функцию?", type: "single", options: ["Эпителиальная", "Соединительная", "Мышечная", "Нервная"], correctIndex: 0, explanation: "Эпителиальная ткань покрывает тело и выстилает полости.", points: 1 },
      { id: "bq5", question: "Что переносят эритроциты?", type: "single", options: ["Кислород", "Белки", "Гормоны", "Жиры"], correctIndex: 0, explanation: "Эритроциты содержат гемоглобин и переносят кислород.", points: 1 }
    ];

    const bioEgeQuestions = [
      { id: "beq1", question: "Фаза деления клетки, в которой хромосомы выстраиваются по экватору:", type: "single", options: ["Профаза", "Метафаза", "Анафаза", "Телофаза"], correctIndex: 1, explanation: "В метафазе хромосомы образуют метафазную пластинку.", points: 1 },
      { id: "beq2", question: "Мономер ДНК включает в себя:", type: "single", options: ["Аминокислоту", "Нуклеотид", "Глюкозу", "Жирную кислоту"], correctIndex: 1, explanation: "Нуклеотиды - мономеры нуклеиновых кислот.", points: 1 },
      { id: "beq3", question: "Какой процесс происходит в световой фазе фотосинтеза?", type: "single", options: ["Синтез глюкозы", "Фотолиз воды", "Фиксация CO2", "Образование крахмала"], correctIndex: 1, explanation: "Фотолиз воды происходит под действием света.", points: 1 },
      { id: "beq4", question: "К какому типу относится нервная система гидры?", type: "single", options: ["Диффузный", "Узловой", "Трубчатый", "Сетчатый"], correctIndex: 0, explanation: "У кишечнополостных диффузная нервная система.", points: 1 },
      { id: "beq5", question: "Какой гормон понижает уровень сахара в крови?", type: "single", options: ["Глюкагон", "Инсулин", "Адреналин", "Тироксин"], correctIndex: 1, explanation: "Инсулин способствует усвоению глюкозы клетками.", points: 1 }
    ];

    const chemOgeQuestions = [
      { id: "cq1", question: "Какое вещество относится к простым?", type: "single", options: ["Вода", "Кислород", "Углекислый газ", "Соляная кислота"], correctIndex: 1, explanation: "Кислород (O2) состоит из атомов одного элемента.", points: 1 },
      { id: "cq2", question: "Формула серной кислоты:", type: "single", options: ["HNO3", "H2SO4", "HCl", "H3PO4"], correctIndex: 1, explanation: "H2SO4 - серная кислота.", points: 1 },
      { id: "cq3", question: "Какая реакция является реакцией нейтрализации?", type: "single", options: ["Кислота + щелочь", "Металл + кислота", "Соль + соль", "Оксид + вода"], correctIndex: 0, explanation: "Реакция между кислотой и основанием называется нейтрализацией.", points: 1 },
      { id: "cq4", question: "Какой индикатор окрашивается в малиновый цвет в щелочи?", type: "single", options: ["Лакмус", "Метилоранж", "Фенолфталеин", "Универсальный"], correctIndex: 2, explanation: "Фенолфталеин в щелочной среде малиновый.", points: 1 },
      { id: "cq5", question: "Валентность кислорода в соединениях обычно равна:", type: "single", options: ["I", "II", "III", "IV"], correctIndex: 1, explanation: "Кислород двувалентен.", points: 1 }
    ];

    const chemEgeQuestions = [
      { id: "ceq1", question: "Какая связь образуется в молекуле хлороводорода HCl?", type: "single", options: ["Ионная", "Ковалентная полярная", "Ковалентная неполярная", "Металлическая"], correctIndex: 1, explanation: "Между разными неметаллами образуется ковалентная полярная связь.", points: 1 },
      { id: "ceq2", question: "Органические соединения с общей формулой CnH2n относятся к:", type: "single", options: ["Алканам", "Алкенам", "Алкинам", "Аренам"], correctIndex: 1, explanation: "CnH2n - формула алкенов и циклоалканов.", points: 1 },
      { id: "ceq3", question: "Какой катализатор используется в реакции гидратации этилена?", type: "single", options: ["Fe", "H3PO4", "V2O5", "Ni"], correctIndex: 1, explanation: "Гидратация этена проходит в присутствии кислотных катализаторов.", points: 1 },
      { id: "ceq4", question: "Оксид углерода(IV) CO2 относится к оксидам:", type: "single", options: ["Основным", "Кислотным", "Амфотерным", "Несолеобразующим"], correctIndex: 1, explanation: "CO2 - кислотный оксид.", points: 1 },
      { id: "ceq5", question: "При сгорании метана образуются:", type: "single", options: ["CO2 и H2O", "CO и H2", "C и H2O", "CH3OH"], correctIndex: 0, explanation: "Полное сгорание углеводородов дает углекислый газ и воду.", points: 1 }
    ];

    insMockExam.run("mock_bio_oge_1", "biology", "ОГЭ по биологии — Вариант 1", "OGE", 210, 5, 0, JSON.stringify(bioOgeQuestions), ogeConversion);
    insMockExam.run("mock_bio_ege_1", "biology", "ЕГЭ по биологии — Вариант 1 (Premium)", "EGE", 235, 5, 1, JSON.stringify(bioEgeQuestions), egeConversion);
    insMockExam.run("mock_chem_oge_1", "chemistry", "ОГЭ по химии — Вариант 1", "OGE", 210, 5, 0, JSON.stringify(chemOgeQuestions), ogeConversion);
    insMockExam.run("mock_chem_ege_1", "chemistry", "ЕГЭ по химии — Вариант 1 (Premium)", "EGE", 235, 5, 1, JSON.stringify(chemEgeQuestions), egeConversion);

    const rusEgeQuestions = [
      { id: "req1", question: "В каком слове верно выделена буква, обозначающая ударный гласный звук?", type: "single", options: ["ЗВО́НИТ", "звони́т", "звОнит", "звОниТ"], correctIndex: 1, explanation: "В глаголе 'звонить' ударение падает на окончание: звони́т, звоня́т.", points: 1 }
    ];
    const mathEgeQuestions = [
      { id: "meq1", question: "Найдите корни уравнения sin x = 1:", type: "single", options: ["x = π/2 + 2πk", "x = πk", "x = 2πk", "x = -π/2 + πk"], correctIndex: 0, explanation: "Синус равен 1 в точке π/2 с периодом 2πk.", points: 1 }
    ];

    insMockExam.run("mock_rus_ege_1", "russian", "ЕГЭ по русскому языку — Вариант 1", "EGE", 235, 1, 0, JSON.stringify(rusEgeQuestions), egeConversion);
    insMockExam.run("mock_math_ege_1", "math", "ЕГЭ по математике (Профиль) — Вариант 1", "EGE", 235, 1, 0, JSON.stringify(mathEgeQuestions), egeConversion);
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  initSchema();
  seedContent();
  console.log("Database seeded successfully.");
}
