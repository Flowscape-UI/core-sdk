import { GradientTransformer } from "gradiente";
import { ModuleTransformerLinearGradientToKonvajs } from "./ModuleTransformerLinearGradientToKonvajs";
import { ModuleTransformerRadialGradientToKonvajs } from "./ModuleTransformerRadialGradientToKonvajs";
import { ModuleTransformerDiamondGradientToKonvajs } from "./ModuleTransformerDiamondGradientToKonvajs";
import { ModuleTransformerConicGradientToKonvajs } from "./ModuleTransformerConicGradientToKonvajs";
import { ModuleTransformerMeshGradientToKonvajs } from "./ModuleTransformerMeshGradientToKonvajs";

let initialized = false;

export function registerGradientTransformers(): void {
	if (initialized) {
		return;
	}

	GradientTransformer.add(new ModuleTransformerLinearGradientToKonvajs());
	GradientTransformer.add(new ModuleTransformerRadialGradientToKonvajs());
	GradientTransformer.add(new ModuleTransformerDiamondGradientToKonvajs());
	GradientTransformer.add(new ModuleTransformerConicGradientToKonvajs());
	GradientTransformer.add(new ModuleTransformerMeshGradientToKonvajs());

	initialized = true;
}

export * from "./types";
export * from "./ModuleTransformerLinearGradientToKonvajs";
export * from "./ModuleTransformerRadialGradientToKonvajs";
export * from "./ModuleTransformerDiamondGradientToKonvajs";
export * from "./ModuleTransformerConicGradientToKonvajs";
export * from "./ModuleTransformerMeshGradientToKonvajs";
