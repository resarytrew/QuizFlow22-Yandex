import { useState } from "react";
import { Link } from "@tanstack/react-router";
import "./studio-sections.css";

const capabilities = [
  {
    title: "Выбор с продолжением",
    text: "У каждого ответа может быть свой следующий шаг. Дайте участнику повлиять на историю.",
    label: "Развилки",
    prompt: "Вы у развилки. Куда пойдём?",
    answers: ["К вершине", "К морю"],
    feedback: [
      "Впереди горная тропа. Следующий вопрос будет о вашем опыте походов.",
      "Берём курс на побережье. Дальше можно выбрать ритм отдыха.",
    ],
  },
  {
    title: "Знания в действии",
    text: "Вопросы, обратная связь и баллы помогают разобраться в теме, а не просто угадать ответ.",
    label: "Обратная связь",
    prompt: "Что помогает закрепить новый навык?",
    answers: ["Только прочитать", "Попробовать на практике"],
    feedback: [
      "Чтение — хорошее начало. Попробуйте применить новое знание в ситуации.",
      "Верно. Практика позволяет проверить, как вы используете новое знание.",
    ],
  },
  {
    title: "Своя история, свой стиль",
    text: "Добавьте изображения, настройте оформление и подберите шаблон под свою аудиторию.",
    label: "Оформление",
    prompt: "Какое настроение у вашей истории?",
    answers: ["Спокойное", "Энергичное"],
    feedback: [
      "Сдержанные цвета и размеренный ритм. Оставляем внимание содержанию.",
      "Контрастный акцент и яркие изображения. Делаем выбор заметнее.",
    ],
  },
];

export function StudioCapabilities() {
  const [active, setActive] = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);
  const item = capabilities[active];
  return (
    <section
      id="features"
      className="studio-section studio-capabilities"
      aria-labelledby="capabilities-title"
    >
      <div className="studio-heading">
        <p>Возможности</p>
        <h2 id="capabilities-title">
          Не просто ответ.
          <br />
          <span>Следующий шаг.</span>
        </h2>
      </div>
      <div className="studio-feature-layout">
        <div
          className="studio-feature-options"
          role="tablist"
          aria-label="Возможности конструктора"
          aria-orientation="vertical"
        >
          {capabilities.map((feature, i) => (
            <button
              key={feature.title}
              id={`capability-${i}`}
              role="tab"
              aria-selected={active === i}
              aria-controls="capability-panel"
              tabIndex={active === i ? 0 : -1}
              onKeyDown={(event) => {
                if (
                  ["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)
                ) {
                  event.preventDefault();
                  const next =
                    event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? capabilities.length - 1
                        : (active +
                            (event.key === "ArrowDown" ? 1 : -1) +
                            capabilities.length) %
                          capabilities.length;
                  setActive(next);
                  setAnswer(null);
                  document.getElementById(`capability-${next}`)?.focus();
                }
              }}
              onClick={() => {
                setActive(i);
                setAnswer(null);
              }}
            >
              <span className="studio-feature-number">0{i + 1}</span>
              <span>
                <strong>{feature.title}</strong>
                <span className="studio-feature-description">
                  {feature.text}
                </span>
              </span>
              <span className="studio-feature-arrow" aria-hidden>
                ↗
              </span>
            </button>
          ))}
        </div>
        <div
          id="capability-panel"
          role="tabpanel"
          aria-labelledby={`capability-${active}`}
          className={`studio-interaction interaction-${active}`}
        >
          <div className="studio-sample-label">
            <span>{item.label}</span>
            <span>Попробуйте здесь ↓</span>
          </div>
          <div className="studio-question-sheet">
            <span className="studio-sheet-type">Вопрос</span>
            <h3>{item.prompt}</h3>
            <div className="studio-sample-answers">
              {item.answers.map((text, i) => (
                <button
                  key={text}
                  aria-pressed={answer === i}
                  onClick={() => setAnswer(i)}
                >
                  {text}
                  <span aria-hidden>→</span>
                </button>
              ))}
            </div>
            <div className="studio-feedback" aria-live="polite">
              {answer === null
                ? "Выберите ответ — посмотрите, что изменится."
                : item.feedback[answer]}
            </div>
          </div>
          <div className="studio-sample-route" aria-hidden>
            <span>Вопрос</span>
            <i />
            <span>{answer === null ? "Ваш выбор" : item.answers[answer]}</span>
            <i />
            <span>Продолжение</span>
          </div>
        </div>
      </div>
    </section>
  );
}

