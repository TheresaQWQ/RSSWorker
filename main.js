addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

const template = {
  rss: `<?xml version="1.0" encoding="UTF-8"?>
  <rss  xmlns:atom="http://www.w3.org/2005/Atom" version="2.0">
    <channel>
      <title><![CDATA[{{title}}]]></title>
      <link>{{link}}</link>
      <description><![CDATA[{{desc}} - Made with ❤ by RSSWorker]]></description>
      <generator>RSSHub</generator>
      <language>zh-cn</language>
      {{items}}
    </channel>
</rss>`,
  item: `<item>
  <title><![CDATA[{{title}}]]></title>
  <description><![CDATA[{{desc}}]]></description>
  <pubDate>{{time}}</pubDate>
  <guid>{{guid}}</guid>
  <link>{{link}}</link>
</item>`
}

const utils = {
  bili: {
    iframe: (aid, page, bvid) => `<iframe src="https://player.bilibili.com/player.html?${bvid ? `bvid=${bvid}` : `aid=${aid}`}${ page ? `&page=${page}` : '' }&high_quality=1" width="650" height="477" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true"></iframe>`
  },
  query: (url) => {
    const query = {};
    url.split("?").pop().split("&").forEach(e => {
      query[e.split('=')[0]] = e.split('=')[1];
    })

    return query;
  },
  makeRSS: (title, desc, link, items) => {
    const tmp1 = template.rss.replace("{{title}}", title).replace("{{desc}}", desc).replace("{{link}}", link);
    const tmp2 = [];
    Object.values(items).forEach(e => {
      tmp2.push(
        template.item
        .replace("{{title}}", e.title)
        .replace("{{desc}}", e.desc)
        .replace("{{time}}", new Date(e.time).toUTCString())
        .replace("{{guid}}", e.guid)
        .replace("{{link}}", e.link)
      )
    });
    const result = tmp1.replace("{{items}}", tmp2.join(''));
    return result;
  },
  makeResp: (body, ctype = "application/xml; charset=utf-8", status = 200) => {
    return new Response(body, {
      status: status,
      headers: {
        "X-Powered-By": "Cloudflare Worker",
        "Content-Type": ctype,
      }
    })
  }
}

/**
 * Respond to the request
 * @param {Request} request
 */
