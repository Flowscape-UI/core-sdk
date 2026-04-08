import type { IAttachable, IDestroyable, IUpdatable, IWithId } from "../core/interfaces";

export interface IInputControllerBase<T = unknown> extends IWithId, IAttachable<T>, IUpdatable, IDestroyable { }

export enum KeyCode {
    // --- Control Keys ---
    None = 0, // No key assigned
    Backspace = 8, // `Backspace` - deletes the character before the cursor
    Tab = 9, // `Tab` - inserts a tab or moves focus to the next field
    Clear = 12, // `Clear` - clears current input on supported keyboards
    Return = 13, // `Enter` / `Return` - confirms input or inserts a new line
    Enter = 13, // `Enter` / `Return` - confirms input or inserts a new line
    Pause = 19, // `Pause` - pauses execution on supported systems
    Escape = 27, // `Esc` - cancels the current action or closes dialogs
    Space = 32, // `Space` - inserts a space character

    // --- Symbols & Punctuation ---
    Exclaim = 33, // `!` - exclamation mark key
    DoubleQuote = 34, // `"` - double quote key
    Hash = 35, // `#` - hash / number sign key
    Dollar = 36, // `$` - dollar sign key
    Ampersand = 38, // `&` - ampersand key
    Quote = 39, // `'` - single quote / apostrophe key
    LeftParen = 40, // `(` - left parenthesis key
    RightParen = 41, // `)` - right parenthesis key
    Asterisk = 42, // `*` - asterisk key
    Plus = 43, // `+` - plus key
    Comma = 44, // `,` - comma key
    Minus = 45, // `-` - minus / hyphen key
    Period = 46, // `.` - period / dot key
    Slash = 47, // `/` - slash key

    Colon = 58, // `:` - colon key
    Semicolon = 59, // `;` - semicolon key
    Less = 60, // `<` - less-than key
    Equals = 61, // `=` - equals key
    Greater = 62, // `>` - greater-than key
    Question = 63, // `?` - question mark key
    At = 64, // `@` - at sign key

    LeftBracket = 91, // `[` - left square bracket key
    Backslash = 92, // `\` - backslash key
    RightBracket = 93, // `]` - right square bracket key
    Caret = 94, // `^` - caret key
    Underscore = 95, // `_` - underscore key
    BackQuote = 96, // `` ` `` - back quote / grave accent key

    // --- Number Keys ---
    Alpha0 = 48, // `0` - top-row digit key `0`
    Alpha1 = 49, // `1` - top-row digit key `1`
    Alpha2 = 50, // `2` - top-row digit key `2`
    Alpha3 = 51, // `3` - top-row digit key `3`
    Alpha4 = 52, // `4` - top-row digit key `4`
    Alpha5 = 53, // `5` - top-row digit key `5`
    Alpha6 = 54, // `6` - top-row digit key `6`
    Alpha7 = 55, // `7` - top-row digit key `7`
    Alpha8 = 56, // `8` - top-row digit key `8`
    Alpha9 = 57, // `9` - top-row digit key `9`

    // --- Letter Keys ---
    A = 97, // `A` - letter key A
    B = 98, // `B` - letter key B
    C = 99, // `C` - letter key C
    D = 100, // `D` - letter key D
    E = 101, // `E` - letter key E
    F = 102, // `F` - letter key F
    G = 103, // `G` - letter key G
    H = 104, // `H` - letter key H
    I = 105, // `I` - letter key I
    J = 106, // `J` - letter key J
    K = 107, // `K` - letter key K
    L = 108, // `L` - letter key L
    M = 109, // `M` - letter key M
    N = 110, // `N` - letter key N
    O = 111, // `O` - letter key O
    P = 112, // `P` - letter key P
    Q = 113, // `Q` - letter key Q
    R = 114, // `R` - letter key R
    S = 115, // `S` - letter key S
    T = 116, // `T` - letter key T
    U = 117, // `U` - letter key U
    V = 118, // `V` - letter key V
    W = 119, // `W` - letter key W
    X = 120, // `X` - letter key X
    Y = 121, // `Y` - letter key Y
    Z = 122, // `Z` - letter key Z

