# Design

## Theme

Dark. Единая тёмная тема лендинга. Яркие акценты и иллюстрации располагаются на тёмной основе без резкой инверсии отдельных секций.

## Style Direction

Неоновый футуризм с настроением Totally Spies: командная энергия, технологичные формы, выразительные изображения и короткие сообщения.

Это актуальное пользовательское направление. Ранее предложенный тёмный editorial не выбран.

Design Read: лендинг хакатона для школьниц и студенток, с неоновой шпионской эстетикой и быстрым доступом к практической информации.

Параметры Taste Skill: DESIGN_VARIANCE: 8, MOTION_INTENSITY: 1, VISUAL_DENSITY: 3. Выразительная композиция и мало текста; анимация не требуется для передачи стиля.

## Color Direction

Сохранить текущие брендовые токены как основу:

- --whd-dark: #0e0e13, основной фон.
- --whd-pink: #fd5cc3, главный неоновый акцент и основное действие.
- --whd-purple: #602aaf, дополнительный цвет существующих иллюстраций и отдельных поверхностей.
- --whd-text: #ffffff; --whd-text-muted: #b9b1cc.

Розовый остаётся главным акцентом. Свечение использовать выборочно вокруг иллюстрации или ключевого действия. Текст и поля не должны терять контраст из-за свечения.

## Density

Мало текста, хорошо различимые смысловые блоки. Визуальная энергия создаётся масштабом и композицией, а не количеством декора.

На телефоне заголовок и главное действие идут перед декоративной графикой. Основная информация читается без горизонтальной прокрутки.

## Typography

Использовать уже установленные Lexend Variable и Montserrat Variable; Montserrat обеспечивает кириллицу. JetBrains Mono использовать только для уместных данных, например времени.

Крупные, короткие заголовки; спокойный читаемый основной текст от 16px. Не использовать свечение на абзацах и обязательных для чтения надписях. Проверить казахские символы Ә Ғ Қ Ң Ө Ұ Ү Һ І и переносы во всех трёх языках.

## Motion

По уточнению пользователя hero имеет неоновое свечение и мягко мигающие неоновые глаза маскота. Анимация глаз повторяется раз в 4.8 секунды; prefers-reduced-motion оставляет статичное свечение. Дополнительно пользователь запросил след за курсором из трёх предоставленных цветков: розового, фиолетового и белого. На лендинге при движении мыши появляются цветки размером 20–50 px с разными поворотами, небольшим дрейфом и исчезновением за 0.95–1.4 секунды. Максимум 24 частицы, без перехвата кликов; на touch и при reduced motion след выключен. Парение, scramble-текст и перехват прокрутки не добавлять.

Наведение, нажатие, фокус и раскрытие элементов должны иметь ясную обратную связь. Изменение статуса или таймера по данным сохраняется. По запросу от 13 октября 2026 раскрытие, закрытие и смена состояния получили плавные переходы 180–280 мс с быстрым откликом и мягким завершением. FAQ и блок формата используют анимацию высоты Base UI с --accordion-panel-height и data-open; мобильное меню использует обратимый переход grid-rows; диалоги Base UI используют opacity/transform и порталы; фотографии галереи — crossfade. При reduced motion пространственные переходы отключены.

## Selected Style Profile

custom

## Profile Source

custom/reference: прямое указание пользователя на неоновый футуризм, Totally Spies, короткие тексты и отказ от толстых outline. Реализация на существующей коллекции компонентов проекта.

## Custom Overrides

- Outline-кнопки и толстые декоративные обводки не использовать.
- Убрать из целевого дизайна массивные розовые рамки, вложенные обведённые панели и тяжёлые псевдообъёмные фаски.
- Разделять блоки отступами, цветом поверхности и композицией.
- Неон, розовый, фиолетовый и сдержанное локальное свечение являются намеренной частью бренда. Общие запреты навыков на эти приёмы не отменяют запрос пользователя.
- Тонкий видимый focus-visible для клавиатуры обязателен; запрет декоративных outline не означает удаление доступного фокуса.
- Технологичность передавать формами и настоящей графикой, без бессмысленных HUD-надписей, фальшивых данных и декоративного интерфейса.

