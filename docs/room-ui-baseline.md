# Room UI 接线基线

状态：DW-001 完成（2026-07-27）；2026-07-30 因头像、真实 QR、云端媒体错误处理接线重新锁定。

这份基线用于记录 Room 页面受保护文件的当前 SHA-256。DW-002～DW-010 时曾要求
不改视觉文件；2026-07-30 这轮头像和真实邀请二维码会合理触碰 Room UI 文件，因此
基线已随代码更新。后续若没有明确 UI 变更任务，仍应以本表作为回归保护。

| 文件 | SHA-256 |
| --- | --- |
| `features/room/components/room-experience.tsx` | `0500DF689A29E22D7A674559371E0A2B0689689FE9AEAC1667801F2C0E1AC92F` |
| `features/room/components/room-experience.module.css` | `3DF040E21AE32BD2549F9C1C97748DC8BECD33D552C860F1C0E794B52D0BC11D` |
| `features/room/components/chat-panel.tsx` | `584EF27E99B81B2FF9C11628B842BE5D5021DD5D6CD8B406BA91C49F91F296C3` |
| `features/room/components/chat-panel.module.css` | `027D76E3680DBBD02F3228EC2E3B7BC7CF938F0325F854E61AB9522CC236DBB5` |
| `features/room/components/itinerary/itinerary-panel.tsx` | `6D4C6419523536D6AC7920C21F25252B67F8EF301502A15D2EFE5BF8310BB671` |
| `features/room/components/itinerary/itinerary.module.css` | `E2469044274A701F5B930425054408DB4AEB312C298644B0504EB65A0DC1A6F9` |
| `features/room/components/room-controls.tsx` | `D1678706FBCC2E3937C1B6ECEAA1EF6214CDF9438A2EDEA67AD5BFFBDF335613` |
| `features/room/components/room-controls.module.css` | `0F3467F9E039CC5A85BC8A542197C3E63A251C4C65FA19081973C8C49CAB44E0` |
| `features/room/components/photos-panel.tsx` | `A8121BCA6027F212605BBB7B8A95176BFEB7AA1CF0CBDAD555720E5EB5D6FCFC` |
| `features/room/components/photos-panel.module.css` | `4589D5AAD3CB1F933F87FAF0C0C4BA622FBF1F76930BA8CC692C9F2A7F978796` |

验收要求：

- Room DOM 和 CSS 由上述组件继续提供；头像和 QR 变更已计入当前基线。
- 后端房间只通过兼容数据模型传入 `RoomExperience`，签名头像 URL 也必须是 DTO 字段，不让组件直接查表。
- 未授权或不存在的房间沿用原 Room unavailable 视觉。
- 最终验证重新计算全部哈希，必须与本表一致。
