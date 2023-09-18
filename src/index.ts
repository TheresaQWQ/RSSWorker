import apiRouter from './rss';

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		if (url.pathname.startsWith('/rss')) {
			// You can also use more robust routing
			return apiRouter.handle(request);
		}

		// 更加优雅的首页~
		return new Response(
			`
			<!DOCTYPE html>
			<html>
				<head>
					<meta charset="utf-8">
					<title>RSSWorker - Made with ❤</title>
				</head>
				<body>
					<h1>RSSWorker - Made with ❤</h1>
					<p>See <a href="https://github.com/TheresaQWQ/RSSWorker">GitHub</a> for more information.</p>
				</body>
			</html>
			`
			,
			{ headers: { 'Content-Type': 'text/html' } }
		);
	},
};
