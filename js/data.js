const EXAM_DATA = {
  subjects: {
    biology: {
      id: "biology",
      title: "Биология",
      icon: "🧬",
      color: "var(--color-green)",
      colorHex: "#00A859",
      bgGradient: "linear-gradient(135deg, rgba(0, 168, 89, 0.1) 0%, rgba(0, 168, 89, 0.02) 100%)",
      topics: [
        {
          id: "bio_cytology",
          title: "Цитология: Строение клетки",
          isPremium: false,
          duration: "45 мин",
          theory: `
            <h3>1. Клеточная теория</h3>
            <p>Клеточная теория — одно из важнейших биологических обобщений, утверждающее единство происхождения и строения всех живых организмов. Создана Т. Шванном и М. Шлейденом (1838–1839 гг.), дополнена Р. Вирховым ("каждая клетка из клетки").</p>
            <div class="note-info-box">
              <strong>Ключевые положения:</strong>
              <ul>
                <li>Клетка — элементарная единица строения, функционирования и развития живого.</li>
                <li>Клетки всех организмов сходны по химическому составу и строению.</li>
                <li>Размножение клеток происходит путём их деления.</li>
              </ul>
            </div>
            <h3>2. Органоиды клетки и их функции</h3>
            <table class="data-table">
              <thead><tr><th>Тип мембраны</th><th>Органоиды</th><th>Основные функции</th></tr></thead>
              <tbody>
                <tr><td><strong>Двумембранные</strong></td><td>Митохондрии, Пластиды</td><td>Клеточное дыхание (АТФ), Фотосинтез</td></tr>
                <tr><td><strong>Одномембранные</strong></td><td>ЭПС, Комплекс Гольджи, Лизосомы, Вакуоли</td><td>Синтез белков/липидов, транспорт, расщепление</td></tr>
                <tr><td><strong>Немембранные</strong></td><td>Рибосомы, Клеточный центр, Цитоскелет</td><td>Синтез белка, веретено деления, опора</td></tr>
              </tbody>
            </table>
          `,
          video: {
            title: "Строение клетки за 15 минут — Разбор для ЕГЭ и ОГЭ",
            instructor: "Екатерина Бионова",
            duration: "14:52",
            youtubeId: "dQw4w9WgXcQ",
            views: "42.5K",
            thumbnail: "https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=500"
          },
          questions: [
            {
              id: "bio_q1",
              question: "Какой органоид отвечает за синтез АТФ в процессе клеточного дыхания?",
              options: ["Комплекс Гольджи", "Митохондрия", "Рибосома", "Лизосома"],
              correctIndex: 1,
              explanation: "Митохондрии — это 'силовые станции' клетки, в которых происходит окислительное фосфорилирование и синтез АТФ."
            }
          ]
        }
      ]
    },
    chemistry: {
      id: "chemistry",
      title: "Химия",
      icon: "🧪",
      color: "var(--color-blue)",
      colorHex: "#2563EB",
      bgGradient: "linear-gradient(135deg, rgba(37, 99, 235, 0.1) 0%, rgba(37, 99, 235, 0.02) 100%)",
      topics: [
        {
          id: "chem_bonds",
          title: "Химическая связь и строение вещества",
          isPremium: false,
          duration: "40 мин",
          theory: `
            <h3>1. Типы химической связи</h3>
            <p>Химическая связь образуется за счет взаимодействия валентных электронов атомов.</p>
            <ul>
              <li><strong>Ковалентная неполярная:</strong> между атомами одного неметалла (H₂, O₂, Cl₂).</li>
              <li><strong>Ковалентная полярная:</strong> между атомами разных неметаллов (HCl, H₂O, NH₃).</li>
              <li><strong>Ионная:</strong> между типичным металлом и неметаллом (NaCl, K₂O).</li>
              <li><strong>Металлическая:</strong> между атомами металлов (Fe, Cu, Al).</li>
            </ul>
          `,
          video: {
            title: "Все типы химической связи наглядно",
            instructor: "Александр Химов",
            duration: "18:20",
            youtubeId: "dQw4w9WgXcQ",
            views: "31.2K",
            thumbnail: "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=500"
          },
          questions: [
            {
              id: "chem_q1",
              question: "Какая химическая связь образуется в молекуле NaCl?",
              options: ["Ковалентная полярная", "Ионная", "Металлическая", "Водородная"],
              correctIndex: 1,
              explanation: "В NaCl связь образуется между ионами натрия Na+ и хлора Cl-."
            }
          ]
        }
      ]
    },
    russian: {
      id: "russian",
      title: "Русский язык",
      icon: "📝",
      color: "var(--color-red)",
      colorHex: "#DC2626",
      bgGradient: "linear-gradient(135deg, rgba(220, 38, 38, 0.1) 0%, rgba(220, 38, 38, 0.02) 100%)",
      topics: [
        {
          id: "rus_orthoepy",
          title: "Орфоэпические нормы (Задание 4)",
          isPremium: false,
          duration: "35 мин",
          theory: `
            <h3>1. Основные орфоэпические правила</h3>
            <p>Правописание и ударения строго регламентируются Орфоэпическим словариком ФИПИ.</p>
            <div class="note-info-box">
              <strong>Частые глаголы:</strong>
              <ul>
                <li>звони́т, звоня́т (не зво́нит)</li>
                <li>обогнала́, налила́, сняла́ (ударение на последний слог в женском роде прошедшего времени)</li>
                <li>опломбирова́ть, премирова́ть (суффикс -ирова-)</li>
              </ul>
            </div>
          `,
          video: {
            title: "Ударения в ЕГЭ по русскому языку — Лайфхаки запоминания",
            instructor: "Анастасия Русская",
            duration: "12:45",
            youtubeId: "dQw4w9WgXcQ",
            views: "58.9K",
            thumbnail: "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=500"
          },
          questions: [
            {
              id: "rus_q1",
              question: "В каком слове верно выделена буква, обозначающая ударный гласный звук?",
              options: ["ЗВО́НИТ", "звони́т", "звОнит", "звОниТ"],
              correctIndex: 1,
              explanation: "В глаголе 'звонить' ударение падает на окончание: звони́т, звоня́т."
            }
          ]
        }
      ]
    },
    math: {
      id: "math",
      title: "Математика",
      icon: "📐",
      color: "var(--color-orange)",
      colorHex: "#EA580C",
      bgGradient: "linear-gradient(135deg, rgba(234, 88, 12, 0.1) 0%, rgba(234, 88, 12, 0.02) 100%)",
      topics: [
        {
          id: "math_equations",
          title: "Тригонометрические уравнения",
          isPremium: false,
          duration: "50 мин",
          theory: `
            <h3>1. Простейшие тригонометрические уравнения</h3>
            <ul>
              <li><strong>sin x = a (|a| ≤ 1):</strong> x = (-1)ᵏ arcsin a + πk, k ∈ ℤ</li>
              <li><strong>cos x = a (|a| ≤ 1):</strong> x = ± arccos a + 2πk, k ∈ ℤ</li>
              <li><strong>tg x = a:</strong> x = arctg a + πk, k ∈ ℤ</li>
            </ul>
          `,
          video: {
            title: "Тригонометрия с нуля — Профильный ЕГЭ",
            instructor: "Михаил Профиль",
            duration: "22:10",
            youtubeId: "dQw4w9WgXcQ",
            views: "64.1K",
            thumbnail: "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=500"
          },
          questions: [
            {
              id: "math_q1",
              question: "Найдите корни уравнения sin x = 1:",
              options: ["x = π/2 + 2πk", "x = πk", "x = 2πk", "x = -π/2 + πk"],
              correctIndex: 0,
              explanation: "Синус равен 1 в точке π/2 с периодом 2πk."
            }
          ]
        }
      ]
    },
    social: {
      id: "social",
      title: "Обществознание",
      icon: "👥",
      color: "var(--color-purple)",
      colorHex: "#9333EA",
      bgGradient: "linear-gradient(135deg, rgba(147, 51, 234, 0.1) 0%, rgba(147, 51, 234, 0.02) 100%)",
      topics: [
        {
          id: "soc_economy",
          title: "Экономика и рыночный механизм",
          isPremium: false,
          duration: "40 мин",
          theory: `
            <h3>1. Законы спроса и предложения</h3>
            <p><strong>Спрос (D):</strong> количество товаров, которое покупатели готовы приобрести по данной цене.</p>
            <p><strong>Предложение (S):</strong> количество товаров, которое продавцы готовы выставить на продажу.</p>
          `,
          video: {
            title: "Экономика для ЕГЭ за 20 минут",
            instructor: "Елена Общество",
            duration: "19:30",
            youtubeId: "dQw4w9WgXcQ",
            views: "38.7K",
            thumbnail: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=500"
          },
          questions: [
            {
              id: "soc_q1",
              question: "Что происходит со спросом при повышении цены товара (при прочих равных условиях)?",
              options: ["Спрос растет", "Спрос снижается", "Спрос не меняется", "Предложение падает до нуля"],
              correctIndex: 1,
              explanation: "По закону спроса увеличение цены приводит к снижению величины спроса."
            }
          ]
        }
      ]
    },
    history: {
      id: "history",
      title: "История",
      icon: "🏛️",
      color: "var(--color-yellow)",
      colorHex: "#CA8A04",
      bgGradient: "linear-gradient(135deg, rgba(202, 138, 4, 0.1) 0%, rgba(202, 138, 4, 0.02) 100%)",
      topics: [
        {
          id: "hist_ancient_rus",
          title: "Древняя Русь в IX–XII вв.",
          isPremium: false,
          duration: "45 мин",
          theory: `
            <h3>1. Образование Древнерусского государства</h3>
            <p>862 г. — Призвание варягов (Рюрик в Новгороде). 882 г. — Объединение Новгорода и Киева князем Олегом.</p>
          `,
          video: {
            title: "История Руси от Рюрика до Ярослава Мудрого",
            instructor: "Дмитрий Историк",
            duration: "25:40",
            youtubeId: "dQw4w9WgXcQ",
            views: "49.0K",
            thumbnail: "https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=500"
          },
          questions: [
            {
              id: "hist_q1",
              question: "В каком году произошло крещение Руси князем Владимиром?",
              options: ["862 г.", "882 г.", "988 г.", "1054 г."],
              correctIndex: 2,
              explanation: "Крещение Руси произошло в 988 году в Херсонесе (Корсуни)."
            }
          ]
        }
      ]
    },
    physics: {
      id: "physics",
      title: "Физика",
      icon: "⚛️",
      color: "var(--color-teal)",
      colorHex: "#0D9488",
      bgGradient: "linear-gradient(135deg, rgba(13, 148, 136, 0.1) 0%, rgba(13, 148, 136, 0.02) 100%)",
      topics: [
        {
          id: "phys_kinematics",
          title: "Законы Ньютона и Динамика",
          isPremium: false,
          duration: "50 мин",
          theory: `
            <h3>1. Три закона Ньютона</h3>
            <p><strong>Второй закон:</strong> Ускорение тела прямо пропорционально равнодействующей всех сил и обратно пропорционально массе: <em>F⃗ = m a⃗</em>.</p>
          `,
          video: {
            title: "Законы Ньютона — Практический разбор задач",
            instructor: "Игорь Физик",
            duration: "21:15",
            youtubeId: "dQw4w9WgXcQ",
            views: "27.4K",
            thumbnail: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=500"
          },
          questions: [
            {
              id: "phys_q1",
              question: "Как изменится ускорение тела, если силу уведичить в 2 раза, а массу уменьшить в 2 раза?",
              options: ["Не изменится", "Увеличится в 2 раза", "Увеличится в 4 раза", "Уменьшится в 2 раза"],
              correctIndex: 2,
              explanation: "a = F/m. Если F' = 2F, a m' = m/2, то a' = 2F / (m/2) = 4 (F/m) = 4a."
            }
          ]
        }
      ]
    },
    informatics: {
      id: "informatics",
      title: "Информатика",
      icon: "💻",
      color: "var(--color-cyan)",
      colorHex: "#0891B2",
      bgGradient: "linear-gradient(135deg, rgba(8, 145, 178, 0.1) 0%, rgba(8, 145, 178, 0.02) 100%)",
      topics: [
        {
          id: "inf_python_basics",
          title: "Обработка последовательностей (Задание 17-24)",
          isPremium: false,
          duration: "45 мин",
          theory: `
            <h3>1. Разбор задачи на Python</h3>
            <pre><code>with open("17.txt") as f:
    nums = [int(x) for x in f]
res = []
for i in range(len(nums) - 1):
    if (nums[i] + nums[i+1]) % 2 == 0:
        res.append(nums[i] + nums[i+1])
print(len(res), max(res))</code></pre>
          `,
          video: {
            title: "Информатика ЕГЭ на Python за 30 минут",
            instructor: "Сергей Кодер",
            duration: "28:50",
            youtubeId: "dQw4w9WgXcQ",
            views: "71.3K",
            thumbnail: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=500"
          },
          questions: [
            {
              id: "inf_q1",
              question: "Какой результат выведет len([x for x in range(10) if x % 2 == 0])?",
              options: ["4", "5", "9", "10"],
              correctIndex: 1,
              explanation: "Четные числа от 0 до 9 включительно: 0, 2, 4, 6, 8 — всего 5 чисел."
            }
          ]
        }
      ]
    },
    english: {
      id: "english",
      title: "Английский язык",
      icon: "🇬🇧",
      color: "var(--color-indigo)",
      colorHex: "#4F46E5",
      bgGradient: "linear-gradient(135deg, rgba(79, 70, 229, 0.1) 0%, rgba(79, 70, 229, 0.02) 100%)",
      topics: [
        {
          id: "eng_grammar",
          title: "English Tenses: Present Perfect vs Past Simple",
          isPremium: false,
          duration: "35 мин",
          theory: `
            <h3>1. Present Perfect vs Past Simple</h3>
            <p><strong>Past Simple:</strong> действие произошло в конкретное время в прошлом (yesterday, in 2020, ago).</p>
            <p><strong>Present Perfect:</strong> результат действия важен для настоящего момента (already, just, never, ever).</p>
          `,
          video: {
            title: "Master All English Tenses for EGE Exam",
            instructor: "Mary Smith",
            duration: "16:40",
            youtubeId: "dQw4w9WgXcQ",
            views: "33.5K",
            thumbnail: "https://images.unsplash.com/photo-1543165796-5426273eaab3?w=500"
          },
          questions: [
            {
              id: "eng_q1",
              question: "Choose the correct sentence:",
              options: ["I have seen him yesterday.", "I saw him yesterday.", "I had seen him yesterday.", "I am seeing him yesterday."],
              correctIndex: 1,
              explanation: "With specific past time markers ('yesterday'), we use Past Simple ('saw')."
            }
          ]
        }
      ]
    },
    literature: {
      id: "literature",
      title: "Литература",
      icon: "📖",
      color: "var(--color-pink)",
      colorHex: "#DB2777",
      bgGradient: "linear-gradient(135deg, rgba(219, 39, 119, 0.1) 0%, rgba(219, 39, 119, 0.02) 100%)",
      topics: [
        {
          id: "lit_pushkin",
          title: "Роман в стихах 'Евгений Онегин' А.С. Пушкина",
          isPremium: false,
          duration: "45 мин",
          theory: `
            <h3>1. Жанровое своеобразие</h3>
            <p>"Евгений Онегин" — энциклопедическая картина русской жизни 1820-х годов. Написан особой "онегинской строфой" (4а4а 4б4б 4в4в 4г4г).</p>
          `,
          video: {
            title: "Евгений Онегин — Полный анализ произведения",
            instructor: "Мария Словесник",
            duration: "24:10",
            youtubeId: "dQw4w9WgXcQ",
            views: "45.8K",
            thumbnail: "https://images.unsplash.com/photo-1474939557548-f842486be195?w=500"
          },
          questions: [
            {
              id: "lit_q1",
              question: "Какова рифмовка онегинской строфы?",
              options: ["Перекрестная, парная, кольцевая, парная", "Парная, перекрестная, кольцевая, парная", "Перекрестная, кольцевая, парная", "Произвольная"],
              correctIndex: 0,
              explanation: "Онегинская строфа состоит из 14 строк со схемой абаб ввгг деед жж."
            }
          ]
        }
      ]
    }
  },
  otherSubjects: [
    { id: "geography", title: "География", icon: "🌍" }
  ]
};

if (typeof window !== "undefined") {
  window.EXAM_DATA = EXAM_DATA;
}
