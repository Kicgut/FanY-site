# CODEX.md 鈥?Codex 寮€鍙戜笌楠岃瘉瑙勫垯

## 服务器命名约定

ECS 服务器负责公网网站、Nuxt/API、Docker、Nginx 和 frps，AI 配置写入 ECS 的 `nuxt-app/.env`；Ubuntu 服务器（服务器 A）负责本地存储、Immich、Skills/Skill 同步、frpc 和照片回流。两者不得混称。详见 `docs/deployment/server-roles.md`。

Codex 璐熻矗 Nuxt/Vue 椤甸潰銆丼erver API銆丳risma schema/migration銆佹湇鍔′笌鑴氭湰銆佹祴璇曞拰楠岃瘉锛涗骇鍝佹潈闄愯竟鐣屼互 `AGENTS.md`銆乣HERMES.md` 鍜?`docs/architecture/` 涓哄噯銆?
## 寮€濮嬪伐浣滃墠

1. 璇诲彇 `AGENTS.md`銆?2. 浠?`docs/README.md` 鎵惧埌瀵瑰簲鐨勫綋鍓嶆灦鏋勩€佽璁″拰浠诲姟鏂囨。銆?3. 妫€鏌?`git status`锛屼繚鐣欑敤鎴峰凡鏈夋敼鍔紝涓嶈鐩栨棤鍏虫枃浠躲€?4. 鍏堢‘璁ゅ綋鍓嶄唬鐮侊紝鍐嶄慨鏀硅鍒掓枃妗ｆ垨瀹炵幇銆?
## API 瀹炵幇椤哄簭

```text
璇诲彇璇锋眰 鈫?璁よ瘉 鈫?鏉冮檺 鈫?杈撳叆鏍￠獙 鈫?service 鈫?audit log 鈫?缁熶竴鍝嶅簲
```

handler 涓嶅簲鐩存帴鎷兼帴鏂囦欢璺緞銆佸疄鐜板鏉傛潈闄愰€昏緫銆佽闂?Hermes 涓昏繘绋嬫垨杩斿洖鏈湴鐪熷疄璺緞銆傛枃浠舵搷浣滃繀椤荤粡杩囪矾寰勪繚鎶わ紱鍏紑 API 涓嶅緱杩斿洖 private 鍏冩暟鎹€?
## 鏁版嵁涓庣姸鎬?
- 鏁版嵁搴撳瓧娈靛彉鏇村繀椤诲悓鏃舵彁浜?migration銆侀獙璇佸懡浠ゅ拰鍥炴粴璇存槑銆?- 鐓х墖銆佸€欓€夊唴瀹广€佸彂甯冭褰曞拰 Job 蹇呴』浣跨敤鏄惧紡鐘舵€佹満銆?- `approved` 涓嶇瓑浜庡叕寮€锛涘唴瀹规祦姘寸嚎鍙戝竷棣栧厛鐢熸垚 draft锛屽叕寮€鍙戝竷浠嶉渶鍗曠嫭浜哄伐纭銆?- AI/Hermes 姘歌繙鍙兘鍒涘缓鎴栦慨鏀瑰€欓€夛紝涓嶅緱鑷姩鍏紑銆?
## 楠岃瘉娓呭崟

鎸夋敼鍔ㄨ寖鍥存墽琛岋細

- `npx prisma validate`銆乣npx prisma migrate deploy`锛堟暟鎹簱鍙樻洿锛夈€?- `pnpm exec tsc --noEmit`锛圱ypeScript 鍙樻洿锛夈€?- `pnpm build`锛堥〉闈€佹湇鍔°€佽矾鐢辨垨鐢熶骇閰嶇疆鍙樻洿锛夈€?- 鏉冮檺鎷掔粷銆佽秺鏉冮殧绂汇€佸緟瀹℃牳涓嶅睍绀恒€佽矾寰?escape銆乣visibleTo` 鍜屽璁℃棩蹇楁祴璇曘€?- 浣跨敤 Conda 鐜鏃堕伒寰牴鐩綍 `environment.yml` 鍜?`docs/deployment/development-environment.md`銆?
楠岃瘉澶辫触瑕佽鏄庡師鍥犮€佸奖鍝嶈寖鍥村拰鏄惁涓虹幆澧冮棶棰橈紝涓嶅緱鎶婃湭楠岃瘉鍐欐垚宸插畬鎴愩€?
## Git 杈圭晫

閬靛畧 `docs/implementation/git-version-control-governance.md`銆備唬鐮併€佹枃妗ｃ€佹ā鏉裤€乵igration 鍜屾祴璇曞彲浠ユ彁浜わ紱鐪熷疄鐓х墖銆佹暟鎹簱銆乣.env`銆丠ermes 杩愯鏃舵暟鎹€佹棩蹇椼€佸浠藉拰瀵嗛挜涓嶅緱鎻愪氦銆?

