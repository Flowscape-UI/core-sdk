// props-panel.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import type { NodeStyle } from "@/types";

type Props = {
    className?: string;
    value: NodeStyle;
    onChange: (next: NodeStyle) => void;
    disabled?: boolean;
    isTextNode?: boolean;      // чтобы показать/скрыть секцию Text
    radiusSupported?: boolean; // чтобы включать/выключать Radius (только Rect)
};

export function NodeInspectorPanel({
    className,
    value,
    onChange,
    disabled,
    isTextNode,
    radiusSupported,
}: Props) {
    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">Node Inspector</CardTitle>
            </CardHeader>

            <CardContent className={disabled ? "pointer-events-none opacity-50" : ""}>
                <Accordion type="single" collapsible defaultValue="fill">
                    {/* === Fill === */}
                    <AccordionItem value="fill">
                        <AccordionTrigger>Fill</AccordionTrigger>
                        <AccordionContent>
                            <div className="flex items-center gap-3">
                                <input
                                    aria-label="Fill color"
                                    type="color"
                                    className="h-9 w-9 rounded-md border border-border bg-background"
                                    value={value.fill.hex}
                                    onChange={(e) =>
                                        onChange({ ...value, fill: { ...value.fill, hex: e.target.value } })
                                    }
                                />
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs text-muted-foreground">Opacity</span>
                                        <span className="text-xs">{value.fill.opacity}%</span>
                                    </div>
                                    <Slider
                                        min={0}
                                        max={100}
                                        step={1}
                                        value={[value.fill.opacity]}
                                        onValueChange={([v]) => onChange({ ...value, fill: { ...value.fill, opacity: v } })}
                                    />
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>

                    {/* === Stroke / Border === */}
                    <AccordionItem value="stroke">
                        <AccordionTrigger>Stroke</AccordionTrigger>
                        <AccordionContent>
                            <div className="grid gap-4">
                                <div className="flex items-center gap-3">
                                    <input
                                        aria-label="Stroke color"
                                        type="color"
                                        className="h-9 w-9 rounded-md border border-border bg-background"
                                        value={value.stroke.hex}
                                        onChange={(e) =>
                                            onChange({ ...value, stroke: { ...value.stroke, hex: e.target.value } })
                                        }
                                    />
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs text-muted-foreground">Opacity</span>
                                            <span className="text-xs">{value.stroke.opacity}%</span>
                                        </div>
                                        <Slider
                                            min={0}
                                            max={100}
                                            step={1}
                                            value={[value.stroke.opacity]}
                                            onValueChange={([o]) =>
                                                onChange({ ...value, stroke: { ...value.stroke, opacity: o } })
                                            }
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs text-muted-foreground">Width</span>
                                        <span className="text-xs">{value.stroke.width}px</span>
                                    </div>
                                    <Slider
                                        min={0}
                                        max={40}
                                        step={1}
                                        value={[value.stroke.width]}
                                        onValueChange={([w]) =>
                                            onChange({ ...value, stroke: { ...value.stroke, width: w } })
                                        }
                                    />
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>

                    {/* === Appearance / Radius === */}
                    <AccordionItem value="appearance">
                        <AccordionTrigger>Appearance</AccordionTrigger>
                        <AccordionContent>
                            <div className={radiusSupported ? "opacity-100" : "opacity-50"}>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs text-muted-foreground">Border Radius</span>
                                    <span className="text-xs">{value.radius}px</span>
                                </div>
                                <Slider
                                    min={0}
                                    max={120}
                                    step={1}
                                    value={[value.radius]}
                                    onValueChange={([r]) => onChange({ ...value, radius: r })}
                                />
                                {!radiusSupported && (
                                    <p className="mt-2 text-xs text-muted-foreground">
                                        Radius is available for rectangular nodes.
                                    </p>
                                )}
                            </div>
                        </AccordionContent>
                    </AccordionItem>

                    {/* === Text (показываем только для Konva.Text) === */}
                    <AccordionItem value="text" disabled={!isTextNode}>
                        <AccordionTrigger>Text</AccordionTrigger>
                        <AccordionContent>
                            <div className="grid gap-3">
                                <div className="grid gap-1.5">
                                    <Label htmlFor="txt-val" className="text-xs">Content</Label>
                                    <Textarea
                                        id="txt-val"
                                        value={value.text.value}
                                        onChange={(e) => onChange({ ...value, text: { ...value.text, value: e.target.value } })}
                                        placeholder="Type here..."
                                        className="min-h-[88px]"
                                    />
                                </div>

                                <div className="grid gap-1.5">
                                    <Label htmlFor="txt-size" className="text-xs">Size</Label>
                                    <div className="flex items-center gap-3">
                                        <Slider
                                            min={8}
                                            max={160}
                                            step={1}
                                            value={[value.text.size]}
                                            onValueChange={([s]) => onChange({ ...value, text: { ...value.text, size: s } })}
                                            className="flex-1"
                                        />
                                        <Input
                                            id="txt-size"
                                            type="number"
                                            min={8}
                                            max={160}
                                            value={value.text.size}
                                            onChange={(e) =>
                                                onChange({ ...value, text: { ...value.text, size: Number(e.target.value) || 0 } })
                                            }
                                            className="w-20"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="grid gap-1.5">
                                        <Label className="text-xs">Weight</Label>
                                        <Select
                                            value={value.text.weight}
                                            onValueChange={(w: "normal" | "bold") =>
                                                onChange({ ...value, text: { ...value.text, weight: w } })
                                            }
                                        >
                                            <SelectTrigger><SelectValue placeholder="Weight" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="normal">Normal</SelectItem>
                                                <SelectItem value="bold">Bold</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="grid gap-1.5">
                                        <Label className="text-xs">Align</Label>
                                        <Select
                                            value={value.text.align}
                                            onValueChange={(a: "left" | "center" | "right") =>
                                                onChange({ ...value, text: { ...value.text, align: a } })
                                            }
                                        >
                                            <SelectTrigger><SelectValue placeholder="Align" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="left">Left</SelectItem>
                                                <SelectItem value="center">Center</SelectItem>
                                                <SelectItem value="right">Right</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </CardContent>
        </Card>
    );
}
