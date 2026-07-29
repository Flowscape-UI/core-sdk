import { describe, it, expect } from "vitest";
import { Color } from "../Color";

describe("Color", () => {

    describe("Construction", () => {
        it("should create default red color", () => {
            const c = Color.fromRGBA(255, 0, 0);
            const rgba = c.getRGBA();

            expect(rgba.r).toBe(255);
            expect(rgba.g).toBe(0);
            expect(rgba.b).toBe(0);
            expect(rgba.a).toBe(1);
        });

        it("should create color from RGBA values", () => {
            const c = Color.fromRGBA(10, 20, 30, 0.5);
            const rgba = c.getRGBA();

            expect(rgba).toEqual({
                r: 10,
                g: 20,
                b: 30,
                a: 0.5
            });
        });

        it("should create color from Hex string", () => {
            const c = Color.fromHex("#123456");
            const rgba = c.getRGBA();
            expect(rgba).toEqual({
                r: 18,
                g: 52,
                b: 86,
                a: 1
            });
        });

        it("should create color from string", () => {
            const colorHex = Color.fromString("#123456");
            const colorNamed = Color.fromString("steelblue");
            const colorRGB = Color.fromString("rgb(18,52, 86, 0.5)");

            expect(colorHex.getRGBA()).toEqual({
                r: 18,
                g: 52,
                b: 86,
                a: 1
            });
            expect(colorNamed.getRGBA()).toEqual({
                r: 70,
                g: 130,
                b: 180,
                a: 1
            });
            expect(colorRGB.getRGBA()).toEqual({
                r: 18,
                g: 52,
                b: 86,
                a: 0.5
            });
        });
    });

    describe("Hex parsing", () => {
        it("should parse #RGB format", () => {
            const c = Color.fromHex("#F00");
            expect(c.toHexString()).toBe("#ff0000");
        });

        it("should parse #RRGGBB format", () => {
            const c = Color.fromHex("#00FF00");
            expect(c.getRGBA()).toEqual({
                r: 0,
                g: 255,
                b: 0,
                a: 1
            });
        });

        it("should parse #RRGGBBAA format", () => {
            const c = Color.fromHex("#0000FF80");
            const rgba = c.getRGBA();

            expect(rgba.r).toBe(0);
            expect(rgba.g).toBe(0);
            expect(rgba.b).toBe(255);
            expect(rgba.a).toBeCloseTo(0.5, 2);
        });

    });

    describe("String parsing", () => {

        it("should parse named color", () => {
            const c = Color.fromString("red");
            expect(c.toHexString()).toBe("#ff0000");
        });

        it("should parse rgba string", () => {
            const c = Color.fromString("rgba(10, 20, 30, 0.5)");
            expect(c.getRGBA()).toEqual({
                r: 10,
                g: 20,
                b: 30,
                a: 0.5
            });
        });

    });

    describe("Equality", () => {
        it("should return true for identical colors", () => {
            const a = Color.fromHex("#123456");
            const b = Color.fromHex("#123456");

            expect(a.equals(b)).toBe(true);
        });

        it("should return false for different colors", () => {
            const a = Color.fromHex("#123456");
            const b = Color.fromHex("#654321");

            expect(a.equals(b)).toBe(false);
        });

    });

    describe("Interpolation", () => {
        it("should interpolate between two colors", () => {
            const red = Color.fromHex("#ff0000");
            const blue = Color.fromHex("#0000ff");

            const mid = Color.lerp(red, blue, 0.5);
            const rgba = mid.getRGBA();

            expect(rgba.r).toBe(128);
            expect(rgba.g).toBe(0);
            expect(rgba.b).toBe(128);
        });
    });

    describe("Color.isValidString()", () => {

        describe("Valid HEX formats", () => {
            it("should validate #RGB", () => {
                expect(Color.isValidString("#F00")).toBe(true);
                expect(Color.isValidString("#0F8")).toBe(true);
            });

            it("should validate #RRGGBB", () => {
                expect(Color.isValidString("#FF0000")).toBe(true);
                expect(Color.isValidString("#00FF00")).toBe(true);
            });

            it("should validate #RRGGBBAA", () => {
                expect(Color.isValidString("#0000FF80")).toBe(true);
            });
        });

        describe("Valid RGB formats", () => {
            it("should validate rgb()", () => {
                expect(Color.isValidString("rgb(255, 0, 0)")).toBe(true);
                expect(Color.isValidString("rgb(0,0,0)")).toBe(true);
            });

            it("should validate rgba()", () => {
                expect(Color.isValidString("rgba(255, 0, 0, 1)")).toBe(true);
                expect(Color.isValidString("rgba(10,20,30,0.5)")).toBe(true);
            });
        });

        describe("Valid named colors", () => {
            it("should validate basic named colors", () => {
                expect(Color.isValidString("red")).toBe(true);
                expect(Color.isValidString("blue")).toBe(true);
                expect(Color.isValidString("transparent")).toBe(true);
            });

            it("should be case-insensitive", () => {
                expect(Color.isValidString("Red")).toBe(true);
                expect(Color.isValidString("BLUE")).toBe(true);
            });
        });

        describe("Invalid formats", () => {
            it("should reject malformed hex", () => {
                expect(Color.isValidString("#12")).toBe(false);
                expect(Color.isValidString("#GGGGGG")).toBe(false);
                expect(Color.isValidString("#12345")).toBe(false);
            });

            it("should reject malformed rgb", () => {
                expect(Color.isValidString("rgb(300,0,0)")).toBe(false);
                expect(Color.isValidString("rgb(10,20)")).toBe(false);
                expect(Color.isValidString("rgba(10,20,30,2)")).toBe(false);
            });

            it("should reject random strings", () => {
                expect(Color.isValidString("hello")).toBe(false);
                expect(Color.isValidString("123")).toBe(false);
                expect(Color.isValidString("rgb()")).toBe(false);
            });

            it("should reject empty string", () => {
                expect(Color.isValidString("")).toBe(false);
            });
        });

    });
});