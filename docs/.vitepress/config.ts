import { defineConfig } from "npm:vitepress";

// Hyrum's Law: With a sufficient number of users of an API,
// it does not matter what you promise in the contract:
// all observable behaviors of your system will be depended on by somebody.
//
// ドキュメントとして公開した内容は、実質的な仕様となり変更が困難になります。
// 特にCLIインターフェースは多くのスクリプトや自動化に組み込まれるため、
// 後方互換性を慎重に考慮する必要があります。

export default defineConfig({
  title: "project-checklist",
  description: "AI-friendly TODO management for modern projects",
  base: "/",
  head: [
    ["link", { rel: "icon", href: "/favicon.ico" }],
    // Redirect from / to /guide/quick-start
    [
      "script",
      {},
      `
      if (location.pathname === '/' || location.pathname === '/index.html') {
        location.replace('/guide/quick-start');
      }
    `,
    ],
  ],

  themeConfig: {
    logo: "/logo.svg",
    nav: [
      { text: "Home", link: "/" },
      { text: "Guide", link: "/guide/quick-start" },
      { text: "Commands", link: "/commands/" },
      { text: "GitHub", link: "https://github.com/mizchi/project-checklist" },
    ],

    sidebar: [
      {
        text: "Guide",
        items: [
          { text: "Quick Start", link: "/guide/quick-start" },
          { text: "Configuration", link: "/guide/config" },
          { text: "GTD Best Practices", link: "/guide/gtd-best-practices" },
        ],
      },
      {
        text: "Commands",
        items: [
          { text: "Overview", link: "/commands/" },
          { text: "init", link: "/commands/init" },
          { text: "doctor", link: "/commands/doctor" },
          { text: "scan (default)", link: "/commands/scan" },
          { text: "add", link: "/commands/add" },
          { text: "check", link: "/commands/check" },
          { text: "update", link: "/commands/update" },
          { text: "merge", link: "/commands/merge" },
          { text: "validate", link: "/commands/validate" },
        ],
      },
      {
        text: "Advanced Usage",
        items: [
          { text: "AI Integration", link: "/advanced/ai-integration" },
          { text: "MCP Server", link: "/advanced/mcp-server" },
          { text: "Scripting", link: "/advanced/scripting" },
        ],
      },
      {
        text: "Development",
        items: [
          { text: "Setup", link: "/development/setup" },
          { text: "Dax Usage", link: "/development/dax-usages" },
        ],
      },
    ],

    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/mizchi/project-checklist",
      },
    ],

    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright © 2025 mizchi",
    },

    search: {
      provider: "local",
    },
  },
});