const scenarios = [
  {
    label: "Для урока",
    title: "Когда ученик — участник.",
    text: "Предложите исследовать тему, принять решение и увидеть последствия. Соберите урок, в котором интересно искать ответ.",
    image: "/assets/landing/workshop.webp",
    alt: "Блокнот, карта и карточки на рабочем столе",
    name: "Мастерская историй",
    steps: ["Ситуация", "Выбор", "Обсуждение"],
    result: "Повод для разговора, а не только оценка.",
  },
  {
    label: "Для команды",
    title: "Сначала попробовать. Потом действовать.",
    text: "Превратите рабочую ситуацию в тренажёр. Покажите разные варианты действий и объясните, к чему они приводят.",
    image: "/assets/landing/workshop.webp",
    alt: "Материалы для подготовки учебного сценария",
    name: "Разговор с коллегой",
    steps: ["Контекст", "Решение", "Обратная связь"],
    result: "Безопасное место для первых ошибок.",
  },
  {
    label: "Для клиента",
    title: "Помогите найти свой вариант.",
    text: "Несколько точных вопросов вместо длинного списка предложений. Настройте пути к рекомендациям под разные потребности.",
    image: "/assets/landing/coast.webp",
    alt: "Морское побережье",
    name: "Путешествие по вашим правилам",
    steps: ["Пожелания", "Уточнение", "Рекомендация"],
    result: "Понятный выбор из множества возможностей.",
  },
];