## Design System Source

src/components/ui, src/components/landing, src/styles.css и src/styles/components.css. Локальные компоненты shadcn Base UI/Nova с Tailwind, class-variance-authority и cn. ConfirmDialog использует Alert Dialog, галерея использует Dialog.

Текущие NeonFrame, NeonPanel, Card и Button содержат тяжёлые рамки/свечение: это исходное состояние для переработки, а не обязательный визуальный образец. Общие изменения не должны неожиданно ухудшить формы и кабинет.

## Components

Сначала переиспользовать структуру и поведение существующих компонентов.

Единая система формы: кнопки и поля с умеренным радиусом около 10–12px; поверхности около 16px. Иллюстрации могут иметь выразительный силуэт. Не превращать каждый блок в рамку или капсулу.

Состояния для проверки:

- Кнопки: default, hover, active, focus-visible, disabled, loading.
- Поля: default, hover, focus, error, disabled, helper text.
- Карточки: default, selected, empty, loading, error, где это применимо.
- Диалоги: open, loading, error, mobile; корректное управление фокусом.
- Блоки: desktop, tablet, mobile, длинные переводы, недоступные изображения и данные.

## Button Style

button-playful-accent с фирменной неоновой палитрой. Основная кнопка залита розовым, текст тёмный и контрастный. Вторичные действия текстовые или с тихой заливкой. Outline-вариант не использовать.

Одна явно главная кнопка в группе, высота на мобильном минимум 44px. Без толстой рамки, вложенной панели и постоянной пульсации. Сохранить disabled/loading и видимый фокус.

## Field Style

field-soft-filled. Тёмная сплошная заливка, явные подписи и сообщения об ошибке. Без толстой обводки и стеклянного фона. Фокус обозначать тонким контрастным кольцом. Не менять порядок и смысл полей.

## Card Style

card-playful-tile в пользовательской интерпретации: выразительная иллюстрация или цветовая поверхность без тяжёлого контура. Свободная композиция там, где контейнер не нужен. Не повторять одну и ту же сетку карточек во всех секциях.

## Modal Style

Для разрушительных действий использовать Base UI Alert Dialog: начальный фокус на Cancel, Escape и Cancel закрывают окно, клик по фону оставляет его открытым. Галерея использует Base UI Dialog: клик по фону и Escape закрывают окно, стрелки переключают фотографии. Оба окна блокируют прокрутку и возвращают фокус. Сохранить понятные действия и спокойный фон без толстых неоновых рамок.

## Header Style

header-marketing-minimal на desktop, header-mobile-sheet как ориентир мобильного меню. Логотип, существующая навигация, переключатель языка и одно главное действие. Без плавающей обведённой капсулы.

Не удалять ссылки ради однострочной навигации: на недостаточной ширине переходить к мобильному меню. Высота desktop-шапки до 80px.

## Hero Style

Композиция по пользовательскому hero layout.jpg: крупный розовый логотип слева, широкая кнопка регистрации под ним, стоящий маскот с экраном справа. Использовать предоставленные hero-wordmark.png и mascot-hero.svg. Сохранить текущий тёмный фон, локальное свечение и стиль кнопки. На телефоне и узком планшете: логотип, CTA, маскот. На экране маскота настоящий таймер; без заданного дедлайна — статус регистрации и дата события. Подзаголовок доступен скринридеру.

Таймер на тёмном экране часов имеет неоновые цифры. Пользователь подтвердил дедлайн: конец 20 октября 2026 по Астане (23:59:59 UTC+5). Использовать его как общий default для UI и серверных проверок регистрации; REGISTRATION_DEADLINE может переопределить дату. Сохранить сообщения и действия для всех стадий регистрации. Hero CTA — розовый гаджет со скошенным силуэтом, светлым бликом и свечением. CTA должен быть виден на типовом экране телефона.

