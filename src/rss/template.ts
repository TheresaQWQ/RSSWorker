const rssTemplate = `<?xml version="1.0" encoding="UTF-8"?>
<rss  xmlns:atom="http://www.w3.org/2005/Atom" version="2.0">
  <channel>
    <title><![CDATA[{{title}}]]></title>
    <link>{{link}}</link>
    <description><![CDATA[{{desc}} - Made with ❤ by RSSWorker]]></description>
    <generator>RSSHub</generator>
    <language>zh-cn</language>
    {{items}}
  </channel>
</rss>`

const itemTemplate = `
<item>
  <title><![CDATA[{{title}}]]></title>
  <link>{{link}}</link>
  <guid>{{guid}}</guid>
  <pubDate>{{pubDate}}</pubDate>
  <description><![CDATA[{{description}}]]></description>
  <author><![CDATA[{{author}}]]></author>
  {{extra}}
</item>`

export interface RSSItem {
  title: string;
  link: string;
  guid?: string;
  pubDate: string;
  description: string;
  author?: string;
  // 扩展参数
  extra?: {
    key: string;
    value: string;
    cdata?: boolean;
  }[]
}

export const generateRSSContent = (title: string, link: string, desc: string, items: RSSItem[]) => {
  const content = rssTemplate
    .replace('{{title}}', title)
    .replace('{{link}}', link)
    .replace('{{desc}}', desc)
    .replace('{{items}}', items.map(item => {
      let str = itemTemplate
        .replace('{{title}}', item.title)
        .replace('{{link}}', item.link)
        .replace('{{guid}}', item.guid || item.link)
        .replace('{{pubDate}}', item.pubDate)
        .replace('{{description}}', item.description)
        .replace('{{author}}', item.author || '')
      
      if (item.extra) {
        const extra = item.extra.map(extra => {
          return `<${extra.key}>${extra.cdata ? '<![CDATA[' : ''}${extra.value}${extra.cdata ? ']]>' : ''}</${extra.key}>`
        })

        str = str.replace('{{extra}}', extra.join(''))
      }

      return str
    }).join(''))

  return content
}