export function StudioScenarios() {
  const [active, setActive] = useState(0);
  const scenario = scenarios[active];
  return (
    <section
      id="scenario-lab"
      className="studio-scenarios"
      aria-labelledby="scenarios-title"
    >
      <div className="studio-section">
        <div className="studio-heading">
          <p>Лаборатория сценариев</p>
          <h2 id="scenarios-title">
            Один инструмент.
            <br />
            <span>Ваш контекст.</span>
          </h2>
        </div>
        <div className="studio-scenario-tabs" aria-label="Выберите применение">
          {scenarios.map((item, i) => (
            <button
              key={item.label}
              aria-pressed={i === active}
              onClick={() => setActive(i)}
            >
              {item.label}
              <span aria-hidden>↗</span>
            </button>
          ))}
        </div>
        <div className="studio-scenario-stage">
          <figure>
            <img
              src={scenario.image}
              alt={scenario.alt}
              width="900"
              height="650"
              loading="lazy"
            />
            <figcaption>{scenario.name}</figcaption>
          </figure>
          <div className="studio-scenario-copy" aria-live="polite">
            <h3>{scenario.title}</h3>
            <p>{scenario.text}</p>
            <ol>
              {scenario.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <p className="studio-scenario-result">{scenario.result}</p>
            <Link to="/templates" className="studio-text-link">
              Подобрать шаблон <span aria-hidden>↗</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function StudioProcess({ onCTA }: { onCTA: () => void }) {
  return (
    <section
      id="how-it-works"
      className="studio-section studio-process"
      aria-labelledby="process-title"
    >
      <div className="studio-heading">
        <p>От замысла к запуску</p>
        <h2 id="process-title">
          Сначала идея.
          <br />
          Дальше — <span>Поток.</span>
        </h2>
      </div>
      <ol className="studio-process-list">
        <li>
          <span className="studio-process-index">01</span>
          <div>
            <h3>Начните с главного</h3>
            <p>
              Откройте чистый холст или выберите шаблон. Сформулируйте первый
              вопрос.
            </p>
          </div>
          <span className="studio-process-art art-start" aria-hidden>
            СТАРТ <b>→</b>
          </span>
        </li>
        <li>
          <span className="studio-process-index">02</span>
          <div>
            <h3>Дайте истории разветвиться</h3>
            <p>
              Свяжите ответы со следующими блоками. Добавьте условия и разные
              результаты.
            </p>
          </div>
          <span className="studio-process-art art-branch" aria-hidden>
            <span>Выбор</span>
            <b>
              ↗<br />↘
            </b>
            <span>
              Путь А<br />
              Путь Б
            </span>
          </span>
        </li>
        <li>
          <span className="studio-process-index">03</span>
          <div>
            <h3>Проверьте и поделитесь</h3>
            <p>
              Пройдите сценарий в предпросмотре. Опубликуйте и отправьте
              участникам ссылку.
            </p>
          </div>
          <button className="potok-button" onClick={onCTA}>
            Открыть конструктор <span aria-hidden>↗</span>
          </button>
        </li>
      </ol>
    </section>
  );
}

export function StudioAuthor() {
  return (
    <section
      id="author"
      className="studio-author"
      aria-labelledby="author-title"
    >
      <div className="studio-section studio-author-layout">
        <figure>
          <img
            src="https://i.postimg.cc/bJZfTDWv/b-900-600-0-10-images-stories-2023-12-04-12-12.jpg"
            alt="Евгений Некрытый, создатель Потока"
            width="600"
            height="750"
            loading="lazy"
          />
          <figcaption>
            Евгений Некрытый
            <span>Преподаватель истории · создатель Потока</span>
          </figcaption>
        </figure>
        <div>
          <p className="studio-author-intro">Инструмент с личной историей</p>
          <h2 id="author-title">
            Обучение должно
            <br />
            быть приключением.
          </h2>
          <blockquote>
            «Я создал этот инструмент, потому что устал от скучных тестов».
          </blockquote>
          <p>
            Как преподаватель истории, я искал способ погрузить учеников в
            контекст эпохи — дать им принимать решения, а не только запоминать
            даты.
          </p>
          <p>
            Из этой задачи вырос Поток. Место, где преподаватель становится
            автором, а ученик — участником истории.
          </p>
          <a className="studio-text-link" href="mailto:mykviz@yandex.ru">
            Написать автору <span aria-hidden>↗</span>
          </a>
        </div>
      </div>
    </section>
  );
}

export function StudioClosing({ onCTA }: { onCTA: () => void }) {
  return (
    <section className="studio-closing">
      <div className="studio-section">
        <p>Ваши идеи в движении</p>
        <h2>
          Больше, чем конструктор -<br />
          это Поток.
        </h2>
        <button className="potok-button" onClick={onCTA}>
          Оживить свою идею <span aria-hidden>↗</span>
        </button>
        <span className="studio-closing-word" aria-hidden>
          Поток
        </span>
      </div>
    </section>
  );
}

export function StudioFooter() {
  return (
    <footer className="studio-footer">
      <div className="studio-section">
        <div className="studio-footer-top">
          <Link to="/" className="studio-footer-brand">
            <img
              src="/assets/landing/potok-mark.svg"
              width="48"
              height="36"
              alt=""
            />
            Поток
          </Link>
          <p>
            Собирайте. Связывайте.
            <br />
            Оживляйте идеи.
          </p>
          <nav aria-label="Ресурсы">
            <Link to="/public">Галерея</Link>
            <Link to="/templates">Шаблоны</Link>
            <Link to="/docs">Документация</Link>
            <a href="mailto:mykviz@yandex.ru">Связаться</a>
          </nav>
        </div>
        <div className="studio-footer-bottom">
          <span>© {new Date().getFullYear()} Поток</span>
          <a href="/legal/privacy-policy.html">Конфиденциальность</a>
          <a href="/legal/public-offer.html">Публичная оферта</a>
          <a href="/legal/project-rules.html">Правила проекта</a>
        </div>
        <p className="studio-legal">
          Некрытый Евгений Владимирович · ИНН 560993778885 ·{" "}
          <a href="mailto:mykviz@yandex.ru">mykviz@yandex.ru</a>
        </p>
      </div>
    </footer>
  );
}
