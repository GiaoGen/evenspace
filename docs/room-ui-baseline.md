# Room UI 接线基线

状态：DW-001 完成（2026-07-27）

这份基线用于保证 Supabase 数据接线不改变现有 Room 页面 UI。DW-002～DW-010
只允许修改数据加载、命令适配、会话同步、Realtime 和测试；以下视觉组件及 CSS
在本轮接线中必须保持字节级不变。

| 文件 | SHA-256 |
| --- | --- |
| `features/room/components/room-experience.tsx` | `C0BA00C17CC58E7FC78845AB565269B4A61F6D09CBD6BE757E6900945B1D1BBF` |
| `features/room/components/room-experience.module.css` | `035F410C17C43634489220772FA18488D1D75D4275F2F68912F8EDCA7D07C632` |
| `features/room/components/chat-panel.tsx` | `D2DA02972755BB01069010CACF9805473EF507DA84D4B958C052D2BAFBE2519C` |
| `features/room/components/chat-panel.module.css` | `6CEB725D4151706220EC3CD94831A31AC374FE0C4C7ABE9BBD33E76C13C893B4` |
| `features/room/components/itinerary/itinerary-panel.tsx` | `83769901274796CBB842818393F687FBC96F9D21AA18F7CDE8C3D14D71ABCF8E` |
| `features/room/components/itinerary/itinerary.module.css` | `1FDD1467FEFD29BE103B147FA61225AE45A1B90A2A26F79D51DFBEF72A7DC9DE` |
| `features/room/components/room-controls.tsx` | `88D28FD92C1CD3535672DB7B4B54D3C9B1A9806AEDF636597FA009B4F4437A7F` |
| `features/room/components/room-controls.module.css` | `95D23E2FD2EF7047CD49B99E0F8C3EDF1DE48B1B517E417F2F556714890F5B2B` |
| `features/room/components/photos-panel.tsx` | `5E206D0B6E44E5308F1C4C34143651123A2E0825A9B9081B9AB91D9606C3E8C4` |
| `features/room/components/photos-panel.module.css` | `4DF726F1F13F57BBFF68C057C8145FF9E223F426A3521021563DF02CE06D3485` |

验收要求：

- Room DOM 和 CSS 由上述原组件继续提供。
- 后端房间只通过兼容数据模型传入 `RoomExperience`。
- 未授权或不存在的房间沿用原 Room unavailable 视觉。
- 最终验证重新计算全部哈希，必须与本表一致。