## Pricing Style

Не применяется: лендинг хакатона. Не добавлять тарифы, цены или выдуманные условия оплаты.

## How It Works Style

process-timeline для реальных этапов и расписания. Каждый пункт: этап, краткое объяснение, подтверждённое время/дата при наличии. Не дублировать длинные описания между About, Timeline и Schedule; сохранять назначение секций.

## Text Animation Style

text-no-animation. Заголовки и полезная информация доступны сразу.

## Scroll Style

scroll-native. Нативные якоря, учёт высоты шапки, без scroll-jacking, параллакса и дополнительной библиотеки плавной прокрутки.

## Layout And Screen Patterns

Разнообразить композицию: выразительный hero; компактные факты когда/где/как; визуальное объяснение формата; расписание; настоящие партнёрские логотипы; фотогалерея; FAQ-аккордеон.

Сохранить существующие id: top, info, about, timeline, schedule, partners, benefits, gallery, faq, registration. Ключевые даты и условия видимы сразу; второстепенные подробности раскрываются в FAQ.

## Screen Templates

Основной экран: публичный лендинг /. Повторное действие регистрации в конце длинной страницы допустимо, если ведёт к тому же следующему шагу.

/login и /dashboard по запросу пользователя от 13 октября 2026 используют стиль лендинга и существующие компоненты (см. Account pages ниже). /onboarding, /invite/$slug, /admin и /checkin сохраняют рабочие сценарии и прежнюю композицию. Изменения AuthCard и AuthHeader обратно совместимы; новое оформление ограничено .account-page.

## BeUniq Rule Priorities

Порядок приоритетов: явное направление пользователя; достоверность и доступность; сохранённые правила этих документов; контекстные рекомендации BeUniq и Taste Skill.

Основные проверки: нет толстых outline; мало повторяющегося текста; ясная иерархия; реальные изображения; согласованные компоненты; корректные мобильные состояния и переводы.

Ориентиры BeUniq: aiSlop <= 20, copySlop <= 20, tasteScore <= 20. Сначала запускать проверку без автоматических исправлений. Не удалять намеренный неон ради числа: каждое релевантное исключение объяснять в отчёте, показывать исходный результат и остаточные замечания. Не объявлять проверку пройденной без результата инструмента.

## Visual Review Needed

Лендинг реализован в соответствии с этим направлением. Результаты проверки первого прохода приведены ниже.

После изменений проверить минимум ширины 360, 390, 768 и 1440px, все три языка, меню, FAQ, фокус клавиатуры и состояния регистрации. Текст: контраст 4.5:1, крупный текст 3:1; интерактивные границы/фокус 3:1 относительно окружения. Проверить, что свечение не скрывает содержание, иллюстрации не вызывают скачков раскладки, CTA и подписи не обрезаются.

BeUniq выполняет статический анализ кода без браузера или сетевых сервисов. Его результат не заменяет отдельную визуальную проверку в процессе реализации.

## Implementation Review: 2026-10-12

### Changes

- Перекомпонованы hero, факты о событии, описание раундов, даты, расписание, спонсоры, преимущества, галерея и footer.
- Толстые рамки и outline-вариант кнопок заменены заливками. Обновлены общие поля, карточки и диалоги; индикаторы клавиатурного фокуса сохранены.
- FAQ сгруппирован по четырём темам. Все 10 исходных вопросов доступны, ответы раскрываются с клавиатуры.
- Сокращены тексты лендинга на EN, RU и KK. Фактические данные, ссылки и якоря сохранены.
- Удалены неиспользуемые DecryptedText, HexagonBackground и StarTrail. Декоративных анимаций на лендинге нет.
- Начальная клиентская локаль берётся из серверного HTML, чтобы исключить расхождение при hydration. При первом визите без сохранённого выбора применяется серверный fallback EN; выбранный язык сохраняется в cookie.