    // --- Navigation & Editing ---
    Delete = 127, // `Delete` - deletes the character after the cursor
    Insert = 277, // `Insert` - toggles insert / overwrite mode
    Home = 278, // `Home` - moves to the start of a line or document
    End = 279, // `End` - moves to the end of a line or document
    PageUp = 280, // `Page Up` - scrolls one page up
    PageDown = 281, // `Page Down` - scrolls one page down

    // --- Arrow Keys ---
    UpArrow = 273, // `↑` - arrow key up
    DownArrow = 274, // `↓` - arrow key down
    RightArrow = 275, // `→` - arrow key right
    LeftArrow = 276, // `←` - arrow key left

    // --- Keypad ---
    Keypad0 = 256, // `Numpad 0` - numeric keypad digit 0
    Keypad1 = 257, // `Numpad 1` - numeric keypad digit 1
    Keypad2 = 258, // `Numpad 2` - numeric keypad digit 2
    Keypad3 = 259, // `Numpad 3` - numeric keypad digit 3
    Keypad4 = 260, // `Numpad 4` - numeric keypad digit 4
    Keypad5 = 261, // `Numpad 5` - numeric keypad digit 5
    Keypad6 = 262, // `Numpad 6` - numeric keypad digit 6
    Keypad7 = 263, // `Numpad 7` - numeric keypad digit 7
    Keypad8 = 264, // `Numpad 8` - numeric keypad digit 8
    Keypad9 = 265, // `Numpad 9` - numeric keypad digit 9
    KeypadPeriod = 266, // `Numpad .` - numeric keypad decimal separator
    KeypadDivide = 267, // `Numpad /` - numeric keypad divide key
    KeypadMultiply = 268, // `Numpad *` - numeric keypad multiply key
    KeypadMinus = 269, // `Numpad -` - numeric keypad minus key
    KeypadPlus = 270, // `Numpad +` - numeric keypad plus key
    KeypadEnter = 271, // `Numpad Enter` - numeric keypad enter key
    KeypadEquals = 272, // `Numpad =` - numeric keypad equals key

    // --- Function Keys ---
    F1 = 282, // `F1` - function key F1
    F2 = 283, // `F2` - function key F2
    F3 = 284, // `F3` - function key F3
    F4 = 285, // `F4` - function key F4
    F5 = 286, // `F5` - function key F5
    F6 = 287, // `F6` - function key F6
    F7 = 288, // `F7` - function key F7
    F8 = 289, // `F8` - function key F8
    F9 = 290, // `F9` - function key F9
    F10 = 291, // `F10` - function key F10
    F11 = 292, // `F11` - function key F11
    F12 = 293, // `F12` - function key F12
    F13 = 294, // `F13` - function key F13
    F14 = 295, // `F14` - function key F14
    F15 = 296, // `F15` - function key F15

    // --- Lock Keys ---
    Numlock = 300, // `Num Lock` - toggles numeric keypad mode
    CapsLock = 301, // `Caps Lock` - toggles uppercase letter mode
    ScrollLock = 302, // `Scroll Lock` - toggles scroll lock mode

    // --- Modifier Keys ---
    RightShift = 303, // `Right Shift` - right shift modifier key
    LeftShift = 304, // `Left Shift` - left shift modifier key
    RightControl = 305, // `Right Ctrl` - right control modifier key
    LeftControl = 306, // `Left Ctrl` - left control modifier key
    RightAlt = 307, // `Right Alt` - right alt modifier key
    LeftAlt = 308, // `Left Alt` - left alt modifier key
    AltGr = 313, // `AltGr` - alternate graphic modifier key

