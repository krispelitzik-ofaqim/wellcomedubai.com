// ===== DATABASE (localStorage) =====
const DB_KEY = 'dubai_guide_db';

const DEFAULT_DATA = {
  hotels: [
    { id:1, name:"Burj Al Arab", nameEn:"Burj Al Arab", category:"hotels", subcategory:"luxury", description:"המלון האייקוני ביותר בדובאי, בצורת מפרש. חוויית יוקרה ברמה הגבוהה ביותר עם שירות אישי, מסעדות עילית ונוף מדהים.", image:"https://images.pexels.com/photos/31692133/pexels-photo-31692133.jpeg", rating:4.9, price:"$$$$$", priceRange:"₪3,000-25,000 / $820-6,800 ללילה", address:"Jumeirah Beach Road", lat:25.1412, lng:55.1855, phone:"+971-4-301-7777", tags:["יוקרה","חוף","מסעדות"], featured:true },
    { id:2, name:"Atlantis The Palm", nameEn:"Atlantis The Palm", category:"hotels", subcategory:"luxury", description:"מלון ענק על אי הפאלם עם פארק מים, אקוריום ומסעדות של שפים בינלאומיים. מושלם למשפחות.", image:"https://images.pexels.com/photos/31692135/pexels-photo-31692135.jpeg", rating:4.7, price:"$$$$", priceRange:"₪1,500-8,000 / $410-2,180 ללילה", address:"The Palm Jumeirah", lat:25.1304, lng:55.1171, phone:"+971-4-426-2000", tags:["משפחות","פארק מים","חוף"], featured:true },
    { id:3, name:"JW Marriott Marquis", nameEn:"JW Marriott Marquis", category:"hotels", subcategory:"business", description:"אחד המלונות הגבוהים בעולם. מיקום מרכזי ליד ה-Business Bay עם מסעדות ובריכה מדהימה.", image:"https://images.pexels.com/photos/31692134/pexels-photo-31692134.jpeg", rating:4.6, price:"$$$", priceRange:"₪600-2,500 / $165-680 ללילה", address:"Business Bay", lat:25.1867, lng:55.2625, phone:"+971-4-414-3000", tags:["עסקים","מרכזי","בריכה"], featured:false },
    { id:4, name:"Rove Downtown", nameEn:"Rove Downtown", category:"hotels", subcategory:"budget", description:"מלון בוטיק מודרני במחיר נגיש, ממש ליד ה-Dubai Mall וברג' חליפה. אידיאלי לזוגות צעירים.", image:"https://images.pexels.com/photos/30063501/pexels-photo-30063501.jpeg", rating:4.3, price:"$$", priceRange:"₪250-600 / $70-165 ללילה", address:"Downtown Dubai", lat:25.1972, lng:55.2744, phone:"+971-4-561-9999", tags:["תקציבי","מרכזי","זוגות"], featured:false },
    { id:5, name:"Caesars Palace Dubai", nameEn:"Caesars Palace Dubai", category:"hotels", subcategory:"luxury", description:"סניף דובאי של הרשת המפורסמת. חוף פרטי, בריכות מדהימות ואווירת קזינו.", image:"https://images.pexels.com/photos/28940115/pexels-photo-28940115.jpeg", rating:4.5, price:"$$$$", priceRange:"₪1,000-5,000 / $275-1,360 ללילה", address:"Bluewaters Island", lat:25.0802, lng:55.1198, phone:"+971-4-556-6666", tags:["יוקרה","חוף","בידור"], featured:true },
    { id:6, name:"Armani Hotel Dubai", nameEn:"Armani Hotel Dubai", category:"hotels", subcategory:"luxury", description:"ממוקם בתוך ברג' חליפה עצמו. עיצוב של ג'ורג'ו ארמאני, חוויה אלגנטית ייחודית.", image:"https://images.pexels.com/photos/29105132/pexels-photo-29105132.jpeg", rating:4.8, price:"$$$$$", priceRange:"₪2,000-15,000 / $545-4,090 ללילה", address:"Burj Khalifa, Downtown", lat:25.1972, lng:55.2744, phone:"+971-4-888-3888", tags:["יוקרה","עיצוב","מרכזי"], featured:true },
  ],
  restaurants: [
    { id:101, name:"Nobu Dubai", nameEn:"Nobu Dubai", category:"restaurants", subcategory:"asian", description:"סניף דובאי של רשת המסעדות היפנית היוקרתית של שף נובו מאצוהיסה. סושי ומנות יפניות ברמה הגבוהה ביותר.", image:"https://images.pexels.com/photos/33669490/pexels-photo-33669490.jpeg", rating:4.8, price:"$$$$", priceRange:"400-800 ₪ לזוג", address:"Atlantis The Palm", lat:25.1304, lng:55.1171, phone:"+971-4-426-2626", tags:["יפני","סושי","יוקרה"], featured:true },
    { id:102, name:"Al Fanar", nameEn:"Al Fanar", category:"restaurants", subcategory:"local", description:"מסעדה אמיראתית מסורתית עם עיצוב ביתי אותנטי. טעמו את המטבח המקומי האמיתי של דובאי.", image:"https://images.pexels.com/photos/33953639/pexels-photo-33953639.jpeg", rating:4.5, price:"$$", priceRange:"100-250 ₪ לזוג", address:"Festival City Mall", lat:25.2243, lng:55.3524, phone:"+971-4-232-9966", tags:["אמיראתי","מסורתי","משפחות"], featured:true },
    { id:103, name:"Zuma Dubai", nameEn:"Zuma Dubai", category:"restaurants", subcategory:"asian", description:"מסעדה יפנית עכשווית ברמה עולמית. הברנץ' של יום שישי מפורסם בכל דובאי.", image:"https://images.pexels.com/photos/31989816/pexels-photo-31989816.jpeg", rating:4.7, price:"$$$$", priceRange:"500-1,000 ₪ לזוג", address:"DIFC, Gate Village", lat:25.2135, lng:55.2825, phone:"+971-4-425-5660", tags:["יפני","ברנץ","יוקרה"], featured:false },
    { id:104, name:"Ravi Restaurant", nameEn:"Ravi Restaurant", category:"restaurants", subcategory:"budget", description:"מסעדה פקיסטנית אגדית שפועלת מ-1978. אוכל מדהים במחירי רצפה - סוד מקומי.", image:"https://images.pexels.com/photos/31023337/pexels-photo-31023337.jpeg", rating:4.3, price:"$", priceRange:"30-70 ₪ לזוג", address:"Satwa", lat:25.2256, lng:55.2688, phone:"+971-4-331-5353", tags:["פקיסטני","תקציבי","מקומי"], featured:false },
    { id:105, name:"Pierchic", nameEn:"Pierchic", category:"restaurants", subcategory:"seafood", description:"מסעדת פירות ים על רציף מעל הים. נוף מהמם לשקיעה ומנות דגים מעולות.", image:"https://images.pexels.com/photos/31023334/pexels-photo-31023334.jpeg", rating:4.6, price:"$$$$", priceRange:"500-900 ₪ לזוג", address:"Al Qasr Hotel, Jumeirah", lat:25.1345, lng:55.1842, phone:"+971-4-432-3232", tags:["פירות ים","רומנטי","שקיעה"], featured:true },
    { id:106, name:"Operation Falafel", nameEn:"Operation Falafel", category:"restaurants", subcategory:"local", description:"רשת מסעדות לבנונית-ערבית מעולה עם פלאפל, חומוס ושווארמה ברמה גבוהה.", image:"https://images.pexels.com/photos/31023335/pexels-photo-31023335.jpeg", rating:4.2, price:"$", priceRange:"40-100 ₪ לזוג", address:"סניפים בכל דובאי", lat:25.2048, lng:55.2708, phone:"+971-4-222-2111", tags:["לבנוני","פלאפל","תקציבי"], featured:false },
  ],
  attractions: [
    { id:201, name:"ברג' חליפה", nameEn:"Burj Khalifa", category:"attractions", subcategory:"landmark", description:"הבניין הגבוה בעולם (828 מטר). עלו לתצפית בקומה 148 לנוף פנורמי עוצר נשימה של דובאי כולה.", image:"https://images.pexels.com/photos/29470840/pexels-photo-29470840.jpeg", rating:4.9, price:"$$", priceRange:"₪149-399 / $40-109", address:"Downtown Dubai", lat:25.1972, lng:55.2744, phone:"+971-4-888-8888", tags:["תצפית","סמל","חובה"], featured:true },
    { id:202, name:"Dubai Mall", nameEn:"Dubai Mall", category:"attractions", subcategory:"shopping", description:"הקניון הגדול בעולם עם מעל 1,200 חנויות, אקוריום, מפל מים ומשטח החלקה על הקרח.", image:"https://images.pexels.com/photos/34422333/pexels-photo-34422333.jpeg", rating:4.7, price:"חינם", priceRange:"כניסה חינם", address:"Downtown Dubai", lat:25.1985, lng:55.2796, phone:"+971-4-362-7500", tags:["קניות","משפחות","חינם"], featured:true },
    { id:203, name:"Palm Jumeirah", nameEn:"Palm Jumeirah", category:"attractions", subcategory:"landmark", description:"האי המלאכותי המפורסם בצורת דקל. חופים, מלונות יוקרה ונסיעה במונורייל עם נוף מדהים.", image:"https://images.pexels.com/photos/28839741/pexels-photo-28839741.jpeg", rating:4.6, price:"$", priceRange:"₪25 / $7 מונורייל", address:"Palm Jumeirah", lat:25.1124, lng:55.1390, phone:"", tags:["אי","חוף","מונורייל"], featured:true },
    { id:204, name:"Dubai Frame", nameEn:"Dubai Frame", category:"attractions", subcategory:"landmark", description:"מסגרת זהב ענקית בגובה 150 מטר. תצפית 360 על דובאי הישנה והחדשה.", image:"https://images.pexels.com/photos/35665804/pexels-photo-35665804.jpeg", rating:4.5, price:"$", priceRange:"₪50 / $14", address:"Zabeel Park", lat:25.2346, lng:55.3005, phone:"+971-4-354-6666", tags:["תצפית","צילום","חדש"], featured:false },
    { id:205, name:"מוזיאון העתיד", nameEn:"Museum of the Future", category:"attractions", subcategory:"museum", description:"אחד הבניינים היפים בעולם עם תערוכות אינטראקטיביות על טכנולוגיות העתיד.", image:"https://images.pexels.com/photos/29353238/pexels-photo-29353238.jpeg", rating:4.8, price:"$$", priceRange:"₪149 / $40", address:"Sheikh Zayed Road", lat:25.2196, lng:55.2806, phone:"+971-4-554-0049", tags:["מוזיאון","טכנולוגיה","ארכיטקטורה"], featured:true },
    { id:206, name:"ספארי מדבר", nameEn:"Desert Safari", category:"attractions", subcategory:"adventure", description:"חוויה בלתי נשכחת: נסיעת שטח בדיונות, רכיבה על גמלים, BBQ בדואי וריקודי בטן.", image:"https://images.pexels.com/photos/14750485/pexels-photo-14750485.jpeg", rating:4.7, price:"$$", priceRange:"₪150-350 / $40-95", address:"Dubai Desert", lat:25.0500, lng:55.4000, phone:"", tags:["מדבר","הרפתקה","שקיעה"], featured:true },
  ],
  shopping: [
    { id:301, name:"Dubai Mall", nameEn:"Dubai Mall", category:"shopping", subcategory:"mall", description:"הקניון הגדול בעולם! מעל 1,200 חנויות, אקוריום, החלקה על קרח, ומזרקת דובאי.", image:"https://images.pexels.com/photos/34422333/pexels-photo-34422333.jpeg", rating:4.8, price:"$-$$$$$", priceRange:"כל טווח מחירים", address:"Downtown Dubai", lat:25.1985, lng:55.2796, tags:["קניון","יוקרה","משפחות"], featured:true },
    { id:302, name:"Gold Souk", nameEn:"Gold Souk", category:"shopping", subcategory:"souk", description:"שוק הזהב המפורסם של דובאי. מאות חנויות תכשיטים במחירים תחרותיים.", image:"https://images.pexels.com/photos/31023333/pexels-photo-31023333.jpeg", rating:4.5, price:"$$-$$$$", priceRange:"תלוי בקנייה", address:"Deira", lat:25.2867, lng:55.2968, tags:["זהב","תכשיטים","מסורתי"], featured:true },
    { id:303, name:"Mall of the Emirates", nameEn:"Mall of the Emirates", category:"shopping", subcategory:"mall", description:"קניון ענק עם Ski Dubai - מתחם סקי מקורה בלב המדבר!", image:"https://images.pexels.com/photos/33669696/pexels-photo-33669696.jpeg", rating:4.6, price:"$$-$$$$", priceRange:"כל טווח מחירים", address:"Sheikh Zayed Road", lat:25.1181, lng:55.2005, tags:["קניון","סקי","בידור"], featured:true },
    { id:304, name:"Spice Souk", nameEn:"Spice Souk", category:"shopping", subcategory:"souk", description:"שוק התבלינים ההיסטורי. ריחות מדהימים ותבלינים מכל העולם.", image:"https://images.pexels.com/photos/10619941/pexels-photo-10619941.jpeg", rating:4.3, price:"$", priceRange:"זול מאוד", address:"Deira", lat:25.2696, lng:55.2988, tags:["תבלינים","מסורתי","שוק"], featured:false },
  ],
  nightlife: [
    { id:401, name:"White Dubai", nameEn:"White Dubai", category:"nightlife", subcategory:"club", description:"אחד המועדונים הכי מפורסמים בדובאי. מוזיקה, DJ-ים בינלאומיים ואווירה מטורפת.", image:"https://images.pexels.com/photos/14749819/pexels-photo-14749819.jpeg", rating:4.5, price:"$$$", priceRange:"₪200-500 / $55-136", address:"Meydan Racecourse", lat:25.1665, lng:55.3052, tags:["מועדון","DJ","לילה"], featured:true },
    { id:402, name:"Atmosphere Lounge", nameEn:"Atmosphere Lounge", category:"nightlife", subcategory:"lounge", description:"בר בקומה 122 של ברג' חליפה. קוקטיילים בגובה - פשוטו כמשמעו.", image:"https://images.pexels.com/photos/14749788/pexels-photo-14749788.jpeg", rating:4.7, price:"$$$$", priceRange:"₪300-700 / $82-190", address:"Burj Khalifa, Floor 122", lat:25.1972, lng:55.2744, tags:["בר","תצפית","יוקרה"], featured:true },
    { id:403, name:"Ain Dubai (גלגל ענק)", nameEn:"Ain Dubai", category:"nightlife", subcategory:"entertainment", description:"הגלגל הענק הגבוה בעולם (250 מטר). חוויה מרהיבה ביום ובלילה.", image:"https://images.pexels.com/photos/36909904/pexels-photo-36909904.jpeg", rating:4.6, price:"$$", priceRange:"₪130-500 / $35-136", address:"Bluewaters Island", lat:25.0797, lng:55.1193, tags:["גלגל ענק","תצפית","רומנטי"], featured:true },
    { id:404, name:"La Perle Show", nameEn:"La Perle by Dragone", category:"nightlife", subcategory:"show", description:"מופע אקרובטי מרהיב עם אפקטים מיוחדים של מים ואש. ברמת Cirque du Soleil.", image:"https://images.pexels.com/photos/33537703/pexels-photo-33537703.jpeg", rating:4.8, price:"$$$", priceRange:"₪300-700 / $82-190", address:"Al Habtoor City", lat:25.1850, lng:55.2448, tags:["מופע","אקרובטיקה","משפחות"], featured:true },
  ],
  transport: [
    { id:501, name:"מטרו דובאי", nameEn:"Dubai Metro", category:"transport", subcategory:"metro", description:"רשת מטרו אוטומטית ומודרנית. הקו האדום והירוק מכסים את רוב נקודות העניין. קנו Nol Card!", image:"https://images.pexels.com/photos/33354945/pexels-photo-33354945.jpeg", rating:4.4, price:"$", priceRange:"₪3-8.5 / $1-2.3 לנסיעה", address:"תחנות בכל רחבי דובאי", lat:25.2048, lng:55.2708, tags:["מטרו","זול","נוח"], featured:true },
    { id:502, name:"מוניות דובאי (RTA)", nameEn:"Dubai Taxi (RTA)", category:"transport", subcategory:"taxi", description:"מוניות רשמיות בצבע קרם. אמינות ונוחות. ניתן להזמין דרך אפליקציית Careem.", image:"https://images.pexels.com/photos/31747298/pexels-photo-31747298.jpeg", rating:4.2, price:"$$", priceRange:"₪12 בסיס + ₪2/ק\"מ", address:"בכל מקום", lat:25.2048, lng:55.2708, tags:["מונית","נוח","24/7"], featured:false },
    { id:503, name:"Water Taxi / Abra", nameEn:"Water Taxi / Abra", category:"transport", subcategory:"boat", description:"סירות עץ מסורתיות חוצות את Dubai Creek. חוויה אותנטית ב-1 דירהם בלבד!", image:"https://images.pexels.com/photos/31084537/pexels-photo-31084537.jpeg", rating:4.6, price:"$", priceRange:"₪1 / $0.27 לנסיעה", address:"Dubai Creek", lat:25.2633, lng:55.2975, tags:["סירה","מסורתי","זול"], featured:true },
    { id:504, name:"Careem / Uber", nameEn:"Careem / Uber", category:"transport", subcategory:"app", description:"שירותי הסעות באפליקציה. Careem הוא השירות המקומי הפופולרי ביותר.", image:"https://images.pexels.com/photos/29352929/pexels-photo-29352929.jpeg", rating:4.3, price:"$$", priceRange:"₪15-100 / $4-27 לנסיעה", address:"בכל מקום", lat:25.2048, lng:55.2708, tags:["אפליקציה","נוח","מהיר"], featured:false },
  ],
  casino: [
    { id:601, name:"Wynn Resort Dubai (בקרוב)", nameEn:"Wynn Resort Dubai", category:"casino", subcategory:"casino", description:"נפתח בקרוב! ריזורט קזינו ראשון בדובאי. ינהל את הקזינו הראשון באמירויות.", image:"https://images.pexels.com/photos/31824217/pexels-photo-31824217.jpeg", rating:0, price:"$$$$", priceRange:"טרם פורסם", address:"Ras Al Khaimah / Dubai", lat:25.1500, lng:55.2000, tags:["קזינו","חדש","יוקרה"], featured:true },
    { id:602, name:"Hippodrome - Meydan", nameEn:"Meydan Racecourse", category:"casino", subcategory:"racing", description:"מתחם מרוצי הסוסים היוקרתי של דובאי. אירועי הימורים על מרוצים ואירועי VIP.", image:"https://images.pexels.com/photos/32696882/pexels-photo-32696882.jpeg", rating:4.4, price:"$$$", priceRange:"₪100-500 / $27-136", address:"Meydan", lat:25.1665, lng:55.3052, tags:["מרוצים","הימורים","VIP"], featured:true },
  ]
};

