/**
 * MakonTV i18n Module — RU/UZ bilingual support
 * Translates all UI text by walking the DOM and replacing Russian text with Uzbek equivalents.
 */
(function() {
  'use strict';

  const translations = {
    // ═══ NAV & COMMON ═══
    'Главная': 'Bosh sahifa',
    'Фильмы': 'Filmlar',
    'Сериалы': 'Seriallar',
    'Войти': 'Kirish',
    'Профиль': 'Profil',
    'Моё': 'Meniki',
    'PREMIUM': 'PREMIUM',

    // ═══ HERO / HOME ═══
    'Все': 'Hammasi',
    'ТВ': 'TV',
    'Мультфильмы': 'Multfilmlar',
    'Смотреть': 'Ko\'rish',
    'Подробнее': 'Batafsil',
    'Смотри без рекламы и в 4K': 'Reklmasiz va 4K sifatda ko\'ring',
    'Подключи подписку MakonTV Premium — контент без ограничений': 'MakonTV Premium obunasini ulang — cheksiz kontent',
    'Выбрать тариф': 'Tarifni tanlash',
    'Продолжить просмотр': 'Ko\'rishni davom ettirish',
    'Рекомендации': 'Tavsiyalar',
    'Популярное': 'Mashhur',
    'Новинки': 'Yangiliklar',
    'Трейлеры': 'Treylerlar',
    'Узбекское кино': 'O\'zbek kinosi',
    'Топ-10 за неделю': 'Haftalik Top-10',

    // ═══ MOVIE DETAIL ═══
    'Тень Самарканда': 'Samarqand soyasi',
    'Триллер': 'Triller',
    'Детектив': 'Detektiv',
    'Драма': 'Drama',
    'Боевики': 'Jangari',
    'Комедии': 'Komediyalar',
    'Фантастика': 'Fantastika',
    'Мелодрама': 'Melodrama',
    'Криминал': 'Kriminal',
    'Ужасы': 'Qo\'rqinchli',
    'Документальные': 'Hujjatli',
    'В избранное': 'Sevimlilarga',
    'В ролях': 'Rollarda',
    'О фильме': 'Film haqida',
    'Отзывы': 'Sharhlar',
    'Похожие': 'O\'xshashlar',
    'Режиссёр': 'Rejissyor',
    'Год': 'Yil',
    'Жанр': 'Janr',
    'Страна': 'Davlat',
    'Возраст': 'Yosh',
    'Качество': 'Sifat',
    'Субтитры': 'Subtitrlar',
    'Аудио': 'Audio',
    'Длительность': 'Davomiyligi',
    'Узбекистан': 'O\'zbekiston',
    'Все права защищены.': 'Barcha huquqlar himoyalangan.',
    'Загадочные исчезновения в древнем Самарканде приводят молодого следователя к тайнам, скрытым веками. Сплетение прошлого и настоящего раскрывает истину, способную изменить судьбы миллионов.': 'Qadimiy Samarqanddagi sirli yo\'qolishlar yosh tergovchini asrlar davomida yashirilgan sirlarga olib keladi. O\'tmish va hozirgi zamonnning chirmashishi millionlab odamlarning taqdirini o\'zgartira oladigan haqiqatni ochib beradi.',

    // ═══ SERIES DETAIL ═══
    'Код: Ташкент': 'Kod: Toshkent',
    'Сезон': 'Mavsum',
    'серий': 'qism',
    'серия': 'qism',
    '10 серий': '10 ta qism',
    'Серия': 'Qism',

    // ═══ NOTIFICATIONS ═══
    'Уведомления': 'Bildirishnomalar',
    'Прочитать все': 'Hammasini o\'qish',
    'Нет уведомлений': 'Bildirishnomalar yo\'q',

    // ═══ AUTH MODAL ═══
    'Вход': 'Kirish',
    'Регистрация': 'Ro\'yxatdan o\'tish',
    'Email или телефон': 'Email yoki telefon',
    'Пароль': 'Parol',
    'Забыли пароль?': 'Parolni unutdingizmi?',
    'Войти через Google': 'Google orqali kirish',
    'Нет аккаунта?': 'Hisobingiz yo\'qmi?',
    'Зарегистрироваться': 'Ro\'yxatdan o\'tish',
    'Имя': 'Ism',
    'Повторите пароль': 'Parolni takrorlang',
    'Создать аккаунт': 'Hisob yaratish',
    'Уже есть аккаунт?': 'Hisobingiz bormi?',

    // ═══ SEARCH ═══
    'Поиск фильмов, сериалов, актёров...': 'Film, serial, aktyor qidirish...',
    'Популярные запросы:': 'Mashhur so\'rovlar:',
    'Ничего не найдено': 'Hech narsa topilmadi',
    'результатов для': 'natija topildi:',
    'Попробуйте изменить запрос или проверить написание': 'So\'rovni o\'zgartiring yoki yozilishini tekshiring',

    // ═══ PROFILE / SETTINGS ═══
    'Настройки': 'Sozlamalar',
    'Личные данные': 'Shaxsiy ma\'lumotlar',
    'Безопасность': 'Xavfsizlik',
    'Подписка и тарифы': 'Obuna va tariflar',
    'Управлять подпиской': 'Obunani boshqarish',
    'Скачанные': 'Yuklab olingan',
    'Пригласить друга': 'Do\'stni taklif qilish',
    'Профили': 'Profillar',
    'Язык и субтитры': 'Til va subtitrlar',
    'Выйти из аккаунта': 'Hisobdan chiqish',
    'Гость': 'Mehmon',
    'Аккаунт': 'Hisob',
    'Тариф': 'Tarif',
    'Активна': 'Faol',
    'Premium — активна': 'Premium — faol',
    'Мадина Каримова': 'Madina Karimova',
    'madina@mail.uz': 'madina@mail.uz',
    'Редактировать': 'Tahrirlash',

    // ═══ PERSONAL DATA ═══
    'Фамилия': 'Familiya',
    'Дата рождения': 'Tug\'ilgan sana',
    'Пол': 'Jins',
    'Мужской': 'Erkak',
    'Женский': 'Ayol',
    'Телефон': 'Telefon',
    'Сохранить': 'Saqlash',
    'Отмена': 'Bekor qilish',
    'Каримова': 'Karimova',
    'Мадина': 'Madina',

    // ═══ SECURITY ═══
    'Текущий пароль': 'Joriy parol',
    'Новый пароль': 'Yangi parol',
    'Подтверждение пароля': 'Parolni tasdiqlash',
    'Изменить пароль': 'Parolni o\'zgartirish',
    'Двухфакторная аутентификация': 'Ikki faktorli autentifikatsiya',
    'SMS-аутентификация': 'SMS-autentifikatsiya',
    'Активные сеансы': 'Faol seanslar',
    'Текущий сеанс': 'Joriy seans',
    'Ташкент, Узбекистан': 'Toshkent, O\'zbekiston',
    'Завершить': 'Tugatish',
    'Удалить аккаунт': 'Hisobni o\'chirish',
    'Все данные будут безвозвратно удалены': 'Barcha ma\'lumotlar qaytarib bo\'lmas tarzda o\'chiriladi',

    // ═══ PLANS ═══
    'Выберите тариф': 'Tarifni tanlang',
    'Базовый': 'Asosiy',
    'Стандарт': 'Standart',
    'Бесплатно': 'Bepul',
    '30 дней бесплатно': '30 kun bepul',
    'Текущий тариф': 'Joriy tarif',
    'Выбрать': 'Tanlash',
    'Лучший выбор': 'Eng yaxshi tanlov',
    'С рекламой': 'Reklama bilan',
    'Без рекламы': 'Reklmasiz',
    'HD качество': 'HD sifat',
    '4K + HDR': '4K + HDR',
    '1 устройство': '1 qurilma',
    '3 устройства': '3 qurilma',
    '5 устройств': '5 qurilma',
    'Без скачивания': 'Yuklab olish yo\'q',
    'До 5 профилей': '5 tagacha profil',
    '4 профиля': '4 profil',
    '5 профилей': '5 profil',
    '29 000 сум/мес': '29 000 so\'m/oy',
    '0 сум': '0 so\'m',
    'Все возможности Premium': 'Premium ning barcha imkoniyatlari',

    // ═══ CHECKOUT ═══
    'Оформление подписки': 'Obunani rasmiylashtirish',
    'Ваш заказ': 'Sizning buyurtmangiz',
    'Способ оплаты': 'To\'lov usuli',
    'Банковская карта': 'Bank kartasi',
    'Номер карты': 'Karta raqami',
    'Срок': 'Muddat',
    'Оплатить': 'To\'lash',
    'Итого:': 'Jami:',

    // ═══ CATALOG ═══
    'Фильмы — каталог': 'Filmlar — katalog',
    'Сериалы — каталог': 'Seriallar — katalog',
    'Весь каталог': 'Barcha katalog',
    'Фильтры': 'Filtrlar',

    // ═══ PLAYER ═══
    'Автовоспроизведение': 'Avto ijro',
    'Авто': 'Avto',
    'Авто (4K)': 'Avto (4K)',
    'Русский': 'Ruscha',
    'Узбекский': 'O\'zbekcha',
    'Английский': 'Inglizcha',
    'Скорость': 'Tezlik',
    'Качество видео': 'Video sifati',

    // ═══ 404 ═══
    'Страница не найдена': 'Sahifa topilmadi',
    'Возможно, она была удалена или вы перешли по неверной ссылке': 'Ehtimol u o\'chirilgan yoki noto\'g\'ri havola orqali kirdingiz',
    'На главную': 'Bosh sahifaga',

    // ═══ LIBRARY ═══
    'Моя коллекция': 'Mening to\'plamim',
    'Избранное': 'Sevimlilar',
    'История': 'Tarix',
    'Пока пусто': 'Hozircha bo\'sh',
    'Добавляйте фильмы и сериалы в избранное, нажимая на закладку': 'Film va seriallarni xatcho\'p tugmasini bosib sevimlilarga qo\'shing',
    'Перейти в каталог': 'Katalogga o\'tish',
    'Войдите, чтобы увидеть избранное': 'Sevimlilarni ko\'rish uchun kiring',

    // ═══ DOWNLOADS ═══
    'Загруженные файлы': 'Yuklab olingan fayllar',
    '3 загруженных файла': '3 ta yuklab olingan fayl',
    'Загружено': 'Yuklangan',
    'Удалить': 'O\'chirish',
    'Удалить всё': 'Hammasini o\'chirish',

    // ═══ REFERRAL ═══
    'Пригласите друзей': 'Do\'stlaringizni taklif qiling',
    'За каждого приглашённого друга, который оформит подписку, вы оба получите 7 дней бесплатного Premium': 'Obunaga yozilgan har bir taklif qilingan do\'stingiz uchun ikkalangiz ham 7 kunlik bepul Premium olasiz',
    'Ваша ссылка': 'Sizning havolangiz',
    'Копировать': 'Nusxalash',
    'Приглашённые друзья': 'Taklif qilingan do\'stlar',
    'Ваши награды': 'Mukofotlaringiz',
    '1 друг': '1 do\'st',
    '3 друга': '3 do\'st',
    '5 друзей': '5 do\'st',
    '+7 дней Premium': '+7 kun Premium',
    '+1 месяц Premium': '+1 oy Premium',
    '+3 месяца Premium': '+3 oy Premium',
    'Ссылка скопирована!': 'Havola nusxalandi!',
    'Поделиться': 'Ulashish',

    // ═══ PROFILES ═══
    'Кто смотрит?': 'Kim ko\'rmoqda?',
    'Добавить': 'Qo\'shish',
    'Детский': 'Bolalar',
    'Детский режим': 'Bolalar rejimi',
    'Динара': 'Dinara',

    // ═══ ONBOARDING ═══
    'Добро пожаловать в MakonTV!': 'MakonTV ga xush kelibsiz!',
    'Выберите жанры, которые вам нравятся, и мы подберём лучшие фильмы и сериалы': 'O\'zingiz yoqtirgan janrlarni tanlang, biz sizga eng yaxshi film va seriallarni tanlab beramiz',
    'Далее': 'Keyingi',
    'Готово': 'Tayyor',
    'Пропустить': 'O\'tkazib yuborish',

    // ═══ REVIEWS ═══
    'Написать отзыв': 'Sharh yozish',
    'Оценить': 'Baholash',
    '1 247 оценок': '1 247 ta baho',
    'Отличный фильм! Атмосфера Самарканда передана невероятно. Рекомендую!': 'Ajoyib film! Samarqand muhiti ajoyib tarzda tasvirlangan. Tavsiya qilaman!',
    'Сюжет держит в напряжении до последней минуты. Актёрская игра на высоте.': 'Syujet oxirgi daqiqagacha hayajonda ushlab turadi. Aktyor o\'yini yuqori darajada.',
    'Алишер К.': 'Alisher K.',
    'Достон Рахимов': 'Doston Raximov',
    '2 недели назад': '2 hafta oldin',

    // ═══ ACTORS ═══
    'Актёр': 'Aktyor',
    'Фильмография': 'Filmografiya',
    'фильмов и сериалов': 'film va seriallar',
    'Наград': 'Mukofotlar',
    'Азиз Каримов': 'Aziz Karimov',
    'Биография актёра. Родился в Ташкенте, окончил Театральный институт имени Островского. Снимался в более чем 20 фильмах, получил награду «Золотой Хумо» за лучшую мужскую роль.': 'Aktyor biografiyasi. Toshkentda tug\'ilgan, Ostrovskiy nomidagi Teatr institutini tugatgan. 20 dan ortiq filmda suratga tushgan, eng yaxshi erkak rol uchun «Oltin Humo» mukofotiga sazovor bo\'lgan.',

    // ═══ FOOTER ═══
    'Каталог': 'Katalog',
    'Помощь': 'Yordam',
    'Тарифы': 'Tariflar',
    'FAQ': 'FAQ',
    'Поддержка': 'Qo\'llab-quvvatlash',
    'ТВ-каналы': 'TV-kanallar',
    'Стриминговый сервис нового поколения. Смотрите фильмы, сериалы и ТВ-каналы в высоком качестве.': 'Yangi avlod striming xizmati. Film, serial va TV-kanallarni yuqori sifatda tomosha qiling.',
    '© 2025 MakonTV. Все права защищены.': '© 2025 MakonTV. Barcha huquqlar himoyalangan.',

    // ═══ TOAST / MISC ═══
    'Добавлено в избранное': 'Sevimlilarga qo\'shildi',
    'Ваши данные обновлены': 'Ma\'lumotlaringiz yangilandi',
    'Пароль изменён': 'Parol o\'zgartirildi',
    'Оплата прошла успешно!': 'To\'lov muvaffaqiyatli amalga oshirildi!',
    'Функция в разработке': 'Funksiya ishlab chiqilmoqda',
    'Профиль удалён': 'Profil o\'chirildi',

    // ═══ MISC CHIPS / FILTERS ═══
    'Показать ещё': 'Yana ko\'rsatish',
    'Свернуть': 'Yig\'ish',
    'Скопировано!': 'Nusxalandi!',
    'Назад': 'Orqaga',

    // ═══ CONTINUE WATCHING ═══
    'Серия 5 · 23:41': '5-qism · 23:41',
    'Серия 3 · 12:05': '3-qism · 12:05',

    // ═══ MOVIE DETAIL EXTENDED ═══
    'Первые 30 дней подписки бесплатно': 'Obunaning birinchi 30 kuni bepul',
    '2ч 18мин': '2s 18daq',

    // ═══ PLAYER CONTROLS ═══
    'Пауза': 'Pauza',
    'Воспроизвести': 'Ijro etish',
    'Полный экран': 'To\'liq ekran',
    'Громкость': 'Ovoz',
  };

  let currentLang = localStorage.getItem('makontv-lang') || 'ru';

  // Store original Russian text for reverting
  const originalTexts = new WeakMap();

  function getTextNodes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    const nodes = [];
    let node;
    while (node = walker.nextNode()) {
      if (node.textContent.trim()) nodes.push(node);
    }
    return nodes;
  }

  function translateNode(node, toLang) {
    if (!originalTexts.has(node)) {
      originalTexts.set(node, node.textContent);
    }

    if (toLang === 'ru') {
      node.textContent = originalTexts.get(node);
      return;
    }

    const original = originalTexts.get(node);
    let text = original;
    // Try exact match first
    const trimmed = text.trim();
    if (translations[trimmed]) {
      node.textContent = text.replace(trimmed, translations[trimmed]);
      return;
    }
    // Try partial replacements (for compound text)
    let changed = false;
    const sortedKeys = Object.keys(translations).sort((a, b) => b.length - a.length);
    for (const key of sortedKeys) {
      if (text.includes(key)) {
        text = text.split(key).join(translations[key]);
        changed = true;
      }
    }
    if (changed) node.textContent = text;
  }

  function translatePlaceholders(toLang) {
    const placeholders = {
      'Email или телефон': 'Email yoki telefon',
      'Поиск фильмов, сериалов, актёров...': 'Film, serial, aktyor qidirish...',
      'Пароль': 'Parol',
      'Повторите пароль': 'Parolni takrorlang',
      'Имя': 'Ism',
      'Текущий пароль': 'Joriy parol',
      'Новый пароль': 'Yangi parol',
      'Подтверждение пароля': 'Parolni tasdiqlash',
      'Номер карты': 'Karta raqami',
      'Срок': 'Muddat',
    };
    document.querySelectorAll('[placeholder]').forEach(el => {
      if (!el.dataset.origPlaceholder) el.dataset.origPlaceholder = el.placeholder;
      if (toLang === 'ru') {
        el.placeholder = el.dataset.origPlaceholder;
      } else {
        const orig = el.dataset.origPlaceholder;
        if (placeholders[orig]) el.placeholder = placeholders[orig];
      }
    });
  }

  function translatePage(lang) {
    currentLang = lang;
    localStorage.setItem('makontv-lang', lang);
    document.documentElement.lang = lang === 'uz' ? 'uz' : 'ru';

    const textNodes = getTextNodes(document.body);
    textNodes.forEach(n => translateNode(n, lang));
    translatePlaceholders(lang);

    // Sync all lang buttons
    document.querySelectorAll('.nav-lang-b, .ft-lang-b').forEach(b => {
      b.classList.toggle('active', b.textContent.trim() === lang.toUpperCase());
    });
  }

  function initI18n() {
    // Bind nav lang buttons
    document.querySelectorAll('.nav-lang-b, .ft-lang-b').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const lang = b.textContent.trim().toLowerCase();
        translatePage(lang);
      });
    });

    // Apply saved language if UZ
    if (currentLang === 'uz') {
      // Delay slightly so DOM is ready
      setTimeout(() => translatePage('uz'), 100);
    }
  }

  // Re-translate after SPA navigation
  const origGo = window.go;
  if (origGo) {
    window.go = function(page) {
      origGo(page);
      if (currentLang === 'uz') {
        setTimeout(() => translatePage('uz'), 50);
      }
    };
  }

  // Also observe DOM changes for dynamic content
  const observer = new MutationObserver((mutations) => {
    if (currentLang !== 'uz') return;
    let hasNew = false;
    mutations.forEach(m => {
      m.addedNodes.forEach(n => {
        if (n.nodeType === 1) hasNew = true;
      });
    });
    if (hasNew) {
      setTimeout(() => translatePage('uz'), 30);
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initI18n();
      observer.observe(document.body, { childList: true, subtree: true });
    });
  } else {
    initI18n();
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Expose for external use
  window.MakonI18n = { translatePage, currentLang: () => currentLang };
})();
