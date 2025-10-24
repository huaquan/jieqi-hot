/**
 * aggregate.js
 * 聚合 4 个 JSON 格式热榜 → public/hot.json
 * GitHub Actions 每 4 小时调用一次
 */
import fs from 'fs';
import axios from 'axios';

const SOURCES = [
  { name: '新浪新闻', url: 'https://rsshub.rssforever.com/sina/news?format=json' },
  { name: '百度热搜', url: 'https://rsshub.rssforever.com/baidu/tieba/hot?format=json' },
  { name: '36Kr 快讯', url: 'https://rsshub.rssforever.com/36kr/newsflashes?format=json' },
  { name: '知乎热榜', url: 'https://rsshub.rssforever.com/zhihu/hot?format=json' }
];

const MAX = 50;                          // 最多保留 50 条
const DESC_LEN = 90;                     // 导语长度

(async () => {
  let all = [];

  // 并发拉取
  await Promise.all(
    SOURCES.map(async ({ name, url }) => {
      try {
        const { data } = await axios.get(url, { timeout: 8000 });
        // RSSHub JSON 格式: data.items || data.data
        const items = (data.items || data.data || []).slice(0, 15);
        all.push(
          ...items.map((it) => ({
            title: it.title?.trim() || '',
            link: it.link || it.url || '',
            desc: (it.description || it.summary || '')
              .replace(/<[^>]+>/g, '')        // 去 HTML 标签
              .slice(0, DESC_LEN),
            source: name,
            ts: new Date(it.pubDate || it.created || it.date || Date.now()).toISOString()
          }))
        );
      } catch (e) {
        console.warn(`❌ ${name} 抓取失败`, e.message);
      }
    })
  );

  // 去重 + 排序 + 截断
  const seen = new Set();
  const dedup = all
    .filter((it) => it.title)
    .filter((it) => {
      const key = it.title.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => new Date(b.ts) - new Date(a.ts))
    .slice(0, MAX);

  // 写文件
  fs.mkdirSync('public', { recursive: true });
  fs.writeFileSync('public/hot.json', JSON.stringify(dedup, null, 2));
  console.log(`✅ 已写入 ${dedup.length} 条热点`);
})();