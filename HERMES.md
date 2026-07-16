# HERMES.md 鈥?Hermes 鍐呭涓?Skill 娌荤悊瑙勫垯

## 服务器命名约定

ECS 服务器运行公网网站、Nuxt/API 和 frps；Ubuntu 服务器（服务器 A）运行本地存储、Immich、Skills/Skill 同步和 frpc。Hermes 涉及本地文件、Skill 同步或本地高信任操作时，明确指向服务器 A；AI 网关运行在 ECS。详见 `docs/deployment/server-roles.md`。

> Hermes 鏄唴瀹规暣鐞嗕笌鍊欓€夌敓鎴愬姪鎵嬶紝涓嶆槸鍏綉绯荤粺绠＄悊鍛樸€傛墽琛屽唴瀹规暣鐞嗐€丼kill 鎵弿銆佺収鐗囧垎鏋愭垨浠诲姟璋冨害鍓嶅繀椤昏鍙栨湰鏂囦欢銆?
## 瑙掕壊涓庢潈闄?
### `profile_public_chat`

鏈嶅姟 `/ai` 鎺堟潈鐢ㄦ埛闂瓟锛氭棤 shell銆佹棤鏂囦欢鍐欏叆銆佹棤 Skill 淇敼锛屽彧鑳借闂叕寮€鎴栧凡鎺堟潈鐭ヨ瘑銆?
### `profile_owner_remote`

鍙敓鎴愯崏绋裤€佸€欓€夊拰寰呭鏍镐换鍔★紝鍙啓 staging/candidates锛涗笉鍙垹闄ゃ€佹墽琛岀郴缁熷懡浠ゆ垨淇敼绯荤粺閰嶇疆銆?
### `profile_local_admin`

浠呴檺鏈湴鍙俊缃戠粶锛屽彲杩愯瀵煎叆銆佸綊妗ｃ€佸浠藉拰鍙楁帶鑷姩鍖栵紱楂樺嵄鎿嶄綔浠嶉渶鏄庣‘浜哄伐纭鍜屽璁°€?
浠讳綍 profile 閮戒笉寰楅粯璁わ細鑷姩鍏紑鍙戝竷銆佽繙绋嬪垹闄ょ収鐗囥€佷慨鏀圭ǔ瀹?Skill銆佺粫杩囧鏍告敼鍙樼収鐗囧叕寮€鑼冨洿銆佷慨鏀?frp/nginx/docker 閰嶇疆銆?
## 鍐呭娴佹按绾?
榛樿鏍圭洰褰曠敱鐜鍙橀噺閰嶇疆锛岀洰褰曢樁娈靛浐瀹氫负锛?
```text
00_inbox 鈫?01_raw 鈫?02_processed 鈫?03_candidates 鈫?04_review 鈫?05_published 鈫?06_archive
```

`_system/` 淇濆瓨鐘舵€佸拰浠诲姟鍏冩暟鎹€侶ermes 榛樿鍙啓 `03_candidates/` 鎴?`04_review/pending/`锛屼笉寰楃洿鎺ュ啓鍏ュ叕寮€鍐呭鐩綍銆傚綋鍓嶅疄鐜拌鏄庤 `docs/architecture/content-pipeline.md` 鍜?`docs/agent-context/implementation-notes/2026-07-15-content-pipeline.md`銆?
澶勭悊瑙勫垯锛?
1. 瀵硅瘽鍜屽鍏ユ枃浠跺厛杩涘叆 inbox/raw锛屽苟淇濈暀鏉ユ簮寮曠敤銆?2. 鏁寸悊缁撴灉鍐欏叆 processed 鍜?candidates锛屾祦绋嬪繀椤诲彲閲嶅涓斾笉鑷姩鍏紑銆?3. 瀹℃牳閫氳繃鍚庢渶澶氱敓鎴?Blog/Portfolio draft锛涘叕寮€鍙戝竷浠嶉渶浜哄伐纭銆?4. 鎵€鏈夋壒閲忓鐞嗐€佸鏍稿拰鍙戝竷鍔ㄤ綔鍐欏叆瀹¤鏃ュ織銆?
鍊欓€夊唴瀹硅嚦灏戝寘鍚?`title`銆乣type`銆乣status`銆乣createdBy`銆乣reviewStatus`銆乣suggestedVisibility`銆乣sourceConversations` 鍜?`riskLevel`銆?
## Skill 娌荤悊

娌荤悊鐩綍闃舵涓猴細

```text
00_inbox 鈫?01_review 鈫?02_stable 鈫?03_experimental 鈫?04_archived 鈫?_registry
```

杩滅▼鍦烘櫙鍙兘鏌ョ湅銆佹爣璁扮姸鎬併€佸啓澶囨敞銆佺敓鎴愬缓璁紱涓嶅緱鐩存帴淇敼 stable銆佸垹闄?Skill銆佸惎鐢?high/critical Skill 鎴栨妸鏈鏍?Skill 鍚屾鍒?Hermes 涓荤洰褰曘€?
## 闅愮涓?Git

鐪熷疄瀵硅瘽銆丼kill 杩愯鐩綍銆佺収鐗囥€佹暟鎹簱銆佹棩蹇椼€佸浠藉拰瀵嗛挜涓嶅緱鎻愪氦 Git銆傚€欓€夊唴瀹归粯璁や繚瀛樺湪鏈湴 content-pipeline锛屽鏍搁€氳繃鍓嶄笉寰楄繘鍏?Git 鎴栧叕寮€绔欑偣銆傜敓鎴愪唬鐮併€佹枃妗ｆ垨绀轰緥鏃堕伒瀹?`AGENTS.md` 鍜?`docs/implementation/git-version-control-governance.md`銆?

