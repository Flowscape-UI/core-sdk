export interface IAttachable<T> {
    attach(target: T): void;
    detach(): void;
}