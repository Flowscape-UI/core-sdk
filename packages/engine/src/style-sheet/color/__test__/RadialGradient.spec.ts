import { describe, it, expect } from "vitest";
import { RadialGradient } from "../RadialGradient";
import { Color } from "../Color";

describe("RadialGradient", () => {

    // ------------------------------------------
    // fromStops
    // ------------------------------------------

    describe("fromStops()", () => {
        it("should create gradient with 2 stops", () => {
            const g = RadialGradient.fromStops([
                { color: "red" },
                { color: "blue" },
            ]);

            const stops = g.getStops();

            expect(stops).toHaveLength(2);
            expect(stops[0].offset).toBe(0);
            expect(stops[1].offset).toBe(1);
        });

        it("should distribute missing offsets", () => {
            const g = RadialGradient.fromStops([
                { color: "red", offset: 0 },
                { color: "green" },
                { color: "blue", offset: 1 },
            ]);

            const stops = g.getStops();

            expect(stops[1].offset).toBeCloseTo(0.5, 5);
        });

        it("should sort stops by offset", () => {
            const g = RadialGradient.fromStops([
                { color: "blue", offset: 1 },
                { color: "red", offset: 0 },
            ]);

            const stops = g.getStops();
            expect(stops[0].color.equals(Color.fromString("red"))).toBe(true);
        });

        it("should throw if less than 2 stops", () => {
            expect(() =>
                RadialGradient.fromStops([{ color: "red" }])
            ).toThrow();
        });
    });

    // ------------------------------------------
    // Options (Shape, Position, Extent)
    // ------------------------------------------

    describe("options", () => {
        it("should use default options (ellipse at center, farthest-corner)", () => {
            const g = RadialGradient.fromStops([{ color: "red" }, { color: "blue" }]);

            expect(g.getShape()).toBe("ellipse");
            expect(g.getPosition()).toBe("center");
            expect(g.getExtent()).toBe("farthest-corner");
        });

        it("should accept explicit shape and position", () => {
            const g = RadialGradient.fromStops(
                [{ color: "red" }, { color: "blue" }],
                { shape: "circle", position: "50% 50%" }
            );

            expect(g.getShape()).toBe("circle");
            expect(g.getPosition()).toBe("50% 50%");
        });

        it("should accept explicit extent", () => {
            const g = RadialGradient.fromStops(
                [{ color: "red" }, { color: "blue" }],
                { extent: "closest-side" }
            );

            expect(g.getExtent()).toBe("closest-side");
        });
    });

    // ------------------------------------------
    // Repeating
    // ------------------------------------------

    describe("repeating", () => {
        it("should allow repeating flag", () => {
            const g = RadialGradient.fromStops(
                [{ color: "red" }, { color: "blue" }],
                { repeating: true }
            );

            expect(g.isRepeating()).toBe(true);
        });
    });

    // ------------------------------------------
    // fromString
    // ------------------------------------------

    describe("fromString()", () => {
        it("should parse simple radial-gradient", () => {
            const g = RadialGradient.fromString("radial-gradient(red, blue)");
            
            expect(g.getStops()).toHaveLength(2);
            expect(g.getShape()).toBe("ellipse");
        });

        it("should parse complex settings (shape at position)", () => {
            const g = RadialGradient.fromString(
                "radial-gradient(circle at 20% 30%, red, blue)"
            );

            console.log(g.getPosition())
            expect(g.getShape()).toBe("circle");
            expect(g.getPosition()).toBe("20% 30%");
        });

        it("should parse extent size", () => {
            const g = RadialGradient.fromString(
                "radial-gradient(closest-side at center, red, blue)"
            );

            expect(g.getExtent()).toBe("closest-side");
        });

        it("should parse repeating-radial-gradient", () => {
            const g = RadialGradient.fromString(
                "repeating-radial-gradient(red, blue)"
            );

            expect(g.isRepeating()).toBe(true);
        });

        it("should parse offsets in string", () => {
            const g = RadialGradient.fromString(
                "radial-gradient(red 10%, blue 90%)"
            );

            const stops = g.getStops();
            expect(stops[0].offset).toBe(0.1);
            expect(stops[1].offset).toBe(0.9);
        });

        it("should throw for invalid string", () => {
            expect(() =>
                RadialGradient.fromString("linear-gradient(red, blue)")
            ).toThrow();
        });
    });

});