# 电影感主题与管理台

本次相对于 PR #14 合并版 `f3e6a90`，在同一个发布分支 `feat/admin-cinematic-observatory` 完成管理台和全站场景更新。

- 管理台的静态球体换为多层玻璃、折射纹理和空间粒子。指针和触摸改变视角，聚焦会拉近镜头，数据同步会扫过一道短光。统计卡可展开查看组成，用户列表可展开查看账号活动、记录和附件。
- 新增趋势支持 7 天和 30 天。点日期、下拉选日期或用方向键移动时，明细显示当天注册的人和时间，以及贡献日常的人和对应篇数。从账号名称可精确定位用户。统计按北京时间归类，包含仍在回收站的日常，明细仅返回账号标识、名称、注册时间和篇数。
- 未登录首页使用四张原创动漫场景。纸白是温室，海盐是海边车站，麦芽是旧电影院，墨林是山间观测站。场景有指针视差、滚动镜头与可操作的聚焦。相册保留完整原图和 4 秒停留，加入对应的播放进度。
- 登录和注册扩大并下移左侧取景框，手机端把动画与表单依序排列。日常与发现重新处理封面前后景、文字衬底和按钮。右下角的全页开关对应蝶翼抬升、鱼群横游、胶片投影、流星与星图四套独立动作。

本地用虚构账号与横竖照片样本完成桌面及 390 像素手机浏览器验收。检查了管理台聚焦、趋势日期明细与用户跳转，首页聚焦、相册比例和自动播放、登录与注册、日常封面及月份导航，以及全页开关的跨页状态。四套主题动效支持系统的减少动态效果偏好。生产发布由合并到 `master` 后的工作流执行。

视觉参考为独立作品的镜头与交互做法。 [MotionSites 指针跟随](https://www.motionsites.ai/lesson/cursor-tracking-website-with-motionsites) · [MotionSites 层次与玻璃](https://www.motionsites.ai/lesson/build-animated-website-with-ai) · [AI Design Skills](https://github.com/elayadesign/ai-design-skills) · [Codrops 开源动效示例](https://github.com/JosephASG/codrops-cinematic-scroll-animations)
