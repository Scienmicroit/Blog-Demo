function randomizeBackgroundBlobs() {
    const blobs = [...document.querySelectorAll('.bg-blob')];
    const zones = [
        { x: [-20, 26], y: [-22, 30] },
        { x: [58, 92], y: [4, 58] },
        { x: [14, 72], y: [58, 88] }
    ];
    const rand = (min, max) => min + Math.random() * (max - min);

    blobs.forEach((blob, index) => {
        const zone = zones[index] || { x: [-12, 88], y: [-12, 88] };
        blob.style.setProperty('--blob-x', `${rand(zone.x[0], zone.x[1]).toFixed(2)}vw`);
        blob.style.setProperty('--blob-y', `${rand(zone.y[0], zone.y[1]).toFixed(2)}vh`);
        blob.style.setProperty('--blob-duration', `${rand(28, 42).toFixed(2)}s`);
        blob.style.setProperty('--blob-delay', `${rand(-18, 0).toFixed(2)}s`);

        for (let i = 1; i <= 3; i++) {
            blob.style.setProperty(`--drift-x${i}`, `${rand(-100, 100).toFixed(1)}px`);
            blob.style.setProperty(`--drift-y${i}`, `${rand(-100, 100).toFixed(1)}px`);
        }
    });
}

randomizeBackgroundBlobs();

const flatCursor = document.getElementById('flat-cursor');

function updateFlatCursorTarget(e) {
    flatCursor.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
    flatCursor.classList.remove('is-hidden');
}

document.addEventListener('mousemove', updateFlatCursorTarget);
document.addEventListener('pointermove', updateFlatCursorTarget);

document.addEventListener('mouseleave', () => {
    flatCursor.classList.add('is-hidden');
});

document.addEventListener('mouseover', (e) => {
    flatCursor.classList.toggle('is-hover', !!e.target.closest('a, button, .clickable, .glass, .social-link, .menu-link, .cd-group, .cd-wheel-item, .records-scrollbar, .records-scroll-thumb'));
});

(function () {
    const maxTilt = 6;
    const lerpFactor = 0.02;
    let card = null;
    let raf = 0;
    let tx = 0, ty = 0, cx = 0, cy = 0;
    let lastPointerX = 0, lastPointerY = 0;
    let hasPointer = false;

    function compute(e) {
        const r = card.getBoundingClientRect();
        const mx = (e.clientX - r.left - r.width / 2) / (r.width / 2);
        const my = (e.clientY - r.top - r.height / 2) / (r.height / 2);
        tx = Math.max(-1, Math.min(1, mx)) * maxTilt;
        ty = Math.max(-1, Math.min(1, my)) * -maxTilt;
    }

    function apply() {
        if (!card) return;
        card.style.setProperty('--tilt-x', cx.toFixed(2) + 'deg');
        card.style.setProperty('--tilt-y', cy.toFixed(2) + 'deg');
    }

    function loop() {
        if (card && card.classList.contains('side-dock')) {
            card.style.setProperty('--tilt-x', '0deg');
            card.style.setProperty('--tilt-y', '0deg');
            raf = 0; return;
        }
        var dx = tx - cx, dy = ty - cy;
        if (Math.abs(dx) < 0.02 && Math.abs(dy) < 0.02) {
            cx = tx; cy = ty; apply(); raf = 0; return;
        }
        cx += dx * lerpFactor; cy += dy * lerpFactor;
        apply();
        raf = requestAnimationFrame(loop);
    }

    function start() { if (!raf) raf = requestAnimationFrame(loop); }
    function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }

    function clear() {
        tx = 0; ty = 0; cx = 0; cy = 0; stop();
        if (card) { card.style.setProperty('--tilt-x', '0deg'); card.style.setProperty('--tilt-y', '0deg'); }
        card = null;
    }

    function getTiltCard(target) {
        const c = target.closest('.glass');
        if (!c || c.closest('.timer-page, .calendar-page') || c.classList.contains('side-dock')) return null;
        return c;
    }

    function setCard(c) {
        if (!c) {
            if (card) clear();
            return;
        }
        if (card && card !== c) clear();
        card = c;
    }

    function syncHoveredCard() {
        if (!hasPointer) return;
        const hovered = document.elementFromPoint(lastPointerX, lastPointerY);
        setCard(hovered ? getTiltCard(hovered) : null);
        if (!card) return;
        compute({ clientX: lastPointerX, clientY: lastPointerY });
        start();
    }

    document.addEventListener('mouseover', function (e) {
        setCard(getTiltCard(e.target));
    });

    document.addEventListener('mousemove', function (e) {
        lastPointerX = e.clientX;
        lastPointerY = e.clientY;
        hasPointer = true;
        setCard(getTiltCard(e.target));
        if (!card) return;
        compute(e); start();
    });

    document.addEventListener('mouseout', function (e) {
        if (!card) return;
        var c = e.target.closest('.glass');
        if (c !== card) return;
        var rel = e.relatedTarget;
        if (rel && rel.closest && rel.closest('.glass') === card) return;
        clear();
    });

    setInterval(syncHoveredCard, 120);
})();

const originalTitle = document.title;
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        document.title = '诶？你怎么走啦？';
    } else {
        document.title = '太好啦，你又回来啦！';
        setTimeout(() => {
            document.title = originalTitle;
        }, 500);
    }
});

function getCardPressTransform(card, scale = 1) {
    const shiftX = getComputedStyle(card).getPropertyValue('--shift-x').trim() || '0px';
    const shiftY = getComputedStyle(card).getPropertyValue('--shift-y').trim() || '0px';
    return `perspective(800px) translate(${shiftX}, ${shiftY}) rotateX(var(--tilt-y, 0deg)) rotateY(var(--tilt-x, 0deg)) scale(${scale})`;
}

document.addEventListener('mousedown', (e) => {
    if (e.target.closest('.timer-page, .calendar-page')) return;
    if (e.target.closest('.music-progress-shell, .music-progress-expansion')) return;
    if (e.target.closest('.menu-link')) return;
    const card = e.target.closest('.glass');
    if (card) {
        const MIN_SCALE = 0.9;

        if (card._bounceTimeout) {
            clearTimeout(card._bounceTimeout);
            card._bounceTimeout = null;
        }

        const currentScale = card._currentScale || 1;
        const newScale = Math.max(currentScale * 0.95, MIN_SCALE);
        card._currentScale = newScale;
        card.style.transition = 'transform 0.15s ease-out';
        card.style.transform = getCardPressTransform(card, newScale);

        const onUp = () => {
            document.removeEventListener('mouseup', onUp);
            card.style.transition = 'transform 0.15s ease-out';
            card.style.transform = getCardPressTransform(card, 1);
            card._currentScale = 1;
            card._bounceTimeout = setTimeout(() => {
                card.style.transition = '';
                card.style.transform = '';
                card._bounceTimeout = null;
            }, 160);
        };
        document.addEventListener('mouseup', onUp);
    }
});

const SEG_MAP = {
    0: [1,1,1,1,1,1,0],
    1: [0,1,1,0,0,0,0],
    2: [1,1,0,1,1,0,1],
    3: [1,1,1,1,0,0,1],
    4: [0,1,1,0,0,1,1],
    5: [1,0,1,1,0,1,1],
    6: [1,0,1,1,1,1,1],
    7: [1,1,1,0,0,0,0],
    8: [1,1,1,1,1,1,1],
    9: [1,1,1,1,0,1,1]
};

function createDigitHTML() {
    return `<div class="seg seg-h seg-a"></div>
            <div class="seg seg-v seg-b"></div>
            <div class="seg seg-v seg-c"></div>
            <div class="seg seg-h seg-d"></div>
            <div class="seg seg-v seg-e"></div>
            <div class="seg seg-v seg-f"></div>
            <div class="seg seg-h seg-g"></div>`;
}

function createTimeHTML() {
    const container = document.getElementById('time');
    let html = '';
    for (let i = 0; i < 6; i++) {
        html += `<div class="seg-digit">${createDigitHTML()}</div>`;
        if (i === 1 || i === 3) {
            html += `<div class="seg-colon"><div class="seg-colon-dot"></div><div class="seg-colon-dot"></div></div>`;
        }
    }
    container.innerHTML = html;
}

function setDigit(digitEl, num) {
    const segs = SEG_MAP[num];
    const segEls = digitEl.querySelectorAll('.seg');
    segEls.forEach((seg, i) => {
        seg.classList.toggle('on', segs[i] === 1);
    });
}

createTimeHTML();

const greetingText = document.querySelector('.greeting-text');
const greetingAvatar = document.querySelector('.greeting-avatar');
const greetingName = document.querySelector('.greeting-name');

const GREETING_PHRASES = {
    0: ['早睡早起，注意身体', '再不睡就要天亮了……'],
    5: ['开启新的一天'],
    8: ['充满能量', '记得吃早餐'],
    11: ['餐后午睡，效率翻倍'],
    13: ['感到小疲？来杯 café', '下午才是最棒的'],
    18: ['劳累一天，好好休息', '晚餐别拖太久', '已进入贤者模式', '请自由安排']
};

function pickGreetingPhrase(hour) {
    var slots = [18, 13, 11, 8, 5, 0];
    for (var i = 0; i < slots.length; i++) {
        if (hour >= slots[i]) {
            var arr = GREETING_PHRASES[slots[i]];
            return arr[Math.floor(Math.random() * arr.length)];
        }
    }
}

var lastHour = -1;

