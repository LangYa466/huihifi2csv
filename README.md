# huihifi2csv

目前写死了会去提取下面这 5 条曲线
- 94db 至臻原声
- 94db 纯享人声
- 94db 丹拿特调
- 34db 高洁解析 (系统里有时候叫 高清解析)
- 94db 澎湃低音


# RUN： 
```bash
npm install
```

GET evaluation ID
`https://huihifi.com/evaluation/5f8a2211-1aab-4a17-89c3-26b5c7c1ae4d`
ID = URL.remove https://huihifi.com/evaluation/ = 5f8a2211-1aab-4a17-89c3-26b5c7c1ae4d
```bash
node main.js 5f8a2211-1aab-4a17-89c3-26b5c7c1ae4d
```
```bash
node main.js your-id
```

`output/{ID}` 

> 过程 `debug` 目录有
