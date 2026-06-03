# AI英雄汇会议室预定系统

纯静态会议室门口屏幕预订系统，按 PRD 使用 HTML、CSS、Vanilla JavaScript 和 localStorage 实现。

## 运行方式

直接用浏览器打开 `index.html` 即可运行，不需要 npm、后端、数据库或构建工具。

## 功能

- 当前会议室状态：Available / 空闲、In Use / 使用中
- 当前时间与中英文日期，每 30 秒刷新
- 今日会议列表，按开始时间升序排列
- 新增会议、点击会议查看详情、编辑会议、删除会议
- 08:00 - 17:00 工作时间校验
- 12:00 - 13:00 午休时间不可预订
- 30 分钟时间粒度
- 会议冲突检测
- 下一场会议卡片
- 会议室详情卡片
- 可用时间条：绿色可用、红色已预订、灰色午休、黑色当前时间指针
- 中国和马来西亚未来节假日展示
- 节假日 30 天刷新机制，失败时回退到缓存或内置默认数据
- 会议记录 Excel 导出、本地数据重置
- 弹窗、按钮、列表、提示消息包含柔和动效，并支持 `prefers-reduced-motion`

## localStorage keys

- `aihero_bookings`
- `aihero_room_config`
- `aihero_holiday_cache`
- `aihero_holiday_last_updated`

## 数据导出

设置弹窗中的导出功能只导出会议记录，文件格式为 `.xlsx`，不包含会议室配置、节假日缓存或其他本地状态数据。

## 本地逻辑测试

项目本身不依赖 npm。若要运行附带的核心逻辑测试，可使用本机 Node：

```powershell
node tests\booking.test.js
```