function updateTime() {
    const now = new Date();
    const hour = now.getHours();
    const h = String(hour).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    const digits = document.querySelectorAll('.seg-digit');
    setDigit(digits[0], parseInt(h[0]));
    setDigit(digits[1], parseInt(h[1]));
    setDigit(digits[2], parseInt(m[0]));
    setDigit(digits[3], parseInt(m[1]));
    setDigit(digits[4], parseInt(s[0]));
    setDigit(digits[5], parseInt(s[1]));

    if (hour !== lastHour) {
        lastHour = hour;

        if (hour >= 0 && hour < 5) {
            greetingAvatar.textContent = '💤';
            greetingText.textContent = '夜深了';
        } else if (hour >= 5 && hour < 8) {
            greetingAvatar.textContent = '🌅';
            greetingText.textContent = '早上好';
        } else if (hour >= 8 && hour < 11) {
            greetingAvatar.textContent = '🌇';
            greetingText.textContent = '上午好';
        } else if (hour >= 11 && hour < 13) {
            greetingAvatar.textContent = '🍴';
            greetingText.textContent = '中午好';
        } else if (hour >= 13 && hour < 18) {
            greetingAvatar.textContent = '☕';
            greetingText.textContent = '下午好';
        } else {
            greetingAvatar.textContent = '🌃';
            greetingText.textContent = '晚上好';
        }

        greetingName.textContent = pickGreetingPhrase(hour);
    }
}

updateTime();
setInterval(updateTime, 1000);

const weatherCard = document.getElementById('weather-card');
const weatherIconEl = document.getElementById('weather-icon');
const weatherLocationEl = document.getElementById('weather-location');
const weatherTempEl = document.getElementById('weather-temp');
const weatherConditionEl = document.getElementById('weather-condition');
const weatherUpdatedEl = document.getElementById('weather-updated');
const WEATHER_REFRESH_INTERVAL = 10 * 60 * 1000;

const WEATHER_CODE_MAP = {
    0: ['晴', '☀️'],
    1: ['晴间多云', '🌤️'],
    2: ['多云', '⛅'],
    3: ['阴', '☁️'],
    45: ['雾', '🌫️'],
    48: ['雾凇', '🌫️'],
    51: ['小毛毛雨', '🌦️'],
    53: ['毛毛雨', '🌦️'],
    55: ['强毛毛雨', '🌧️'],
    56: ['冻毛毛雨', '🌧️'],
    57: ['强冻毛毛雨', '🌧️'],
    61: ['小雨', '🌧️'],
    63: ['中雨', '🌧️'],
    65: ['大雨', '🌧️'],
    66: ['冻雨', '🌧️'],
    67: ['强冻雨', '🌧️'],
    71: ['小雪', '🌨️'],
    73: ['中雪', '🌨️'],
    75: ['大雪', '🌨️'],
    77: ['雪粒', '🌨️'],
    80: ['小阵雨', '🌦️'],
    81: ['阵雨', '🌧️'],
    82: ['强阵雨', '🌧️'],
    85: ['小阵雪', '🌨️'],
    86: ['阵雪', '🌨️'],
    95: ['雷阵雨', '⛈️'],
    96: ['雷暴伴冰雹', '⛈️'],
    99: ['强雷暴伴冰雹', '⛈️']
};

function showWeatherError() {
    weatherCard.classList.add('is-error');
}

function getCurrentPosition() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation unavailable'));
            return;
        }

        navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: WEATHER_REFRESH_INTERVAL
        });
    });
}

