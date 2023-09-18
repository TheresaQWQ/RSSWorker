import { RequestLike, Router } from 'itty-router';
import { RSSItem, generateRSSContent } from './template';

import {
	BilibiliDynamic,
	BilibiliVideos
} from './routes/bilibili'

const router = Router();

const routes: {
	path: string,
	handler: (req: RequestLike, params: any) => Promise<{
		title: string,
		link: string,
		description: string,
		items: RSSItem[]
	}>
}[]
 = [
	{
		// 哔哩哔哩动态
		path: '/bilibili/dynamic/:uid',
		handler: BilibiliDynamic,
	},
	{
		// 哔哩哔哩视频更新
		path: '/bilibili/videos/:uid',
		handler: BilibiliVideos,
	}
]

router.get('*', async (req) => {
	const url = new URL(req.url);
	const pathname = url.pathname.substring(4);

	for (const route of routes) {
		// 匹配包含参数的路由
		const routeRegex = new RegExp(`^${route.path.replace(/\/:\w+/g, '(/\\w+)')}$`);
		const match = routeRegex.test(pathname)
		if (match) {
			const paramsArr = (routeRegex.exec(pathname)?.slice(1) || []).map((item) => decodeURIComponent(item).substring(1));
			const paramsKeys: string[] = route.path.match(/\/:(\w+)/g)?.map((item) => item.substring(2)) || [];
			const params: {
				[index: string]: string
			} = {};

			console.log(paramsArr, paramsKeys)

			paramsArr.forEach((param, index) => {
				params[paramsKeys[index]] = param;
			})

			try {
				const response = await route.handler(req, params);
				const content = generateRSSContent(response.title, response.link, response.description, response.items)
				return new Response(content, {
					headers: {
						'Content-Type': 'application/xml; charset=utf-8',
						'Cache-Control': 'public, max-age=300',
					}
				})
			} catch (error) {
				// TODO: 更加优雅的错误页面
				const e = error as unknown as Error
				return new Response(`${e.stack}`, {
					status: 500,
					headers: {
						'Content-Type': 'text/plain; charset=utf-8',
						'Cache-Control': 'no-cache, no-store, must-revalidate',
					}
				})
			}
		}
	}

	// TODO: 更加优雅的404页面
	return new Response('Not Found', {
		status: 404,
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Cache-Control': 'no-cache, no-store, must-revalidate',
		}
	})
})

export default router;
