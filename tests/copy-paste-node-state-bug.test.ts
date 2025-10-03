import { describe, it, expect, beforeEach } from 'vitest';
import Konva from 'konva';
import { CoreEngine } from '../src/core/CoreEngine';
import { SelectionPlugin } from '../src/plugins/SelectionPlugin';
import { NodeHotkeysPlugin } from '../src/plugins/NodeHotkeysPlugin';

describe('КРИТИЧЕСКИЙ БАГ: Ноды возвращаются к исходным размерам при копировании', () => {
  let container: HTMLDivElement;
  let core: CoreEngine;
  let selectionPlugin: SelectionPlugin;
  let hotkeysPlugin: NodeHotkeysPlugin;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    core = new CoreEngine({
      container,
      width: 800,
      height: 600,
    });

    selectionPlugin = new SelectionPlugin();
    hotkeysPlugin = new NodeHotkeysPlugin();

    core.plugins.addPlugins([selectionPlugin, hotkeysPlugin]);
  });

  describe('Изменение размеров ноды после добавления в группу', () => {
    it('должно сохранять ТЕКУЩИЕ размеры ноды, а не исходные', () => {
      // Создаём ноду с исходными размерами
      const node = core.nodes.addShape({
        x: 100,
        y: 100,
        width: 50,
        height: 50,
        fill: 'blue',
      });

      const nodeKonva = node.getNode() as unknown as Konva.Rect;

      console.log('=== ИСХОДНОЕ СОСТОЯНИЕ ===');
      console.log('Исходные размеры:', nodeKonva.width(), 'x', nodeKonva.height());

      // Создаём группу
      const group = core.nodes.addGroup({
        x: 0,
        y: 0,
      });

      const groupKonva = group.getNode() as unknown as Konva.Group;

      // Добавляем ноду в группу
      nodeKonva.moveTo(groupKonva);

      // ВАЖНО: Изменяем размеры ноды ПОСЛЕ добавления в группу
      nodeKonva.width(100); // Было 50, стало 100
      nodeKonva.height(80); // Было 50, стало 80

      console.log('=== ПОСЛЕ ИЗМЕНЕНИЯ ===');
      console.log('Новые размеры:', nodeKonva.width(), 'x', nodeKonva.height());

      // Копируем группу
      (selectionPlugin as any)._select(group);

      const copyEvent = new KeyboardEvent('keydown', {
        code: 'KeyC',
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(copyEvent);

      // Вставляем
      const pasteEvent = new KeyboardEvent('keydown', {
        code: 'KeyV',
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(pasteEvent);

      // Получаем новую группу
      const allNodes = core.nodes.list();
      const groups = allNodes.filter((n) => n.constructor.name === 'GroupNode');
      expect(groups.length).toBe(2);

      const newGroup = groups[1];
      const newGroupKonva = newGroup.getNode() as unknown as Konva.Group;

      // Получаем дочернюю ноду
      const children = newGroupKonva.getChildren();
      expect(children.length).toBe(1);

      const newNodeKonva = children[0] as Konva.Rect;

      console.log('=== ПОСЛЕ КОПИРОВАНИЯ ===');
      console.log('Размеры скопированной ноды:', newNodeKonva.width(), 'x', newNodeKonva.height());

      // КРИТИЧЕСКАЯ ПРОВЕРКА: размеры должны быть ТЕКУЩИЕ (100x80), а не исходные (50x50)
      expect(newNodeKonva.width()).toBe(100); // ❌ БАГ: может вернуться к 50
      expect(newNodeKonva.height()).toBe(80); // ❌ БАГ: может вернуться к 50
    });

    it('должно сохранять ТЕКУЩУЮ ротацию ноды, а не исходную', () => {
      // Создаём ноду без ротации
      const node = core.nodes.addShape({
        x: 100,
        y: 100,
        width: 60,
        height: 40,
        fill: 'red',
      });

      const nodeKonva = node.getNode() as unknown as Konva.Rect;

      console.log('=== ИСХОДНОЕ СОСТОЯНИЕ ===');
      console.log('Исходная ротация:', nodeKonva.rotation());

      // Создаём группу
      const group = core.nodes.addGroup({
        x: 0,
        y: 0,
      });

      const groupKonva = group.getNode() as unknown as Konva.Group;
      nodeKonva.moveTo(groupKonva);

      // ВАЖНО: Поворачиваем ноду ПОСЛЕ добавления в группу
      nodeKonva.rotation(45); // Было 0, стало 45

      console.log('=== ПОСЛЕ ИЗМЕНЕНИЯ ===');
      console.log('Новая ротация:', nodeKonva.rotation());

      // Копируем группу
      (selectionPlugin as any)._select(group);

      const copyEvent = new KeyboardEvent('keydown', {
        code: 'KeyC',
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(copyEvent);

      const pasteEvent = new KeyboardEvent('keydown', {
        code: 'KeyV',
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(pasteEvent);

      // Получаем новую группу
      const allNodes = core.nodes.list();
      const groups = allNodes.filter((n) => n.constructor.name === 'GroupNode');
      const newGroup = groups[1];
      const newGroupKonva = newGroup.getNode() as unknown as Konva.Group;

      const children = newGroupKonva.getChildren();
      const newNodeKonva = children[0] as Konva.Rect;

      console.log('=== ПОСЛЕ КОПИРОВАНИЯ ===');
      console.log('Ротация скопированной ноды:', newNodeKonva.rotation());

      // КРИТИЧЕСКАЯ ПРОВЕРКА: ротация должна быть ТЕКУЩАЯ (45), а не исходная (0)
      expect(newNodeKonva.rotation()).toBeCloseTo(45, 1); // ❌ БАГ: может вернуться к 0
    });

    it('должно сохранять ТЕКУЩИЙ масштаб ноды, а не исходный', () => {
      // Создаём ноду без масштаба
      const node = core.nodes.addCircle({
        x: 100,
        y: 100,
        radius: 30,
        fill: 'green',
      });

      const nodeKonva = node.getNode() as unknown as Konva.Circle;

      console.log('=== ИСХОДНОЕ СОСТОЯНИЕ ===');
      console.log('Исходный масштаб:', nodeKonva.scaleX(), nodeKonva.scaleY());

      // Создаём группу
      const group = core.nodes.addGroup({
        x: 0,
        y: 0,
      });

      const groupKonva = group.getNode() as unknown as Konva.Group;
      nodeKonva.moveTo(groupKonva);

      // ВАЖНО: Масштабируем ноду ПОСЛЕ добавления в группу
      nodeKonva.scaleX(2); // Было 1, стало 2
      nodeKonva.scaleY(1.5); // Было 1, стало 1.5

      console.log('=== ПОСЛЕ ИЗМЕНЕНИЯ ===');
      console.log('Новый масштаб:', nodeKonva.scaleX(), nodeKonva.scaleY());

      // Копируем группу
      (selectionPlugin as any)._select(group);

      const copyEvent = new KeyboardEvent('keydown', {
        code: 'KeyC',
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(copyEvent);

      const pasteEvent = new KeyboardEvent('keydown', {
        code: 'KeyV',
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(pasteEvent);

      // Получаем новую группу
      const allNodes = core.nodes.list();
      const groups = allNodes.filter((n) => n.constructor.name === 'GroupNode');
      const newGroup = groups[1];
      const newGroupKonva = newGroup.getNode() as unknown as Konva.Group;

      const children = newGroupKonva.getChildren();
      const newNodeKonva = children[0] as Konva.Circle;

      console.log('=== ПОСЛЕ КОПИРОВАНИЯ ===');
      console.log('Масштаб скопированной ноды:', newNodeKonva.scaleX(), newNodeKonva.scaleY());

      // КРИТИЧЕСКАЯ ПРОВЕРКА: масштаб должен быть ТЕКУЩИЙ (2, 1.5), а не исходный (1, 1)
      expect(newNodeKonva.scaleX()).toBeCloseTo(2, 2); // ❌ БАГ: может вернуться к 1
      expect(newNodeKonva.scaleY()).toBeCloseTo(1.5, 2); // ❌ БАГ: может вернуться к 1
    });
  });

  describe('Множественные изменения ноды в разных группах', () => {
    it('должно сохранять последнее состояние ноды после перемещения между группами', () => {
      // Создаём ноду с исходными параметрами
      const node = core.nodes.addShape({
        x: 50,
        y: 50,
        width: 40,
        height: 40,
        fill: 'yellow',
      });

      const nodeKonva = node.getNode() as unknown as Konva.Rect;

      console.log('=== ИСХОДНОЕ СОСТОЯНИЕ ===');
      console.log('Размеры:', nodeKonva.width(), 'x', nodeKonva.height());
      console.log('Ротация:', nodeKonva.rotation());
      console.log('Масштаб:', nodeKonva.scaleX(), nodeKonva.scaleY());

      // Создаём первую группу
      const group1 = core.nodes.addGroup({ x: 0, y: 0 });
      const group1Konva = group1.getNode() as unknown as Konva.Group;
      nodeKonva.moveTo(group1Konva);

      // Изменяем в первой группе
      nodeKonva.width(60);
      nodeKonva.height(60);
      nodeKonva.rotation(30);

      console.log('=== ПОСЛЕ ПЕРВОЙ ГРУППЫ ===');
      console.log('Размеры:', nodeKonva.width(), 'x', nodeKonva.height());
      console.log('Ротация:', nodeKonva.rotation());

      // Создаём вторую группу
      const group2 = core.nodes.addGroup({ x: 0, y: 0 });
      const group2Konva = group2.getNode() as unknown as Konva.Group;
      nodeKonva.moveTo(group2Konva);

      // Изменяем во второй группе
      nodeKonva.width(80);
      nodeKonva.height(70);
      nodeKonva.rotation(60);
      nodeKonva.scaleX(1.5);

      console.log('=== ПОСЛЕ ВТОРОЙ ГРУППЫ (ФИНАЛЬНОЕ СОСТОЯНИЕ) ===');
      console.log('Размеры:', nodeKonva.width(), 'x', nodeKonva.height());
      console.log('Ротация:', nodeKonva.rotation());
      console.log('Масштаб:', nodeKonva.scaleX());

      // Копируем вторую группу
      (selectionPlugin as any)._select(group2);

      const copyEvent = new KeyboardEvent('keydown', {
        code: 'KeyC',
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(copyEvent);

      const pasteEvent = new KeyboardEvent('keydown', {
        code: 'KeyV',
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(pasteEvent);

      // Получаем новую группу
      const allNodes = core.nodes.list();
      const groups = allNodes.filter((n) => n.constructor.name === 'GroupNode');
      const newGroup = groups[groups.length - 1];
      const newGroupKonva = newGroup.getNode() as unknown as Konva.Group;

      const children = newGroupKonva.getChildren();
      const newNodeKonva = children[0] as Konva.Rect;

      console.log('=== ПОСЛЕ КОПИРОВАНИЯ ===');
      console.log('Размеры:', newNodeKonva.width(), 'x', newNodeKonva.height());
      console.log('Ротация:', newNodeKonva.rotation());
      console.log('Масштаб:', newNodeKonva.scaleX());

      // КРИТИЧЕСКАЯ ПРОВЕРКА: должно быть ПОСЛЕДНЕЕ состояние (80x70, rotation=60, scaleX=1.5)
      // НЕ исходное (40x40, rotation=0, scaleX=1)
      // НЕ из первой группы (60x60, rotation=30)
      expect(newNodeKonva.width()).toBe(80); // ❌ БАГ: может вернуться к 40 или 60
      expect(newNodeKonva.height()).toBe(70); // ❌ БАГ: может вернуться к 40 или 60
      expect(newNodeKonva.rotation()).toBeCloseTo(60, 1); // ❌ БАГ: может вернуться к 0 или 30
      expect(newNodeKonva.scaleX()).toBeCloseTo(1.5, 2); // ❌ БАГ: может вернуться к 1
    });
  });

  describe('Вырезание и вставка с изменёнными параметрами', () => {
    it('должно сохранять изменённые параметры при вырезании/вставке', () => {
      // Создаём ноду
      const node = core.nodes.addShape({
        x: 100,
        y: 100,
        width: 50,
        height: 50,
        fill: 'purple',
      });

      const nodeKonva = node.getNode() as unknown as Konva.Rect;

      // Создаём группу
      const group = core.nodes.addGroup({ x: 0, y: 0 });
      const groupKonva = group.getNode() as unknown as Konva.Group;
      nodeKonva.moveTo(groupKonva);

      // Изменяем параметры
      nodeKonva.width(90);
      nodeKonva.height(75);
      nodeKonva.rotation(45);
      nodeKonva.scaleX(1.2);

      console.log('=== ДО ВЫРЕЗАНИЯ ===');
      console.log('Размеры:', nodeKonva.width(), 'x', nodeKonva.height());
      console.log('Ротация:', nodeKonva.rotation());
      console.log('Масштаб:', nodeKonva.scaleX());

      // Вырезаем группу
      (selectionPlugin as any)._select(group);

      const cutEvent = new KeyboardEvent('keydown', {
        code: 'KeyX',
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(cutEvent);

      // Вставляем
      const pasteEvent = new KeyboardEvent('keydown', {
        code: 'KeyV',
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(pasteEvent);

      // Получаем восстановленную группу
      const allNodes = core.nodes.list();
      const groups = allNodes.filter((n) => n.constructor.name === 'GroupNode');
      const restoredGroup = groups[0];
      const restoredGroupKonva = restoredGroup.getNode() as unknown as Konva.Group;

      const children = restoredGroupKonva.getChildren();
      const restoredNodeKonva = children[0] as Konva.Rect;

      console.log('=== ПОСЛЕ ВСТАВКИ ===');
      console.log('Размеры:', restoredNodeKonva.width(), 'x', restoredNodeKonva.height());
      console.log('Ротация:', restoredNodeKonva.rotation());
      console.log('Масштаб:', restoredNodeKonva.scaleX());

      // КРИТИЧЕСКАЯ ПРОВЕРКА: должны сохраниться изменённые параметры
      expect(restoredNodeKonva.width()).toBe(90); // ❌ БАГ: может вернуться к 50
      expect(restoredNodeKonva.height()).toBe(75); // ❌ БАГ: может вернуться к 50
      expect(restoredNodeKonva.rotation()).toBeCloseTo(45, 1); // ❌ БАГ: может вернуться к 0
      expect(restoredNodeKonva.scaleX()).toBeCloseTo(1.2, 2); // ❌ БАГ: может вернуться к 1
    });
  });
});