function formatWeatherUpdateTime(value) {
    const date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) {
        return '--:-- 更新';
    }

    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes} 更新`;
}

function getFallbackPlaceName(timezone) {
    if (!timezone || typeof timezone !== 'string') return '当前位置';
    const place = timezone.split('/').pop().replace(/_/g, ' ');
    return place || '当前位置';
}

function pickAddressPart(address, keys) {
    for (const key of keys) {
        if (address && address[key]) return address[key];
    }
    return '';
}

async function fetchPlaceName(latitude, longitude, fallbackTimezone) {
    const fallback = getFallbackPlaceName(fallbackTimezone);
    let timeout = null;

    try {
        const controller = new AbortController();
        timeout = setTimeout(() => controller.abort(), 4000);
        const url = new URL('https://nominatim.openstreetmap.org/reverse');
        url.searchParams.set('format', 'jsonv2');
        url.searchParams.set('lat', latitude);
        url.searchParams.set('lon', longitude);
        url.searchParams.set('zoom', '10');
        url.searchParams.set('accept-language', 'zh-CN');

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        if (!response.ok) return fallback;

        const data = await response.json();
        const address = data.address || {};
        const city = pickAddressPart(address, ['city', 'town', 'village', 'municipality', 'state']);
        const district = pickAddressPart(address, ['city_district', 'district', 'suburb', 'county']);

        if (city && district && city !== district && !city.includes(district)) {
            return `${city}${district}`;
        }

        return city || district || fallback;
    } catch (error) {
        return fallback;
    } finally {
        if (timeout) clearTimeout(timeout);
    }
}

async function fetchCurrentWeather(latitude, longitude) {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', latitude);
    url.searchParams.set('longitude', longitude);
    url.searchParams.set('current', 'temperature_2m,weather_code,is_day');
    url.searchParams.set('temperature_unit', 'celsius');
    url.searchParams.set('timezone', 'auto');
    url.searchParams.set('forecast_days', '1');

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error('Weather request failed');
    }

    return response.json();
}

async function updateWeather() {
    try {
        const position = await getCurrentPosition();
        const latitude = String(position.coords.latitude);
        const longitude = String(position.coords.longitude);
        const weather = await fetchCurrentWeather(latitude, longitude);
        const current = weather.current || {};
        const code = Number(current.weather_code);
        const temperature = Number(current.temperature_2m);
        if (!Number.isFinite(temperature)) {
            throw new Error('Weather temperature missing');
        }
        const isNight = current.is_day === 0;
        const [condition, icon] = WEATHER_CODE_MAP[code] || ['未知', '☁️'];
        const placeName = await fetchPlaceName(latitude, longitude, weather.timezone);

        weatherCard.classList.remove('is-error');
        weatherLocationEl.textContent = placeName;
        weatherTempEl.textContent = `${Math.round(temperature)}°C`;
        weatherConditionEl.textContent = condition;
        weatherIconEl.textContent = code === 0 && isNight ? '🌙' : icon;
        weatherUpdatedEl.textContent = formatWeatherUpdateTime(current.time);
    } catch (error) {
        showWeatherError();
    }
}

updateWeather().then(() => {
    if (!weatherCard.classList.contains('is-error')) {
        setInterval(updateWeather, WEATHER_REFRESH_INTERVAL);
    }
});

const likesCardEl = document.getElementById('likes-card');
const likesCountEl = document.getElementById('likes-count');
const likesHeartEl = document.getElementById('likes-heart');
let likes = parseInt(localStorage.getItem('blog_likes') || '17247');
const likesCountTextNode = document.createTextNode('');
likesCountEl.textContent = '';
likesCountEl.appendChild(likesCountTextNode);

function updateLikesCountText() {
    likesCountTextNode.nodeValue = likes.toLocaleString();
}

updateLikesCountText();

function spawnPlusBubble() {
    const bubble = document.createElement('span');
    bubble.className = 'plus-bubble';
    bubble.textContent = '+1';
    likesCountEl.appendChild(bubble);
    setTimeout(() => bubble.remove(), 800);
}

function spawnFloatHearts() {
    const rect = likesHeartEl.getBoundingClientRect();
    const cardRect = likesCardEl.getBoundingClientRect();
    for (let i = 0; i < 3; i++) {
        const h = document.createElement('span');
        h.className = 'float-heart';
        h.textContent = '♥';
        const ox = rect.left - cardRect.left + rect.width / 2;
        const oy = rect.top - cardRect.top + rect.height / 2;
        h.style.left = ox + 'px';
        h.style.top = oy + 'px';
        h.style.setProperty('--hx', (Math.random() * 30 - 15) + 'px');
        h.style.setProperty('--hr', (Math.random() * 40 - 20) + 'deg');
        h.style.animationDelay = (i * 0.08) + 's';
        likesCardEl.appendChild(h);
        setTimeout(() => h.remove(), 900);
    }
}

likesCardEl.addEventListener('click', (e) => {
    likes++;
    localStorage.setItem('blog_likes', likes);
    updateLikesCountText();
    likesHeartEl.classList.remove('pop');
    void likesHeartEl.offsetWidth;
    likesHeartEl.classList.add('pop');
    spawnPlusBubble();
    spawnFloatHearts();
});

const lunarFormatter = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', {
    month: 'long',
    day: 'numeric'
});
const lunarDayNames = [
    '', '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
    '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
    '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'
];
const solarTermNames = [
    '小寒', '大寒', '立春', '雨水', '惊蛰', '春分', '清明', '谷雨',
    '立夏', '小满', '芒种', '夏至', '小暑', '大暑', '立秋', '处暑',
    '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至'
];
const solarTermMinutes = [
    0, 21208, 42467, 63836, 85337, 107014, 128867, 150921,
    173149, 195551, 218072, 240693, 263343, 285989, 308563, 331033,
    353350, 375494, 397447, 419210, 440795, 462224, 483532, 504758
];

function getSolarTerm(date) {
    const start = date.getMonth() * 2;
    for (let i = start; i < start + 2; i++) {
        const termDate = new Date(
            Date.UTC(1900, 0, 6, 2, 5) +
            31556925974.7 * (date.getFullYear() - 1900) +
            solarTermMinutes[i] * 60000
        );
        if (termDate.getUTCDate() === date.getDate()) return solarTermNames[i];
    }
    return '';
}

function getLunarLabel(date) {
    const parts = lunarFormatter.formatToParts(date);
    const month = parts.find(part => part.type === 'month')?.value || '';
    const day = Number(parts.find(part => part.type === 'day')?.value);
    if (day === 1) return { text: month, isSolarTerm: false };
    const solarTerm = getSolarTerm(date);
    return {
        text: solarTerm || lunarDayNames[day] || '',
        isSolarTerm: Boolean(solarTerm)
    };
}

function renderCalendarDays(container, year, month, today, showLunar = false) {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDay = firstDay === 0 ? 6 : firstDay - 1;
    container.innerHTML = '';

    for (let i = 0; i < startDay; i++) {
        const empty = document.createElement('div');
        empty.className = 'day empty';
        container.appendChild(empty);
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const dayEl = document.createElement('div');
        dayEl.className = 'day';
        const numberEl = document.createElement('span');
        numberEl.textContent = d;
        dayEl.appendChild(numberEl);

        if (showLunar) {
            const lunar = getLunarLabel(new Date(year, month, d, 12));
            const lunarEl = document.createElement('span');
            lunarEl.className = 'lunar-label';
            lunarEl.textContent = lunar.text;
            dayEl.appendChild(lunarEl);
            dayEl.classList.toggle('solar-term', lunar.isSolarTerm);
        }

        if (d === today) dayEl.classList.add('today');
        container.appendChild(dayEl);
    }
}

function renderCalendar() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const today = now.getDate();

    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    const weekday = weekdays[now.getDay()];
    document.getElementById('calendar-date').textContent = `${year} 年 ${month + 1} 月 ${today} 日 星期${weekday}`;

    const activeWeekdayIndex = now.getDay() === 0 ? 6 : now.getDay() - 1;
    document.querySelectorAll('.calendar-weekdays .weekday').forEach((day, index) => {
        day.classList.toggle('active', index === activeWeekdayIndex);
    });

    const container = document.getElementById('calendar-days');
    renderCalendarDays(container, year, month, today);
}

renderCalendar();

function scheduleCalendarRefresh() {
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    setTimeout(() => {
        renderCalendar();
        scheduleCalendarRefresh();
    }, nextMidnight - now + 1000);
}

scheduleCalendarRefresh();

const calendarCard = document.querySelector('.calendar-card');
const calendarPage = document.getElementById('calendar-page');
const calendarModal = document.getElementById('calendar-modal');
const calendarGhost = document.getElementById('calendar-ghost');
const calendarClose = document.getElementById('calendar-close');

function setCalendarStartRect(rect) {
    const radius = getComputedStyle(calendarCard).borderRadius;
    calendarPage.style.setProperty('--start-left', `${rect.left}px`);
    calendarPage.style.setProperty('--start-top', `${rect.top}px`);
    calendarPage.style.setProperty('--start-width', `${rect.width}px`);
    calendarPage.style.setProperty('--start-height', `${rect.height}px`);
    calendarPage.style.setProperty('--start-radius', radius);
}

function renderExpandedCalendar() {
    const now = new Date();
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    document.getElementById('calendar-expanded-header').textContent =
        `${now.getFullYear()} 年 ${now.getMonth() + 1} 月 ${now.getDate()} 日 星期${weekdays[now.getDay()]}`;
    document.querySelectorAll('.calendar-expanded-weekdays .weekday').forEach((day, index) => {
        day.classList.toggle('active', index === (now.getDay() === 0 ? 6 : now.getDay() - 1));
    });
    renderCalendarDays(
        document.getElementById('calendar-expanded-days'),
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        true
    );
}

function openCalendar() {
    if (calendarPage.classList.contains('active') || calendarPage.classList.contains('opening')) return;
    const rect = calendarCard.getBoundingClientRect();
    const ghostCard = calendarCard.cloneNode(true);
    ghostCard.className = 'calendar-ghost-card';
    ghostCard.removeAttribute('style');
    ghostCard.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
    calendarGhost.replaceChildren(ghostCard);
    renderExpandedCalendar();
    setCalendarStartRect(rect);
    calendarCard.style.opacity = '0';
    calendarPage.classList.add('opening');
    calendarPage.setAttribute('aria-hidden', 'false');
    void calendarModal.offsetWidth;
    requestAnimationFrame(() => {
        calendarPage.classList.add('active');
        calendarPage.classList.remove('opening');
    });
}

function closeCalendar() {
    if (!calendarPage.classList.contains('active')) return;
    const rect = calendarCard.getBoundingClientRect();
    const bg = calendarPage.querySelector('.calendar-page-bg');
    const ghostCard = calendarGhost.querySelector('.calendar-ghost-card');
    calendarModal.style.transition =
        'left 0.32s ease-in, top 0.32s ease-in, width 0.32s ease-in, height 0.32s ease-in, border-radius 0.32s ease-in, transform 0.2s ease';
    if (ghostCard) ghostCard.style.transition = 'transform 0.32s ease-in';
    calendarPage.classList.remove('active');
    calendarPage.classList.add('opening');
    bg.style.opacity = '0';
    calendarModal.style.left = `${rect.left}px`;
    calendarModal.style.top = `${rect.top}px`;
    calendarModal.style.width = `${rect.width}px`;
    calendarModal.style.height = `${rect.height}px`;
    calendarModal.style.borderRadius = getComputedStyle(calendarCard).borderRadius;
    let closeFallback;
    const finishCalendarClose = event => {
        if (event && event.propertyName !== 'width') return;
        calendarModal.removeEventListener('transitionend', finishCalendarClose);
        clearTimeout(closeFallback);
        calendarPage.classList.remove('opening');
        calendarPage.setAttribute('aria-hidden', 'true');
        calendarModal.style.cssText = '';
        calendarGhost.replaceChildren();
        calendarCard.style.opacity = '';
        bg.style.cssText = '';
        playCardBounce(calendarCard, 0.9, 200, 110);
    };
    calendarModal.addEventListener('transitionend', finishCalendarClose);
    closeFallback = setTimeout(finishCalendarClose, 500);
}

calendarCard.style.cursor = 'pointer';
calendarCard.addEventListener('click', openCalendar);
calendarClose.addEventListener('click', closeCalendar);
calendarPage.querySelector('.calendar-page-bg').addEventListener('click', closeCalendar);
document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeCalendar();
});

const menuShell = document.querySelector('.menu-shell');
const menuIndicator = document.querySelector('.menu-indicator');
const menuHoverIndicator = document.querySelector('.menu-hover-indicator');
const menuLinks = document.querySelectorAll('.menu-link');

function clearMenuPreview() {
    menuLinks.forEach(link => link.classList.remove('is-preview'));
}

function getMenuTargetY(target) {
    let y = 0;
    let node = target;
    while (node && node !== menuShell) {
        y += node.offsetTop || 0;
        node = node.offsetParent;
    }
    return y;
}

function createMenuIndicatorController(indicator) {
    let y = 0;
    let targetY = 0;
    let velocity = 0;
    let frame = null;
    let lastTime = 0;
    let completeMove = null;

    function setPosition(nextY) {
        y = nextY;
        indicator.style.transform = `translate3d(0, ${nextY}px, 0)`;
    }

    function stopMotion(clearComplete = true) {
        if (frame) {
            cancelAnimationFrame(frame);
            frame = null;
        }
        lastTime = 0;
        velocity = 0;
        if (clearComplete) {
            completeMove = null;
        }
    }

    function animate(time) {
        if (!lastTime) {
            lastTime = time;
        }

        const dt = Math.min((time - lastTime) / 1000, 0.032);
        lastTime = time;

        const stiffness = 230;
        const damping = 20;
        const distance = targetY - y;
        const acceleration = distance * stiffness - velocity * damping;

        velocity += acceleration * dt;
        setPosition(y + velocity * dt);

        if (Math.abs(distance) < 0.35 && Math.abs(velocity) < 4) {
            const done = completeMove;
            completeMove = null;
            setPosition(targetY);
            stopMotion(false);
            if (done) done();
            return;
        }

        frame = requestAnimationFrame(animate);
    }

    function move(target, animateMove = true, onComplete = null) {
        if (!menuShell || !indicator || !target) return;

        const nextY = getMenuTargetY(target);
        completeMove = typeof onComplete === 'function' ? onComplete : null;

        indicator.style.setProperty('--menu-indicator-height', `${target.offsetHeight}px`);
        indicator.style.setProperty('--menu-indicator-y', `${nextY}px`);
        targetY = nextY;

        if (!animateMove || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            const done = completeMove;
            completeMove = null;
            stopMotion(false);
            setPosition(nextY);
            if (done) done();
            return;
        }

        if (!frame) {
            frame = requestAnimationFrame(animate);
        }
    }

    function setPress(isPressing) {
        indicator.classList.toggle('is-pressing', isPressing);
    }

    function syncTo(nextY) {
        stopMotion();
        targetY = nextY;
        setPosition(nextY);
    }

    return { move, setPress, syncTo, getY: () => y };
}

function getActiveMenuLink() {
    return document.querySelector('.menu-link.active') || menuLinks[0];
}

const solidMenuIndicator = createMenuIndicatorController(menuIndicator);
const hoverMenuIndicator = createMenuIndicatorController(menuHoverIndicator);
let menuHoverReturnId = 0;
let menuPointerX = 0;
let menuPointerY = 0;
let hasMenuPointer = false;

function setMenuIndicatorPress(isPressing) {
    hoverMenuIndicator.setPress(isPressing);
}

function rememberMenuPointer(e) {
    menuPointerX = e.clientX;
    menuPointerY = e.clientY;
    hasMenuPointer = true;
}

function getMenuLinkUnderPointer() {
    if (!hasMenuPointer) return null;
    const hovered = document.elementFromPoint(menuPointerX, menuPointerY);
    const link = hovered && hovered.closest ? hovered.closest('.menu-link') : null;
    return link && menuShell.contains(link) ? link : null;
}

function syncMenuHoverState(animateMove = true) {
    const hoveredLink = getMenuLinkUnderPointer();
    const returnId = ++menuHoverReturnId;
    clearMenuPreview();
    setMenuIndicatorPress(false);

    if (hoveredLink) {
        menuShell.classList.add('is-hovering');
        hoveredLink.classList.add('is-preview');
        hoverMenuIndicator.move(hoveredLink, animateMove);
        return;
    }

    hoverMenuIndicator.move(getActiveMenuLink(), animateMove, () => {
        if (returnId === menuHoverReturnId) {
            menuShell.classList.remove('is-hovering');
        }
    });
}

function scheduleMenuHoverSync() {
    requestAnimationFrame(() => syncMenuHoverState(false));
    setTimeout(() => syncMenuHoverState(true), 90);
    setTimeout(() => syncMenuHoverState(true), 720);
}

document.addEventListener('pointermove', rememberMenuPointer);

solidMenuIndicator.move(getActiveMenuLink(), false);
hoverMenuIndicator.move(getActiveMenuLink(), false);
window.addEventListener('resize', () => {
    solidMenuIndicator.move(getActiveMenuLink(), false);
    hoverMenuIndicator.move(getActiveMenuLink(), false);
    scheduleMenuHoverSync();
    if (isMenuSideMode) {
        dockProfileCard();
    }
});

const layoutEl = document.querySelector('.layout');
const profileCardEl = document.querySelector('.profile-card');
const detailMenuTargets = new Set(['#projects', '#about', '#share', '#blogs']);
let isMenuSideMode = false;
let profileHomeRect = null;
let profileDockCleanupTimer = null;

function getDockProfileRect() {
    const horizontalGap = window.innerWidth <= 720 ? 18 : 32;
    const verticalGap = window.innerHeight <= 620 ? 18 : 24;
    const width = Math.min(248, window.innerWidth - horizontalGap * 2);
    return {
        left: horizontalGap,
        top: verticalGap,
        width,
        height: Math.max(360, window.innerHeight - verticalGap * 2)
    };
}

function getProfileGridRect() {
    const layoutRect = layoutEl.getBoundingClientRect();
    return {
        left: layoutRect.left + profileCardEl.offsetLeft,
        top: layoutRect.top + profileCardEl.offsetTop,
        width: profileCardEl.offsetWidth,
        height: profileCardEl.offsetHeight
    };
}

function getAppliedProfileRect() {
    return {
        left: parseFloat(profileCardEl.style.left) || 0,
        top: parseFloat(profileCardEl.style.top) || 0,
        width: parseFloat(profileCardEl.style.width) || profileCardEl.offsetWidth,
        height: parseFloat(profileCardEl.style.height) || profileCardEl.offsetHeight
    };
}

function getProfileContentEls() {
    return [...profileCardEl.querySelectorAll(':scope > .profile-header, :scope > .menu-label, :scope > .menu-shell')];
}

function getProfileContentRect() {
    const rects = getProfileContentEls().map(el => el.getBoundingClientRect());
    return {
        left: Math.min(...rects.map(rect => rect.left)),
        top: Math.min(...rects.map(rect => rect.top))
    };
}

function playProfileContentFlip(beforeRect) {
    const afterRect = getProfileContentRect();
    const dx = beforeRect.left - afterRect.left;
    const dy = beforeRect.top - afterRect.top;
    const contentEls = getProfileContentEls();

    contentEls.forEach(el => {
        el.style.transition = 'none';
        el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    });
    void profileCardEl.offsetWidth;

    requestAnimationFrame(() => {
        contentEls.forEach(el => {
            el.style.transition = 'transform 0.64s cubic-bezier(0.22, 1, 0.36, 1)';
            el.style.transform = 'translate3d(0, 0, 0)';
        });

        setTimeout(() => {
            contentEls.forEach(el => {
                el.style.transition = '';
                el.style.transform = '';
            });
        }, 700);
    });
}

function clearProfileDockCleanup() {
    if (!profileDockCleanupTimer) return;
    clearTimeout(profileDockCleanupTimer);
    profileDockCleanupTimer = null;
}

function applyProfileRect(rect, docked = isMenuSideMode) {
    profileCardEl.style.left = `${rect.left}px`;
    profileCardEl.style.top = `${rect.top}px`;
    profileCardEl.style.width = `${rect.width}px`;
    profileCardEl.style.height = `${rect.height}px`;
    profileCardEl.style.borderRadius = docked ? '30px' : '';
}

function dockProfileCard() {
    applyProfileRect(getDockProfileRect(), true);
}

function finalizeProfileHomeDock() {
    if (isMenuSideMode) return;
    clearProfileDockCleanup();
    const dockedRect = getAppliedProfileRect();

    profileCardEl.classList.add('home-hover-suppressed');
    profileCardEl.classList.remove('side-dock');
    profileCardEl.classList.remove('returning-home');
    profileCardEl.style.transition = 'none';
    profileCardEl.style.left = '';
    profileCardEl.style.top = '';
    profileCardEl.style.width = '';
    profileCardEl.style.height = '';
    profileCardEl.style.borderRadius = '';

    const gridRect = getProfileGridRect();
    const dx = dockedRect.left - gridRect.left;
    const dy = dockedRect.top - gridRect.top;
    const shouldFlipHome = Math.hypot(dx, dy) > 0.75;

    const releaseHomeHoverSuppression = () => {
        profileCardEl.classList.remove('home-hover-suppressed');
        profileCardEl.removeEventListener('pointerleave', releaseHomeHoverSuppression);
    };

    if (shouldFlipHome) {
        profileCardEl.style.setProperty('--shift-x', `${dx}px`);
        profileCardEl.style.setProperty('--shift-y', `${dy}px`);
        void profileCardEl.offsetWidth;
    } else {
        profileCardEl.style.setProperty('--shift-x', '0px');
        profileCardEl.style.setProperty('--shift-y', '0px');
    }

    requestAnimationFrame(() => {
        profileCardEl.style.transition = '';
        if (shouldFlipHome) {
            profileCardEl.style.setProperty('--shift-x', '0px');
            profileCardEl.style.setProperty('--shift-y', '0px');
        }
        if (profileCardEl.matches(':hover')) {
            profileCardEl.addEventListener('pointerleave', releaseHomeHoverSuppression, { once: true });
        } else {
            releaseHomeHoverSuppression();
        }
        profileHomeRect = null;
        scheduleMenuHoverSync();
    });
}

function setNonMenuCardsHidden(hidden) {
    const cards = [...layoutEl.querySelectorAll(':scope > .glass:not(.profile-card)')];
    cards.forEach((card, index) => {
        const delayIndex = hidden ? index : cards.length - 1 - index;
        card.classList.add('detail-transition');
        card.style.transitionDelay = `${delayIndex * 55}ms`;
        card.classList.toggle('detail-hidden', hidden);

        clearTimeout(card._detailModeTimer);
        card._detailModeTimer = setTimeout(() => {
            card.style.transitionDelay = '';
            if (!hidden) {
                card.classList.remove('detail-transition');
            }
            card._detailModeTimer = null;
        }, delayIndex * 55 + 520);
    });
}

function enterMenuSideMode() {
    clearProfileDockCleanup();
    profileCardEl.classList.remove('home-hover-suppressed');
    profileCardEl.classList.remove('returning-home');
    profileCardEl.style.setProperty('--tilt-x', '0deg');
    profileCardEl.style.setProperty('--tilt-y', '0deg');

    if (isMenuSideMode) {
        profileCardEl.style.transition = '';
        dockProfileCard();
        return;
    }

    const isReturningHome = profileCardEl.classList.contains('side-dock');
    isMenuSideMode = true;

    if (!isReturningHome) {
        profileHomeRect = getProfileGridRect();
        profileCardEl.classList.add('side-dock');
        profileCardEl.style.transition = 'none';
        applyProfileRect(profileHomeRect, true);
        void profileCardEl.offsetWidth;
    } else {
        const currentRect = getAppliedProfileRect();
        profileCardEl.style.transition = 'none';
        applyProfileRect(currentRect, true);
        void profileCardEl.offsetWidth;
    }

    profileCardEl.style.transition = '';
    setNonMenuCardsHidden(true);
    requestAnimationFrame(() => {
        dockProfileCard();
        scheduleMenuHoverSync();
    });
}

function exitMenuSideMode() {
    if (!isMenuSideMode && !profileCardEl.classList.contains('side-dock')) return;

    isMenuSideMode = false;
    clearProfileDockCleanup();
    setNonMenuCardsHidden(false);
    const contentRect = getProfileContentRect();
    const currentRect = getAppliedProfileRect();
    profileCardEl.style.transition = 'none';
    applyProfileRect(currentRect, true);
    profileCardEl.classList.add('returning-home');
    playProfileContentFlip(contentRect);
    void profileCardEl.offsetWidth;
    profileCardEl.style.transition = '';

    if (profileHomeRect) {
        requestAnimationFrame(() => applyProfileRect(profileHomeRect, false));
    }

    const cleanupProfileDock = (e) => {
        if (e && e.propertyName !== 'height') return;
        profileCardEl.removeEventListener('transitionend', cleanupProfileDock);
        finalizeProfileHomeDock();
        scheduleMenuHoverSync();
    };
    profileCardEl.addEventListener('transitionend', cleanupProfileDock);
    profileDockCleanupTimer = setTimeout(cleanupProfileDock, 760);
}

menuLinks.forEach(link => {
    link.addEventListener('mouseenter', (e) => {
        rememberMenuPointer(e);
        menuHoverReturnId++;
        menuShell.classList.add('is-hovering');
        clearMenuPreview();
        link.classList.add('is-preview');
        hoverMenuIndicator.move(link);
    });

    link.addEventListener('click', (e) => {
        e.preventDefault();
        rememberMenuPointer(e);
        clearMenuPreview();
        menuLinks.forEach(l => l.classList.remove('active'));
        e.currentTarget.classList.add('active', 'is-preview');
        hoverMenuIndicator.syncTo(solidMenuIndicator.getY());
        solidMenuIndicator.move(e.currentTarget);
        hoverMenuIndicator.move(e.currentTarget);

        const target = e.currentTarget.getAttribute('href');
        if (detailMenuTargets.has(target)) {
            enterMenuSideMode();
        } else {
            exitMenuSideMode();
        }
        scheduleMenuHoverSync();
    });

    link.addEventListener('pointerdown', () => setMenuIndicatorPress(true));
    link.addEventListener('pointerup', () => setMenuIndicatorPress(false));
    link.addEventListener('pointercancel', () => setMenuIndicatorPress(false));
    link.addEventListener('pointerleave', () => setMenuIndicatorPress(false));
});

menuShell.addEventListener('mouseleave', () => {
    const returnId = ++menuHoverReturnId;
    clearMenuPreview();
    hoverMenuIndicator.move(getActiveMenuLink(), true, () => {
        if (returnId === menuHoverReturnId) {
            menuShell.classList.remove('is-hovering');
        }
    });
});

const musicCard = document.getElementById('music-card');
const musicArt = document.getElementById('music-art');
const musicTitle = document.getElementById('music-title');
const musicPlayButton = document.getElementById('music-play');
const musicRandomButton = document.getElementById('music-random');
const musicProgressShell = document.getElementById('music-progress-shell');
const musicProgress = document.getElementById('music-progress');
const musicProgressExpansion = document.getElementById('music-progress-expansion');
const musicTime = document.getElementById('music-time');
const musicTrackDots = document.querySelectorAll('.music-dot');
const MUSIC_TRACKS = [
    {
        title: '梦境寻踪',
        src: '梦境寻踪.mp3',
        art: null,
        fallbackDuration: 0
    },
    {
        title: 'Numb - Linkin Park',
        src: 'Numb - Linkin Park.mp3',
        art: 'music-img.jpg',
        fallbackDuration: 187
    }
];

const musicAudio = new Audio();
musicAudio.preload = 'metadata';
let musicTrackIndex = 0;
let musicDuration = MUSIC_TRACKS[0].fallbackDuration;
let musicCurrentTime = 0;
let isMusicPlaying = false;
let musicProgressRaf = 0;
let musicProgressExpandTimer = null;
let musicVisualAnchorTime = 0;
let musicVisualAnchorNow = performance.now();

function formatMusicTime(seconds) {
    if (!Number.isFinite(seconds)) return '--:--';
    const roundedSeconds = Math.round(seconds);
    const upperBound = musicDuration > 0 ? Math.round(musicDuration) : roundedSeconds;
    const safeSeconds = Math.max(0, Math.min(upperBound, roundedSeconds));
    const minutes = Math.floor(safeSeconds / 60);
    const rest = String(safeSeconds % 60).padStart(2, '0');
    return `${minutes}:${rest}`;
}

function formatMusicDuration() {
    return musicDuration > 0 ? formatMusicTime(musicDuration) : '--:--';
}

function setMusicPlaying(nextState) {
    isMusicPlaying = nextState;
    musicPlayButton.classList.toggle('is-playing', isMusicPlaying);
    musicPlayButton.setAttribute('aria-pressed', String(isMusicPlaying));
    musicPlayButton.setAttribute('aria-label', isMusicPlaying ? '暂停音乐' : '播放音乐');
}

function clampMusicTime(seconds) {
    const nextTime = Number.isFinite(seconds) ? seconds : 0;
    if (musicDuration <= 0) {
        return Math.max(0, nextTime);
    }
    return Math.max(0, Math.min(musicDuration, nextTime));
}

function anchorMusicProgressVisual(seconds = musicCurrentTime) {
    musicVisualAnchorTime = clampMusicTime(seconds);
    musicVisualAnchorNow = performance.now();
}

function getMusicVisualTime() {
    if (musicAudio.paused || musicAudio.ended) {
        return musicCurrentTime;
    }
    return clampMusicTime(musicVisualAnchorTime + ((performance.now() - musicVisualAnchorNow) / 1000));
}

function updateMusicProgress(seconds, shouldSeek = false) {
    musicCurrentTime = clampMusicTime(seconds);
    const ratio = musicDuration > 0 ? musicCurrentTime / musicDuration : 0;
    const percent = ratio * 100;
    musicProgress.style.setProperty('--music-progress', `${percent}%`);
    musicProgress.style.setProperty('--music-progress-ratio', String(ratio));
    musicCard.style.setProperty('--music-progress-ratio', String(ratio));
    musicProgress.setAttribute('aria-valuenow', String(Math.round(musicCurrentTime)));
    musicProgress.setAttribute('aria-valuemax', String(Math.round(musicDuration)));
    musicProgress.setAttribute('aria-valuetext', `${formatMusicTime(musicCurrentTime)} / ${formatMusicDuration()}`);
    musicTime.textContent = `${formatMusicTime(musicCurrentTime)}/${formatMusicDuration()}`;

    if (shouldSeek && musicDuration > 0) {
        const seekLimit = Number.isFinite(musicAudio.duration) ? musicAudio.duration : musicDuration;
        musicAudio.currentTime = Math.max(0, Math.min(seekLimit, musicCurrentTime));
        anchorMusicProgressVisual(musicCurrentTime);
    }
}

function updateMusicProgressFromPointer(e) {
    if (musicDuration <= 0) return;
    const rect = musicProgress.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    updateMusicProgress(ratio * musicDuration, true);
}

function stopMusicProgressLoop() {
    if (!musicProgressRaf) return;
    cancelAnimationFrame(musicProgressRaf);
    musicProgressRaf = 0;
}

function syncMusicProgressLoop() {
    const audioTime = Math.min(musicAudio.currentTime, musicDuration);
    const visualTime = getMusicVisualTime();
    if (Math.abs(audioTime - visualTime) > 0.24) {
        anchorMusicProgressVisual(audioTime);
        updateMusicProgress(audioTime);
    } else {
        updateMusicProgress(visualTime);
    }
    if (!musicAudio.paused && !musicAudio.ended) {
        musicProgressRaf = requestAnimationFrame(syncMusicProgressLoop);
    }
}

function startMusicProgressLoop() {
    stopMusicProgressLoop();
    musicProgressRaf = requestAnimationFrame(syncMusicProgressLoop);
}

function updateMusicTrackUI() {
    const track = MUSIC_TRACKS[musicTrackIndex];
    musicTitle.textContent = track.title;
    musicArt.textContent = '';

    if (track.art) {
        const image = document.createElement('img');
        image.src = track.art;
        image.alt = track.title;
        musicArt.appendChild(image);
    } else {
        musicArt.textContent = '🎵';
    }

    musicTrackDots.forEach((dot, index) => {
        dot.classList.toggle('active', index === musicTrackIndex);
    });
}

function loadMusicTrack(index, shouldPlay = false) {
    const nextIndex = (index + MUSIC_TRACKS.length) % MUSIC_TRACKS.length;
    const track = MUSIC_TRACKS[nextIndex];
    stopMusicProgressLoop();
    musicTrackIndex = nextIndex;
    musicDuration = track.fallbackDuration;
    musicCurrentTime = 0;
    musicVisualAnchorTime = 0;
    musicVisualAnchorNow = performance.now();
    musicAudio.src = encodeURI(track.src);
    musicAudio.load();
    setMusicPlaying(false);
    updateMusicTrackUI();
    updateMusicProgress(0);

    if (shouldPlay) {
        musicAudio.play().catch(() => setMusicPlaying(false));
    }
}

function switchMusicTrack(direction) {
    const shouldResume = !musicAudio.paused && !musicAudio.ended;
    loadMusicTrack(musicTrackIndex + direction, shouldResume);
}

function switchToRandomMusicTrack() {
    if (MUSIC_TRACKS.length < 2) return;

    const shouldResume = !musicAudio.paused && !musicAudio.ended;
    let nextIndex = musicTrackIndex;
    while (nextIndex === musicTrackIndex) {
        nextIndex = Math.floor(Math.random() * MUSIC_TRACKS.length);
    }
    loadMusicTrack(nextIndex, shouldResume);
}

musicRandomButton.addEventListener('click', switchToRandomMusicTrack);

musicPlayButton.addEventListener('click', () => {
    if (musicAudio.ended) {
        updateMusicProgress(0, true);
    }

    if (musicAudio.paused) {
        musicAudio.play().catch(() => setMusicPlaying(false));
    } else {
        musicAudio.pause();
    }
});

musicAudio.addEventListener('play', () => {
    setMusicPlaying(true);
    anchorMusicProgressVisual(musicAudio.currentTime);
    startMusicProgressLoop();
});
musicAudio.addEventListener('pause', () => {
    setMusicPlaying(false);
    stopMusicProgressLoop();
    updateMusicProgress(Math.min(musicAudio.currentTime, musicDuration));
    anchorMusicProgressVisual(musicCurrentTime);
});
musicAudio.addEventListener('loadedmetadata', () => {
    if (Number.isFinite(musicAudio.duration) && musicAudio.duration > 0) {
        musicDuration = musicAudio.duration;
        updateMusicProgress(Math.min(musicAudio.currentTime, musicDuration));
        anchorMusicProgressVisual(musicCurrentTime);
    }
});
musicAudio.addEventListener('timeupdate', () => {
    if (musicAudio.paused || musicAudio.ended) {
        updateMusicProgress(Math.min(musicAudio.currentTime, musicDuration));
    }
});
musicAudio.addEventListener('ended', () => {
    setMusicPlaying(false);
    stopMusicProgressLoop();
    updateMusicProgress(musicDuration);
    anchorMusicProgressVisual(musicDuration);
});

musicProgressShell.addEventListener('mousedown', (e) => e.stopPropagation());

function syncMusicProgressExpansionOrigin() {
    let left = 0;
    let top = 0;
    let node = musicProgress;

    while (node && node !== musicCard) {
        left += node.offsetLeft || 0;
        top += node.offsetTop || 0;
        node = node.offsetParent;
    }

    musicCard.style.setProperty('--progress-origin-left', `${left}px`);
    musicCard.style.setProperty('--progress-origin-top', `${top}px`);
    musicCard.style.setProperty('--progress-origin-width', `${musicProgress.offsetWidth}px`);
    musicCard.style.setProperty('--progress-origin-height', `${musicProgress.offsetHeight}px`);
}

musicProgressShell.addEventListener('mouseenter', () => {
    clearTimeout(musicProgressExpandTimer);
    syncMusicProgressExpansionOrigin();
    musicProgressExpandTimer = setTimeout(() => {
        musicCard.classList.add('progress-expanded');
        musicProgressExpandTimer = null;
    }, 600);
});

musicProgressShell.addEventListener('mouseleave', () => {
    clearTimeout(musicProgressExpandTimer);
    musicProgressExpandTimer = null;
});

musicCard.addEventListener('mouseleave', () => {
    clearTimeout(musicProgressExpandTimer);
    musicProgressExpandTimer = null;
    musicCard.classList.remove('progress-expanded');
});

function updateMusicProgressFromCardPointer(e) {
    if (musicDuration <= 0) return;
    const rect = musicCard.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    updateMusicProgress(ratio * musicDuration, true);
}

musicProgressExpansion.addEventListener('mousedown', (e) => e.stopPropagation());

musicProgressExpansion.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    updateFlatCursorTarget(e);
    musicProgressExpansion.classList.add('is-dragging');
    musicProgressExpansion.setPointerCapture(e.pointerId);
    updateMusicProgressFromCardPointer(e);
});

musicProgressExpansion.addEventListener('pointermove', (e) => {
    if (!musicProgressExpansion.classList.contains('is-dragging')) return;
    updateFlatCursorTarget(e);
    updateMusicProgressFromCardPointer(e);
});

function stopExpandedMusicProgressDrag(e) {
    musicProgressExpansion.classList.remove('is-dragging');
    if (musicProgressExpansion.hasPointerCapture(e.pointerId)) {
        musicProgressExpansion.releasePointerCapture(e.pointerId);
    }
}

musicProgressExpansion.addEventListener('pointerup', stopExpandedMusicProgressDrag);
musicProgressExpansion.addEventListener('pointercancel', stopExpandedMusicProgressDrag);

musicProgressShell.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    updateFlatCursorTarget(e);
    musicProgress.classList.add('is-dragging');
    musicProgressShell.setPointerCapture(e.pointerId);
    updateMusicProgressFromPointer(e);
});

musicProgressShell.addEventListener('pointermove', (e) => {
    if (!musicProgress.classList.contains('is-dragging')) return;
    updateFlatCursorTarget(e);
    updateMusicProgressFromPointer(e);
});

function stopMusicProgressDrag(e) {
    musicProgress.classList.remove('is-dragging');
    if (musicProgressShell.hasPointerCapture(e.pointerId)) {
        musicProgressShell.releasePointerCapture(e.pointerId);
    }
}

musicProgressShell.addEventListener('pointerup', stopMusicProgressDrag);
musicProgressShell.addEventListener('pointercancel', stopMusicProgressDrag);

musicProgress.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        e.preventDefault();
        updateMusicProgress(musicCurrentTime + 5, true);
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        e.preventDefault();
        updateMusicProgress(musicCurrentTime - 5, true);
    }
    if (e.key === 'Home') {
        e.preventDefault();
        updateMusicProgress(0, true);
    }
    if (e.key === 'End') {
        e.preventDefault();
        updateMusicProgress(musicDuration, true);
    }
});

let musicSwipePointerId = null;
let musicSwipeStartX = 0;
let musicSwipeStartY = 0;

musicCard.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.music-progress-shell, .music-progress-expansion, .music-play, .music-random')) return;
    musicSwipePointerId = e.pointerId;
    musicSwipeStartX = e.clientX;
    musicSwipeStartY = e.clientY;
    musicCard.setPointerCapture(e.pointerId);
});

musicCard.addEventListener('pointermove', (e) => {
    if (e.pointerId !== musicSwipePointerId) return;
    const dx = e.clientX - musicSwipeStartX;
    const dy = e.clientY - musicSwipeStartY;
    if (Math.abs(dx) > 14 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        e.preventDefault();
        updateFlatCursorTarget(e);
    }
});

function stopMusicSwipe(e) {
    if (e.pointerId !== musicSwipePointerId) return;
    const dx = e.clientX - musicSwipeStartX;
    const dy = e.clientY - musicSwipeStartY;
    musicSwipePointerId = null;

    if (musicCard.hasPointerCapture(e.pointerId)) {
        musicCard.releasePointerCapture(e.pointerId);
    }

    if (Math.abs(dx) >= 45 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        switchMusicTrack(dx < 0 ? 1 : -1);
    }
}

musicCard.addEventListener('pointerup', stopMusicSwipe);
musicCard.addEventListener('pointercancel', stopMusicSwipe);

loadMusicTrack(0);
requestAnimationFrame(syncMusicProgressExpansionOrigin);
window.addEventListener('resize', syncMusicProgressExpansionOrigin);

const timerPage = document.getElementById('timer-page');
const timerContainer = document.getElementById('timer-container');
const timerClockGhost = document.getElementById('timer-clock-ghost');
const recordsCard = document.getElementById('records-card');
const timeCard = document.getElementById('time-card');
const timerClose = document.getElementById('timer-close');
let timeCardRestoreTimer = null;

function playCardBounce(card, depth = 0.95, duration = 150, pressDuration = 0) {
    if (card._bounceTimeout) {
        clearTimeout(card._bounceTimeout);
        card._bounceTimeout = null;
    }

    card._currentScale = depth;
    card.style.transition = pressDuration > 0 ? `transform ${pressDuration}ms ease-out` : 'none';
    card.style.transform = getCardPressTransform(card, depth);
    if (pressDuration === 0) {
        void card.offsetWidth;
    }
    setTimeout(() => {
        card.style.transition = `transform ${duration}ms ease-out`;
        card.style.transform = getCardPressTransform(card, 1);
        card._currentScale = 1;
        card._bounceTimeout = setTimeout(() => {
            card.style.transition = '';
            card.style.transform = '';
            card._bounceTimeout = null;
        }, duration + 10);
    }, pressDuration);
}

function setTimerStartRect(rect) {
    const radius = getComputedStyle(timeCard).borderRadius;
    timerPage.style.setProperty('--start-left', rect.left + 'px');
    timerPage.style.setProperty('--start-top', rect.top + 'px');
    timerPage.style.setProperty('--start-width', rect.width + 'px');
    timerPage.style.setProperty('--start-height', rect.height + 'px');
    timerPage.style.setProperty('--start-radius', radius);
    timerContainer.style.setProperty('--start-left', rect.left + 'px');
    timerContainer.style.setProperty('--start-top', rect.top + 'px');
    timerContainer.style.setProperty('--start-width', rect.width + 'px');
    timerContainer.style.setProperty('--start-height', rect.height + 'px');
    timerContainer.style.setProperty('--start-radius', radius);
}

timeCard.style.cursor = 'pointer';
timeCard.addEventListener('click', () => {
    if (timerPage.classList.contains('active') || timerPage.classList.contains('opening')) return;
    clearTimeout(timeCardRestoreTimer);
    const rect = timeCard.getBoundingClientRect();
    timerClockGhost.innerHTML = `<div class="time-display">${document.getElementById('time').innerHTML}</div>`;
    timerContainer.style.cssText = '';
    recordsCard.style.cssText = '';
    setTimerStartRect(rect);
    recordsCard.style.transition = 'none';
    recordsCard.style.left = rect.left + 'px';
    recordsCard.style.top = rect.top + 'px';
    recordsCard.style.width = rect.width + 'px';
    recordsCard.style.height = rect.height + 'px';
    recordsCard.style.borderRadius = getComputedStyle(timeCard).borderRadius;
    recordsCard.style.opacity = '0';
    recordsCard.style.transform = 'scale(0.72)';
    recordsCard.style.filter = 'blur(12px) saturate(1.25)';
    timeCard.style.opacity = '0';
    const activeTimerTab = document.querySelector('.timer-tab.active')?.dataset.tab || 'stopwatch';
    timerPage.classList.toggle('stopwatch-mode', activeTimerTab === 'stopwatch');
    timerPage.classList.toggle('countdown-mode', activeTimerTab === 'countdown');
    timerPage.classList.add('opening');
    void timerContainer.offsetWidth;
    void recordsCard.offsetWidth;
    requestAnimationFrame(() => {
        recordsCard.style.transition = '';
        recordsCard.style.left = '';
        recordsCard.style.top = '';
        recordsCard.style.width = '';
        recordsCard.style.height = '';
        recordsCard.style.borderRadius = '';
        recordsCard.style.opacity = '';
        recordsCard.style.transform = '';
        recordsCard.style.filter = '';
        timerPage.classList.add('active');
        timerPage.classList.remove('opening');
    });
});

timerClose.addEventListener('click', () => {
    const rect = timeCard.getBoundingClientRect();
    const bg = timerPage.querySelector('.timer-bg');
    timerClockGhost.innerHTML = `<div class="time-display">${document.getElementById('time').innerHTML}</div>`;
    timerPage.classList.add('closing');
    bg.style.transition = 'opacity 0.35s ease-in';
    bg.style.opacity = '0';
    timerContainer.style.transition = 'left 0.35s ease-in, top 0.35s ease-in, width 0.35s ease-in, height 0.35s ease-in, border-radius 0.35s ease-in';
    timerContainer.style.left = rect.left + 'px';
    timerContainer.style.top = rect.top + 'px';
    timerContainer.style.width = rect.width + 'px';
    timerContainer.style.height = rect.height + 'px';
    timerContainer.style.borderRadius = getComputedStyle(timeCard).borderRadius;
    timerContainer.style.transform = 'none';
    recordsCard.style.transition = 'left 0.35s ease-in, top 0.35s ease-in, width 0.35s ease-in, height 0.35s ease-in, border-radius 0.35s ease-in, opacity 0.25s ease-in, filter 0.25s ease-in, transform 0.35s ease-in';
    recordsCard.style.left = rect.left + 'px';
    recordsCard.style.top = rect.top + 'px';
    recordsCard.style.width = rect.width + 'px';
    recordsCard.style.height = rect.height + 'px';
    recordsCard.style.borderRadius = getComputedStyle(timeCard).borderRadius;
    recordsCard.style.opacity = '0';
    recordsCard.style.filter = 'blur(16px) saturate(1.35)';
    recordsCard.style.transform = 'scale(0.72)';
    clearTimeout(timeCardRestoreTimer);
    timeCardRestoreTimer = setTimeout(() => {
        timeCard.style.opacity = '1';
    }, 330);
    setTimeout(() => {
        timerPage.classList.remove('active');
        timerPage.classList.remove('opening');
        timerPage.classList.remove('closing');
        timerPage.classList.remove('liquid-merging');
        timerContainer.style.cssText = '';
        recordsCard.style.cssText = '';
        timerClockGhost.innerHTML = '';
        timeCard.style.opacity = '';
        bg.style.cssText = '';
        playCardBounce(timeCard, 0.9, 200, 110);
    }, 370);
});

document.querySelectorAll('.timer-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;
        const fromTab = document.querySelector('.timer-tab.active')?.dataset.tab;
        document.querySelectorAll('.timer-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        timerPage.classList.toggle('stopwatch-mode', targetTab === 'stopwatch');
        timerPage.classList.toggle('countdown-mode', targetTab === 'countdown');

        if (fromTab === 'stopwatch' && targetTab === 'countdown') {
            timerPage.classList.add('liquid-merging');
            setTimeout(() => timerPage.classList.remove('liquid-merging'), 680);
        }

        if (targetTab === 'countdown' && !cdRunning) {
            updateCDDisplay();
        }

        document.getElementById('stopwatch-panel').classList.toggle('hidden', targetTab !== 'stopwatch');
        document.getElementById('countdown-panel').classList.toggle('hidden', targetTab !== 'countdown');
    });
});

function createTimerSegHTML() {
    let html = '';
    for (let i = 0; i < 2; i++) {
        html += `<div class="seg-timer-digit">${createDigitHTML()}</div>`;
    }
    return html;
}

function setTimerDigit(container, tens, ones) {
    const digits = container.querySelectorAll('.seg-timer-digit');
    setDigit(digits[0], tens);
    setDigit(digits[1], ones);
}

const swSegDisplay = document.getElementById('stopwatch-display');
swSegDisplay.innerHTML =
    createTimerSegHTML() +
    '<div class="seg-timer-colon"><div class="seg-timer-dot"></div><div class="seg-timer-dot"></div></div>' +
    createTimerSegHTML() +
    '<div class="seg-timer-dot-sep"></div>' +
    createTimerSegHTML() +
    `<div class="seg-timer-digit">${createDigitHTML()}</div>`;

let swInterval = null;
let swStart = 0;
let swElapsed = 0;
let swRunning = false;
let recordCount = 0;

const swStartBtn = document.getElementById('sw-start');
const swResetBtn = document.getElementById('sw-reset');
const swRecordBtn = document.getElementById('sw-record');
const recordsList = document.getElementById('records-list');
const recordsScrollbar = document.getElementById('records-scrollbar');
const recordsScrollThumb = document.getElementById('records-scroll-thumb');
let recordsThumbDragging = false;
let recordsThumbStartY = 0;
let recordsScrollStartTop = 0;

function getRecordsScrollMetrics() {
    const maxScroll = Math.max(0, recordsList.scrollHeight - recordsList.clientHeight);
    const trackHeight = recordsScrollbar.clientHeight;
    const thumbHeight = maxScroll > 0
        ? Math.max(30, (recordsList.clientHeight / recordsList.scrollHeight) * trackHeight)
        : trackHeight;
    const maxThumbTop = Math.max(0, trackHeight - thumbHeight);
    return { maxScroll, trackHeight, thumbHeight, maxThumbTop };
}

function updateRecordsScrollbar() {
    const { maxScroll, thumbHeight, maxThumbTop } = getRecordsScrollMetrics();
    recordsCard.classList.toggle('records-scrollable', maxScroll > 1);
    recordsScrollThumb.style.height = `${thumbHeight}px`;
    const thumbTop = maxScroll > 0 ? (recordsList.scrollTop / maxScroll) * maxThumbTop : 0;
    recordsScrollThumb.style.transform = `translateY(${thumbTop}px)`;
}

recordsList.addEventListener('scroll', updateRecordsScrollbar);
window.addEventListener('resize', updateRecordsScrollbar);

const recordsObserver = new MutationObserver(() => requestAnimationFrame(updateRecordsScrollbar));
recordsObserver.observe(recordsList, { childList: true });

recordsScrollbar.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    updateFlatCursorTarget(e);
    const { maxScroll, thumbHeight, maxThumbTop } = getRecordsScrollMetrics();
    if (maxScroll <= 0) return;

    if (e.target === recordsScrollbar) {
        const trackRect = recordsScrollbar.getBoundingClientRect();
        const targetTop = Math.max(0, Math.min(maxThumbTop, e.clientY - trackRect.top - thumbHeight / 2));
        recordsList.scrollTop = (targetTop / maxThumbTop) * maxScroll;
    }

    recordsThumbDragging = true;
    recordsThumbStartY = e.clientY;
    recordsScrollStartTop = recordsList.scrollTop;
    recordsScrollbar.classList.add('is-dragging');
    recordsScrollbar.setPointerCapture(e.pointerId);
});

recordsScrollbar.addEventListener('pointermove', (e) => {
    if (!recordsThumbDragging) return;
    e.preventDefault();
    updateFlatCursorTarget(e);
    const { maxScroll, maxThumbTop } = getRecordsScrollMetrics();
    const dragRatio = maxThumbTop > 0 ? (e.clientY - recordsThumbStartY) / maxThumbTop : 0;
    recordsList.scrollTop = recordsScrollStartTop + dragRatio * maxScroll;
});

function stopRecordsScrollbarDrag(e) {
    if (!recordsThumbDragging) return;
    recordsThumbDragging = false;
    recordsScrollbar.classList.remove('is-dragging');
    if (recordsScrollbar.hasPointerCapture(e.pointerId)) {
        recordsScrollbar.releasePointerCapture(e.pointerId);
    }
    updateFlatCursorTarget(e);
}

recordsScrollbar.addEventListener('pointerup', stopRecordsScrollbarDrag);
recordsScrollbar.addEventListener('pointercancel', stopRecordsScrollbarDrag);
updateRecordsScrollbar();

function updateSWDisplay(ms) {
    const elapsed = Math.max(0, Math.floor(ms));
    const m = Math.floor(elapsed / 60000);
    const s = Math.floor((elapsed % 60000) / 1000);
    const ms3 = elapsed % 1000;
    const segs = swSegDisplay.querySelectorAll('.seg-timer-digit');
    setDigit(segs[0], Math.floor(m / 10));
    setDigit(segs[1], m % 10);
    setDigit(segs[2], Math.floor(s / 10));
    setDigit(segs[3], s % 10);
    setDigit(segs[4], Math.floor(ms3 / 100));
    setDigit(segs[5], Math.floor((ms3 % 100) / 10));
    setDigit(segs[6], ms3 % 10);
}

function formatSWText(ms) {
    const elapsed = Math.max(0, Math.floor(ms));
    const m = Math.floor(elapsed / 60000);
    const s = Math.floor((elapsed % 60000) / 1000);
    const ms3 = elapsed % 1000;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms3).padStart(3, '0')}`;
}