async function handleRequest(request) {
  const path = new URL(request.url).pathname;
  const query = utils.query(request.url);

  if (path === '/') {
    return utils.makeResp(await fetch('https://cdn.jsdelivr.net/gh/TheresaQWQ/RSSWorker@main/template/index.html').body);
  } else if (path === '/bili/dynamic') {
    // 本段代码复制自 RSSHub
    const uid = query.uid;
    const resp = await fetch(`https://api.vc.bilibili.com/dynamic_svr/v1/dynamic_svr/space_history?host_uid=${uid}`);
    const data = (await resp.json()).data.cards;
    const title = `${data[0].desc.user_profile.info.uname} 的 bilibili 动态`;
    const link = `https://space.bilibili.com/${uid}/dynamic`;
    const items = data.map((item) => {
      const parsed = JSON.parse(item.card);
      const data = parsed.item || parsed;
      const origin = parsed.origin ? JSON.parse(parsed.origin) : null;

      // img
      let imgHTML = '';
      const getImgs = (data) => {
        let imgs = '';
        // 动态图片
        if (data.pictures) {
          for (let i = 0; i < data.pictures.length; i++) {
            imgs += `<img src="${data.pictures[i].img_src}">`;
          }
        }
        // 专栏封面
        if (data.image_urls) {
          for (let i = 0; i < data.image_urls.length; i++) {
            imgs += `<img src="${data.image_urls[i]}">`;
          }
        }
        // 视频封面
        if (data.pic) {
          imgs += `<img src="${data.pic}">`;
        }
        // 音频/番剧/直播间封面/小视频封面
        if (data.cover && data.cover.unclipped) {
          imgs += `<img src="${data.cover.unclipped}">`;
        } else if (data.cover) {
          imgs += `<img src="${data.cover}">`;
        }
        // 专题页封面
        if (data.sketch && data.sketch.cover_url) {
          imgs += `<img src="${data.sketch.cover_url}">`;
        }
        return imgs;
      };

      imgHTML += getImgs(data);

      if (origin) {
        imgHTML += getImgs(origin.item || origin);
      }
      // video小视频
      let videoHTML = '';
      if (data.video_playurl) {
        videoHTML += `<video width="${data.width}" height="${data.height}" controls><source src="${unescape(data.video_playurl).replace(/^http:/, 'https:')}"><source src="${unescape(data.video_playurl)}"></video>`;
      }
      // some rss readers disallow http content.
      // 部分 RSS 阅读器要求内容必须使用https传输
      // bilibili short video does support https request, but https request may timeout ocassionally.
      // to maximize content availability, here add two source tags.
      // bilibili的API中返回的视频地址采用http，然而经验证，短视频地址支持https访问，但偶尔会返回超时错误(可能是网络原因)。
      // 因此保险起见加入两个source标签
      // link
      let link = '';
      if (data.dynamic_id) {
        link = `https://t.bilibili.com/${data.dynamic_id}`;
      } else if (item.desc && item.desc.dynamic_id) {
        link = `https://t.bilibili.com/${item.desc.dynamic_id}`;
      }
      const getTitle = (data) => data.title || data.description || data.content || (data.vest && data.vest.content) || '';
      const getDes = (data) =>
        data.dynamic || data.desc || data.description || data.content || data.summary || (data.vest && data.vest.content) + (data.sketch && `<br>${data.sketch.title}<br>${data.sketch.desc_text}`) || data.intro || '';
      const getOriginDes = (data) => (data && (data.apiSeasonInfo && data.apiSeasonInfo.title && `//转发自: ${data.apiSeasonInfo.title}`) + (data.index_title && `<br>${data.index_title}`)) || '';
      const getOriginName = (data) => data.uname || (data.author && data.author.name) || (data.upper && data.upper.name) || (data.user && (data.user.uname || data.user.name)) || (data.owner && data.owner.name) || '';
      const getOriginTitle = (data) => (data.title ? `${data.title}<br>` : '');
      const getIframe = (data) => (data && data.aid ? `<br><br>${utils.bili.iframe(data.aid)}<br>` : '');

      // emoji
      let data_content = getDes(data);
      if (item.display.emoji_info) {
        const emoji = item.display.emoji_info.emoji_details;
        emoji.forEach(function (item) {
          data_content = data_content.replace(
            new RegExp(`\\${item.text}`, 'g'),
            `<img alt="${item.text}" src="${item.url}"style="margin: -1px 1px 0px; display: inline-block; width: 20px; height: 20px; vertical-align: text-bottom;" title="" referrerpolicy="no-referrer">`
          );
        });
      }
      const getUrl = (data) => {
        if (!data) {
          return '';
        }
        if (data.aid) {
          return `<br>视频地址：https://www.bilibili.com/video/av${data.aid}`;
        }
        if (data.image_urls) {
          return `<br>专栏地址：https://www.bilibili.com/read/cv${data.id}`;
        }
        if (data.upper) {
          return `<br>音频地址：https://www.bilibili.com/audio/au${data.id}`;
        }
        if (data.roomid) {
          return `<br>直播间地址：https://live.bilibili.com/${data.roomid}`;
        }
        if (data.sketch) {
          return `<br>活动地址：${data.sketch.target_url}`;
        }
        if (data.url) {
          return `<br>地址：${data.url}`;
        }
        return '';
      };

      return {
        title: getTitle(data),
        desc: `${data_content || getDes(data)}${origin && getOriginName(origin) ? `<br><br>//转发自: @${getOriginName(origin)}: ${getOriginTitle(origin.item || origin)}${getDes(origin.item || origin)}` : `${getOriginDes(origin)}`}<br>${getUrl(data)}${getUrl(origin)}${getIframe(data)}${getIframe(origin)}${imgHTML ? `<br>${imgHTML}` : ''}${videoHTML ? `<br>${videoHTML}` : ''}`,
        time: new Date(item.desc.timestamp * 1000).toUTCString(),
        link: link,
      };
    });

    return utils.makeResp(utils.makeRSS(title, title, link, items));
  } else {
    return utils.makeResp("404 Not Found!", "", 404);
  }
}