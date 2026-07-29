import type { ID } from "../types";

/**
 * Represents an object that has a stable unique identifier.
 *
 * Objects with an ID can be stored, retrieved, and managed using maps,
 * entity managers, selection systems, history systems, and serialization.
 *
 * This interface should be used for entities that require stable identity
 * across the system lifecycle.
 *
 * Представляет объект, имеющий стабильный уникальный идентификатор.
 *
 * Объекты с ID могут храниться, находиться и управляться через Map,
 * менеджеры сущностей, систему выделения, историю и сериализацию.
 *
 * Используется для сущностей, которым нужна стабильная идентичность
 * на протяжении жизненного цикла системы.
 */
export interface IWithId<TId extends ID = ID> {
    readonly id: TId;
}


/**
 * Represents an object that has a type classification.
 *
 * Type is used for registries, factories, renderer mapping,
 * tool systems, and other systems where objects are grouped
 * or created by type.
 *
 * Type describes what the object is, not which specific instance it is.
 *
 * Представляет объект, имеющий тип (классификацию).
 *
 * Тип используется в реестрах (registry), фабриках, системе рендереров,
 * инструментах и других системах, где объекты группируются
 * или создаются по типу.
 *
 * Тип описывает, ЧТО это за объект, а не КАКОЙ это конкретно объект.
 */
export interface IWithType<TType = string> {
    readonly type: TType;
}


/**
 * Represents an entity that has both a unique identifier and a type.
 *
 * Combines identity (id) and classification (type).
 * Most engine entities implement this interface, such as:
 * nodes, layers, handles, tools, effects, commands, etc.
 *
 * Entities can be stored in entity managers (by id)
 * and processed via registries (by type).
 *
 * Представляет сущность, имеющую и уникальный идентификатор, и тип.
 *
 * Объединяет идентичность (id) и классификацию (type).
 * Большинство сущностей движка реализуют этот интерфейс:
 * ноды, слои, хендлы, инструменты, эффекты, команды и т.д.
 *
 * Сущности могут храниться в менеджерах (по id)
 * и обрабатываться через registry (по type).
 */
export interface IEntity<
    TType = string,
    TId extends ID = ID
> extends IWithId<TId>, IWithType<TType> { }