updateSWDisplay(0);

function updateSW() {
    swElapsed = performance.now() - swStart;
    updateSWDisplay(swElapsed);
}

swStartBtn.addEventListener('click', () => {
    if (swRunning) {
        cancelAnimationFrame(swInterval);
        swRunning = false;
        swStartBtn.textContent = '继续';
        swRecordBtn.disabled = false;
        return;
    }

    swStart = performance.now() - swElapsed;
    swRunning = true;
    swStartBtn.textContent = '暂停';
    swResetBtn.disabled = false;
    swRecordBtn.disabled = false;
    swInterval = requestAnimationFrame(function tick() {
        updateSW();
        if (swRunning) {
            swInterval = requestAnimationFrame(tick);
        }
    });
});

swResetBtn.addEventListener('click', () => {
    cancelAnimationFrame(swInterval);
    swRunning = false;
    swElapsed = 0;
    updateSWDisplay(0);
    recordsList.innerHTML = '';
    recordCount = 0;
    swStartBtn.disabled = false;
    swStartBtn.textContent = '开始';
    swResetBtn.disabled = true;
    swRecordBtn.disabled = true;
});

swRecordBtn.addEventListener('click', () => {
    if (!swRunning && swElapsed > 0) {
        recordCount++;
        const item = document.createElement('div');
        item.className = 'record-item';
        item.innerHTML = `<span class="record-num">#${recordCount}</span><span>${formatSWText(swElapsed)}</span>`;
        recordsList.prepend(item);
        swRecordBtn.disabled = true;
    } else if (swRunning) {
        recordCount++;
        const item = document.createElement('div');
        item.className = 'record-item';
        item.innerHTML = `<span class="record-num">#${recordCount}</span><span>${formatSWText(swElapsed)}</span>`;
        recordsList.prepend(item);
    }
});