### Verification

- Финальные проверки: ESLint, TypeScript (`tsc --noEmit`), 38 тестов Vitest и локальная сборка `vite build --config vite.config.local.ts` прошли. Облачное развёртывание не выполнялось.
- Playwright: EN, RU, KK на ширинах 360, 390, 768 и 1440px. Кнопка hero видна в первом экране; текст не выходит за границы; изображения загружаются.
- Визуально просмотрены desktop и mobile, отдельно tablet 768px и страница входа на desktop/mobile.
- Мобильное меню раскрывается, Escape закрывает его и возвращает фокус кнопке. Все 10 ответов FAQ проверены клавишей Enter.
- Переход регистрации ведёт на /login. Отправка писем и создание аккаунта не выполнялись.
- Смена языка на RU и перезагрузка в новой браузерной сессии: язык сохранён, ошибок hydration нет.
- Набор ключей переводов одинаковый во всех трёх локалях.
- Проверенные пары цветов: CTA 6.87:1; основной текст 9.37:1; ответ FAQ 8.12:1; фокус 11.55:1; призовой фонд 6.93:1.
- Снимки находятся в output/playwright/. Общие компоненты проверены на странице входа; полный сценарий администратора и зарегистрированной команды не проходился.

### BeUniq Static Audit

Полный автоматический результат по репозиторию: **FAIL**, порог 20. Это сырой результат сканера, без ручного уменьшения баллов.

| Метрика        |  До | После |
| -------------- | --: | ----: |
| AI-slop        | 100 |    85 |
| Copy-slop      |  58 |    42 |
| Taste          |  45 |    18 |
| Design quality |  76 |    76 |

Полные отчёты с severity, evidence, file/line и предложениями инструмента: [до](output/design/beuniq-before.json), [после](output/design/beuniq-after.json).

Разбор оставшихся замечаний:

| Правила                                              | Решение и основание                                                                                                                                                             |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| missing-image-alt                                    | Ложное срабатывание на многострочные JSX img. Hero и Gallery имеют локализованный alt. У составного логотипа Partners есть role=img и aria-label, вложенные части декоративные. |
| LP-HERO-004, LP-LEX-001                              | Ложное срабатывание на CSS text-transform: uppercase в landing.css; это не рекламный текст.                                                                                     |
| LP-PRF-004                                           | Проценты CSS, размеры макета и позиционирование настоящего логотипа ошибочно распознаны как маркетинговые метрики.                                                              |
| LP-PRC-005, MET-014, UI-016                          | Сканер принимает серверные token/run, пример имени команды TODO Squad и recommended-конфигурацию ESLint за текст лендинга. Не менять бизнес-код ради этих совпадений.           |
| AST-008, AST-005, CLR-004                            | Имя существующего изображения star-glow.webp распознано как набор иконок/эффектов. Локальное статичное свечение соответствует явному запросу на неон; визуально проверено.      |
| TYP-005, TYP-009, CRD-002, CRD-004, TYP-019          | Начертание заголовка, единственная подпись об издании события, радиусы 12–16px и переносы текста: намеренные решения выбранного профиля, требуют визуальной оценки.             |
| TASTE-FBK-001 в Navbar/FAQ                           | :active и :focus-visible определены централизованно в landing.css. Сканер не связывает их с отдельным TSX-файлом.                                                               |
| Остальные находки в admin/dashboard и других экранах | За пределами первого прохода лендинга. Не считать весь репозиторий прошедшим BeUniq; отдельно оценивать при переработке этих экранов.                                           |

Общий score не является оценкой отрисованного лендинга. Автоматическое исправление декоративных правил не запускалось, чтобы сохранить запрошенный неоновый стиль.

