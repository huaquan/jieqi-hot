const axios = require('axios');
const xml2js = require('xml2js');
const fs = require('fs');
const path = require('path');

const rssFeeds = [
  { name: 'sina', url: 'http://rss.sina.com.cn/news/allnews/sports.xml' },
  { name: 'baidu', url: 'https://tieba.baidu.com/hottopic/browse/topicList' },
  { name: '36kr', url: 'https://36kr.com/feed' },
  { name: 'zhihu', url: 'https://www.zhihu.com/rss' }
];

const parseXml = async (xml) => {
  return new Promise((resolve, reject) => {
    xml2js.parseString(xml, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
};

const fetchRss = async (url) => {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch ${url}: ${error.message}`);
    return null;
  }
};

const processFeeds = async () => {
  const fetchPromises = rssFeeds.map(async (feed) => {
    const xml = await fetchRss(feed.url);
    if (xml) {
      const parsed = await parseXml(xml);
      return parsed.rss.channel[0].item.map(item => ({
        ...item,
        source: feed.name
      }));
    }
    return [];
  });

  const results = await Promise.all(fetchPromises);
  const mergedItems = results.flat();

  // Deduplicate by title
  const uniqueItems = mergedItems.reduce((acc, item) => {
    const existingItem = acc.find(i => i.title[0] === item.title[0]);
    if (!existingItem) acc.push(item);
    return acc;
  }, []);

  // Sort by pubDate (descending)
  uniqueItems.sort((a, b) => {
    const dateA = new Date(a.pubDate[0]);
    const dateB = new Date(b.pubDate[0]);
    return dateB - dateA;
  });

  // Limit to 50 items
  const topItems = uniqueItems.slice(0, 50);

  // Write to file
  const outputDir = path.join(__dirname, '../public');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'hot.json'), JSON.stringify(topItems, null, 2));
};

processFeeds().catch(console.error);