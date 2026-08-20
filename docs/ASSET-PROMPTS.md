# Промпты для генерации ассетов шутера

**Дата:** 2026-08-14
**Связано с:** `docs/SHOOTER-ROADMAP.md` (фазы 0.2, 0.5, 1.4, 2.2)

---

## 1. Что диктует эта конкретная игра

Прежде чем генерировать — четыре ограничения, которые отличают этот проект от обычной 2D-игры.

### 1.1 Фон — живая камера, а не наш арт
Фоном служит комната пользователя: непредсказуемые цвета, текстуры, освещение. Плоский мультяшный спрайт может полностью потеряться на стене похожего цвета.

**Вывод:** нужен **неон/свечение с жёстким контуром**. Светящийся объект читается на любом фоне, потому что он ярче почти всего, что попадает в кадр.

### 1.2 Чёрный фон = бесплатная прозрачность
Для светящихся ассетов **не нужен альфа-канал и не нужно удалять фон**. Генерируем на **чистом чёрном**, рисуем аддитивно:

```ts
ctx.globalCompositeOperation = 'lighter';  // чёрный становится невидимым
ctx.drawImage(sprite, x, y);
ctx.globalCompositeOperation = 'source-over';
```

Это убирает целый шаг пайплайна (rembg / remove.bg) и работает идеально для вспышек, взрывов, трассеров, ореолов.

Альфа нужна **только** непрозрачным объектам, которые должны перекрывать фон (корпус дрона, иконки HUD).

### 1.3 НЕ генерировать кадры анимации
ИИ плохо держит консистентность между кадрами: дрон на кадре 2 отличается от кадра 1 деталями, и анимация «дёргается».

**Вывод:** один статичный спрайт на сущность, **анимация — кодом** (пульс масштаба, вращение, затухание альфы, частицы). Текущий рендерер уже так работает (мишени сжимаются, трассеры гаснут). Это дешевле, стабильнее и не требует спрайт-листов.

Исключение — взрыв: там кадры оправданы, но проще взять одну «вспышку» и размножить её частицами.

### 1.4 Зеркало и мелкий размер
- Канвас зеркалится (`scaleX(-1)`) до фазы 0.1 → **никакого текста и цифр внутри текстур**; предпочитать **радиально или билатерально симметричные** формы, они переживают отражение.
- Мишени рендерятся ~84–128 px. Мелкая деталь превратится в кашу → **жирный силуэт, крупные формы, сильный контур**.
- Генерировать 1024×1024, ужимать до 256 (мишени) / 512 (взрыв). Downscale даёт резкость.

---

## 2. Общие блоки промпта

Склеивать: `[СТИЛЬ] + [ОБЪЕКТ] + [ТЕХНИЧЕСКОЕ]`, минус — в negative.

**СТИЛЬ (один и тот же во всех промптах — держит единство арта):**
```
neon holographic arcade game sprite, glowing cyan and magenta rim light,
dark translucent core, crisp emissive edges, high contrast, bold readable
silhouette, synthwave palette
```

**ТЕХНИЧЕСКОЕ (для светящихся, аддитивный блендинг):**
```
centered, orthographic front view, isolated on pure solid black background,
symmetrical design, no text, no letters, no numbers, no watermark,
game asset sheet, 1024x1024
```

**ТЕХНИЧЕСКОЕ (для непрозрачных, нужен альфа-канал):**
```
centered, orthographic front view, isolated on flat neutral grey background,
clean cut-out silhouette, symmetrical design, no text, no letters, no numbers,
no shadow on ground, game asset, 1024x1024
```

**NEGATIVE (везде):**
```
text, letters, numbers, watermark, signature, UI frame, border, multiple objects,
cluttered background, scene, landscape, perspective, motion blur, photorealistic,
drop shadow, asymmetric, cropped
```

---

## 3. Промпты по ассетам

### 3.1 Обычная мишень — дрон (аддитивный, чёрный фон)
```
neon holographic arcade game sprite, glowing cyan and magenta rim light, dark
translucent core, crisp emissive edges, high contrast, bold readable silhouette,
synthwave palette, a hovering hexagonal drone with a single glowing eye core and
three symmetrical rotor rings, radially symmetric, centered, orthographic front
view, isolated on pure solid black background, no text, game asset, 1024x1024
```

### 3.2 Быстрая мелкая мишень
```
[СТИЛЬ], a small fast interceptor orb, sharp arrow-like fins pointing outward,
bright electric blue core, streamlined aggressive shape, radially symmetric,
[ТЕХНИЧЕСКОЕ-чёрный]
```

### 3.3 Бронированная мишень (2 попадания)
```
[СТИЛЬ], a heavy armored drone encased in thick angular plating, dim orange core
barely visible through armor slits, riveted metal segments, looks tough and slow,
radially symmetric, [ТЕХНИЧЕСКОЕ-чёрный]
```
*Ключ: визуально «толще» обычной — игрок должен понять, что нужно два выстрела, без подписи.*

