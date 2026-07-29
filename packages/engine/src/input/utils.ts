import { KeyCode, type BrowserKeyCode } from "./types";

export const BROWSER_KEY_CODE_MAP: Readonly<Record<BrowserKeyCode, KeyCode>> = {
    // --- Control ---
    Backspace: KeyCode.Backspace,
    Tab: KeyCode.Tab,
    Enter: KeyCode.Return,
    Pause: KeyCode.Pause,
    Escape: KeyCode.Escape,
    Space: KeyCode.Space,

    // --- Numbers ---
    Digit0: KeyCode.Alpha0,
    Digit1: KeyCode.Alpha1,
    Digit2: KeyCode.Alpha2,
    Digit3: KeyCode.Alpha3,
    Digit4: KeyCode.Alpha4,
    Digit5: KeyCode.Alpha5,
    Digit6: KeyCode.Alpha6,
    Digit7: KeyCode.Alpha7,
    Digit8: KeyCode.Alpha8,
    Digit9: KeyCode.Alpha9,

    // --- Letters ---
    KeyA: KeyCode.A,
    KeyB: KeyCode.B,
    KeyC: KeyCode.C,
    KeyD: KeyCode.D,
    KeyE: KeyCode.E,
    KeyF: KeyCode.F,
    KeyG: KeyCode.G,
    KeyH: KeyCode.H,
    KeyI: KeyCode.I,
    KeyJ: KeyCode.J,
    KeyK: KeyCode.K,
    KeyL: KeyCode.L,
    KeyM: KeyCode.M,
    KeyN: KeyCode.N,
    KeyO: KeyCode.O,
    KeyP: KeyCode.P,
    KeyQ: KeyCode.Q,
    KeyR: KeyCode.R,
    KeyS: KeyCode.S,
    KeyT: KeyCode.T,
    KeyU: KeyCode.U,
    KeyV: KeyCode.V,
    KeyW: KeyCode.W,
    KeyX: KeyCode.X,
    KeyY: KeyCode.Y,
    KeyZ: KeyCode.Z,

    // --- Symbols ---
    Minus: KeyCode.Minus,
    Equal: KeyCode.Equals,
    BracketLeft: KeyCode.LeftBracket,
    BracketRight: KeyCode.RightBracket,
    Backslash: KeyCode.Backslash,
    Semicolon: KeyCode.Semicolon,
    Quote: KeyCode.Quote,
    Backquote: KeyCode.BackQuote,
    Comma: KeyCode.Comma,
    Period: KeyCode.Period,
    Slash: KeyCode.Slash,

    // --- Navigation ---
    Delete: KeyCode.Delete,
    Insert: KeyCode.Insert,
    Home: KeyCode.Home,
    End: KeyCode.End,
    PageUp: KeyCode.PageUp,
    PageDown: KeyCode.PageDown,

    // --- Arrows ---
    ArrowUp: KeyCode.UpArrow,
    ArrowDown: KeyCode.DownArrow,
    ArrowLeft: KeyCode.LeftArrow,
    ArrowRight: KeyCode.RightArrow,

    // --- Numpad ---
    Numpad0: KeyCode.Keypad0,
    Numpad1: KeyCode.Keypad1,
    Numpad2: KeyCode.Keypad2,
    Numpad3: KeyCode.Keypad3,
    Numpad4: KeyCode.Keypad4,
    Numpad5: KeyCode.Keypad5,
    Numpad6: KeyCode.Keypad6,
    Numpad7: KeyCode.Keypad7,
    Numpad8: KeyCode.Keypad8,
    Numpad9: KeyCode.Keypad9,
    NumpadDecimal: KeyCode.KeypadPeriod,
    NumpadDivide: KeyCode.KeypadDivide,
    NumpadMultiply: KeyCode.KeypadMultiply,
    NumpadSubtract: KeyCode.KeypadMinus,
    NumpadAdd: KeyCode.KeypadPlus,
    NumpadEnter: KeyCode.KeypadEnter,
    NumpadEqual: KeyCode.KeypadEquals,

    // --- Function Keys ---
    F1: KeyCode.F1,
    F2: KeyCode.F2,
    F3: KeyCode.F3,
    F4: KeyCode.F4,
    F5: KeyCode.F5,
    F6: KeyCode.F6,
    F7: KeyCode.F7,
    F8: KeyCode.F8,
    F9: KeyCode.F9,
    F10: KeyCode.F10,
    F11: KeyCode.F11,
    F12: KeyCode.F12,
    F13: KeyCode.F13,
    F14: KeyCode.F14,
    F15: KeyCode.F15,

    // --- Locks ---
    NumLock: KeyCode.Numlock,
    CapsLock: KeyCode.CapsLock,
    ScrollLock: KeyCode.ScrollLock,

    // --- Modifiers ---
    ShiftLeft: KeyCode.LeftShift,
    ShiftRight: KeyCode.RightShift,
    ControlLeft: KeyCode.LeftControl,
    ControlRight: KeyCode.RightControl,
    AltLeft: KeyCode.LeftAlt,
    AltRight: KeyCode.RightAlt,

    // --- System ---
    MetaLeft: KeyCode.LeftCommand,
    MetaRight: KeyCode.RightCommand,
    ContextMenu: KeyCode.Menu,
    PrintScreen: KeyCode.Print,
};

export function getBrowserKeyCode(code: string): KeyCode {
    return BROWSER_KEY_CODE_MAP[code as BrowserKeyCode] ?? KeyCode.None;
}

export function isBrowserKeyCode(code: string): code is BrowserKeyCode {
    return code in BROWSER_KEY_CODE_MAP;
}