В dev-режиме остаются два исходных 404 для шрифтов панели TanStack Devtools. Они относятся к инструментам разработки; шрифты лендинга загружаются. Полная функциональная проверка аккаунтов и закрытой регистрации не входит в этот визуальный проход.

## Full-screen hero sizing

По уточнению пользователя hero занимает всю доступную ширину без ограничения 1280 px и высоту первого экрана вместе с шапкой. Desktop: min-height calc(100svh - 80px), телефон: calc(100svh - 72px). Маскот масштабируется по ширине колонки и доступной высоте, без обрезки; размер цифр таймера повышен с 4cqw до 5cqw. На узком планшете композиция остаётся вертикальной. На телефонах высотой 640–740 px логотип и отступы компактнее, чтобы CTA и маскот помещались в первый экран. При ещё меньшей высоте контент может естественно удлинить секцию ради читаемости.

## Hero background grid

По запросу пользователя возвращён мотив шестиугольной сетки из исходного HexagonBackground: тонкие фиолетовые линии на всю площадь hero с затуханием сверху и снизу. Реализация — повторяемый SVG-фон, без дополнительных DOM-ячеек, таймеров и перехвата кликов. Существующее неоновое свечение сохранено.

## Mobile hero order

Пользователь изменил порядок на телефоне: надпись, уменьшенный маскот, кнопка у нижнего края первого экрана. До 767 px используется сетка из трёх рядов с высотой 100svh минус 72 px шапки; учтён нижний safe area. Маскот ограничен 280 px, на коротких экранах 250 px; компактный логотип освобождает место на 320×568. Подпись таймера на маленькой панели доступна скринридеру, визуально остаются четыре числа с единицами. Горизонтальный телефон использует две колонки для сохранения читаемости. Desktop-композиция сохраняется.

Проверены RU/KK/EN на 320×568 и 390×844: порядок соблюдён, кнопка полностью в первом экране, горизонтальной прокрутки нет. Также проверены 360×667, 430×932, 768×1024, 1440×900 и горизонтальный 667×375. Локальный отладчик перенесён с кнопки регистрации на середину правого края и скрыт до наведения.

## Cursor trail performance update

The three source flowers are now transparent WebP sprites, 100 px wide for a maximum 50 CSS px particle at 2x density. Combined transfer size: 8,994 bytes instead of 24,477 bytes (63% reduction). The trail predecodes and reuses a fixed pool of 16 image elements, emits at most once per 60 ms with a 20 px movement threshold, and fades particles in 0.8–1.1 seconds. Per-particle blur filters were removed. Reduced motion, touch exclusion, idle cleanup and route cleanup are retained. This supersedes the earlier 24-particle settings.

## Event facts — Watermelon stats-2

По запросу пользователя секция «Когда / Где / Команда» заменена блоком https://registry.watermelon.sh/r/stats-2.json. Сохранены структура с крупными значениями, бейджами и боковыми градиентными акцентами; применены тёмные поверхности WHD и розовый, фиолетовый, лаймовый акценты. Данные: 25 октября 2026, Астана / Назарбаев Университет со ссылкой на карту, 3–4 участницы из общих констант размера команды. RU/KK/EN поддерживаются. На телефоне карточки идут одной колонкой; hover-анимации учитывают reduced motion. Проверены ширины 360, 768 и 1440 px на всех трёх языках: горизонтального переполнения нет. TypeScript, ESLint изменённых компонентов и локальная production-сборка прошли.

## About — Watermelon feature-2