let cdHour = 0, cdMin = 0, cdSec = 0;
let cdInterval = null;
let cdTotal = 0;
let cdRemaining = 0;
let cdRunning = false;
let cdLastTick = 0;

const cdSegHour = document.getElementById('cd-seg-hour');
const cdSegMin = document.getElementById('cd-seg-min');
const cdSegSec = document.getElementById('cd-seg-sec');
const cdStartBtn = document.getElementById('cd-start');
const cdResetBtn = document.getElementById('cd-reset');

cdSegHour.innerHTML = createTimerSegHTML();
cdSegMin.innerHTML = createTimerSegHTML();
cdSegSec.innerHTML = createTimerSegHTML();

function updateCDDisplay() {
    setTimerDigit(cdSegHour, Math.floor(cdHour / 10), cdHour % 10);
    setTimerDigit(cdSegMin, Math.floor(cdMin / 10), cdMin % 10);
    setTimerDigit(cdSegSec, Math.floor(cdSec / 10), cdSec % 10);
}

function updateCDFromRemaining() {
    const displayRemaining = Math.max(0, Math.ceil(cdRemaining));
    const h = Math.floor(displayRemaining / 3600);
    const m = Math.floor((displayRemaining % 3600) / 60);
    const s = displayRemaining % 60;
    setTimerDigit(cdSegHour, Math.floor(h / 10), h % 10);
    setTimerDigit(cdSegMin, Math.floor(m / 10), m % 10);
    setTimerDigit(cdSegSec, Math.floor(s / 10), s % 10);
}

