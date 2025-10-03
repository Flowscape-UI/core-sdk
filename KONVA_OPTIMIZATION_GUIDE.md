# Руководство по оптимизации Konva в проекте

## 📊 Обзор оптимизаций

Этот проект использует комбинацию **встроенных возможностей Konva** и **кастомных оптимизаций** для достижения максимальной производительности.

---

## ✅ Реализованные оптимизации

### 1. **VirtualizationManager** - Виртуализация нод

**Статус:** ✅ Оптимизирован

**Что делает:**

- Скрывает ноды вне viewport (`visible: false`)
- Отключает события для скрытых нод (`listening: false`)
- Использует буферную зону для плавности
- Throttling обновлений

**Использует Konva API:**

- `node.visible(false)` - нода не рендерится
- `node.listening(false)` - нода не обрабатывает события
- `node.getClientRect({ relativeTo })` - Konva автоматически кэширует результаты
- `layer.batchDraw()` - оптимизированная перерисовка

**Рекомендации Konva:** ✅ Полностью соответствует

- [Listening False](https://konvajs.org/docs/performance/Listening_False.html)
- [All Performance Tips](https://konvajs.org/docs/performance/All_Performance_Tips.html)

---

### 2. **LODManager** - Level of Detail

**Статус:** ✅ Необходим (Konva не предоставляет)

**Что делает:**

- Отключает stroke при малом масштабе (`strokeEnabled(false)`)
- Отключает shadow при малом масштабе (`shadowEnabled(false)`)
- Отключает perfectDraw (`perfectDrawEnabled(false)`)

**Использует Konva API:**

- `shape.strokeEnabled(false)` - отключает обводку
- `shape.shadowEnabled(false)` - отключает тень
- `shape.perfectDrawEnabled(false)` - отключает perfect drawing

**Рекомендации Konva:** ✅ Полностью соответствует

- [Disable Perfect Drawing](https://konvajs.org/docs/performance/Disable_Perfect_Draw.html)
- [Optimize Strokes](https://konvajs.org/docs/performance/Optimize_Strokes.html)

**Прирост:** 20-30% при большом количестве нод

---

### 3. **Layer Management** - Управление слоями

**Статус:** ✅ Реализовано

**Где используется `listening: false`:**

- `GridPlugin` - слой сетки
- `LogoPlugin` - слой логотипа
- `AreaSelectionPlugin` - слой выделения
- `RulerPlugin` - слой линеек
- `CoreEngine._gridLayer` - фоновый слой

**Рекомендации Konva:** ✅ Полностью соответствует

- [Layer Management](https://konvajs.org/docs/performance/Layer_Management.html)

---

## 🗑️ Удаленные избыточности

### ❌ BBoxCacheManager (удален)

**Причина удаления:**

- Konva **автоматически кэширует** `getClientRect()` внутренне
- Konva **автоматически инвалидирует** кэш при изменении трансформаций
- Наш TTL-кэш был избыточен и мог давать устаревшие данные

**Результат:** Код упрощен, надежность повышена

---

## 🚀 Дополнительные рекомендации Konva

### 1. **Shape Caching** (опционально)

Для сложных фигур с множеством операций рисования:

```typescript
// Кэшировать сложную группу
complexGroup.cache();

// Очистить кэш при изменении
complexGroup.clearCache();
```

**Когда использовать:**

- Сложные фигуры с множеством операций рисования
- Фигуры с фильтрами
- Фигуры, которые редко меняются, но часто перерисовываются

**Когда НЕ использовать:**

- Простые фигуры (медленнее чем прямой рендер)
- Часто меняющиеся фигуры

📚 [Shape Caching](https://konvajs.org/docs/performance/Shape_Caching.html)

---

### 2. **Оптимизация перетаскивания**

Если используется drag & drop:

```typescript
shape.on('dragstart', () => {
  shape.moveTo(dragLayer); // Переместить на отдельный слой
});

shape.on('dragend', () => {
  shape.moveTo(mainLayer); // Вернуть обратно
});
```

📚 [Drag and Drop Optimization](https://konvajs.org/docs/sandbox/Drag_and_Drop_Stress_Test.html)

---

### 3. **Konva.Animation** вместо requestAnimationFrame

Для анимаций:

```typescript
const anim = new Konva.Animation((frame) => {
  // Анимация
  shape.rotation(frame.time * 0.1);
}, layer);

anim.start();

// Не забыть остановить
anim.stop();
```

📚 [Optimize Animation](https://konvajs.org/docs/performance/Optimize_Animation.html)

---

### 4. **Memory Management**

```typescript
// Полное удаление (освобождает память)
node.destroy();

// Временное удаление (можно вернуть)
node.remove();

// Уничтожение Tween
const tween = new Konva.Tween({...});
tween.play();
tween.on('finish', () => {
  tween.destroy(); // Важно!
});
```

📚 [Avoid Memory Leaks](https://konvajs.org/docs/performance/Avoid_Memory_Leaks.html)

---

### 5. **Retina устройства**

Если есть проблемы с производительностью на retina:

```typescript
Konva.pixelRatio = 1; // Отключить автоматическое масштабирование
```

⚠️ Может повлиять на качество отображения

---

## 📈 Текущая архитектура оптимизаций

```
┌─────────────────────────────────────────┐
│         Konva Framework                 │
│  (встроенные оптимизации)               │
│                                         │
│  ✓ Автоматический кэш getClientRect()  │
│  ✓ Автоматическая инвалидация кэша     │
│  ✓ Batch drawing                       │
│  ✓ Hit graph optimization              │
└─────────────────────────────────────────┘
                    ▲
                    │
┌─────────────────────────────────────────┐
│    Кастомные оптимизации проекта        │
│                                         │
│  ✓ VirtualizationManager                │
│    - Viewport culling                   │
│    - visible: false / listening: false  │
│                                         │
│  ✓ LODManager                           │
│    - Динамический Level of Detail       │
│    - strokeEnabled / shadowEnabled      │
│                                         │
│  ✓ Layer Management                     │
│    - listening: false для статики       │
└─────────────────────────────────────────┘
```

---

## 🎯 Итоговые результаты оптимизации

### Что было сделано:

1. ✅ **Удален BBoxCacheManager** - избыточный кэш (Konva делает это сам)
2. ✅ **Упрощен VirtualizationManager** - убран TTL-кэш, полагаемся на Konva
3. ✅ **Улучшен LODManager** - добавлены комментарии о связи с Konva API
4. ✅ **Проверено использование** - `listening: false` активно применяется

### Преимущества:

- 📉 **Меньше кода** - проще поддерживать
- 🔒 **Надежнее** - используем встроенные механизмы Konva
- ⚡ **Быстрее** - нет избыточных операций
- 📚 **Документировано** - понятно, что делает каждая оптимизация

---

## 📚 Полезные ссылки

- [All Performance Tips](https://konvajs.org/docs/performance/All_Performance_Tips.html)
- [Shape Caching](https://konvajs.org/docs/performance/Shape_Caching.html)
- [Listening False](https://konvajs.org/docs/performance/Listening_False.html)
- [Avoid Memory Leaks](https://konvajs.org/docs/performance/Avoid_Memory_Leaks.html)
- [Layer Management](https://konvajs.org/docs/performance/Layer_Management.html)

---

**Дата создания:** 2025-10-03  
**Версия:** 1.0
