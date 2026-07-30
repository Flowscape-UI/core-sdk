import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

const config: Config = {
	title: "Flowscape",
	tagline:
		"Framework-agnostic 2D engine for editors, builders and infinite canvas apps",
	favicon: "img/favicon.ico",

	// Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
	future: {
		v4: true, // Improve compatibility with the upcoming Docusaurus v4
	},

	// Set the production url of your site here
	url: "https://flowscape-ui.github.io",
	// Set the /<baseUrl>/ pathname under which your site is served
	// For GitHub pages deployment, it is often '/<projectName>/'
	baseUrl: "/docs",

	// GitHub pages deployment config.
	// If you aren't using GitHub pages, you don't need these.
	organizationName: "Flowscape-UI", // Usually your GitHub org/user name.
	projectName: "docs", // Usually your repo name.

	onBrokenLinks: "warn",

	// Even if you don't use internationalization, you can use this field to set
	// useful metadata like html lang. For example, if your site is Chinese, you
	// may want to replace "en" with "zh-Hans".
	i18n: {
		defaultLocale: "en",
		locales: [
			"en",
			// 'ru',
			// 'ro'
		],
		localeConfigs: {
			en: {
				label: "English",
				htmlLang: "en-US",
			},
			// ru: {
			//   label: 'Русский',
			//   htmlLang: 'ru-RU',
			// },
			// ro: {
			//   label: 'Română',
			//   htmlLang: 'ro-RO',
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
						"https://github.com/Flowscape-UI/core-sdk/tree/main",
				},
				blog: {
					showReadingTime: true,
					feedOptions: {
						type: ["rss", "atom"],
						xslt: true,
					},
					editUrl:
						"https://github.com/Flowscape-UI/core-sdk/tree/main",
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
		// algolia: {
		//   appId: process.env.APP_ID!,
		//   apiKey: process.env.SEARCH_API_KEY!,
		//   indexName: process.env.INDEX_NAME!,
		// },
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

				// 🌐 Language switcher
				{
					type: "localeDropdown",
					position: "right",
				},

				// 🔍 Search (Algolia потом подключим)
				{
					type: "search",
					position: "right",
				},

				// GitHub
				{
					href: "https://github.com/Flowscape-UI/core-sdk",
					label: "GitHub",
					position: "right",
				},
				// Linktree
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
							to: "https://github.com/Flowscape-UI/core-sdk",
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