const cdOvertime = document.getElementById('cd-overtime');
const cdOvertimeSeg = document.getElementById('cd-overtime-seg');
const cdDisplayWrapper = document.getElementById('cd-display-wrapper');
let cdOvertimeTransitionTimer = null;
const CD_OVERTIME_ANIMATION_MS = 560;
cdOvertimeSeg.innerHTML = createTimerSegHTML() +
    '<div class="seg-timer-colon"><div class="seg-timer-dot"></div><div class="seg-timer-dot"></div></div>' +
    createTimerSegHTML() +
    '<div class="seg-timer-colon"><div class="seg-timer-dot"></div><div class="seg-timer-dot"></div></div>' +
    createTimerSegHTML();

function clearCDOvertimeTransition() {
    if (cdOvertimeTransitionTimer) {
        clearTimeout(cdOvertimeTransitionTimer);
        cdOvertimeTransitionTimer = null;
    }
}

function updateCDOvertimeDisplay(seconds) {
    const overtime = Math.max(0, Math.floor(seconds));
    const oH = Math.floor(overtime / 3600);
    const oM = Math.floor((overtime % 3600) / 60);
    const oS = overtime % 60;
    const oSegs = cdOvertimeSeg.querySelectorAll('.seg-timer-digit');
    setDigit(oSegs[0], Math.floor(oH / 10));
    setDigit(oSegs[1], oH % 10);
    setDigit(oSegs[2], Math.floor(oM / 10));
    setDigit(oSegs[3], oM % 10);
    setDigit(oSegs[4], Math.floor(oS / 10));
    setDigit(oSegs[5], oS % 10);
}