// Practical info
const PRACTICAL_INFO = {
  emergency: { police:"999", ambulance:"998", fire:"997", tourist_police:"+971-800-2438" },
  currency: { name:"דירהם (AED)", rate:"1 USD = ~3.67 AED", tip:"טיפ 10-15% מקובל" },
  visa: "ישראלים מקבלים ויזה אוטומטית בכניסה (30 יום). יש להציג דרכון בתוקף ל-6 חודשים לפחות.",
  weather: "חודשים מומלצים: נובמבר-מרץ (20-30°C). הקיץ חם מאוד (40-50°C).",
  phrases: [
    { he:"שלום", ar:"سلام / مرحبا", pron:"סאלאם / מרחבא" },
    { he:"תודה", ar:"شكراً", pron:"שוכראן" },
    { he:"כמה זה עולה?", ar:"بكم هذا؟", pron:"בכם האד'א?" },
    { he:"כן / לא", ar:"نعم / لا", pron:"נעם / לא" },
    { he:"סליחה", ar:"عفواً", pron:"עפוואן" },
    { he:"אני רוצה...", ar:"أريد...", pron:"אוריד..." },
    { he:"איפה..?", ar:"أين..؟", pron:"אין..?" },
    { he:"יופי / מצוין", ar:"ممتاز", pron:"מומתאז" },
  ],
  tips: [
    "הלבוש: לבוש צנוע במקומות ציבוריים. בחוף ובבריכה - רגיל.",
    "אלכוהול: מותר רק בברים ומסעדות מורשות. אסור ברחוב.",
    "צילום: אסור לצלם אנשים מקומיים ללא רשות. היזהרו ליד בסיסים צבאיים.",
    "רמדאן: באכילה ושתייה ברחוב בשעות הצום - נא להימנע.",
    "Nol Card: קנו כרטיס Nol בשדה התעופה - עובד על מטרו, אוטובוסים ומוניות מים.",
    "שבת: אין הגבלות מיוחדות, הכל פתוח 7 ימים בשבוע.",
    "כשרות: יש מספר מסעדות כשרות בדובאי. חפשו באפליקציה.",
  ]
};

