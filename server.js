const server = Bun.serve({
	port: 3000,
	async fetch(req) {
		const url = new URL(req.url);
		const pathname = url.pathname === "/" ? "/index.html" : url.pathname;

		const file = Bun.file(`.${pathname}`);
		if (await file.exists()) return new Response(file);

		return new Response("Not Found", { status: 404 });
	},
});

const url = `http://localhost:${server.port}`;
console.log(`Server running at ${url}`);
Bun.spawn(["open", url]);
