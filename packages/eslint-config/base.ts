import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	{
		ignores: [
			"**/dist/**",
			"**/build/**",
			"**/.turbo/**",
			"**/node_modules/**",
		],
	},
	{
		files: ["**/*.ts", "**/*.tsx"],
		rules: {
			eqeqeq: ["error", "always"],
			"prefer-const": "error",
			curly: ["error", "all"],
			"@typescript-eslint/no-explicit-any": "warn",
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					argsIgnorePattern: "^_",
					varsIgnorePattern: "^_",
				},
			],
		},
	},
);
