# EverChek 网站重建 — 进度记录

> 断点续传用。每完成一步就更新这个文件。
> 最后更新：2026-09-03

## 目标（业主 2026-09-03 确认）

1. **修复并改版现有英文站** —— 审计出的 114 条问题要修；设计要重做
2. **多语言** —— 第一批：法语（全站）
3. **内容后台** —— 可视化编辑，不用改代码

## 已定的技术决策

| 项 | 决定 | 理由 |
|---|---|---|
| 架构 | **Astro 5 静态生成** | 沿用自家 p20-website 的成熟体系，团队已会用 |
| 内容模型 | **区块化 YAML**：`content/pages/<locale>/*.yaml` | 一页 = 一个有序 `sections` 列表，23 种区块可拖拽增删 |
| 后台 | **Sveltia CMS**（`/admin`） | 基于 Git、免费、无服务器、多语言支持最好 |
| 路由 | 单一动态路由 `src/pages/[...slug].astro` | 所有页面共用，locale 由文件夹决定 |
| 多语言 | 每页自带 `path` + `translationKey` | 支持各语言独立 slug；`translationKey` 驱动 hreflang |
| 部署 | Cloudflare Pages | ⚠️ 见下方「待业主操作」 |
| 参考实现 | `/Users/yanhuarong/Desktop/体温计p20/p20-website` | 同体系姊妹站 |

## 仓库状态

- 仓库：`https://github.com/RefreshBiosensing/everchek-website`
- 本地：`/Users/yanhuarong/Desktop/everchek/repo-everchek`
- 分支：**`astro-rebuild`**（`main` 未动，线上不受影响）
- 脚手架工作副本：`/Users/yanhuarong/Desktop/everchek/everchek-website`（内容已同步进仓库）

## 已完成

- [x] 全站镜像抓取（20 页 + 全部图片 + site.css/js/nav/footer/blog-data.json），51MB
- [x] 克隆真仓库，建 `astro-rebuild` 分支
- [x] 目录重构：图片 → `public/images/`、博客图 → `public/blog/`、`_headers` 与 `.well-known` → `public/`（用 `git mv` 保留历史）
- [x] 从 p20-website 移植 Astro 代码骨架（src/scripts/config），`package.json` 改名 `everchek-website`
- [x] **20 个页面全部转成区块模型 YAML**，21 个文件全部解析通过，0 失败
- [x] `content/i18n/en.yaml` UI 字典转为 EverChek（导航新增 Resources 下拉、页脚新增 Guides 栏 —— 修掉「6 个指南页零导航入链」）
- [x] 修 i18n 两处：`nav.solutions.root` 从占位 `/cgm-` 改为真实页；SLA 文案全站统一为 "one China business day (Mon–Fri, UTC+8)"
- [x] **新色板落地** `src/styles/global.css` —— 旧品牌蓝 `#80BCE2`（白底 2.06:1）降级为纯装饰色，主色改 `#0B5FA5`（6.57:1）
- [x] `VisualPhone.astro` 血糖曲线改用新主色（原浅蓝 2px 描边过淡）

## 已完成（第二批）

