# Ray Academic Website

Ray 的双语个人学术网站。英文页面位于根路径，中文页面位于 `/zh/`，网站由 Astro 构建并通过 GitHub Pages 自动发布。

## 本地运行

```bash
npm install
npx astro dev --background
```

查看后台服务状态：

```bash
npx astro dev status
npx astro dev logs
npx astro dev stop
```

完整检查：

```bash
npm test
```

## 新增课程

在 `src/content/courses/` 新建课程清单，例如 `behavioral-economics.yaml`。文件名即课程网址标识，只能使用小写英文、数字和连字符。

```yaml
order: 1
title:
  en: Course title
  zh: 课程名称
description:
  en: Course description
  zh: 课程简介
resources: []
```

## 新增课程资料

1. 将资料放入 `public/materials/<课程标识>/`。
2. 在对应课程清单的 `resources` 中登记路径和双语标题。

```yaml
resources:
  - path: lecture-01.pdf
    order: 1
    title:
      en: Lecture 1
      zh: 第一讲
    description:
      en: Optional description
      zh: 可选说明
    updated: "2026-07-15"
```

单文件网页可直接登记 `.html` 文件；带有配套资源的网页应保留原目录结构，并将入口登记为 `<目录>/index.html`。

## 发布前检查

- 只提交计划公开的资料。
- 检查文件名、页面正文、网页元数据和 PDF 文档属性中的个人信息。
- 删除学生个人信息，统一使用“学生”、`student` 或课程代码。
- 确认中英文标题完整且文件路径有效。
- 运行 `npm test`；校验失败时不要发布。

推送至 `main` 后，GitHub Actions 会运行相同检查并自动部署网站。