function showCDOvertimeTransition() {
    clearCDOvertimeTransition();
    cdDisplayWrapper.classList.add('hidden');
    cdOvertime.classList.remove('hidden', 'is-resetting', 'is-overtime-active');
    void cdOvertime.offsetWidth;
    cdOvertime.classList.add('is-entering');
    cdOvertimeTransitionTimer = setTimeout(() => {
        cdOvertime.classList.remove('is-entering');
        cdOvertime.classList.add('is-overtime-active');
        cdOvertimeTransitionTimer = null;
    }, CD_OVERTIME_ANIMATION_MS);
}

function resetCDOvertimeView() {
    const wasOvertimeVisible = !cdOvertime.classList.contains('hidden');
    clearCDOvertimeTransition();

    if (wasOvertimeVisible) {
        updateCDOvertimeDisplay(0);
        cdDisplayWrapper.classList.add('hidden');
        cdOvertime.classList.remove('hidden', 'is-entering');
        cdOvertime.classList.add('is-overtime-active');
        void cdOvertime.offsetWidth;
        cdOvertime.classList.remove('is-overtime-active');
        cdOvertime.classList.add('is-resetting');
        cdOvertimeTransitionTimer = setTimeout(() => {
            cdOvertime.classList.remove('is-resetting');
            cdOvertime.classList.add('hidden');
            cdDisplayWrapper.classList.remove('hidden');
            cdOvertimeTransitionTimer = null;
        }, CD_OVERTIME_ANIMATION_MS);
        return;
    }

    cdOvertime.classList.remove('is-entering', 'is-resetting', 'is-overtime-active');
    cdOvertime.classList.add('hidden');
    cdDisplayWrapper.classList.remove('hidden');
}

