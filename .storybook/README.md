# Storybook 9 - Конфигурация

## Установленные пакеты

- **storybook**: 9.1.16
- **@storybook/html-vite**: 9.1.16
- **@storybook/addon-essentials**: 9.0.0-alpha.10
- **@storybook/addon-interactions**: 9.0.0-alpha.10
- **@storybook/addon-links**: 9.0.0-alpha.10
- **@storybook/addon-docs**: 9.0.0-alpha.10
- **@storybook/blocks**: 9.0.0-alpha.10

## Запуск

```bash
# Режим разработки
npm run storybook
# или
bun run storybook

# Сборка для продакшена
npm run build-storybook
# или
bun run build-storybook
```

## Структура

```
.storybook/
├── main.ts          # Основная конфигурация
├── preview.ts       # Настройки preview
└── tsconfig.json    # TypeScript конфигурация

stories/
├── Introduction.mdx        # Введение
├── Playground.stories.ts   # Интерактивная песочница
├── Hotkeys.mdx            # Горячие клавиши
├── Plugins.mdx            # Документация по плагинам
├── Examples.mdx           # Примеры использования
└── page.css               # Стили

public/
└── images/                # Статические изображения
    └── .gitkeep
```

## Важные изменения для Storybook 9

1. **Импорты MDX**: Используйте `@storybook/blocks` вместо `@storybook/addon-docs/blocks`

   ```tsx
   import { Meta } from '@storybook/blocks';
   ```

2. **Типы для stories**: Используйте `@storybook/html` для типов

   ```tsx
   import type { Meta, StoryObj } from '@storybook/html';
   ```

3. **Статические файлы**: Размещайте в директории `public/`

## Примечания

- Версия 9.1.16 - последняя стабильная версия Storybook 9
- Аддоны используют версию 9.0.0-alpha.10 (последняя доступная для Storybook 9)
- Для изображений в playground добавьте `logo.png` и `img.jpg` в `public/images/`
