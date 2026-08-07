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
     ON CONFLICT(id) DO UPDATE SET
       topic_id = excluded.topic_id,
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

    const rusOgeQuestions = [
      { id: "roq1", question: "В каком слове допущена ошибка в постановке ударения: НЕВЕРНО выделена буква, обозначающая ударный гласный звук?", type: "single", options: ["кра́лась", "торты́", "доне́льзя", "опломбирова́ть"], correctIndex: 1, explanation: "В существительном 'торты' ударение неподвижное и падает на первый слог: то́рты, то́ртов.", points: 1 },
      { id: "roq2", question: "Укажите вариант ответа, в котором в обоих словах одного ряда пропущена одна и та же буква:", type: "single", options: ["изг..нять, прик..сновение", "р..сток, з..рница", "б..ргамот, к..вычки", "соб..рать, расст..лать"], correctIndex: 0, explanation: "В ряду A: изго́нять (проверяемая гласная О: го́нит), прикосновение (чередующийся корень кос/кас, после корня нет суффикса А, пишется О).", points: 1 },
      { id: "roq3", question: "В каком предложении вместо слова ДВОЙНОЙ нужно использовать ДВОЙСТВЕННЫЙ?", type: "single", options: ["В актовом зале установили двойной остекленный рамный блок.", "У него сложилось двойное впечатление от этого сложного спектакля.", "Спортсмен одержал двойную победу на чемпионатах мира.", "Для решения задачи применили двойной интеграл."], correctIndex: 1, explanation: "Паронимы: двойственный — противоречивый, двоякий ('двойственное впечатление'). Двойной — состоящий из двух частей.", points: 1 },
      { id: "roq4", question: "Укажите предложение с пунктуационной ошибкой:", type: "single", options: ["Солнце скрылось за тучами, и пошел проливной дождь.", "Ученики, завершившие проект вовремя получили высшие баллы.", "Опадая с деревьев, желтые листья тихо шуршали под ногами.", "Я знал, что решение задачи потребует много времени."], correctIndex: 1, explanation: "Причастный оборот 'завершившие проект вовремя' находится после определяемого слова 'Ученики' и должен выделяться запятыми с двух сторон: 'Ученики, завершившие проект вовремя, получили...'.", points: 1 },
      { id: "roq5", question: "Укажите грамматически правильное продолжение предложения: 'Изучая исторические документы...'", type: "single", options: ["исследователями были сделаны важные открытия.", "нами было потрачено много времени в архиве.", "студенты узнали много новых фактов о войне.", "были обнаружены ранее неизвестные письма."], correctIndex: 2, explanation: "Деепричастный оборот должен относиться к подлежащему, которое совершает оба действия: 'студенты (что делая?) изучая... узнали'.", points: 1 }
    ];

    const rusEgeQuestions = [
      { id: "req1", question: "В каком слове верно выделена буква, обозначающая ударный гласный звук?", type: "single", options: ["ЗВО́НИТ", "звони́т", "звОнит", "звОниТ"], correctIndex: 1, explanation: "В глаголе 'звонить' ударение падает на окончание: звони́т, звоня́т.", points: 1 },
      { id: "req2", question: "В одном из выделенных ниже слов допущена ошибка в образовании формы слова. Исправьте ошибку:", type: "single", options: ["ИХНИЕ книги", "пара НОСКОВ", "около ПЯТИСОТ рублей", "более КРАСИВЫЙ"], correctIndex: 0, explanation: "Местоимение 'их' не имеет формы 'ихний'. Правильная форма притяжательного местоимения 3-го лица множественного числа — 'их'.", points: 1 },
      { id: "req3", question: "Укажите вариант ответа, в котором во всех словах одного ряда пропущена одна и та же буква:", type: "single", options: ["пр..сечь, пр..града", "с..грать, раз..грать", "б..сцельный, из..гнать", "пр..открыть, пр..ехать"], correctIndex: 0, explanation: "В ряду A в обоих словах приставка ПРЕ- в значении 'пере' (пресечь = перерубить, преграда = перегородка).", points: 1 },
      { id: "req4", question: "Укажите цифры, на месте которых должны стоять запятые: 'Туча (1) надвигавшаяся с запада (2) закрыла все небо (3) и вскоре пошел сильный дождь.'", type: "single", options: ["1, 2, 3", "1, 2", "3, 4", "1, 3"], correctIndex: 0, explanation: "1 и 2 выделяют причастный оборот 'надвигавшаяся с запада' после определяемого слова 'Туча'. 3 разделяет две части сложного предложения перед союзом И.", points: 1 },
      { id: "req5", question: "Укажите предложение, в котором НЕ со словом пишется СЛИТНО:", type: "single", options: ["(НЕ)ОТРЕМОНТИРОВАННЫЙ вовремя мост", "абсолютно (НЕ)ИНТЕРЕСНАЯ книга", "решение вовсе (НЕ)ПРОДУМАНО", "(НЕ)ЗНАЯ правил поведения"], correctIndex: 1, explanation: "Прилагательное 'неинтересная' с наречием меры и степени 'абсолютно' пишется слитно, так как нет противопоставления или слов 'вовсе не', 'далеко не'.", points: 1 }
    ];

    const mathOgeQuestions = [
      { id: "moq1", question: "Найдите значение выражения: (1/4 + 1/5) * 20.", type: "single", options: ["9", "5", "4", "20"], correctIndex: 0, explanation: "(1/4 + 1/5) = 9/20. Затем 9/20 * 20 = 9.", points: 1 },
      { id: "moq2", question: "Решите уравнение: x² - 5x + 6 = 0.", type: "single", options: ["x = 2; x = 3", "x = -2; x = -3", "x = 1; x = 6", "x = -1; x = 5"], correctIndex: 0, explanation: "По теореме Виета сумма корней равна 5, произведение равно 6. Корни: x = 2 и x = 3.", points: 1 },
      { id: "moq3", question: "В прямоугольном треугольнике катеты равны 6 см и 8 см. Найдите гипотенузу.", type: "single", options: ["10 см", "12 см", "14 см", "48 см"], correctIndex: 0, explanation: "По теореме Пифагора c² = a² + b² = 6² + 8² = 36 + 64 = 100. c = 10 см.", points: 1 },
      { id: "moq4", question: "На диаграмме показана температура воздуха за 5 дней: 12°C, 15°C, 18°C, 14°C, 11°C. Найдите среднюю температуру.", type: "single", options: ["14°C", "15°C", "13°C", "16°C"], correctIndex: 0, explanation: "Среднее значение = (12 + 15 + 18 + 14 + 11) / 5 = 70 / 5 = 14°C.", points: 1 },
      { id: "moq5", question: "Найдите площадь трапеции, основания которой равны 7 см и 11 см, а высота равна 4 см.", type: "single", options: ["36 см²", "72 см²", "44 см²", "28 см²"], correctIndex: 0, explanation: "Площадь трапеции равна полусумме оснований на высоту: S = ((7 + 11)/2) * 4 = 9 * 4 = 36 см².", points: 1 }
    ];

    const mathEgeQuestions = [
      { id: "meq1", question: "Найдите корни уравнения sin x = 1:", type: "single", options: ["x = π/2 + 2πk", "x = πk", "x = 2πk", "x = -π/2 + πk"], correctIndex: 0, explanation: "Синус равен 1 в точке π/2 с периодом 2πk.", points: 1 },
      { id: "meq2", question: "Найдите точку максимума функции f(x) = x³ - 3x² + 5 на отрезке [-1, 3]:", type: "single", options: ["x = 0", "x = 2", "x = -1", "x = 3"], correctIndex: 0, explanation: "Производная f'(x) = 3x² - 6x = 3x(x - 2). Критические точки x = 0 и x = 2. При переходе через x = 0 знак f' меняется с '+' на '-', поэтому x = 0 — точка максимума.", points: 1 },
      { id: "meq3", question: "В правильной четырехугольной пирамиде сторона основания равна 6, а высота равна 4. Найдите площадь боковой поверхности пирамиды.", type: "single", options: ["60", "36", "48", "96"], correctIndex: 0, explanation: "Апофема h_b = √(4² + (6/2)²) = √(16 + 9) = 5. Площадь боковой поверхности S_бок = 4 * (1/2 * a * h_b) = 4 * (1/2 * 6 * 5) = 60.", points: 1 },
      { id: "meq4", question: "Вероятность того, что новый насос прослужит больше года, равна 0,92. Вероятность того, что он прослужит больше двух лет, равна 0,78. Найдите вероятность того, что он прослужит меньше двух лет, но больше года.", type: "single", options: ["0,14", "0,85", "0,12", "0,70"], correctIndex: 0, explanation: "Пусть A — событие 'служит > 1 года', B — 'служит > 2 лет'. Искомое событие P = P(A) - P(B) = 0,92 - 0,78 = 0,14.", points: 1 },
      { id: "meq5", question: "Найдите наибольшее значение функции y = 7 + 12x - x³ на отрезке [-2, 2].", type: "single", options: ["23", "7", "-9", "16"], correctIndex: 0, explanation: "y' = 12 - 3x² = 0 ⇒ x² = 4 ⇒ x = ±2. Вычислим значения в точках: y(-2) = 7 - 24 + 8 = -9; y(2) = 7 + 24 - 8 = 23. Наибольшее значение равно 23.", points: 1 }
    ];

    const socOgeQuestions = [
      { id: "soq1", question: "Какая из приведенных ниже характеристик относится к традиционному (аграрному) обществу?", type: "single", options: ["Преобладание натурального хозяйства", "Высокий уровень урбанизации", "Массовое промышленное производство", "Развитие информационных технологий"], correctIndex: 0, explanation: "В традиционном обществе преобладает натуральное хозяйство, ручной труд и аграрный сектор экономики.", points: 1 },
      { id: "soq2", question: "Что из перечисленного относится к биологическим (природным) потребностям человека?", type: "single", options: ["Потребность в пище и воздухе", "Потребность в общении", "Потребность в познании мира", "Потребность в самореализации"], correctIndex: 0, explanation: "Биологические потребности жизненно необходимы для выживания организма (пища, вода, сон, отдых, дыхание).", points: 1 },
      { id: "soq3", question: "К какому виду налогов в РФ относится налог на доходы физических лиц (НДФЛ)?", type: "single", options: ["Федеральный прямой налог", "Региональный косвенный налог", "Местный прямой налог", "Федеральный косвенный налог"], correctIndex: 0, explanation: "НДФЛ взимается непосредственно с дохода налогоплательщика и устанавливается Налоговым кодексом РФ на федеральном уровне.", points: 1 },
      { id: "soq4", question: "Какая форма государственного устройства характеризуется единой конституцией и отсутствием суверенных образований в своем составе?", type: "single", options: ["Унитарное государство", "Федерация", "Конфедерация", "Монархия"], correctIndex: 0, explanation: "Унитарное государство имеет единую систему органов власти, единую конституцию и законодательство без автономии регионов.", points: 1 },
      { id: "soq5", question: "Согласно Конституции РФ, высшей ценностью в Российской Федерации являются:", type: "single", options: ["Человек, его права и свободы", "Государственный суверенитет", "Природные богатства", "Экономическая стабильность"], correctIndex: 0, explanation: "Статья 2 Конституции РФ гласит: 'Человек, его права и свободы являются высшей ценностью'.", points: 1 }
    ];

    const socEgeQuestions = [
      { id: "seq1", question: "Какое суждение о чувственном и рациональном познании является ВЕРНЫМ?", type: "single", options: ["Чувственное познание включает ощущения, восприятия и представления.", "Рациональное познание дает наглядный образ предмета.", "Истина всегда субъективна по своему содержанию.", "Ощущение отражает целостный образ предмета."], correctIndex: 0, explanation: "Чувственное познание протекает в формах ощущения, восприятия и представления. Рациональное — в формах понятия, суждения и умозаключения.", points: 1 },
      { id: "seq2", question: "Государство ввело прогрессивную шкалу налогообложения доходов. Какой экономический смысл имеет эта мера?", type: "single", options: ["Снижение социального неравенства путем изъятия большей доли доходов у богатых граждан", "Стимулирование роста доходов высокооплачиваемых специалистов", "Сокращение общих налоговых поступлений в государственный бюджет", "Упрощение процедуры расчета и уплаты налогов"], correctIndex: 0, explanation: "Прогрессивный налог предполагает возрастание ставки по мере роста дохода, что сглаживает социальное неравенство.", points: 1 },
      { id: "seq3", question: "В стране Z высшая власть передается по наследству, но ограничена законом и парламентом. Какова форма правления страны Z?", type: "single", options: ["Ограниченная (конституционная) монархия", "Абсолютная монархия", "Президентская республика", "Парламентская республика"], correctIndex: 0, explanation: "Если монарх правит пожизненно и передает власть по наследству, но его полномочия ограничены конституцией и парламентом — это конституционная монархия.", points: 1 },
      { id: "seq4", question: "Какое правовое условие обязательно для заключения брака в РФ согласно Семейному кодексу?", type: "single", options: ["Взаимное добровольное согласие мужчины и женщины", "Наличие собственного жилья у обоих супругов", "Обязательное заключение брачного договора", "Согласие родителей вступающих в брак"], correctIndex: 0, explanation: "Ст. 12 СК РФ указывает добровольное согласие мужчины и женщины и достижение брачного возраста в качестве обязательных условий.", points: 1 },
      { id: "seq5", question: "Какова главная функция Центрального банка Российской Федерации?", type: "single", options: ["Защита и обеспечение устойчивости рубля и монопольная эмиссия денег", "Выдача кредитов физическим лицам под процент", "Прием вкладов населения и коммерческих организаций", "Финансирование коммерческих бизнес-проектов"], correctIndex: 0, explanation: "ЦБ РФ — главный эмиссионный и мегарегулирующий орган, обеспечивающий устойчивость национальной валюты и банковской системы.", points: 1 }
    ];

    const histOgeQuestions = [
      { id: "hoq1", question: "Какое событие произошло в 988 году?", type: "single", options: ["Крещение Руси князем Владимиром", "Призвание варягов на Русь", "Съезд князей в Любече", "Битва на реке Калке"], correctIndex: 0, explanation: "В 988 году князь Владимир Святославич принял христианство как государственную религию Древнерусского государства.", points: 1 },
      { id: "hoq2", question: "Кто из русских правителей ввел опричнину в XVI веке?", type: "single", options: ["Иван IV Грозный", "Иван III Великий", "Василий III", "Борис Годунов"], correctIndex: 0, explanation: "Иван IV Грозный учредил опричнину в 1565 году для укрепления личной власти и борьбы с боярами.", points: 1 },
      { id: "hoq3", question: "В результате какой войны Россия получила выход к Балтийскому морю и провозгласила себя империей?", type: "single", options: ["Северная война (1700–1721)", "Смоленская война", "Ливонская война", "Семилетняя война"], correctIndex: 0, explanation: "Северная война со Швецией завершилась Ништадтским миром 1721 г., закрепившим за Россией Прибалтику и статус империи.", points: 1 },
      { id: "hoq4", question: "Какая реформа была проведена императором Александром II в 1861 году?", type: "single", options: ["Отмена крепостного права", "Создание Государственной думы", "Учреждение министерств", "Издание Жалованной грамоты дворянству"], correctIndex: 0, explanation: "19 февраля 1861 г. Александр II подписал Манифест об отмене крепостного права в России.", points: 1 },
      { id: "hoq5", question: "Какое решающее сражение Великой Отечественной войны произошло зимой 1942–1943 гг.?", type: "single", options: ["Сталинградская битва", "Курская битва", "Битва за Москву", "Освобождение Киева"], correctIndex: 0, explanation: "Победа Красной Армии под Сталинградом (февраль 1943 г.) ознаменовала коренной перелом в Великой Отечественной войне.", points: 1 }
    ];

    const histEgeQuestions = [
      { id: "heq1", question: "Укажите век, к которому относится принятие Свода законов 'Русская Правда':", type: "single", options: ["XI век", "IX век", "XIII век", "XV век"], correctIndex: 0, explanation: "Первый письменный свод законов Древней Руси 'Краткая Правда' был составлен при Ярославе Мудром в первой половине XI века (около 1016 г.).", points: 1 },
      { id: "heq2", question: "Какое важное внешнеполитическое событие произошло в 1480 году?", type: "single", options: ["Стояние на реке Угре и окончательное свержение ордынского ига", "Куликовская битва", "Взятие Казани войсками Ивана IV", "Битва на реке Шелони"], correctIndex: 0, explanation: "Стояние на реке Угре в 1480 г. между войсками Ивана III и хана Ахмата завершилось бегством Орды и окончанием ордынского владычества.", points: 1 },
      { id: "heq3", question: "Укажите исторического деятеля, возглавившего Второе ополчение в 1611–1612 гг.:", type: "single", options: ["Кузьма Минин и Дмитрий Пожарский", "Прокопий Ляпунов", "Иван Болотников", "Василий Шуйский"], correctIndex: 0, explanation: "Нижегородский староста Кузьма Минин и князь Дмитрий Пожарский сформировали Второе ополчение и освободили Москву от поляков в 1612 г.", points: 1 },
      { id: "heq4", question: "Какой орган высшей государственной власти был учрежден Петром I в 1711 году?", type: "single", options: ["Правительствующий Сенат", "Святейший Синод", "Государственный совет", "Боярская дума"], correctIndex: 0, explanation: "Сенат был создан Петром I в 1711 году как высший орган законодательной, исполнительной и судебной власти.", points: 1 },
      { id: "heq5", question: "Какое событие произошло в рамках Военной реформы Д.А. Милютина в 1874 году?", type: "single", options: ["Введение всесословной воинской повинности", "Создание стрелецкого войска", "Переход к рекрутской набору", "Формирование Красной Армии"], correctIndex: 0, explanation: "В 1874 г. рекрутские наборы были заменены всеобщей всесословной воинской повинностью для мужского населения.", points: 1 }
    ];

    const physOgeQuestions = [
      { id: "poq1", question: "Чему равно ускорение тела массой 4 кг под действием силы 20 Н?", type: "single", options: ["5 м/с²", "80 м/с²", "0.2 м/с²", "24 м/с²"], correctIndex: 0, explanation: "По второму закону Ньютона F = ma ⇒ a = F / m = 20 Н / 4 кг = 5 м/с².", points: 1 },
      { id: "poq2", question: "Какое количество теплоты требуется для нагревания 2 кг воды на 10°C? (Удельная теплоемкость воды c = 4200 Дж/(кг·°C))", type: "single", options: ["84 000 Дж", "42 000 Дж", "21 000 Дж", "420 Дж"], correctIndex: 0, explanation: "Q = cmΔT = 4200 * 2 * 10 = 84 000 Дж = 84 кДж.", points: 1 },
      { id: "poq3", question: "Чему равно сопротивление проводника, если при напряжении 12 В по нему течет ток 3 А?", type: "single", options: ["4 Ом", "36 Ом", "0.25 Ом", "15 Ом"], correctIndex: 0, explanation: "По закону Ома R = U / I = 12 В / 3 А = 4 Ом.", points: 1 },
      { id: "poq4", question: "Чему равна кинетическая энергия тела массой 2 кг, движущегося со скоростью 6 м/с?", type: "single", options: ["36 Дж", "12 Дж", "72 Дж", "18 Дж"], correctIndex: 0, explanation: "E_к = (m * v²) / 2 = (2 * 6²) / 2 = 36 Дж.", points: 1 },
      { id: "poq5", question: "Какое оптическое приспособление используется для получения увеличенного действительного изображения на экране?", type: "single", options: ["Собирающая линза", "Рассеивающая линза", "Плоское зеркало", "Выпуклое зеркало"], correctIndex: 0, explanation: "Действительное изображение на экране создается собирающей линзой при расположении предмета за фокусом.", points: 1 }
    ];

    const physEgeQuestions = [
      { id: "peq1", question: "Какое из уравнений описывает зависимость координаты от времени x(t) для тела, брошенного вертикально вверх со скоростью v0 из точки x0 = 0?", type: "single", options: ["x(t) = v0*t - (g*t²)/2", "x(t) = v0*t + (g*t²)/2", "x(t) = (g*t²)/2", "x(t) = v0/t - g*t"], correctIndex: 0, explanation: "Ускорение свободного падения g направлено противоположно начальной скорости v0, поэтому x(t) = v0*t - (g*t²)/2.", points: 1 },
      { id: "peq2", question: "В идеальном тепловом двигателе температура нагревателя равна 500 K, а температура холодильника — 300 K. Чему равен КПД этого двигателя?", type: "single", options: ["40%", "60%", "20%", "50%"], correctIndex: 0, explanation: "КПД цикла Карно η = (T_нагр - T_холод) / T_нагр = (500 - 300) / 500 = 200 / 500 = 0.4 = 40%.", points: 1 },
      { id: "peq3", question: "Два точечных заряда q1 и q2 находятся на расстоянии r друг от друга. Как изменится сила Кулона, если расстояние между ними увеличить в 3 раза?", type: "single", options: ["Уменьшится в 9 раз", "Увеличится в 9 раз", "Уменьшится в 3 раза", "Не изменится"], correctIndex: 0, explanation: "Закон Кулона: F = k*|q1*q2|/r². При увеличении r в 3 раза знаменатель увеличивается в 3² = 9 раз, то есть сила уменьшается в 9 раз.", points: 1 },
      { id: "peq4", question: "Чему равна частота света с длиной волны λ = 600 нм в вакууме? (c = 3·10⁸ м/с)", type: "single", options: ["5·10¹⁴ Гц", "2·10¹⁴ Гц", "1.8·10¹¹ Гц", "3·10¹5 Гц"], correctIndex: 0, explanation: "ν = c / λ = (3·10⁸ м/с) / (600·10⁻⁹ м) = 5·10¹⁴ Гц.", points: 1 },
      { id: "peq5", question: "При альфа-распаде ядра атома его зарядовое число Z и массовое число A изменяются следующим образом:", type: "single", options: ["Z уменьшается на 2, A уменьшается на 4", "Z уменьшается на 1, A не меняется", "Z увеличивается на 1, A не меняется", "Z уменьшается на 4, A уменьшается на 2"], correctIndex: 0, explanation: "Альфа-частица представляет собой ядро гелия ⁴₂He. При α-распаде массовое число А уменьшается на 4, а зарядовое число Z — на 2.", points: 1 }
    ];

    const infOgeQuestions = [
      { id: "ioq1", question: "В одной из кодировок Unicode каждый символ кодируется 16 битами. Ученик написал текст: 'Лев, тигр, пантера, ягуар, гепард — хищники.' Сколько байт составит объем этого текста?", type: "single", options: ["90 байт", "45 байт", "180 байт", "360 байт"], correctIndex: 0, explanation: "16 бит = 2 байта на символ. Посчитаем количество символов в тексте со знаками и пробелами: 45 символов. Объем V = 45 * 2 = 90 байт.", points: 1 },
      { id: "ioq2", question: "Для какого из приведенных чисел ЛОЖНО высказывание: (Число > 50) ИЛИ НЕ (Число четное)?", type: "single", options: ["42", "53", "17", "60"], correctIndex: 0, explanation: "Выражение ложно, если обе части ложны. Часть 1: (x > 50) = 0 ⇒ x ≤ 50. Часть 2: НЕ (x четное) = 0 ⇒ x четное. Единственное четное число ≤ 50 из вариантов — 42.", points: 1 },
      { id: "ioq3", question: "Между четырьмя пунктами A, B, C, D построены дороги. Длины дорог: AB=2, AC=5, AD=8, BC=1, CD=3. Найдите кратчайший путь из A в D.", type: "single", options: ["6", "8", "7", "5"], correctIndex: 0, explanation: "Пути из A в D: A->D (8), A->C->D (5+3=8), A->B->C->D (2+1+3=6). Минимальная длина равна 6.", points: 1 },
      { id: "ioq4", question: "Файл demo.txt находился в каталоге C:\\Document\\School. Его переместили в каталог C:\\Exam. Каково полное имя файла после перемещения?", type: "single", options: ["C:\\Exam\\demo.txt", "C:\\Document\\Exam\\demo.txt", "C:\\School\\demo.txt", "C:\\Exam\\School\\demo.txt"], correctIndex: 0, explanation: "Полное имя файла состоит из пути к новому каталогу и имени самого файла: C:\\Exam\\demo.txt.", points: 1 },
      { id: "ioq5", question: "В таблице приведены запросы и количество страниц, найденных поисковым сервером: 'Сканеры' — 200, 'Принтеры' — 300, 'Сканеры | Принтеры' — 450. Сколько страниц будет найдено по запросу 'Сканеры & Принтеры'?", type: "single", options: ["50", "100", "150", "500"], correctIndex: 0, explanation: "По формуле включений-исключений N(A | B) = N(A) + N(B) - N(A & B) ⇒ 450 = 200 + 300 - N(A & B) ⇒ N(A & B) = 500 - 450 = 50.", points: 1 }
    ];

    const infEgeQuestions = [
      { id: "ieq1", question: "Значение логического выражения ((x → y) ∧ (y → z)) → (x → z) равно 1 при любых значениях переменных x, y, z. Каким свойством обладает это выражение?", type: "single", options: ["Является тавтологией (тождественно истинным)", "Является тождественно ложным", "Зависит только от переменной y", "Не выполнимо ни при каких условиях"], correctIndex: 0, explanation: "Правило транзитивности импликации: если x имплицирует y, а y имплицирует z, то x имплицирует z. Это выражение истинно при всех 8 комбинациях x, y, z.", points: 1 },
      { id: "ieq2", question: "Текстовый файл состоит из символов 'A', 'B', 'C'. Найдите максимальное количество подряд идущих символов 'A' в строке 'AAABAAABAAAA'?", type: "single", options: ["4", "3", "5", "2"], correctIndex: 0, explanation: "После разбиения по 'B' получаем подстроки 'AAA', 'AAA', 'AAAA'. Максимальная длина подстроки из 'A' равна 4.", points: 1 },
      { id: "ieq3", question: "Сколько существует целых чисел x на отрезке [1, 100], для которых выражение (x % 3 == 0) and (x % 5 != 0) принимает значение ИСТИНА?", type: "single", options: ["27", "33", "20", "6"], correctIndex: 0, explanation: "Чисел от 1 до 100, кратных 3: 33. Из них кратных 15 (и 3, и 5): 6 (15, 30, 45, 60, 75, 90). Чисел, кратных 3 и не кратных 5: 33 - 6 = 27.", points: 1 },
      { id: "ieq4", question: "В кодировке ASCII один символ занимает 8 бит. Скорость передачи файла составляет 56000 бит/с. Сколько секунд займет передача текста из 7000 символов?", type: "single", options: ["1 секунда", "2 секунды", "0.5 секунд", "10 секунд"], correctIndex: 0, explanation: "Размер файла: 7000 * 8 бит = 56000 бит. Время передачи = 56000 / 56000 = 1 секунда.", points: 1 },
      { id: "ieq5", question: "Алгоритм вычисления функции F(n) задан рекурсивно: F(1)=1; F(n)=F(n-1)+2*n при n > 1. Чему равно F(4)?", type: "single", options: ["19", "20", "12", "15"], correctIndex: 0, explanation: "F(1)=1. F(2)=1 + 2*2 = 5. F(3)=5 + 2*3 = 11. F(4)=11 + 2*4 = 19.", points: 1 }
    ];

    insMockExam.run("mock_rus_oge_1", "russian", "ОГЭ по русскому языку — Вариант 1", "OGE", 210, 5, 0, JSON.stringify(rusOgeQuestions), ogeConversion);
    insMockExam.run("mock_rus_ege_1", "russian", "ЕГЭ по русскому языку — Вариант 1 (Premium)", "EGE", 235, 5, 1, JSON.stringify(rusEgeQuestions), egeConversion);
    insMockExam.run("mock_math_oge_1", "math", "ОГЭ по математике — Вариант 1", "OGE", 210, 5, 0, JSON.stringify(mathOgeQuestions), ogeConversion);
    insMockExam.run("mock_math_ege_1", "math", "ЕГЭ по математике (Профиль) — Вариант 1 (Premium)", "EGE", 235, 5, 1, JSON.stringify(mathEgeQuestions), egeConversion);
    insMockExam.run("mock_soc_oge_1", "social", "ОГЭ по обществознанию — Вариант 1", "OGE", 210, 5, 0, JSON.stringify(socOgeQuestions), ogeConversion);
    insMockExam.run("mock_soc_ege_1", "social", "ЕГЭ по обществознанию — Вариант 1 (Premium)", "EGE", 235, 5, 1, JSON.stringify(socEgeQuestions), egeConversion);
    insMockExam.run("mock_hist_oge_1", "history", "ОГЭ по истории — Вариант 1", "OGE", 210, 5, 0, JSON.stringify(histOgeQuestions), ogeConversion);
    insMockExam.run("mock_hist_ege_1", "history", "ЕГЭ по истории — Вариант 1 (Premium)", "EGE", 235, 5, 1, JSON.stringify(histEgeQuestions), egeConversion);
    insMockExam.run("mock_phys_oge_1", "physics", "ОГЭ по физике — Вариант 1", "OGE", 210, 5, 0, JSON.stringify(physOgeQuestions), ogeConversion);
    insMockExam.run("mock_phys_ege_1", "physics", "ЕГЭ по физике — Вариант 1 (Premium)", "EGE", 235, 5, 1, JSON.stringify(physEgeQuestions), egeConversion);
    insMockExam.run("mock_inf_oge_1", "informatics", "ОГЭ по информатике — Вариант 1", "OGE", 210, 5, 0, JSON.stringify(infOgeQuestions), ogeConversion);
    insMockExam.run("mock_inf_ege_1", "informatics", "ЕГЭ по информатике — Вариант 1 (Premium)", "EGE", 235, 5, 1, JSON.stringify(infEgeQuestions), egeConversion);
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  initSchema();
  seedContent();
  console.log("Database seeded successfully.");
}