Секция «Один день. Три вызова» использует выбранный пользователем https://registry.watermelon.sh/r/feature-2.json: текст и два раскрывающихся вопроса слева, три смещённые карточки справа. Карточки показывают реальные раунды и время из общего EVENT_SCHEDULE в src/lib/event.ts. Вопросы об опыте и поиске команды используют существующие переводы FAQ, ссылка на Telegram сохранена. Кнопка ведёт к расписанию. Фон, типографика и розовый/фиолетовый/лаймовый акценты согласованы с WHD; массивных обводок нет. На узких экранах колонки складываются вертикально. Проверены RU/KK/EN на 360, 768 и 1440 px, раскрытие с клавиатуры, одиночное раскрытие и переход к расписанию. TypeScript, ESLint и локальная production-сборка прошли.

## Dates — Watermelon stats-3

Секция «Сохрани даты» заменена выбранным пользователем https://registry.watermelon.sh/r/stats-3.json: центрированный заголовок, компактные плашки с иконкой, датой и подписью. Сохранены существующие периоды регистрации (6–20 октября), подтверждения (20–21 октября) и день WHD (25 октября), включая RU/KK/EN. Использованы тёмные поверхности и розовый, фиолетовый, лаймовый акценты WHD. Блик при наведении отключается при reduced motion. На телефоне плашки идут одной колонкой; до 359 px подписи расположены под датами. Проверены 320, 360, 768 и 1440 px на трёх языках: обрезки и горизонтального переполнения нет. TypeScript, ESLint изменённых компонентов и локальная production-сборка прошли.

## Gallery — scattered photo reference

По видео tengilemalamala-6f1a1e.mp4 галерея перестроена в свободную композицию: центральный заголовок и кнопка, шесть кадров разных размеров вокруг. Использованы три существующие фотографии WHD, повторённые с разными кадрированиями; новые фотографии не выдумывались. Сохранены тёмный фон, шрифты и розовый акцент WHD. Motion useScroll и MotionValue дают небольшое смещение при прокрутке и движении мыши без React-перерисовок на каждый кадр. На touch отсутствует реакция на указатель; reduced motion оставляет статичные фотографии. Клик открывает native dialog с тремя оригиналами, кнопками вперёд/назад, ArrowLeft/ArrowRight, Escape и возвратом фокуса. Есть RU/KK/EN и отдельная композиция для телефона. TypeScript, ESLint и production build прошли; IAB-проверка на 1200×828, 390×844 и 320×700 без перекрытия центрального блока.

## Benefits and partners — Watermelon bento-02

Installed the user-selected bento-02 registry block and adapted its four-tile layout for the prize pool, welcome package, merchandise/networking and sponsors. Desktop uses 2+1 / 1+2 columns, tablet two columns, mobile one column. WHD colors, original logos, localized content and #benefits/#partners anchors are retained. Unused registry demo/map files were removed. Verified RU/KK/EN at 320, 390, 768 and 1440 px; fixed tablet overflow by using two columns. TypeScript, component ESLint and local production build passed. Screenshot: output/bento/desktop.png.

## FAQ — Watermelon faq-6

Installed the requested faq-6 registry block. Adapted the split layout with a heading/contact link on the left and ten numbered accordion questions on the right. Preserved all existing RU/KK/EN answers and markup links; the former category filters are replaced by the complete question list. Existing Radix accordion is reused with single-open/collapsible behavior, plus/minus indicators and thin keyboard focus. WHD dark surfaces, pink accents and subtle dashed row separators replace the demo outer border. Mobile stacks the heading above the list. Checked keyboard activation, single-open behavior, Telegram answer link, 320/390/768/1440 px and RU/KK/EN text. TypeScript, targeted ESLint and local production build passed. Screenshot: output/faq/desktop.png.

Gallery asset update: the user's three additional photographs now replace repeated frames. All six photos are available in the viewer; new WebP assets total 747,322 bytes.

## Footer — Watermelon footer-2

