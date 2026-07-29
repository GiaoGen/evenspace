# Room UI 接线基线

状态：DW-001 完成（2026-07-27）；2026-07-30 因头像、真实 QR、云端媒体错误处理接线重新锁定。

这份基线用于记录 Room 页面受保护文件的当前 SHA-256。DW-002～DW-010 时曾要求
不改视觉文件；2026-07-30 这轮头像和真实邀请二维码会合理触碰 Room UI 文件，因此
基线已随代码更新。后续若没有明确 UI 变更任务，仍应以本表作为回归保护。

| 文件 | SHA-256 |
| --- | --- |
| `features/room/components/room-experience.tsx` | `1009CD3C9870FD4FA491C2F9449D484D57965C0B031F4C71F96D890DDEF99AFF` |
| `features/room/components/room-experience.module.css` | `58C24014A986240E9688599D2E8880BA4FB6618936C0DDA84AD113B6C2D9425F` |
| `features/room/components/chat-panel.tsx` | `0420484942460FE605778760F1C8874AF6397B8A867CA0A0F263AF6BD9D7F1B2` |
| `features/room/components/chat-panel.module.css` | `6C644494BEC765185703B2D1AEC23549C38F320325399AC2F03DA4F86F6031E3` |
| `features/room/components/itinerary/itinerary-panel.tsx` | `83769901274796CBB842818393F687FBC96F9D21AA18F7CDE8C3D14D71ABCF8E` |
| `features/room/components/itinerary/itinerary.module.css` | `E2469044274A701F5B930425054408DB4AEB312C298644B0504EB65A0DC1A6F9` |
| `features/room/components/room-controls.tsx` | `D1678706FBCC2E3937C1B6ECEAA1EF6214CDF9438A2EDEA67AD5BFFBDF335613` |
| `features/room/components/room-controls.module.css` | `0F3467F9E039CC5A85BC8A542197C3E63A251C4C65FA19081973C8C49CAB44E0` |
| `features/room/components/photos-panel.tsx` | `255A071E99C71D088FDA1EB525121A3E4A14C30F0C2879353221D6DFADF6AE59` |
| `features/room/components/photos-panel.module.css` | `4DF726F1F13F57BBFF68C057C8145FF9E223F426A3521021563DF02CE06D3485` |

验收要求：

- Room DOM 和 CSS 由上述组件继续提供；头像和 QR 变更已计入当前基线。
- 后端房间只通过兼容数据模型传入 `RoomExperience`，签名头像 URL 也必须是 DTO 字段，不让组件直接查表。
- 未授权或不存在的房间沿用原 Room unavailable 视觉。
- 最终验证重新计算全部哈希，必须与本表一致。
