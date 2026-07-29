import { describe, it, expect } from "vitest";
import { LinearGradient } from "../LinearGradient";
import { Color } from "../Color";

describe("LinearGradient", () => {

    // ------------------------------------------
    // fromStops
    // ------------------------------------------

    describe("fromString()", () => {
        it.only("should validate strings correctly", () => {
            const gradients = [
                'linear-gradient()',
                'linear-gradient(red, blue)',
                'linear-gradient(red 50%, blue 60%)',
                'repeating-linear-gradient(to top, red 50%, blue 60%)',
            ].join(',');

            const gradient = LinearGradient.fromString(gradients);
        });
    });


    describe("fromStops()", () => {
        it("should create gradient with 2 stops", () => {
            const g = LinearGradient.fromStops([
                { color: "red" },
                { color: "blue" },
            ]);

            const stops = g.getStops();

            expect(stops).toHaveLength(2);
            expect(stops[0].offset).toBe(0);
            expect(stops[1].offset).toBe(1);
        });

        it("should distribute missing offsets", () => {
            const g = LinearGradient.fromStops([
                { color: "red", offset: 0 },
                { color: "green" },
                { color: "blue", offset: 1 },
            ]);

            const stops = g.getStops();

            expect(stops[0].offset).toBe(0);
            expect(stops[1].offset).toBeCloseTo(0.5, 5);
            expect(stops[2].offset).toBe(1);
        });

        it("should clamp offsets", () => {
            const g = LinearGradient.fromStops([
                { color: "red", offset: -1 },
                { color: "blue", offset: 2 },
            ]);

            const stops = g.getStops();

            expect(stops[0].offset).toBe(0);
            expect(stops[1].offset).toBe(1);
        });

        it("should sort stops by offset", () => {
            const g = LinearGradient.fromStops([
                { color: "blue", offset: 1 },
                { color: "red", offset: 0 },
            ]);

            const stops = g.getStops();

            expect(stops[0].color.equals(Color.fromString("red"))).toBe(true);
            expect(stops[1].color.equals(Color.fromString("blue"))).toBe(true);
        });

        it("should throw if less than 2 stops", () => {
            expect(() =>
                LinearGradient.fromStops([{ color: "red" }])
            ).toThrow();
        });

    });

    // ------------------------------------------
    // Direction
    // ------------------------------------------

    describe("direction", () => {
        it("should use default direction (ToBottom)", () => {
            const g = LinearGradient.fromStops([
                { color: "red" },
                { color: "blue" },
            ]);

            expect(g.getDirection()).toBe(GradientDirection.ToBottom);
        });

        it("should accept explicit direction", () => {
            const g = LinearGradient.fromStops(
                [
                    { color: "red" },
                    { color: "blue" },
                ],
                { direction: GradientDirection.ToRight }
            );

            expect(g.getDirection()).toBe(GradientDirection.ToRight);
        });

        it("should accept degree direction", () => {
            const g = LinearGradient.fromStops(
                [
                    { color: "red" },
                    { color: "blue" },
                ],
                { direction: "45deg" }
            );

            expect(g.getDirection()).toBe("45deg");
        });

    });

    // ------------------------------------------
    // Repeating
    // ------------------------------------------

    describe("repeating", () => {

        it("should default to non-repeating", () => {
            const g = LinearGradient.fromStops([
                { color: "red" },
                { color: "blue" },
            ]);

            expect(g.isRepeating()).toBe(false);
        });

        it("should allow repeating flag", () => {
            const g = LinearGradient.fromStops(
                [
                    { color: "red" },
                    { color: "blue" },
                ],
                { repeating: true }
            );

            expect(g.isRepeating()).toBe(true);
        });
    });

    // ------------------------------------------
    // fromString
    // ------------------------------------------

    describe("fromString()", () => {
        it("should parse simple linear-gradient", () => {
            const g = LinearGradient.fromString(
                "linear-gradient(red, blue)"
            );

            const stops = g.getStops();

            expect(stops).toHaveLength(2);
            expect(stops[0].offset).toBe(0);
            expect(stops[1].offset).toBe(1);
        });

        it("should parse direction", () => {
            const g = LinearGradient.fromString(
                "linear-gradient(to right, red, blue)"
            );

            expect(g.getDirection()).toBe("to right");
        });

        it("should parse percent offsets", () => {
            const g = LinearGradient.fromString(
                "linear-gradient(red 0%, blue 100%)"
            );

            const stops = g.getStops();

            expect(stops[0].offset).toBe(0);
            expect(stops[1].offset).toBe(1);
        });

        it("should parse degree direction", () => {
            const g = LinearGradient.fromString(
                "linear-gradient(45deg, red, blue)"
            );

            expect(g.getDirection()).toBe("45deg");
        });

        it("should parse repeating-linear-gradient", () => {
            const g = LinearGradient.fromString(
                "repeating-linear-gradient(to right, red, blue)"
            );

            expect(g.isRepeating()).toBe(true);
        });

        it("should throw for invalid string", () => {
            expect(() =>
                LinearGradient.fromString("invalid-gradient(red, blue)")
            ).toThrow();
        });
    });

    // ------------------------------------------
    // isValidString
    // ------------------------------------------

    describe("isValidString()", () => {
        it("should validate correct gradient", () => {
            expect(
                LinearGradient.isValidString(
                    "linear-gradient(to right, red, blue)"
                )
            ).toBe(true);
        });

        it("should reject invalid gradient", () => {
            expect(
                LinearGradient.isValidString("linear-gradient(red)")
            ).toBe(false);
        });
    });

});