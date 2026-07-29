import { describe, it, expect } from "vitest";
import { ConicGradient } from "../ConicGradient";
import { Color } from "../Color";

describe("ConicGradient", () => {

    // ------------------------------------------
    // fromStops
    // ------------------------------------------

    describe("fromStops()", () => {
        it("should create gradient with 2 stops", () => {
            const g = ConicGradient.fromStops([
                { color: "red" },
                { color: "blue" },
            ]);

            const stops = g.getStops();

            expect(stops).toHaveLength(2);
            expect(stops[0].offset).toBe(0);
            expect(stops[1].offset).toBe(1);
        });

        it("should distribute missing offsets (CSS-like)", () => {
            const g = ConicGradient.fromStops([
                { color: "red", offset: 0 },
                { color: "green" },
                { color: "blue", offset: 1 },
            ]);

            const stops = g.getStops();

            expect(stops[0].offset).toBe(0);
            expect(stops[1].offset).toBeCloseTo(0.5, 5);
            expect(stops[2].offset).toBe(1);
        });

        it("should clamp offsets to 0..1", () => {
            const g = ConicGradient.fromStops([
                { color: "red", offset: -0.5 },
                { color: "blue", offset: 1.5 },
            ]);

            const stops = g.getStops();

            expect(stops[0].offset).toBe(0);
            expect(stops[1].offset).toBe(1);
        });

        it("should throw if less than 2 stops", () => {
            expect(() =>
                ConicGradient.fromStops([{ color: "red" }])
            ).toThrow();
        });
    });

    // ------------------------------------------
    // Angle & Position (from / at)
    // ------------------------------------------

    describe("options (angle & position)", () => {
        it("should use default angle (0deg) and position (at center)", () => {
            const g = ConicGradient.fromStops([
                { color: "red" },
                { color: "blue" },
            ]);

            expect(g.getAngle()).toBe("0deg");
            expect(g.getPosition()).toBe("at center");
        });

        it("should accept explicit angle and position", () => {
            const g = ConicGradient.fromStops(
                [{ color: "red" }, { color: "blue" }],
                { angle: "90deg", position: "at 25% 25%" }
            );

            expect(g.getAngle()).toBe("90deg");
            expect(g.getPosition()).toBe("at 25% 25%");
        });
    });

    // ------------------------------------------
    // fromString() - CSS Parsing
    // ------------------------------------------

    describe("fromString()", () => {
        it("should parse simple conic-gradient", () => {
            const g = ConicGradient.fromString("conic-gradient(white, black)");
            const stops = g.getStops();

            expect(stops).toHaveLength(2);
            expect(g.getAngle()).toBe("0deg");
            expect(g.isRepeating()).toBe(false);
        });

        it("should parse 'from [angle]' parameter", () => {
            const g = ConicGradient.fromString("conic-gradient(from 180deg, red, blue)");
            expect(g.getAngle()).toBe("180deg");
        });

        it("should parse 'at [position]' parameter", () => {
            const g = ConicGradient.fromString("conic-gradient(at 10% 20%, red, blue)");
            expect(g.getPosition()).toBe("at 10% 20%");
        });

        it("should parse combined 'from' and 'at'", () => {
            const g = ConicGradient.fromString("conic-gradient(from 45deg at center, red, blue)");
            expect(g.getAngle()).toBe("45deg");
            expect(g.getPosition()).toBe("at center");
        });

        it("should parse degree offsets in color stops", () => {
            // В конических градиентах 180deg = 0.5 offset
            const g = ConicGradient.fromString("conic-gradient(red 0deg, blue 180deg, green 360deg)");
            const stops = g.getStops();

            expect(stops[0].offset).toBe(0);
            expect(stops[1].offset).toBe(0.5);
            expect(stops[2].offset).toBe(1);
        });

        it("should parse repeating-conic-gradient", () => {
            const g = ConicGradient.fromString("repeating-conic-gradient(red, blue 10%)");
            expect(g.isRepeating()).toBe(true);
        });

        it("should handle rgba/rgb colors with commas correctly", () => {
            const g = ConicGradient.fromString("conic-gradient(rgba(255, 0, 0, 1), rgb(0, 0, 255))");
            console.log(g.getStops()[0]?.color.getRGBA().r);
            expect(g.getStops()[0]?.color.getRGBA().r).toBe(255);
            expect(g.getStops()[1]?.color.getRGBA().b).toBe(255);
        });
    });

    // ------------------------------------------
    // isValidString
    // ------------------------------------------

    describe("isValidString()", () => {
        it("should validate correct conic strings", () => {
            expect(ConicGradient.isValidString("conic-gradient(red, blue)")).toBe(true);
            expect(ConicGradient.isValidString("repeating-conic-gradient(from 0, red, blue)")).toBe(true);
        });

        it("should reject invalid strings", () => {
            expect(ConicGradient.isValidString("linear-gradient(red, blue)")).toBe(false);
            expect(ConicGradient.isValidString("conic-gradient(red)")).toBe(false); // < 2 stops
        });
    });
});