# Room UI 接线基线

状态：DW-001 完成（2026-07-27）；2026-07-30 因头像、真实 QR、云端媒体错误处理接线重新锁定。

这份基线用于记录 Room 页面受保护文件的当前 SHA-256。DW-002～DW-010 时曾要求
不改视觉文件；2026-07-30 这轮头像和真实邀请二维码会合理触碰 Room UI 文件，因此
基线已随代码更新。后续若没有明确 UI 变更任务，仍应以本表作为回归保护。

| 文件 | SHA-256 |
| --- | --- |
| `features/room/components/room-experience.tsx` | `806FEB4593AF863ECB9EA4D059E05108E5472FFC455D438F47652712C8C185F9` |
| `features/room/components/room-experience.module.css` | `3DF040E21AE32BD2549F9C1C97748DC8BECD33D552C860F1C0E794B52D0BC11D` |
| `features/room/components/chat-panel.tsx` | `EB8D724319274F082DA1F9156C56BA483EF73AD14B130928FD906134BBB6438B` |
| `features/room/components/chat-panel.module.css` | `877BAC04EE73FD52D62C570016C226D2C8EF7C9EA58238E21069336436124E05` |
| `features/room/components/itinerary/itinerary-panel.tsx` | `83769901274796CBB842818393F687FBC96F9D21AA18F7CDE8C3D14D71ABCF8E` |
| `features/room/components/itinerary/itinerary.module.css` | `E2469044274A701F5B930425054408DB4AEB312C298644B0504EB65A0DC1A6F9` |
| `features/room/components/room-controls.tsx` | `D1678706FBCC2E3937C1B6ECEAA1EF6214CDF9438A2EDEA67AD5BFFBDF335613` |
| `features/room/components/room-controls.module.css` | `0F3467F9E039CC5A85BC8A542197C3E63A251C4C65FA19081973C8C49CAB44E0` |
| `features/room/components/photos-panel.tsx` | `1054CFC6D56DCD88DF1B879F18127A73FADBA58943C0DDB00E78269CEC00FB03` |
| `features/room/components/photos-panel.module.css` | `CF23059AF169B7FCC787E26673A31A8D0D8A3D3C454F11FA1C606AFDABA9BD1D` |

验收要求：

- Room DOM 和 CSS 由上述组件继续提供；头像和 QR 变更已计入当前基线。
- 后端房间只通过兼容数据模型传入 `RoomExperience`，签名头像 URL 也必须是 DTO 字段，不让组件直接查表。
- 未授权或不存在的房间沿用原 Room unavailable 视觉。
- 最终验证重新计算全部哈希，必须与本表一致。
