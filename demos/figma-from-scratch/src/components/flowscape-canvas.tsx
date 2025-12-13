// FlowscapeCanvas.tsx
import { useEffect, useRef, useState } from "react";
import Konva from "konva";
import {
    AreaSelectionPlugin,
    CameraHotkeysPlugin,
    CoreEngine,
    GridPlugin,
    NodeHotkeysPlugin,
    RulerGuidesPlugin,
    RulerHighlightPlugin,
    RulerManagerPlugin,
    RulerPlugin,
    SelectionPlugin,
} from "@flowscape-ui/core-sdk";

import { Toolbar } from "./toolbar";
import { NodeInspectorPanel } from "./props-panel";

// --- Локальный тип состояния панели (структурно совместим с тем, что ожидает NodeInspectorPanel)
type NodeStyle = {
    fill: { hex: string; opacity: number };                 // 0..100
    stroke: { hex: string; opacity: number; width: number };  // px
    radius: number;                                           // px
    text: { value: string; size: number; weight: "normal" | "bold"; align: "left" | "center" | "right" };
};

// --- Утилиты цвета
function rgbaFromHexOpacity(hex: string, opacityPct: number) {
    const o = Math.max(0, Math.min(100, Math.round(opacityPct))) / 100;
    const h = hex.replace("#", "");
    const n =
        h.length === 3
            ? parseInt(h.split("").map((c) => c + c).join(""), 16)
            : parseInt(h, 16);
    const r = (n >> 16) & 255,
        g = (n >> 8) & 255,
        b = n & 255;
    return `rgba(${r},${g},${b},${o})`;
}

function parseCssColorToHexOpacity(input?: string | null) {
    if (!input) return { hex: "#000000", opacity: 100 };
    const c = document.createElement("canvas");
    const ctx = c.getContext("2d");
    if (!ctx) return { hex: "#000000", opacity: 100 };
    ctx.fillStyle = String(input);
    const s = String(ctx.fillStyle);
    const m = s.match(/^rgba?\(([^)]+)\)$/i);
    if (!m) return { hex: s, opacity: 100 };
    const parts = m[1].split(",").map((v) => v.trim());
    const [r, g, b] = parts.slice(0, 3).map((v) => parseInt(v, 10));
    const a =
        parts[3] != null ? Math.max(0, Math.min(1, parseFloat(parts[3]))) : 1;
    const toHex = (x: number) => x.toString(16).padStart(2, "0");
    return { hex: `#${toHex(r)}${toHex(g)}${toHex(b)}`, opacity: Math.round(a * 100) };
}