Installed the user-selected footer-2 registry block and adapted its two-panel composition: purple brand panel with logo, closing invitation and four social links; dark navigation panel with six section anchors, legal links, copyright and registration action. The template newsletter form is replaced by the existing functional login/dashboard action. Existing registration-open/closed behavior, link URLs and localized labels are preserved. New group headings are translated for RU/KK/EN. Mobile stacks the panels; compact widths move legal links below navigation, and 320 px uses a single navigation column for readable Russian words. Existing shared Button/Input components were retained. TypeScript, targeted ESLint and production build passed. Desktop, tablet and phone checked; screenshot: output/footer/desktop.png.

## Closing CTA — Watermelon cta-4

Added the requested cta-4 block between FAQ and footer. Its phone mockup is replaced by the real hero mascot with the same neon watch countdown, eye animation and thin purple treatment. HeroMascot is shared by both placements; the hero retains its existing sizing/priority, while the closing CTA uses a lazy image and scoped dimensions. Both countdowns use the server-provided registration deadline (default end of 20 October 2026 in Astana). Closing CTA follows nextStep routes and changes to the closed-registration state on expiry, including hiding the onboarding action after closure. Dark purple panel with subtle hex grid, text/action on the left, mascot on the right; mobile stacks copy/action above mascot. RU/KK/EN supported. TypeScript, targeted ESLint and local production build passed. Desktop and mobile visually checked; both timers showed matching values and updated. Hero rechecked at 320 px after extraction. Screenshot: output/cta/desktop.png.

## Landing-wide Totally Spies styling — 2026-10-13

User requested the entire landing to match the hero. Added a scoped spy-theme.css after landing.css: Montserrat italic display headings, asymmetric gadget shells, pink gradient actions with dark circular lime arrows, luminous date/time accents, and low-opacity hex grids in selected panels. Facts, challenge cards, date blocks, schedule, bento, photo frames, FAQ, closing CTA and footer now share this language. User-provided flower sprites decorate small section labels and the challenge panel; sponsor logos and photo colors remain intact. No extra continuous animation was added. Existing hover effects respect reduced motion. Shared application/auth styles are unchanged.

Visual checks: desktop 1440 px and mobile 320/390 px, Russian and Kazakh narrow-screen copy, English desktop. Fixed schedule min-content overflow by stacking time above event names below 1024 px. Fixed the decorative challenge flower extending beyond the narrow container. Mobile gallery heading/action remains clear of the rotated photos. Local production build passed. Screenshots: output/spy-theme/desktop.png and output/spy-theme/footer.png.

## FAQ showcase and full page — 2026-10-13

The supplied split FAQ reference informs the structure: an illustrated left panel and five separate accordion cards on the right. The landing shows participation, experience, team, registration and online-format questions, with “Все вопросы” linking to /faq and the existing Telegram contact. The public /faq route contains all ten existing localized answers, a home link and language controls. The supplied mascot is stored as a 45 KB WebP. Pink/purple styling, hex grid and soft corners intentionally follow the approved WHD theme rather than the reference’s gold palette. Mobile stacks the illustration/actions above the questions; full-page sidebar stays sticky only on desktop.

## Account pages — 2026-10-13

Login and dashboard now use the approved WHD language: Montserrat italic display, pink gadget buttons, purple filled panels, subtle hex grids and the supplied FAQ mascot. AccountShell reuses AuthHeader and supplies legal/FAQ navigation. AuthCard accepts an optional illustration slot for split login/OTP layouts; its existing onboarding/invite layout is preserved. All form controls still use Button, Input, Field and existing validation.

DashboardLayout places the greeting, profile action and three real status facts above the team area. Team management is the main column; optional CV and FAQ/contact form the secondary column. NoTeamCard retains both create/join forms and name generation. TeamCard now shows readable member names, roles, initials, available slots and a labeled invite field. On narrow phones member actions move below names. Existing login redirects, Google/OTP operations, registration checks, team callbacks and CV requests remain intact. RU/EN/KK additions cover only new introductory labels.

Responsive checks: 320/390/768/1440 px. No persistent decorative animation; form/feedback transitions respect reduced motion. No new UI dependency. Proof: output/account-redesign/login.png and dashboard.png (local component fixtures).

