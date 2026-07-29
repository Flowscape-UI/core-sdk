import Konva from "konva";
import { RendererCanvasBase } from "../base";
import { FontStyle, TextAlign, TextVerticalAlign, TextWrapMode, type NodeText } from "../../../../nodes";


const TEXT_NAME = "text-fill";
const TEXT_SELECTOR = `.${TEXT_NAME}`;

export class RendererCanvasText extends RendererCanvasBase<NodeText> {
    public create(node: NodeText): Konva.Group {
        const group = new Konva.Group({
            id: String(node.id),
        });

        const text = new Konva.Text({
            name: TEXT_NAME,
            listening: false,
            text: "",
            width: 0,
            height: 0,
            fontFamily: "Inter",
            fontSize: 16,
            fontStyle: "normal",
            fontVariant: "normal",
            align: "left",
            verticalAlign: "top",
            wrap: "word",
            lineHeight: 1.2,
            padding: 0,
            fill: "#000000",
        });

        group.add(text);

        return group;
    }

    protected onUpdate(node: NodeText, view: Konva.Group): void {
    const text = this._findOneOrThrow<Konva.Text>(view, TEXT_SELECTOR);

    text.text(node.getText());
    text.fontFamily(node.getFontFamily());
    text.fontSize(node.getFontSize());
    text.fontStyle(this._resolveFontStyle(node));
    text.align(this._resolveTextAlign(node));
    text.verticalAlign(this._resolveVerticalAlign(node));
    text.wrap(this._resolveWrapMode(node));
    text.lineHeight(node.getLineHeight());
    text.fill(node.getFill());

    if ("letterSpacing" in text && typeof text.letterSpacing === "function") {
        text.letterSpacing(node.getLetterSpacing());
    }

    // Сначала ограничиваем только ширину
    text.width(Math.max(1, node.getWidth()));
    text.height(undefined as unknown as number);

    const bounds = text.getClientRect({
        skipTransform: true,
        skipShadow: true,
        skipStroke: true,
    });

    text.height(Math.max(1, bounds.height));
}

    private _resolveFontStyle(node: NodeText): string {
        const weight = node.getFontWeight();
        const style = node.getFontStyle();

        const stylePart = style === FontStyle.Italic ? "italic" : "normal";
        const weightPart = String(weight);

        return `${stylePart} ${weightPart}`;
    }

    private _resolveTextAlign(node: NodeText): "left" | "center" | "right" | "justify" {
        switch (node.getTextAlign()) {
            case TextAlign.Center:
                return "center";
            case TextAlign.Right:
                return "right";
            case TextAlign.Justify:
                return "justify";
            case TextAlign.Left:
            default:
                return "left";
        }
    }

    private _resolveVerticalAlign(node: NodeText): "top" | "middle" | "bottom" {
        switch (node.getVerticalAlign()) {
            case TextVerticalAlign.Center:
                return "middle";
            case TextVerticalAlign.Bottom:
                return "bottom";
            case TextVerticalAlign.Top:
            default:
                return "top";
        }
    }

    private _resolveWrapMode(node: NodeText): "word" | "char" | "none" {
        switch (node.getWrapMode()) {
            case TextWrapMode.Character:
                return "char";
            case TextWrapMode.None:
                return "none";
            case TextWrapMode.Word:
            default:
                return "word";
        }
    }
}