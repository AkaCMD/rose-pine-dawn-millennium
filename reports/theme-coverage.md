# Steam 主题覆盖检查

采集时间：2026-10-24T06:53:32.605Z。状态标签：installed-live-refresh。

疑似遗漏需要复核。未验证表示缺少可用页面或主题变量，不能视为已通过。

| 区域 | 状态 | 可用页面 | 疑似遗漏 | 人工复核 |
| --- | --- | ---: | ---: | ---: |
| 主窗口 | 需人工复核 | 1 | 0 | 1 |
| 库首页 | 未验证 | 0 | 0 | 0 |
| 收藏夹 | 未验证 | 0 | 0 | 0 |
| 游戏详情 | 未验证 | 0 | 0 | 0 |
| 下载 | 未验证 | 0 | 0 | 0 |
| 设置 | 未验证 | 0 | 0 | 0 |
| 菜单 | 未验证 | 0 | 0 | 0 |
| 商店 | 疑似遗漏 | 1 | 2 | 62 |

## 元素证据

| 页面 | 问题 | 元素 | 计算值 |
| --- | --- | --- | --- |
| Steam 上的 Call of Duty®: Modern Warfare® 4 | low-contrast | `#purchase_note > div.notice_box_content:nth-child(2) > b:nth-child(1)` | 2.5:1 < 4.5:1 |
| Steam 上的 Call of Duty®: Modern Warfare® 4 | low-contrast | `#purchase_note > div.notice_box_content:nth-child(2) > p:nth-child(3)` | 1.96:1 < 4.5:1 |

## 页面采集情况

| 页面 | 可见状态 | 主题变量匹配 | 样本数 | 区域识别 |
| --- | --- | --- | ---: | --- |
| Library Supernav | hidden | 是 | 7 | 未识别 |
| Steam 上的 Call of Duty®: Modern Warfare® 4 | visible | 是 | 110 | store |
| Store Supernav | hidden | 是 | 10 | 未识别 |
| Community Supernav | hidden | 是 | 9 | 未识别 |
| Profile Supernav | hidden | 是 | 12 | 未识别 |
| Account Menu | hidden | 是 | 11 | menus |
| Notifications Menu | hidden | 是 | 8 | menus |
| Help Root Menu | hidden | 是 | 12 | menus |
| Games Root Menu | hidden | 是 | 9 | menus |
| Friends Root Menu | hidden | 是 | 11 | menus |
| Steam Root Menu | hidden | 是 | 13 | menus |
| View Root Menu | hidden | 是 | 16 | menus |
| (Steam renderer) | hidden | 是 | 0 | 未识别 |
| Steam | visible | 是 | 28 | frame |
| (Steam renderer) | hidden | 是 | 2 | collections |
| (Steam renderer) | hidden | 是 | 0 | 未识别 |

## 检查边界

JSON 保留所有需人工复核元素、坐标和计算样式。报告不保存文字内容、Cookie、查询参数或会话值。

只检查当前视口；悬停、键盘焦点、选中、弹出菜单和滚动后的内容需要分别打开并重新采集。

好友聊天、社区、Big Picture 和游戏内覆盖层属于后续范围。

背景图片、渐变、透明画布、滤镜及混合效果列为人工复核。图片、视频、SVG 和画布保留原色。

深色背景是疑似遗漏；调色板强调色允许用作背景。对比度阈值为普通文字 4.5:1、大字 3:1。

可见性采用中心点最上层元素命中近似判断；无直接文字且中心被子级素材覆盖的容器跳过背景检查。伪元素、Shadow DOM、子框架和原生窗口遮挡没有覆盖。

themeBase 只验证当前渲染器存在主题变量，不能证明加载的是本次仓库版本。

退出码：0 表示采集完成；1 表示 strict 检查发现遗漏、待复核、未验证或采集失败；2 表示接口或参数错误。
