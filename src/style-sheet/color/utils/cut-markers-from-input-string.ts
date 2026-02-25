/**
 * Normalizes specific functional blocks in a string by matching high-level signatures 
 * and replacing them with a target signature while preserving internal arguments.
 * * @remarks
 * This version filters out empty functions like `linear-gradient()` and only 
 * returns blocks that contain actual parameters.
 * * @param inputString - The raw string to process.
 * @param markers - An array of function signatures to match (e.g., `['linear-gradient()']`).
 * @param replaceMarker - The target signature to normalize to (e.g., `'gradient()'`).
 * @returns A comma-separated string of normalized functions with content.
 */
export function replaceMarkersFromInputString(
    inputString: string,
    markers: string[],
    replaceMarker: string,
): string {
    const results: string[] = [];
    let i = 0;

    const cleanMarkers = markers.map(m => m.replace('()', '('));
    const cleanReplace = replaceMarker.replace('()', '(');

    while (i < inputString.length) {
        let startIdx = -1;
        let activeMarker = "";

        for (const marker of cleanMarkers) {
            const idx = inputString.indexOf(marker, i);
            if (idx !== -1 && (startIdx === -1 || idx < startIdx)) {
                startIdx = idx;
                activeMarker = marker;
            }
        }

        if (startIdx === -1) break;

        const openBracketIdx = startIdx + activeMarker.length - 1;

        let bracketLevel = 0;
        let contentEnd = -1;

        for (let j = openBracketIdx; j < inputString.length; j++) {
            if (inputString[j] === '(') bracketLevel++;
            else if (inputString[j] === ')') bracketLevel--;

            if (bracketLevel === 0) {
                contentEnd = j;
                break;
            }
        }

        if (contentEnd !== -1) {
            // Извлекаем контент и убираем лишние пробелы
            const content = inputString.substring(openBracketIdx + 1, contentEnd).trim();
            
            // Гвардия: добавляем только если внутри скобок что-то есть
            if (content.length > 0) {
                results.push(`${cleanReplace}${content})`);
            }
            
            i = contentEnd + 1;
        } else {
            break;
        }
    }

    return results.join(', ');
}