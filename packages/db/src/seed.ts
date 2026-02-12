/**
 * MakonTV Seed Script
 * Populates the database with content from the current frontend mocks.
 * Run: npm run seed (from packages/db)
 */
import 'dotenv/config';
import { createDb } from './index';
import {
  genres, persons, movies, series, seasons, episodes,
  movieGenres, seriesGenres, movieCast, seriesCast,
  plans, users, userProfiles, collections, collectionItems,
  notifications, favorites, watchHistory, reviews,
} from './schema';

async function seed() {
  console.log('🌱 Seeding MakonTV database...\n');
  const db = createDb();

  // ══════════════════════════════
  // 1. GENRES (from frontend filter chips)
  // ══════════════════════════════
  console.log('  → Genres');
  const genreData = [
    { slug: 'thriller', name: { ru: 'Триллер', uz: 'Triller' } },
    { slug: 'detective', name: { ru: 'Детектив', uz: 'Detektiv' } },
    { slug: 'drama', name: { ru: 'Драма', uz: 'Drama' } },
    { slug: 'action', name: { ru: 'Боевики', uz: 'Jangari' } },
    { slug: 'comedy', name: { ru: 'Комедии', uz: 'Komediyalar' } },
    { slug: 'scifi', name: { ru: 'Фантастика', uz: 'Fantastika' } },
    { slug: 'melodrama', name: { ru: 'Мелодрама', uz: 'Melodrama' } },
    { slug: 'crime', name: { ru: 'Криминал', uz: 'Kriminal' } },
    { slug: 'horror', name: { ru: 'Ужасы', uz: "Qo'rqinchli" } },
    { slug: 'documentary', name: { ru: 'Документальные', uz: 'Hujjatli' } },
  ];
  const insertedGenres = await db.insert(genres).values(
    genreData.map((g, i) => ({ ...g, sortOrder: i }))
  ).returning();
  const genreMap = Object.fromEntries(insertedGenres.map(g => [g.slug, g.id]));

  // ══════════════════════════════
  // 2. PERSONS (actors from frontend)
  // ══════════════════════════════
  console.log('  → Persons');
  const personData = [
    {
      name: { ru: 'Азиз Каримов', uz: 'Aziz Karimov' },
      bio: {
        ru: 'Биография актёра. Родился в Ташкенте, окончил Театральный институт имени Островского. Снимался в более чем 20 фильмах, получил награду «Золотой Хумо» за лучшую мужскую роль.',
        uz: "Aktyor biografiyasi. Toshkentda tug'ilgan, Ostrovskiy nomidagi Teatr institutini tugatgan. 20 dan ortiq filmda suratga tushgan, eng yaxshi erkak rol uchun «Oltin Humo» mukofotiga sazovor bo'lgan."
      },
      birthPlace: { ru: 'Ташкент, Узбекистан', uz: "Toshkent, O'zbekiston" },
    },
    { name: { ru: 'Малика Ибрагимова', uz: 'Malika Ibragimova' } },
    { name: { ru: 'Достон Рахимов', uz: 'Doston Raximov' } },
    { name: { ru: 'Нилуфар Усманова', uz: 'Nilufar Usmonova' } },
    { name: { ru: 'Бахтиёр Ташматов', uz: 'Baxtiyor Toshmatov' } },
  ];
  const insertedPersons = await db.insert(persons).values(personData).returning();

  // ══════════════════════════════
  // 3. MOVIES (from frontend mock data)
  // ══════════════════════════════
  console.log('  → Movies');
  const movieData = [
    {
      slug: 'ten-samarkanda',
      title: { ru: 'Тень Самарканда', uz: 'Samarqand soyasi' },
      description: {
        ru: 'Загадочные исчезновения в древнем Самарканде приводят молодого следователя к тайнам, скрытым веками. Сплетение прошлого и настоящего раскрывает истину, способную изменить судьбы миллионов. Фильм снят на натуре в исторических локациях Узбекистана с участием международной съёмочной группы.',
        uz: "Qadimiy Samarqanddagi sirli yo'qolishlar yosh tergovchini asrlar davomida yashirilgan sirlarga olib keladi."
      },
      shortDesc: {
        ru: 'Загадочные исчезновения в древнем Самарканде приводят молодого следователя к тайнам, скрытым веками.',
        uz: "Qadimiy Samarqanddagi sirli yo'qolishlar yosh tergovchini sirlarga olib keladi."
      },
      year: 2024,
      durationMin: 138,
      rating: '8.4',
      ratingCount: 1247,
      ageRating: '16+',
      country: { ru: 'Узбекистан', uz: "O'zbekiston" },
      quality: '4K',
      videoType: 'url',
      isPremium: true,
      isPublished: true,
      featured: true,
    },
    {
      slug: 'last-caravan',
      title: { ru: 'Последний караван', uz: "So'nggi karvon" },
      shortDesc: { ru: 'Эпическое путешествие по Шёлковому пути', uz: "Ipak yo'li bo'ylab epik sayohat" },
      year: 2024, durationMin: 120, rating: '7.8', ratingCount: 856,
      ageRating: '12+', country: { ru: 'Узбекистан', uz: "O'zbekiston" },
      quality: 'HD', isPublished: true,
    },
    {
      slug: 'aral-sea',
      title: { ru: 'Аральское море', uz: 'Orol dengizi' },
      shortDesc: { ru: 'Документальная история исчезающего моря', uz: "Yo'qolayotgan dengiz haqida hujjatli film" },
      year: 2023, durationMin: 95, rating: '8.1', ratingCount: 634,
      ageRating: '12+', quality: 'HD', isPublished: true,
    },
    {
      slug: 'bukhara-nights',
      title: { ru: 'Ночи Бухары', uz: 'Buxoro kechalari' },
      shortDesc: { ru: 'Мистический триллер в древнем городе', uz: 'Qadimiy shahardagi mistik triller' },
      year: 2024, durationMin: 112, rating: '7.5', ratingCount: 421,
      ageRating: '18+', quality: '4K', isPremium: true, isPublished: true,
    },
    {
      slug: 'fergana-valley',
      title: { ru: 'Ферганская долина', uz: "Farg'ona vodiysi" },
      shortDesc: { ru: 'Семейная драма на фоне великих перемен', uz: "Katta o'zgarishlar fonidagi oilaviy drama" },
      year: 2023, durationMin: 105, rating: '7.9', ratingCount: 712,
      ageRating: '16+', quality: 'HD', isPublished: true,
    },
    {
      slug: 'tashkent-express',
      title: { ru: 'Ташкент Экспресс', uz: 'Toshkent Ekspress' },
      shortDesc: { ru: 'Динамичный боевик в сердце столицы', uz: "Poytaxt qalbidagi dinamik jangari film" },
      year: 2024, durationMin: 98, rating: '7.2', ratingCount: 389,
      ageRating: '16+', quality: '4K', isPublished: true,
    },
  ];
  const insertedMovies = await db.insert(movies).values(movieData).returning();
  const movieMap = Object.fromEntries(insertedMovies.map(m => [m.slug, m.id]));

  // Movie-Genre associations
  const mgLinks = [
    { movie: 'ten-samarkanda', genres: ['thriller', 'detective', 'drama'] },
    { movie: 'last-caravan', genres: ['drama', 'action'] },
    { movie: 'aral-sea', genres: ['documentary', 'drama'] },
    { movie: 'bukhara-nights', genres: ['thriller', 'horror'] },
    { movie: 'fergana-valley', genres: ['drama', 'melodrama'] },
    { movie: 'tashkent-express', genres: ['action', 'crime'] },
  ];
  for (const link of mgLinks) {
    for (const g of link.genres) {
      await db.insert(movieGenres).values({
        movieId: movieMap[link.movie],
        genreId: genreMap[g],
      });
    }
  }

  // Movie-Cast associations
  await db.insert(movieCast).values([
    { movieId: movieMap['ten-samarkanda'], personId: insertedPersons[0].id, role: 'actor', characterName: { ru: 'Следователь Камол', uz: 'Tergovchi Kamol' }, sortOrder: 0 },
    { movieId: movieMap['ten-samarkanda'], personId: insertedPersons[1].id, role: 'actor', sortOrder: 1 },
    { movieId: movieMap['ten-samarkanda'], personId: insertedPersons[2].id, role: 'director', sortOrder: 0 },
    { movieId: movieMap['last-caravan'], personId: insertedPersons[0].id, role: 'actor', sortOrder: 0 },
    { movieId: movieMap['bukhara-nights'], personId: insertedPersons[3].id, role: 'actor', sortOrder: 0 },
  ]);

  // ══════════════════════════════
  // 4. SERIES (from frontend: "Код: Ташкент")
  // ══════════════════════════════
  console.log('  → Series');
  const seriesData = [
    {
      slug: 'kod-tashkent',
      title: { ru: 'Код: Ташкент', uz: 'Kod: Toshkent' },
      description: {
        ru: 'Криминальный триллер о хакере, который случайно раскрывает заговор в самом сердце столицы.',
        uz: "Poytaxt qalbidagi fitna-fasodni tasodifan fosh qilgan xaker haqida kriminal triller."
      },
      year: 2024, rating: '8.6', ratingCount: 2341,
      ageRating: '16+', quality: '4K',
      isPremium: true, isPublished: true, featured: true,
    },
    {
      slug: 'silk-road-secrets',
      title: { ru: 'Тайны Шёлкового пути', uz: "Ipak yo'li sirlari" },
      description: { ru: 'Исторический сериал о торговых путях Центральной Азии', uz: "Markaziy Osiyo savdo yo'llari haqida tarixiy serial" },
      year: 2023, rating: '7.9', ratingCount: 1105,
      ageRating: '12+', quality: 'HD', isPublished: true,
    },
  ];
  const insertedSeries = await db.insert(series).values(seriesData).returning();
  const seriesMap = Object.fromEntries(insertedSeries.map(s => [s.slug, s.id]));

  // Series-Genre
  await db.insert(seriesGenres).values([
    { seriesId: seriesMap['kod-tashkent'], genreId: genreMap['thriller'] },
    { seriesId: seriesMap['kod-tashkent'], genreId: genreMap['crime'] },
    { seriesId: seriesMap['silk-road-secrets'], genreId: genreMap['drama'] },
    { seriesId: seriesMap['silk-road-secrets'], genreId: genreMap['documentary'] },
  ]);

  // Series-Cast
  await db.insert(seriesCast).values([
    { seriesId: seriesMap['kod-tashkent'], personId: insertedPersons[4].id, role: 'actor', sortOrder: 0 },
    { seriesId: seriesMap['kod-tashkent'], personId: insertedPersons[3].id, role: 'actor', sortOrder: 1 },
  ]);

  // ══════════════════════════════
  // 5. SEASONS & EPISODES (from "Код: Ташкент" — 10 episodes)
  // ══════════════════════════════
  console.log('  → Seasons & Episodes');
  const [season1] = await db.insert(seasons).values({
    seriesId: seriesMap['kod-tashkent'],
    number: 1,
    title: { ru: 'Сезон 1', uz: '1-mavsum' },
  }).returning();

  const episodeTitles = [
    { ru: 'Пробуждение', uz: "Uyg'onish" },
    { ru: 'Сигнал', uz: 'Signal' },
    { ru: 'Шифр', uz: 'Shifr' },
    { ru: 'Преследование', uz: "Ta'qib" },
    { ru: 'Ловушка', uz: "Tuzoq" },
    { ru: 'Разоблачение', uz: 'Fosh etish' },
    { ru: 'Побег', uz: 'Qochish' },
    { ru: 'Союзник', uz: 'Ittifoqchi' },
    { ru: 'Противостояние', uz: 'Qarama-qarshilik' },
    { ru: 'Финал', uz: 'Final' },
  ];
  await db.insert(episodes).values(
    episodeTitles.map((t, i) => ({
      seasonId: season1.id,
      number: i + 1,
      title: t,
      durationMin: 42 + Math.floor(Math.random() * 15),
      isFree: i === 0,
    }))
  );

  // Season for Silk Road
  const [season1sr] = await db.insert(seasons).values({
    seriesId: seriesMap['silk-road-secrets'],
    number: 1,
    title: { ru: 'Сезон 1', uz: '1-mavsum' },
  }).returning();
  await db.insert(episodes).values(
    Array.from({ length: 8 }, (_, i) => ({
      seasonId: season1sr.id,
      number: i + 1,
      title: { ru: `Серия ${i + 1}`, uz: `${i + 1}-qism` },
      durationMin: 45 + Math.floor(Math.random() * 10),
      isFree: i === 0,
    }))
  );

  // ══════════════════════════════
  // 6. PLANS (from frontend pricing cards)
  // ══════════════════════════════
  console.log('  → Plans');
  await db.insert(plans).values([
    {
      slug: 'basic',
      name: { ru: 'Базовый', uz: 'Asosiy' },
      price: 0,
      priceLabel: { ru: 'Бесплатно', uz: 'Bepul' },
      features: [
        { ru: 'С рекламой', uz: 'Reklama bilan' },
        { ru: 'HD качество', uz: 'HD sifat' },
        { ru: '1 устройство', uz: '1 qurilma' },
        { ru: 'Без скачивания', uz: "Yuklab olish yo'q" },
      ],
      maxDevices: 1, maxProfiles: 1, hasAds: true, quality: 'HD',
      hasDownloads: false, sortOrder: 0,
    },
    {
      slug: 'standard',
      name: { ru: 'Стандарт', uz: 'Standart' },
      price: 29000,
      priceLabel: { ru: '29 000 сум/мес', uz: "29 000 so'm/oy" },
      features: [
        { ru: 'Без рекламы', uz: 'Reklmasiz' },
        { ru: '4K + HDR', uz: '4K + HDR' },
        { ru: '3 устройства', uz: '3 qurilma' },
        { ru: '4 профиля', uz: '4 profil' },
      ],
      maxDevices: 3, maxProfiles: 4, hasAds: false, quality: '4K',
      hasDownloads: true, isBest: true, sortOrder: 1,
    },
    {
      slug: 'premium',
      name: { ru: 'Premium', uz: 'Premium' },
      price: 49000,
      priceLabel: { ru: '49 000 сум/мес', uz: "49 000 so'm/oy" },
      features: [
        { ru: 'Все возможности Premium', uz: 'Premium ning barcha imkoniyatlari' },
        { ru: '5 устройств', uz: '5 qurilma' },
        { ru: 'До 5 профилей', uz: '5 tagacha profil' },
      ],
      maxDevices: 5, maxProfiles: 5, hasAds: false, quality: '4K+HDR',
      hasDownloads: true, sortOrder: 2,
    },
  ]);

  // ══════════════════════════════
  // 7. USERS (demo user from frontend)
  // ══════════════════════════════
  console.log('  → Users & Profiles');
  const [demoUser] = await db.insert(users).values({
    email: 'madina@mail.uz',
    name: { ru: 'Мадина Каримова', uz: 'Madina Karimova' },
    avatarLetter: 'М',
    gender: 'female',
    subscriptionStatus: 'active',
    referralCode: 'MADINA2024',
    role: 'user',
    language: 'ru',
  }).returning();

  await db.insert(userProfiles).values([
    { userId: demoUser.id, name: 'Мадина', isDefault: true },
    { userId: demoUser.id, name: 'Динара', isKids: false },
    { userId: demoUser.id, name: 'Детский', isKids: true },
  ]);

  // Admin user
  const [adminUser] = await db.insert(users).values({
    email: 'admin@makontv.uz',
    name: { ru: 'Администратор', uz: 'Administrator' },
    avatarLetter: 'А',
    role: 'admin',
    language: 'ru',
  }).returning();

  // ══════════════════════════════
  // 8. COLLECTIONS (home page carousels)
  // ══════════════════════════════
  console.log('  → Collections');
  const collData = [
    { slug: 'continue-watching', title: { ru: 'Продолжить просмотр', uz: "Ko'rishni davom ettirish" }, type: 'auto', sortOrder: 0 },
    { slug: 'trending', title: { ru: 'Популярное', uz: 'Mashhur' }, type: 'manual', sortOrder: 1 },
    { slug: 'new', title: { ru: 'Новинки', uz: 'Yangiliklar' }, type: 'auto_new', sortOrder: 2 },
    { slug: 'recommendations', title: { ru: 'Рекомендации', uz: 'Tavsiyalar' }, type: 'manual', sortOrder: 3 },
    { slug: 'top10', title: { ru: 'Топ-10 за неделю', uz: 'Haftalik Top-10' }, type: 'manual', sortOrder: 4 },
    { slug: 'uzbek-cinema', title: { ru: 'Узбекское кино', uz: "O'zbek kinosi" }, type: 'manual', sortOrder: 5 },
  ];
  const insertedColls = await db.insert(collections).values(collData).returning();
  const collMap = Object.fromEntries(insertedColls.map(c => [c.slug, c.id]));

  // Add movies to collections
  const allMovieIds = insertedMovies.map(m => m.id);
  for (const mid of allMovieIds) {
    await db.insert(collectionItems).values({ collectionId: collMap['trending'], movieId: mid, sortOrder: allMovieIds.indexOf(mid) });
    await db.insert(collectionItems).values({ collectionId: collMap['uzbek-cinema'], movieId: mid, sortOrder: allMovieIds.indexOf(mid) });
  }
  // Top-10 = first 6 movies + 2 series
  for (let i = 0; i < allMovieIds.length; i++) {
    await db.insert(collectionItems).values({ collectionId: collMap['top10'], movieId: allMovieIds[i], sortOrder: i });
  }
  await db.insert(collectionItems).values({ collectionId: collMap['top10'], seriesId: seriesMap['kod-tashkent'], sortOrder: 6 });
  await db.insert(collectionItems).values({ collectionId: collMap['top10'], seriesId: seriesMap['silk-road-secrets'], sortOrder: 7 });

  // ══════════════════════════════
  // 9. NOTIFICATIONS (from frontend dropdown)
  // ══════════════════════════════
  console.log('  → Notifications');
  await db.insert(notifications).values([
    {
      userId: demoUser.id, type: 'new_episode',
      title: { ru: 'Новая серия!', uz: 'Yangi qism!' },
      body: { ru: 'Код: Ташкент — Серия 6', uz: 'Kod: Toshkent — 6-qism' },
      iconType: 'play', actionUrl: '#series-detail',
    },
    {
      userId: demoUser.id, type: 'promo',
      title: { ru: 'Скидка 30%', uz: '30% chegirma' },
      body: { ru: 'на годовую подписку', uz: 'yillik obunaga' },
      iconType: 'gift', actionUrl: '#plans',
    },
    {
      userId: demoUser.id, type: 'new_movie',
      title: { ru: 'Новый фильм:', uz: 'Yangi film:' },
      body: { ru: 'Тень Самарканда', uz: 'Samarqand soyasi' },
      iconType: 'play', actionUrl: '#detail',
    },
    {
      userId: demoUser.id, type: 'promo',
      title: { ru: 'Пригласите друга —', uz: "Do'stingizni taklif qiling —" },
      body: { ru: '7 дней Premium', uz: '7 kun Premium' },
      iconType: 'gift', actionUrl: '#referral',
    },
  ]);

  // ══════════════════════════════
  // 10. WATCH HISTORY / FAVORITES (demo data)
  // ══════════════════════════════
  console.log('  → Watch History & Favorites');
  await db.insert(watchHistory).values([
    { userId: demoUser.id, movieId: movieMap['ten-samarkanda'], progressSec: 4200, durationSec: 8280, progressPct: '50.72' },
    { userId: demoUser.id, movieId: movieMap['last-caravan'], progressSec: 1800, durationSec: 7200, progressPct: '25.00' },
  ]);
  await db.insert(favorites).values([
    { userId: demoUser.id, movieId: movieMap['ten-samarkanda'] },
    { userId: demoUser.id, seriesId: seriesMap['kod-tashkent'] },
  ]);

  // ══════════════════════════════
  // 11. REVIEWS (from frontend)
  // ══════════════════════════════
  console.log('  → Reviews');
  await db.insert(reviews).values([
    { userId: demoUser.id, movieId: movieMap['ten-samarkanda'], rating: 5, text: 'Отличный фильм! Атмосфера Самарканда передана невероятно. Рекомендую!' },
  ]);

  console.log('\n✅ Seed complete!\n');
  console.log('   Genres:       ', insertedGenres.length);
  console.log('   Persons:      ', insertedPersons.length);
  console.log('   Movies:       ', insertedMovies.length);
  console.log('   Series:       ', insertedSeries.length);
  console.log('   Collections:  ', insertedColls.length);
  console.log('   Users:         2 (demo + admin)');
  console.log('');
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