### 3.4 Бомба — СТРЕЛЯТЬ НЕЛЬЗЯ (критично для читаемости)
```
[СТИЛЬ], a spherical proximity mine with yellow and black diagonal hazard
stripes, blinking red warning light on top, spikes around the equator, clearly
dangerous do-not-touch object, radially symmetric, [ТЕХНИЧЕСКОЕ-чёрный]
```
*Это единственный ассет, который должен **выбиваться** из общей палитры. Жёлто-чёрные полосы + красный — универсальный код «не трогать». Если он похож на остальные мишени — игрок будет по нему стрелять и злиться.*

### 3.5 Дульная вспышка (аддитивный)
```
[СТИЛЬ], a muzzle flash burst, radial star of white-hot light with cyan outer
glow, four sharp spikes plus soft bloom, very bright center, radially symmetric,
[ТЕХНИЧЕСКОЕ-чёрный]
```

### 3.6 Искра попадания
```
[СТИЛЬ], an impact spark burst, radiating white and yellow shards outward from a
bright core, sharp thin rays, energetic, radially symmetric,
[ТЕХНИЧЕСКОЕ-чёрный]
```

### 3.7 Взрыв (одна вспышка; кадры делать частицами в коде)
```
[СТИЛЬ], an energy explosion bloom, expanding ring shockwave with hot white
center fading to magenta edges, plasma tendrils, radially symmetric,
[ТЕХНИЧЕСКОЕ-чёрный], 512x512
```

### 3.8 Прицел / реticle (аддитивный)
```
[СТИЛЬ], a targeting reticle, thin glowing cyan brackets at four corners with a
small center dot, minimal HUD crosshair, clean geometric lines, radially
symmetric, [ТЕХНИЧЕСКОЕ-чёрный]
```
*Текущий вектор-прицел рисуется кодом и работает — этот ассет опционален.*

### 3.9 Иконки HUD (нужна АЛЬФА — непрозрачные)
```
[СТИЛЬ], a set of separate game HUD icons: a heart, a bullet cartridge, a
lightning bolt, flat emissive style, thick bold shapes readable at small size,
[ТЕХНИЧЕСКОЕ-серый]
```
*Генерировать по одной иконке за раз — «сет» одним изображением придётся резать вручную.*

### 3.10 Пауэрап
```
[СТИЛЬ], a floating power-up capsule, glowing green core inside a rotating
hexagonal cage, inviting friendly shape, radially symmetric,
[ТЕХНИЧЕСКОЕ-чёрный]
```

---

## 4. Пайплайн после генерации

| Тип | Шаги |
|---|---|
| **Светящиеся** (3.1–3.8, 3.10) | 1. Проверить, что фон реально чёрный (`#000`), а не тёмно-серый — серый «засветится» при аддитивном блендинге. При необходимости поднять контраст/уровни. 2. Ужать до 256 px. 3. Положить в `public/textures/`. 4. Рисовать через `globalCompositeOperation = 'lighter'`. |
| **Непрозрачные** (3.9) | 1. Удалить фон (`rembg`, remove.bg, Photoshop «Выделить предмет»). 2. Сохранить PNG с альфой. 3. Проверить края на ореол от фона. |

**Проверка «читается ли на камере»:** положить спрайт поверх скриншота своей реальной комнаты и посмотреть с 2–3 метров. Если сливается — усилить контур/свечение, а не насыщенность.

**Атлас:** когда набор устоится — упаковать в один PNG (`free-tex-packer`, TexturePacker) и грузить одним запросом; `lib/spriteSheet.ts` из фазы 0.2 рассчитан на атлас.

---

## 5. Чем генерировать

| Инструмент | Плюс | Минус |
|---|---|---|
| **Flux / SDXL локально** | Бесплатно, повторяемо (seed), можно img2img для вариаций | Нужна установка и GPU |
| **Midjourney** | Лучшая эстетика «из коробки» | Платно, слабый контроль точной формы |
| **DALL·E / ChatGPT** | Проще всего, понимает длинные инструкции | Хуже с «строго на чёрном», часто добавляет сцену |
| **Nano Banana / Gemini** | Хорош в правках по словам («убери текст») | Стиль плавает между генерациями |

**Совет по единству стиля:** зафиксировать **seed** (где возможно) и менять только описание объекта, оставляя блок `[СТИЛЬ]` посимвольно одинаковым. Разъезжающийся стиль — главная причина, почему набор ассетов выглядит «сборной солянкой».

---

## 6. Минимальный набор для старта

Не генерировать всё сразу. Для играбельной Фазы 1–2 хватит **четырёх**:

1. Обычная мишень (3.1)
2. Бомба «не стрелять» (3.4)
3. Дульная вспышка (3.5)
4. Взрыв (3.7)

Остальное — вариации, когда базовый цикл уже ощущается хорошо.
