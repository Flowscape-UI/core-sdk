import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

const config: Config = {
	title: "Flowscape",
	tagline:
		"Framework-agnostic 2D engine for editors, builders and infinite canvas apps",
	favicon: "img/favicon.ico",

	future: {
		v4: true,
	},

	url: "https://flowscape-ui.github.io",
	baseUrl: "/core-sdk/",

	organizationName: "Flowscape-UI",
	projectName: "core-sdk",

	onBrokenLinks: "warn",

	i18n: {
		defaultLocale: "en",
		locales: [
			"en",
			// "ru",
			// "ro",
		],
		localeConfigs: {
			en: {
				label: "English",
				htmlLang: "en-US",
			},
			// ru: {
			// 	label: "Русский",
			// 	htmlLang: "ru-RU",
			// },
			// ro: {
			// 	label: "Română",
			// 	htmlLang: "ro-RO",
			// },
		},
	},

	presets: [
		[
			"classic",
			{
				docs: {
					routeBasePath: "/",
					sidebarPath: "./sidebars.ts",
					editUrl:
						"https://github.com/Flowscape-UI/core-sdk/tree/main/apps/docs/",
				},

				blog: {
					showReadingTime: true,

					feedOptions: {
						type: ["rss", "atom"],
						xslt: true,
					},

					editUrl:
						"https://github.com/Flowscape-UI/core-sdk/tree/main/apps/docs/",

					onInlineTags: "warn",
					onInlineAuthors: "warn",
					onUntruncatedBlogPosts: "warn",
				},

				theme: {
					customCss: "./src/css/custom.css",
				},
			} satisfies Preset.Options,
		],
	],

	themeConfig: {
		image: "img/social-card.png",

		colorMode: {
			respectPrefersColorScheme: true,
		},

		navbar: {
			title: "Flowscape",

			logo: {
				alt: "Flowscape Logo",
				src: "img/logo.svg",
			},

			items: [
				{
					type: "docSidebar",
					sidebarId: "tutorialSidebar",
					position: "right",
					label: "Tutorial",
				},

				{
					to: "/blog",
					label: "Blog",
					position: "left",
				},

				{
					href: "/core-sdk/playground/",
					label: "Playground",
					position: "left",
				},

				{
					type: "localeDropdown",
					position: "right",
				},

				{
					type: "search",
					position: "right",
				},

				{
					href: "https://github.com/Flowscape-UI/core-sdk",
					label: "GitHub",
					position: "right",
				},

				{
					href: "https://linktr.ee/flowscape_ui",
					label: "Linktree",
					position: "right",
				},
			],
		},

		footer: {
			style: "dark",

			links: [
				{
					title: "Docs",
					items: [
						{
							label: "Tutorial",
							to: "/intro",
						},
						{
							label: "Playground",
							href: "/core-sdk/playground/",
						},
					],
				},

				{
					title: "Community",
					items: [
						{
							label: "Linktree",
							href: "https://linktr.ee/flowscape_ui",
						},
						{
							label: "Discord",
							href: "https://discord.gg/GBVWxGuyTn",
						},
						{
							label: "X",
							href: "https://x.com/FlowscapeUI",
						},
					],
				},

				{
					title: "More",
					items: [
						{
							label: "Blog",
							to: "/blog",
						},
						{
							href: "https://github.com/Flowscape-UI/core-sdk",
							label: "GitHub",
						},
					],
				},
			],

			copyright: `Copyright © ${new Date().getFullYear()} Flowscape UI`,
		},

		prism: {
			theme: prismThemes.github,
			darkTheme: prismThemes.dracula,
		},
	} satisfies Preset.ThemeConfig,
};

export default config;
