# 主题覆盖检查

[采集脚本](../scripts/theme-coverage.mjs)检查运行中的 Steam 渲染结果，生成按区域分类的疑似遗漏报告。
检查范围为主窗口、库首页、收藏夹、游戏详情、下载、设置、菜单和商店。
术语见[词汇表](../CONTEXT.md)。

## 运行检查

需要 Node.js 22 或更高版本，以及已开启本地 CEF 调试接口的 Steam。
工具没有额外 npm 依赖，也不会修改 Steam 的调试设置。

```bash
npm test
npm run test:coverage
```

`npm test` 检查调色板、manifest 文件引用、主题变量、颜色计算和区域状态判断。
实时采集默认连接 `http://127.0.0.1:8080`，写入 `reports/theme-coverage.md` 和对应 JSON。
Markdown 列出可用页面中的疑似遗漏，JSON 同时保存人工复核样本和隐藏页面的诊断信息。
报告不保存页面文字、Cookie、查询参数或会话值。元素选择器可能包含 Steam 元素 ID。

将待查页面打开并滚动到目标内容后运行采集；菜单、悬停、焦点和选中状态需要分别采集。
通过不同的输出路径保留每个状态，状态标签只标识采集，不代表脚本执行了交互：

```bash
npm run test:coverage -- --state settings-language-open --out reports/settings-language-open
npm run test:coverage -- --state library-hover --out reports/library-hover
npm run test:coverage -- --strict
npm run test:coverage -- --preview --state repository-css-preview --out reports/theme-coverage-preview
```

完整参数如下：

| 参数 | 默认值 | 用途 |
| --- | --- | --- |
| `--endpoint` | `http://127.0.0.1:8080` | 指定本地 HTTP 调试接口 |
| `--out` | `reports/theme-coverage` | 指定输出路径前缀，生成 `.md` 和 `.json` |
| `--target` | 所有符合条件的页面 | 只检查指定 CDP target ID |
| `--state` | `current` | 标记当前已打开的界面状态 |
| `--strict` | 关闭 | 将疑似遗漏、人工复核、未验证区域或页面错误设为失败 |
| `--preview` | 关闭 | 临时注入仓库 CSS，读取样式后移除；报告记录 CSS 摘要，不安装主题 |

退出码 0 表示采集完成，不能据此判断全部区域通过。
strict 模式存在未解决项目时返回 1；接口或参数错误返回 2。
每次采集独立计算区域状态，不合并历史报告。

## 检测标准与边界

[规则模块](../scripts/coverage-rules.mjs)将面积至少 400 平方 CSS 像素、亮度低于 0.2 的非调色板背景列为疑似深色遗漏。
调色板强调色允许作为背景，较小的深色元素可能漏检。
普通文字对比度阈值为 4.5:1，大字为 3:1；大字指至少 24px，或至少 18.66px 且字重至少 700。
禁用文字跳过对比度检查。阈值作为筛查规则使用，不构成整体无障碍合规结论。

[页面扫描器](../scripts/scan-page.mjs)读取计算样式、合成透明背景，并使用中心点的最上层命中元素近似判断可见性。
图片、视频、SVG 和画布跳过检查；图片背景、渐变、透明画布、滤镜和混合效果列为人工复核。
没有直接文字、且中心被子级图片等素材覆盖的容器跳过背景检查，避免将素材背后的暗底误判为遗漏。
中心点方法可能漏检局部露出的背景、透明覆盖层后面的内容及不接收指针事件的元素。
主题变量缺失、隐藏或空白页面不能满足区域覆盖。
变量匹配也不能证明当前安装的主题与仓库版本一致。

区域识别依赖 DOM 标记、页面路由和特定窗口标题。
Steam 使用无法识别的类名时，实际已打开的区域仍可能显示为未验证。
脚本只读取当前视口，不执行滚动或导航，也不扫描伪元素、Shadow DOM、子框架或原生窗口遮挡。
好友聊天、社区、Big Picture 和游戏内覆盖层属于后续检查范围。

## 浏览器验证用例

[CEF 用例](../tests/browser-scanner.test.mjs)创建临时空白页面，加载仓库 CSS 和带已知问题的样本。
它验证真实样式层叠、遗漏背景、低对比度、图片排除、遮挡、隐藏元素、悬停和焦点状态，结束后关闭临时页面。
分隔线、通知、公告按钮及商店首页文字的配色断言使用实际客户端选择器。
悬停与焦点样式通过 CDP 强制伪类验证，不测试鼠标或键盘事件处理。
加载背景用例先加载主题 CSS，再加载调色板，验证文档和浏览器占位层均保持浅色。
该用例覆盖 CSS 接管后的背景，不验证 CEF 原生渲染器在主题样式生效前的首帧颜色。
默认测试跳过此用例；Steam 调试接口可用时执行：

```bash
STEAM_CDP_TEST=1 npm test
```

用例验证扫描器能发现已知问题；真实页面覆盖以实时采集报告为准。