## Base UI and lint migration, 2026-10-14

The app now uses shadcn Base UI with the Nova registry configuration. The b0
TanStack Start reference was generated outside this repository. Its Inter font
was not adopted; WHD fonts, Kazakh glyph coverage, assets, content, section order,
and custom grids remain. Earlier notes about Radix and native dialogs describe
the implementation before this migration.

Shared controls use semantic tokens mapped to the existing WHD palette. Appearance
belongs in component variants or owned CSS. All six shadcnlint rules are errors,
including UI internals; call sites may use layout classes. Runtime gallery and
flower offsets use CSS custom properties. Reduced motion removes movement.

Both accordion compositions use Base UI value arrays and single-open behavior.
Admin tables use TanStack Table v9 for sorting and visibility while retaining
all rows, search, CSV, counts, and attendance behavior. No pagination or selection
was added. The confirmation and gallery dialog behavior is specified above.

## Hero performance, 2026-10-14

The mascot illustration now has static eye colors and glow. Two cropped SVG images
reuse the supplied artwork for bright and dim eye states; the small overlays
crossfade with CSS opacity on the existing 4.8-second cycle. Reduced motion keeps
the base glow and loads no eye overlays. HeroMascot shares this behavior with the
closing CTA. The mobile title and action own their stacking order so the hex grid
stays behind them.

The flower pool is created only when a fine pointer with hover is available and
reduced motion is off. Preference changes release or recreate the pool; decoding
from a discarded pool cannot activate a replacement. The 16-particle cap, cursor
spacing, duration and cleanup behavior are retained.

The official `.agents/skills/shadcn` skill is pinned in `SOURCE.md`. Use its
`--dry-run`/`--diff` workflow for updates. Run `pnpm exec vp check`, the behavior
tests, and the production build. See `docs/shadcn-migration.md` and the latest
entry in `design-qa.md` for validation evidence. No permanent preview route exists.

## Component composition after review, 2026-10-14

Use the canonical Field compound family for new recipes. Existing forms use the
FormField adapter for translated labels, required markers, hint/error IDs, and
control ARIA attributes. Button retains WHD aliases alongside upstream defaults
and icon sizes. Card supports size and CardAction; its header, content, and
footer are siblings, with descriptions inside headers. Owned variants retain
account spacing.

Admin column definitions own translated labels, accessors, sorting, and cells.
The shared renderer uses TanStack header groups and visible cells with stable
row IDs. Pending attendance state must not recreate cell component identities,
so confirmation focus can return to the same checkbox after an update.

Confirmation content scrolls inside its capped height. Enabled hidden-column
controls and field hints use muted-foreground rather than the dim decorative
token. The review-fix evidence is recorded in design-qa.md.

## Hero button hover, 2026-10-14

The hero CTA loads its account route on activation. Repeated pointer entry and
keyboard focus do not preload account access checks. The gradient, skewed casing,
hover lift and brighter glow remain; two static shadow layers crossfade through
opacity over 180ms. Reduced motion keeps the glow feedback without the lift.

Flowers use fixed boxes with transforms for position and scale. Their 100:91
aspect ratio, displayed widths of 20 to 50px, drift, duration and 16-particle cap
are preserved. Position wrappers keep cursor offsets outside the burst animation;
the decorative layer is contained and never intercepts clicks.

The CTA's interactive area stays fixed on hover and press. Only the nested
hero-cta-surface moves; its decorative descendants ignore pointer events. Apply
hover and active states from the link so lifting the surface cannot repeatedly
remove the cursor from the hit area. The skew, glow and lift remain visible.

The hero surface uses a transform transition. Only fine pointers with hover and
motion enabled reserve compositor layers for the surface and its two glow layers.
Touch devices have no hover lift; keyboard focus shows the brighter glow and focus
outline. Reduced motion disables movement and transitions without reserving layers.
