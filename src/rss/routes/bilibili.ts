import { RequestLike } from "itty-router";

export const BilibiliDynamic = async (req: RequestLike, params: any) => {
  const url = new URL(req.url);
  const uid = params.uid;
  const directLink = url.searchParams.get('directLink') === 'true';

  if (!uid) {
    throw new Error('uid is required');
  }

  const resp = await fetch(`https://api.vc.bilibili.com/dynamic_svr/v1/dynamic_svr/space_history?host_uid=${uid}`)
  const json = await resp.json() as any

  if (json.code !== 0) {
    throw new Error(json.message);
  }

  const author = json.data.cards[0].desc.user_profile.info.uname
  const cards = json.data.cards

  /**
   * 以下代码来自项目 DIYgod/RSSHub
   */
  const items = await Promise.all(
    cards.map(async (item: any) => {
      const getTitle = (data: any) => (data ? data.title || data.description || data.content || (data.vest && data.vest.content) || '' : '');
      const getDes = (data: any) =>
        data.dynamic || data.desc || data.description || data.content || data.summary || (data.vest && data.vest.content) + (data.sketch && `<br>${data.sketch.title}<br>${data.sketch.desc_text}`) || data.intro || '';
      const getOriginDes = (data: any) => (data && (data.apiSeasonInfo && data.apiSeasonInfo.title && `//转发自: ${data.apiSeasonInfo.title}`) + (data.index_title && `<br>${data.index_title}`)) || '';
      const getOriginName = (data: any) => data.uname || (data.author && data.author.name) || (data.upper && data.upper.name) || (data.user && (data.user.uname || data.user.name)) || (data.owner && data.owner.name) || '';
      const getOriginTitle = (data: any) => (data.title ? `${data.title}<br>` : '');

      const parsed = JSON.parse(item.card);

      const data = getTitle(parsed.item) ? parsed.item : parsed;
      const origin = parsed.origin ? JSON.parse(parsed.origin) : null;

      // img
      let imgHTML = '';
      const getImgs = (data: any) => {
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
      } else if (item.desc?.dynamic_id) {
        link = `https://t.bilibili.com/${item.desc.dynamic_id}`;
      }

      // emoji
      let data_content = getDes(data);
      // 换行处理
      data_content = data_content.replace(/\r\n/g, '<br>').replace(/\n/g, '<br>');
      if (item.display.emoji_info) {
        const emoji = item.display.emoji_info.emoji_details;
        emoji.forEach((item: any) => {
          data_content = data_content.replace(
            new RegExp(`\\${item.text}`.replace(/\\?/g, '\\?'), 'g'),
            `<img alt="${item.text}" src="${item.url}"style="margin: -1px 1px 0px; display: inline-block; width: 20px; height: 20px; vertical-align: text-bottom;" title="" referrerpolicy="no-referrer">`
          );
        });
      }
      const getUrl = (data: any) => {
        if (!data) {
          return '';
        }
        let url;
        if (data.aid) {
          const id = item?.desc?.bvid || item?.desc?.origin?.bvid;
          url = `https://www.bilibili.com/video/${id}`;
          directLink && (link = url);
          return `<br>视频地址：<a href=${url}>${url}</a>`;
        }
        if (data.image_urls) {
          url = `https://www.bilibili.com/read/cv${data.id}`;
          directLink && (link = url);
          return `<br>专栏地址：<a href=${url}>${url}</a>`;
        }
        if (data.upper) {
          url = `https://www.bilibili.com/audio/au${data.id}`;
          directLink && (link = url);
          return `<br>音频地址：<a href=${url}>${url}</a>`;
        }
        if (data.roomid) {
          url = `https://live.bilibili.com/${data.roomid}`;
          directLink && (link = url);
          return `<br>直播间地址：<a href=${url}>${url}</a>`;
        }
        if (data.sketch) {
          url = data.sketch.target_url;
          directLink && (link = url);
          return `<br>活动地址：<a href=${url}>${url}</a>`;
        }
        if (data.url) {
          url = data.url;
          directLink && (link = url);
          return `<br>地址：<a href=${url}>${url}</a>`;
        }
        return '';
      };

      return {
        title: getTitle(data),
        description: (() => {
          const description = data_content || getDes(data);
          const originName = origin && getOriginName(origin) ? `<br><br>//转发自: @${getOriginName(origin)}: ${getOriginTitle(origin.item || origin)}${getDes(origin.item || origin)}` : getOriginDes(origin);
          const imgHTMLSource = imgHTML ? `<br>${imgHTML}` : '';
          const videoHTMLSource = videoHTML ? `<br>${videoHTML}` : '';
          return `${description}${originName}<br>${getUrl(data)}${getUrl(origin)}${imgHTMLSource}${videoHTMLSource}`;
        })(),
        pubDate: item.desc?.timestamp ? new Date(item.desc?.timestamp).toISOString() : null,
        link,
        author,
      };
    })
  );

  return {
    title: `${author} 的 bilibili 动态`,
    link: `https://space.bilibili.com/${uid}/dynamic`,
    description: `${author} 的 bilibili 动态`,
    items: items
  }
}

export const BilibiliVideos = async (req: RequestLike, params: any) => {
  const uid = params.uid;
  const data: any = await (await fetch(`https://api.bilibili.com/x/space/arc/search?mid=${uid}`)).json()

  if (data.code !== 0) {
    throw new Error(data.message);
  }

  const list = data.data.list.vlist

  return {
    title: `${data.data.list.vlist[0].author} 投稿的视频`,
    link: `https://space.bilibili.com/${uid}`,
    description: `${data.data.list.vlist[0].author} 投稿的视频`,
    items: list.map((item: any) => {
      return {
        title: item.title,
        description: item.description,
        pubDate: new Date(item.created * 1000).toISOString(),
        link: `https://www.bilibili.com/video/${item.bvid}`,
        guid: item.aid
      }
    })
  }
}