- [x] **依赖装上了** —— `registry.npmjs.org` 在国内拉 tarball 一直 ECONNRESET，换 `--registry=https://registry.npmmirror.com` 解决
- [x] **构建通过**，21 个页面（20 内容页 + 404）
- [x] 修 `content.ts` 加载器：原来 `readdirSync` 不递归，`content/pages/en/blog/` 下的 3 篇文章根本不会被构建
- [x] **修掉一批移植遗留的身份 bug**：`astro.config` 的 `site` 还是 `p20-website.pages.dev`（canonical/sitemap/og:url/schema @id 全指错域名）；CMS `repo` 指向 `p20-website`（编辑会提交到姊妹仓库）；Organization schema 自称 `P20`
- [x] Organization 加 `@id` / `legalName` / `foundingDate` / `parentOrganization` / **`sameAs`**（审计点名的 critical：搜品牌名返回的是 Senseonics 的 Eversense）
- [x] **BreadcrumbList 全站生成**（原来一个都没有）
- [x] Header/Footer 换真 logo（原来是给 "P20" 三字符设计的圆形徽章，"EverChek" 八字符溢出）；logo 8697×2029/173KB → 400×93/11KB
- [x] split hero 加底板（白色器械浮在白底上没有边界）
- [x] **真 404 页** `src/pages/404.astro`
- [x] **`_redirects`**：20 个旧 `.html` URL 的 301 + 两个改名图片 + `/blog/cgm-skd-b2b-guide` 合并
- [x] **`robots.txt`** 放行 AI 爬虫（⚠️ 需先在 Cloudflare 关掉托管版，文件内已注明）
- [x] **图片优化** `scripts/optimise-images.mjs`：39.8MB → 3.5MB（-91%）；dist 56MB → 5.6MB；**首页含全部资源 5.16MB → 0.46MB**
- [x] favicon 指向真实文件（原来指向 p20 的 `favicon.svg`，不存在）
- [x] **法语接上**：`astro.config` locales 加 `fr`，CMS 加 `pages_fr` + `i18n_fr` 两个集合
- [x] **CMS 修两处**：folder 集合加 `nested: {depth: 2}`（否则后台看不到 `blog/` 下的 3 篇文章）；`schemaType` 下拉补 Article 选项（否则后台存文章会丢 schema）
- [x] Sveltia CMS 锁版本 `@0.205.2`（原来无版本号；我先写的 0.111.1 不存在，已修）
- [x] CMS 后台实测可加载，仓库识别为 `everchek-website`

## 进行中

- [ ] **法语翻译工作流运行中**（8 组并行 + 一轮跨文件复核：hreflang key 一致性、链接完整性、术语统一、字数上限、声明不越界）

## 待做

- [ ] 法语翻译回来后：构建验证 hreflang 成对出现、`/fr/` 路由可访问
- [ ] 删除旧的扁平 HTML 文件（`git rm *.html site.css site.js nav.html footer.html blog-data.json`）——构建已验证通过，可以删了
- [ ] 逐页视觉走查，对照旧站确认无内容丢失
- [ ] `llms.txt`
- [ ] `.well-known/agent-skills/index.json` 里的 URL 还是 `.html` 形式（会 308），要更新
- [ ] GA4 埋点 + 表单归因字段（`source_page`/`referrer`/`landing_page`/`utm`）
- [ ] 询盘表单：国家下拉换完整 ISO 列表；`/request-nda` 页
- [ ] `accuracyClaim` 字段要加进 `pagesCollection()`，否则 Sveltia 存盘会丢（见「已知问题」）
- [ ] `functions/_middleware.js` 里硬编码的首页 Markdown 还是旧文案（含 `<8% MARD`、`.html` 链接），要么更新要么删掉这个 function

## 已知问题 / 需要业主拍板

1. **`accuracyClaim` 不是 CMS 字段** —— 我按转换规则把它放在 `home.yaml` 顶层，但 Sveltia 不会显示它，存盘可能丢失。要么加进 CMS schema，要么改放别处。
2. **MARD 声明 A/B 未决** —— 当前按 B 实施（撤下裸数字，改成方法与协议文案）。翻盘只需改 `home.yaml` 的 `accuracyClaim` 一个字段。
3. **`[TODO: ...]` 占位符** —— 全站 grep `TODO:` 可列出。主要是：IP 等级（站上 IPX8 与 IP28 并存）、灭菌方式（两种说法）、CE 状态（五页互相矛盾）、认证机构名称与 scope、RF 型式认证。这些必须业主给答案，我不能编。
4. **`/blog/cgm-skd-b2b-guide`** —— 仓库里有第 4 篇文章，线上可访问但不在 sitemap、不在 `blog-data.json`、无任何入链。内容与 `what-is-cgm-skd` 高度重合，建议 301 合并。

## ⚠️ 待业主操作（我做不了）

**Cloudflare Pages 构建设置必须改**，否则合并后线上会挂：

| 设置项 | 现在 | 改成 |
|---|---|---|
| Build command | （空） | `npm run build` |
| Build output directory | `/`（仓库根） | `dist` |
| Node version | — | 建议设 `NODE_VERSION=20` 或更高 |

**建议流程**：先在 Cloudflare Pages 给 `astro-rebuild` 分支开一个 preview 部署，确认无误再合 `main`。
