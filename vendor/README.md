# vendor

여기 있는 것은 **받아서 넣어 둔 남의 코드**다. 직접 고치지 않는다. 고칠 일이
생기면 아래 방법으로 다시 만든다.

## supabase.js

`@supabase/supabase-js` 를 한 파일로 묶은 것. 서버(Supabase)와 주고받는 일을
한다.

- 판: **2.45.4**
- 만든 날: 2026-09-20
- 크기: 약 99 KB (minify)

### 왜 CDN 을 안 쓰나

`https://esm.sh/...` 나 jsDelivr 에서 그때그때 불러오면 짧고 편하다. 그런데
이 화면은 얼굴 사진과 건강에 관한 측정값을 다룬다. 그 화면에서 도는 코드를
남의 서버가 매번 보내 준다는 뜻이고, 그쪽이 바뀌면 이쪽도 같이 바뀐다.
받아서 같이 두면 우리가 올린 것만 돈다.

곁가지로, 인터넷이 느리거나 막힌 자리에서도 화면이 뜬다.

jsDelivr 의 `/+esm` 주소는 한 파일처럼 보이지만 실제로는 딸린 꾸러미 6개를
다시 불러오는 껍데기다. 그래서 그 파일만 받아 두는 것으로는 안 된다.

### 다시 만드는 법

`C:\src\nodejs` 에 node 가 있다. PATH 에 없으므로 앞에 붙여 준다.

```powershell
$env:Path = "C:\src\nodejs;$env:Path"

$tmp = "$env:TEMP\pidu_bundle"
New-Item -ItemType Directory -Force $tmp | Out-Null
Set-Location $tmp

'{"name":"b","private":true,"type":"module"}' | Out-File package.json -Encoding utf8
npm install @supabase/supabase-js@2.45.4 esbuild --no-audit --no-fund

"export { createClient } from '@supabase/supabase-js';" | Out-File entry.js -Encoding utf8

node_modules\.bin\esbuild.cmd entry.js --bundle --format=esm --platform=browser `
  --minify --target=es2020 --outfile="C:\src\hpe_rehab\dashboard\vendor\supabase.js"
```

만든 뒤 확인할 것: 파일 안에 `https://` 로 시작하는 `import` 가 없어야 한다.
있으면 아직 밖을 보고 있다는 뜻이다.

판을 올렸으면 이 문서의 판 번호와 날짜도 같이 고친다.