    // --- System / OS Keys ---
    RightApple = 309, // `Right Command` - right macOS command key (legacy Apple name)
    RightCommand = 309, // `Right Command` - right macOS command key
    LeftApple = 310, // `Left Command` - left macOS command key (legacy Apple name)
    LeftCommand = 310, // `Left Command` - left macOS command key
    LeftWindows = 311, // `Left Win` - left Windows / Meta key
    RightWindows = 312, // `Right Win` - right Windows / Meta key
    Help = 315, // `Help` - help key on supported keyboards
    Print = 316, // `Print Screen` - captures the current screen on supported systems
    SysReq = 317, // `SysRq` - system request key
    Break = 318, // `Break` - break key on supported systems
    Menu = 319, // `Menu` - context menu key

    // --- Mouse Buttons ---
    Mouse0 = 323, // `Mouse Left` - primary mouse button
    Mouse1 = 324, // `Mouse Right` - secondary mouse button
    Mouse2 = 325, // `Mouse Middle` - middle mouse button / wheel click
    Mouse3 = 326, // `Mouse 4` - additional mouse button 4
    Mouse4 = 327, // `Mouse 5` - additional mouse button 5
    Mouse5 = 328, // `Mouse 6` - additional mouse button 6
    Mouse6 = 329, // `Mouse 7` - additional mouse button 7
}

export enum MouseButton {
    Left = 0,
    Middle = 1,
    Right = 2,
}

export type BrowserKeyCode =
    | "Backspace"
    | "Tab"
    | "Enter"
    | "Pause"
    | "Escape"
    | "Space"

    | "Digit0"
    | "Digit1"
    | "Digit2"
    | "Digit3"
    | "Digit4"
    | "Digit5"
    | "Digit6"
    | "Digit7"
    | "Digit8"
    | "Digit9"

    | "KeyA"
    | "KeyB"
    | "KeyC"
    | "KeyD"
    | "KeyE"
    | "KeyF"
    | "KeyG"
    | "KeyH"
    | "KeyI"
    | "KeyJ"
    | "KeyK"
    | "KeyL"
    | "KeyM"
    | "KeyN"
    | "KeyO"
    | "KeyP"
    | "KeyQ"
    | "KeyR"
    | "KeyS"
    | "KeyT"
    | "KeyU"
    | "KeyV"
    | "KeyW"
    | "KeyX"
    | "KeyY"
    | "KeyZ"

    | "Minus"
    | "Equal"
    | "BracketLeft"
    | "BracketRight"
    | "Backslash"
    | "Semicolon"
    | "Quote"
    | "Backquote"
    | "Comma"
    | "Period"
    | "Slash"

    | "Delete"
    | "Insert"
    | "Home"
    | "End"
    | "PageUp"
    | "PageDown"

    | "ArrowUp"
    | "ArrowDown"
    | "ArrowLeft"
    | "ArrowRight"

    | "Numpad0"
    | "Numpad1"
    | "Numpad2"
    | "Numpad3"
    | "Numpad4"
    | "Numpad5"
    | "Numpad6"
    | "Numpad7"
    | "Numpad8"
    | "Numpad9"
    | "NumpadDecimal"
    | "NumpadDivide"
    | "NumpadMultiply"
    | "NumpadSubtract"
    | "NumpadAdd"
    | "NumpadEnter"
    | "NumpadEqual"

    | "F1"
    | "F2"
    | "F3"
    | "F4"
    | "F5"
    | "F6"
    | "F7"
    | "F8"
    | "F9"
    | "F10"
    | "F11"
    | "F12"
    | "F13"
    | "F14"
    | "F15"

    | "NumLock"
    | "CapsLock"
    | "ScrollLock"

    | "ShiftLeft"
    | "ShiftRight"
    | "ControlLeft"
    | "ControlRight"
    | "AltLeft"
    | "AltRight"
    | "MetaLeft"
    | "MetaRight"

    | "ContextMenu"
    | "PrintScreen";