const DB_VERSION = 3;
function getDB() {
  const ver = localStorage.getItem(DB_KEY + '_ver');
  if (ver && Number(ver) >= DB_VERSION) {
    const stored = localStorage.getItem(DB_KEY);
    if (stored) return JSON.parse(stored);
  }
  // Reset to latest default data
  localStorage.setItem(DB_KEY, JSON.stringify(DEFAULT_DATA));
  localStorage.setItem(DB_KEY + '_ver', DB_VERSION);
  return { ...DEFAULT_DATA };
}

function saveDB(data) {
  localStorage.setItem(DB_KEY, JSON.stringify(data));
}

function getAllItems(category) {
  return getDB()[category] || [];
}

function getItem(category, id) {
  return getAllItems(category).find(item => item.id === Number(id));
}

function addItem(category, item) {
  const db = getDB();
  if (!db[category]) db[category] = [];
  item.id = Date.now();
  db[category].push(item);
  saveDB(db);
  return item;
}

function updateItem(category, id, updates) {
  const db = getDB();
  const idx = db[category].findIndex(item => item.id === Number(id));
  if (idx >= 0) {
    db[category][idx] = { ...db[category][idx], ...updates };
    saveDB(db);
    return db[category][idx];
  }
  return null;
}

function deleteItem(category, id) {
  const db = getDB();
  db[category] = db[category].filter(item => item.id !== Number(id));
  saveDB(db);
}

function getFeatured() {
  const db = getDB();
  const all = [];
  for (const cat of Object.keys(db)) {
    all.push(...db[cat].filter(i => i.featured));
  }
  return all;
}

function searchAll(query) {
  const db = getDB();
  const q = query.toLowerCase();
  const results = [];
  for (const cat of Object.keys(db)) {
    results.push(...db[cat].filter(i =>
      i.name?.toLowerCase().includes(q) ||
      i.nameEn?.toLowerCase().includes(q) ||
      i.description?.toLowerCase().includes(q) ||
      i.tags?.some(t => t.includes(q))
    ));
  }
  return results;
}

function getStats() {
  const db = getDB();
  return {
    hotels: db.hotels?.length || 0,
    restaurants: db.restaurants?.length || 0,
    attractions: db.attractions?.length || 0,
    shopping: db.shopping?.length || 0,
    nightlife: db.nightlife?.length || 0,
    transport: db.transport?.length || 0,
    casino: db.casino?.length || 0,
    total: Object.values(db).reduce((sum, arr) => sum + arr.length, 0)
  };
}
