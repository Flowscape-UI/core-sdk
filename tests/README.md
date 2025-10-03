# Тесты для Flowscape Core SDK

## Установка зависимостей

```bash
npm install
```

## Запуск тестов

### Запуск всех тестов в watch-режиме

```bash
npm test
```

### Запуск тестов один раз

```bash
npm run test:run
```

### Запуск тестов с UI-интерфейсом

```bash
npm run test:ui
```

- **Одиночные ноды:**
  - Сохранение размеров (width/height)
  - Сохранение трансформаций (scaleX/scaleY/rotation)
  - Сохранение визуального размера (width \* scaleX)
- **Группы:**
  - Сохранение размеров нод в группе
  - Сохранение трансформаций группы
  - Сохранение визуальных размеров в трансформированной группе

- **Вырезание (Cut):**
  - Сохранение размеров и трансформаций после вырезания/вставки

### `grouping-sizes.test.ts`

Тесты для проверки сохранения размеров при группировке/разгруппировке:

- **Создание группы:**
  - Сохранение размеров нод при добавлении в группу
  - Сохранение трансформаций нод
  - Сохранение визуального размера

- **Трансформация группы:**
  - Изменение визуального размера нод при трансформации группы
  - Сохранение соотношения размеров при неравномерной трансформации

- **Разгруппировка:**
  - Сохранение визуального размера нод
  - Сохранение трансформаций (композиция трансформаций ноды и группы)

- **Временная группа (Temp Multi Group):**
  - Сохранение размеров при коммите временной группы в постоянную

- **Сложные сценарии:**
  - Группировка → трансформация → разгруппировка → копирование

## Что проверяют тесты

### 1. Размеры (width/height)

Проверяется, что базовые размеры нод не изменяются при операциях копирования/группировки.

### 2. Трансформации (scaleX/scaleY/rotation)

Проверяется, что трансформации сохраняются и правильно композируются при вложенных операциях.

### 3. Визуальный размер

Проверяется итоговый визуальный размер ноды на экране (учитывая все трансформации):

```
visualWidth = width * scaleX
visualHeight = height * scaleY
```

### 4. Композиция трансформаций

При вложенных группах проверяется правильная композиция трансформаций:

```
finalScaleX = nodeScaleX * groupScaleX
finalRotation = nodeRotation + groupRotation
```

## Как добавить новые тесты

1. Создайте новый файл `*.test.ts` в директории `tests/`
2. Импортируйте необходимые модули из `vitest` и SDK
3. Используйте `describe` для группировки тестов
4. Используйте `it` или `test` для отдельных тест-кейсов
5. Используйте `expect` для проверки ожиданий

Пример:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { CoreEngine } from '../src/core/CoreEngine';

describe('Моя фича', () => {
  let core: CoreEngine;

  beforeEach(() => {
    const container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);

    core = new CoreEngine({ container, width: 800, height: 600 });
  });

  it('должна работать правильно', () => {
    const node = core.nodes.addShape({ x: 0, y: 0, width: 100, height: 100 });
    expect(node.getNode().width()).toBe(100);
  });
});
```

## Отладка тестов

### Запуск конкретного теста

```bash
npm test -- copy-paste-sizes
```

### Запуск с подробным выводом

```bash
npm test -- --reporter=verbose
```

### Отладка в VS Code

Добавьте конфигурацию в `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Vitest Tests",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "test"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## Покрытие кода

После запуска `npm run test:coverage` отчёт будет доступен в директории `coverage/`:

- `coverage/index.html` - визуальный отчёт
- `coverage/coverage-final.json` - JSON-отчёт

## Проблемы и решения

### Canvas не поддерживается в тестах

Решение: используется mock canvas в `tests/setup.ts`

### Тесты падают с ошибкой "Cannot find module"

Решение: убедитесь, что установлены все зависимости (`npm install`)

### Тесты проходят локально, но падают в CI

Решение: проверьте версии Node.js и зависимостей в CI
