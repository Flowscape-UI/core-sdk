import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
	resolve: {
		alias:
			command === "serve"
				? {
						"@flowscape-ui/core-sdk": fileURLToPath(
							new URL(
								"../../packages/engine/src/index.ts",
								import.meta.url,
							),
						),
					}
				: {},
	},
}));