function checkCDStartable() {
    cdStartBtn.disabled = (cdHour === 0 && cdMin === 0 && cdSec === 0);
}

updateCDDisplay();
checkCDStartable();

const cdGroups = document.querySelectorAll('.cd-group');

function closeCDWheels() {
    cdGroups.forEach(group => group.classList.remove('picking'));
}

function setCDUnit(unit, value) {
    if (unit === 'hour') cdHour = value;
    else if (unit === 'min') cdMin = value;
    else cdSec = value;
    cdTotal = cdHour * 3600 + cdMin * 60 + cdSec;
    cdRemaining = cdTotal;
    updateCDDisplay();
    checkCDStartable();
}

function syncCDWheelSelection(wheel) {
    const unit = wheel.dataset.unit;
    const items = wheel._items || [...wheel.querySelectorAll('.cd-wheel-item')];
    const center = wheel.scrollTop + wheel.clientHeight / 2;
    let selectedItem = items[0];
    let selectedDistance = Infinity;

    items.forEach(item => {
        const itemCenter = item._center;
        const distance = Math.abs(itemCenter - center);
        if (distance < selectedDistance) {
            selectedDistance = distance;
            selectedItem = item;
        }
    });

    const value = selectedItem._value;
    items.forEach(item => item.classList.toggle('selected', item === selectedItem));
    setCDUnit(unit, value);
}

function buildCDWheel(group) {
    const unit = group.dataset.unit;
    const maxVal = unit === 'hour' ? 99 : 59;
    const wheel = document.createElement('div');
    wheel.className = 'cd-wheel';
    wheel.dataset.unit = unit;
    let scrollSettleTimer = null;
    wheel.addEventListener('click', (e) => e.stopPropagation());
    wheel.addEventListener('wheel', (e) => e.stopPropagation(), { passive: true });
    wheel.addEventListener('scroll', () => {
        if (!group.classList.contains('picking')) return;
        clearTimeout(scrollSettleTimer);
        scrollSettleTimer = setTimeout(() => {
            if (!group.classList.contains('picking')) return;
            syncCDWheelSelection(wheel);
        }, 90);
    });

    for (let i = 0; i <= maxVal; i++) {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'cd-wheel-item';
        item.dataset.value = i;
        item._value = i;
        item.innerHTML = createTimerSegHTML();
        setTimerDigit(item, Math.floor(i / 10), i % 10);
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            setCDUnit(unit, i);
            closeCDWheels();
        });
        wheel.appendChild(item);
    }

    group.appendChild(wheel);
    wheel._items = [...wheel.querySelectorAll('.cd-wheel-item')];
    wheel._items.forEach(item => {
        item._center = item.offsetTop + item.offsetHeight / 2;
    });
}

cdGroups.forEach(group => {
    buildCDWheel(group);

    group.addEventListener('click', (e) => {
        e.stopPropagation();
        if (cdRunning) return;
        const wasOpen = group.classList.contains('picking');
        closeCDWheels();
        if (wasOpen) return;

        const unit = group.dataset.unit;
        const currentVal = unit === 'hour' ? cdHour : unit === 'min' ? cdMin : cdSec;
        const wheel = group.querySelector('.cd-wheel');
        wheel.querySelectorAll('.cd-wheel-item').forEach(item => {
            item.classList.toggle('selected', Number(item.dataset.value) === currentVal);
        });
        group.classList.add('picking');
        const selected = wheel.querySelector('.cd-wheel-item.selected');
        if (selected) {
            wheel.scrollTop = selected.offsetTop - (wheel.clientHeight - selected.clientHeight) / 2;
            syncCDWheelSelection(wheel);
        }
    });
});

document.addEventListener('click', (e) => {
    if (!e.target.closest('.cd-group')) {
        closeCDWheels();
    }
});

function tickCountdown() {
    const now = performance.now();
    const elapsed = (now - cdLastTick) / 1000;
    cdLastTick = now;
    cdRemaining -= elapsed;

    if (cdRemaining > -1) {
        updateCDFromRemaining();
        return;
    }

    updateCDOvertimeDisplay(Math.abs(cdRemaining) - 1);

    if (!cdDisplayWrapper.classList.contains('hidden')) {
        showCDOvertimeTransition();
        cdRunning = false;
        cdStartBtn.style.display = 'none';
        cdResetBtn.disabled = false;
    }
}

cdStartBtn.addEventListener('click', () => {
    if (cdRunning) {
        clearInterval(cdInterval);
        cdRunning = false;
        cdStartBtn.textContent = '继续';
        return;
    }

    if (!cdRunning && cdRemaining > -1) {
        cdRunning = true;
        cdStartBtn.textContent = '暂停';
        cdStartBtn.disabled = false;
        cdResetBtn.disabled = false;
        resetCDOvertimeView();
        if (cdRemaining === cdTotal) {
            cdRemaining -= 1;
            updateCDFromRemaining();
        }
        cdLastTick = performance.now();
        cdInterval = setInterval(tickCountdown, 40);
    }
});

cdResetBtn.addEventListener('click', () => {
    clearInterval(cdInterval);
    cdRunning = false;
    cdRemaining = cdTotal;
    updateCDFromRemaining();
    cdStartBtn.textContent = '开始';
    cdStartBtn.style.display = '';
    resetCDOvertimeView();
    checkCDStartable();
    cdResetBtn.disabled = true;
});
