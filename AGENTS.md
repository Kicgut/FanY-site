# AGENTS.md 鈥?椤圭洰閫氱敤浠ｇ悊瑙勫垯

## 服务器命名约定（必须遵守）

- ECS 服务器：运行公网网站、Nuxt/API、Docker、Nginx、frps；AI 配置放在 ECS 的 `nuxt-app/.env`。
- Ubuntu 服务器（服务器 A）：运行本地存储、照片原图、Immich、Skills/Skill 同步、frpc 和照片回流；不等同于 ECS。
- 网站 404、API、AI 配置和部署默认指 ECS；原图、Skill 同步和本地服务指服务器 A。详见 `docs/deployment/server-roles.md`。

> 閫傜敤浜?Codex銆丠ermes銆丆laude Code銆丆ursor Agent 鍙婂叾浠栦唬鐮佷唬鐞嗐€傚厛璇绘湰鏂囦欢锛屽啀鎸変换鍔¤鍙?`CODEX.md`銆乣HERMES.md` 鍜?`docs/README.md`銆?
## 椤圭洰瀹氫綅

鏈」鐩敱鍥涢儴鍒嗙粍鎴愶細鍏紑缃戠珯銆佺収鐗囪祫浜х鐞嗐€丠ermes 鍐呭鐢熶骇涓灑銆佺瀵嗗唴瀹瑰畨鍏ㄧ綉鍏炽€?
鏍稿績鍘熷垯锛?
1. 鍏紑銆佹湅鍙嬨€佺浜哄唴瀹瑰繀椤诲垎灞傞殧绂汇€?2. 鏈湴鏈嶅姟鍣ㄤ繚瀛樺師鍥俱€佺瀵嗗唴瀹广€丠ermes 涓诲疄渚嬪拰鏈€楂樻潈闄愭搷浣滐紱ECS 鍙壙鎷呭叆鍙ｅ拰鍏紑灞曠ず銆?3. AI/Hermes 鍙兘鐢熸垚鍊欓€夊唴瀹癸紝涓嶈兘缁曡繃浜哄伐瀹℃牳鑷姩鍏紑銆?4. 杩滅▼ owner 涓嶆槸鏈€楂樻潈闄愶紱鍒犻櫎銆乻hell銆丼kill 淇敼绛夌牬鍧忔€ф搷浣滃繀椤昏姹?`local_trusted`銆?
## 鏉冨▉鏂囨。涓庨槄璇婚『搴?
- 鏂囨。鍏ュ彛鍜岀洰褰曪細`docs/README.md`
- 鏂囨。淇敼椤哄簭锛歚docs/documentation-guide.md`
- 褰撳墠鏋舵瀯锛歚docs/architecture/`
- 璁捐銆佸疄鐜般€佽繍缁磋鑼冿細`docs/design/`銆乣docs/implementation/`銆乣docs/operations/`
- 浠诲姟鍜屾湭瀹屾垚璁″垝锛歚docs/project-management/tasks/`銆乣docs/project-management/plans/`
- Codex 涓撶敤绾︽潫锛歚CODEX.md`
- Hermes 涓撶敤绾︽潫锛歚HERMES.md`

浠诲姟寮€濮嬪墠鍏堢‘璁ゅ綋鍓嶅疄鐜帮紝鍐嶅尯鍒嗏€滃凡瀹炵幇鈥濃€滆鍒掍腑鈥濃€滃巻鍙茶褰曗€濓紱涓嶈鎶婅鍒掓枃妗ｅ綋浣滀唬鐮佷簨瀹炪€?
## 瀹夊叏杈圭晫

浠ｇ悊涓嶅緱瀹炵幇浠ヤ笅琛屼负锛岄櫎闈炴槑纭爣娉ㄤ负浠呮湰鍦版渶楂樻潈闄愬苟鑾峰緱浜哄伐纭锛?
- 鍏綉鏆撮湶 Hermes WebUI 瀹屾暣鑳藉姏鎴栬繙绋嬫墽琛?shell銆?- 杩滅▼姘镐箙鍒犻櫎鐓х墖銆佸喎瀛樺偍鏂囦欢鎴栨暟鎹簱銆?- 鑷姩淇敼绋冲畾 Skill銆佺郴缁熼厤缃垨 frp/nginx/docker 閰嶇疆銆?- AI 鐢熸垚鍚庤嚜鍔ㄥ叕寮€鍙戝竷锛屾垨璁╃敤鎴蜂笂浼犲悗鐩存帴鍏紑灞曠ず銆?- 缁曡繃 Nuxt API 鏉冮檺鏍￠獙鏆撮湶 friends/private 鍘熷浘鎴栧厓鏁版嵁銆?- 灏嗙湡瀹?`.env`銆丣WT_SECRET銆乫rp token銆丄PI key銆佹暟鎹簱銆佺収鐗囥€佸璇濄€佹棩蹇楁垨澶囦唤鍐欏叆 Git銆?
## 瀹炵幇瑙勫垯

- 鏂?API 蹇呴』鎵ц璁よ瘉銆佹潈闄愭牎楠屻€佽緭鍏ユ牎楠岋紝骞堕€氳繃 service 灞傝闂暟鎹簱鎴栨枃浠剁郴缁熴€?- 鏂囦欢璺緞鍙兘鐢辨暟鎹簱 ID 鎴栫櫧鍚嶅崟鏍圭洰褰曡В鏋愶紝蹇呴』闃叉 `..` 閫冮€稿拰 symlink 缁曡繃銆?- 鎵归噺鎿嶄綔瑕佹敮鎸?dry-run 鎴栬繑鍥炲奖鍝嶈寖鍥达紝骞惰褰?audit log銆?- 鐓х墖銆佸唴瀹瑰拰 Skill 鐨勭姸鎬佹祦杞繀椤绘樉寮忥紝绂佹闅愬紡鍙戝竷銆?- 鏂?Prisma 瀛楁蹇呴』鏈?migration銆侀獙璇佹柟寮忓拰鍥炴粴璇存槑銆?- 缁熶竴鍝嶅簲锛氭垚鍔熶负 `{ success: true, data }`锛屽け璐ヤ负 `{ success: false, code, message }`銆?
## 淇敼鍚庣殑鏈€浣庨獙璇?
鏍规嵁椋庨櫓閫夋嫨骞惰褰曢獙璇佺粨鏋滐紝鑷冲皯瑕嗙洊锛氭潈闄愭嫆缁濄€佽秺鏉冮殧绂汇€佸緟瀹℃牳涓嶅叕寮€銆佽矾寰勮竟鐣屻€佹壒閲忓璁℃棩蹇楋紱鏁版嵁搴撲慨鏀硅繕闇€鎵ц Prisma 鏍￠獙鍜岃縼绉婚獙璇侊紝鍓嶇/鏈嶅姟淇敼杩橀渶鎵ц绫诲瀷妫€鏌ヤ笌鏋勫缓銆?
## Git 杈圭晫

浠ｇ爜銆佹枃妗ｃ€侀厤缃ā鏉裤€乵igration 鍜屾祴璇曡繘鍏?Git锛涚湡瀹炴暟鎹€佸瘑閽ャ€佽繍琛屾椂鐩綍鍜屽浠戒笉寰楄繘鍏?Git銆傛彁浜ゅ墠鍙傝€?`docs/implementation/git-version-control-governance.md`銆?