export function FlowscapeCanvas() {
    const ref = useRef<HTMLDivElement | null>(null);
    const [engine, setEngine] = useState<CoreEngine | null>(null);

    // выделенная нода
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isTextNode, setIsTextNode] = useState(false);
    const [radiusSupported, setRadiusSupported] = useState(false);

    // состояние панели
    const [panelValue, setPanelValue] = useState<NodeStyle>({
        fill: { hex: "#AF33F2", opacity: 100 },
        stroke: { hex: "#000000", opacity: 100, width: 0 },
        radius: 0,
        text: { value: "", size: 24, weight: "normal", align: "left" },
    });

    // инициализация движка
    useEffect(() => {
        if (!ref.current) return;

        const eg = new CoreEngine({
            container: ref.current,
            autoResize: true,
            plugins: [
                new CameraHotkeysPlugin(),
                new GridPlugin({ enableSnap: true }),
                new SelectionPlugin({ dragEnabled: true }),
                new NodeHotkeysPlugin(),
                new AreaSelectionPlugin(),
                new RulerPlugin(),
                new RulerGuidesPlugin({ snapToGrid: true, gridStep: 1 }),
                new RulerHighlightPlugin({ highlightColor: "#2b83ff", highlightOpacity: 0.3 }),
                new RulerManagerPlugin({ enabled: true }),
            ],
        });

        setEngine(eg);
        return () => {
            // CoreEngine сам у вас управляет жизненным циклом; если нужен destroy — вызовите тут.
        };
    }, []);

    // Синхронизация панели при select/deselect (ТОЛЬКО чтение свойств)
    useEffect(() => {
        if (!engine) return;

        const onSelected = (baseNode: any) => {
            setSelectedId(baseNode.id);
            const shape = engine.nodes.findById(baseNode.id)?.getNode() as any;

            // fill
            const fillParsed = parseCssColorToHexOpacity(
                typeof shape.fill === "function" ? shape.fill() : null
            );

            // stroke
            const strokeParsed = parseCssColorToHexOpacity(
                typeof shape.stroke === "function" ? shape.stroke() : null
            );
            const strokeWidth =
                typeof shape.strokeWidth === "function"
                    ? Number(shape.strokeWidth() || 0)
                    : 0;

            // radius
            const canRadius = typeof shape.cornerRadius === "function";
            const currentRadius = canRadius ? Number(shape.cornerRadius() || 0) : 0;

            // text
            const isText = shape instanceof Konva.Text;
            const textVal =
                isText && typeof shape.text === "function"
                    ? String(shape.text() ?? "")
                    : "";
            const textSize =
                isText && typeof shape.fontSize === "function"
                    ? Number(shape.fontSize() || 24)
                    : 24;
            const fontStyle =
                isText && typeof shape.fontStyle === "function"
                    ? String(shape.fontStyle() || "normal")
                    : "normal";
            const align =
                isText && typeof shape.align === "function"
                    ? String(shape.align() || "left")
                    : "left";

            setIsTextNode(isText);
            setRadiusSupported(canRadius);
            setPanelValue({
                fill: { hex: fillParsed.hex, opacity: fillParsed.opacity },
                stroke: {
                    hex: strokeParsed.hex,
                    opacity: strokeParsed.opacity,
                    width: strokeWidth,
                },
                radius: currentRadius,
                text: {
                    value: textVal,
                    size: textSize,
                    weight: fontStyle.includes("bold") ? "bold" : "normal",
                    align: align === "center" || align === "right" ? (align as any) : "left",
                },
            });
        };

        const onDeselected = () => {
            setSelectedId(null);
            setIsTextNode(false);
            setRadiusSupported(false);
        };

        engine.eventBus.on("node:selected", onSelected);
        engine.eventBus.on("node:deselected", onDeselected);
        return () => {
            engine.eventBus.off("node:selected", onSelected);
            engine.eventBus.off("node:deselected", onDeselected);
        };
    }, [engine]);

    // Применение стиля ТОЛЬКО по действиям в панели
    const applyStyle = (next: NodeStyle) => {
        setPanelValue(next);
        if (!engine || !selectedId) return;

        const shape = engine.nodes.findById(selectedId)?.getNode() as any;

        // Fill
        if (typeof shape.fill === "function") {
            shape.fill(rgbaFromHexOpacity(next.fill.hex, next.fill.opacity));
        }

        // Stroke
        if (typeof shape.stroke === "function") {
            shape.stroke(rgbaFromHexOpacity(next.stroke.hex, next.stroke.opacity));
        }
        if (typeof shape.strokeWidth === "function") {
            shape.strokeWidth(next.stroke.width);
            if (typeof shape.strokeEnabled === "function") {
                shape.strokeEnabled((next.stroke.width ?? 0) > 0);
            }
        }
        // По желанию: не масштабировать толщину обводки при ресайзе
        if (typeof shape.strokeScaleEnabled === "function") {
            shape.strokeScaleEnabled(false);
        }

        // Radius
        if (typeof shape.cornerRadius === "function") {
            shape.cornerRadius(Math.max(0, Math.round(next.radius)));
        }

        // Text
        if (shape instanceof Konva.Text) {
            if (typeof shape.text === "function") shape.text(next.text.value);
            if (typeof shape.fontSize === "function") shape.fontSize(next.text.size);
            if (typeof shape.align === "function") shape.align(next.text.align);
            if (typeof shape.fontStyle === "function")
                shape.fontStyle(next.text.weight === "bold" ? "bold" : "normal");
            // Цвет текста — тот же fill
        }

        engine.nodes.layer.batchDraw?.();
    };

    // Handlers toolbar — добавление нод
    const handleCircleClick = () => {
        if (engine) {
            engine.nodes.addCircle({
                x: 160,
                y: 120,
                radius: 50,
                fill: "#f59e0b",
            });
        }
    };

    const handleSquareClick = () => {
        if (engine) {
            engine.nodes.addShape({
                x: 140,
                y: 100,
                width: 120,
                height: 80,
                fill: "#f59e0b",
                stroke: "#f59e0b",
                strokeWidth: 0,
            });
        }
    };

    const handleTextClick = () => {
        if (engine) {
            engine.nodes.addText({
                x: 120,
                y: 90,
                text: "Hello",
                fontSize: 24,
                fill: "#f59e0b",
            });
        }
    };

    const handleStarClick = () => {
        if (engine) {
            engine.nodes.addStar({
                x: 160,
                y: 140,
                fill: "#f59e0b",
            });
        }
    };

    return (
        <div className="flex flex-1 grow w-full h-full relative">
            {/* канвас */}
            <div ref={ref} className="absolute top-0 left-0 w-full h-full" />

            {/* инспектор свойств */}
            <NodeInspectorPanel
                className="absolute top-0 right-0 h-full w-[380px] border-l border-[#2a2f3a] bg-[#0b0f1a]/95 backdrop-blur"
                value={panelValue}
                onChange={applyStyle}
                disabled={!selectedId}
                isTextNode={isTextNode}
                radiusSupported={radiusSupported}
            />

            {/* тулбар */}
            <Toolbar
                onCircleClick={handleCircleClick}
                onSquareClick={handleSquareClick}
                onTextClick={handleTextClick}
                onStarClick={handleStarClick}
            />
        </div>
    );
}
