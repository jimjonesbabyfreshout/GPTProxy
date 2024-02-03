export async function onRequest(context) {
    const {
        request, // Same as the request in the existing Worker API
        env, // Same as env in the existing Worker API
        params, // If the document name contains [id] or [[path]], it is the same as the params in the existing Worker API.
        waitUntil, // Same as ctx.waitUntil in the existing Worker API
        next, // Used for middleware or obtaining resources
        data, // Any space to transfer data between middleware
    } = context;
    // const newResponse = request.clone();
    const url = new URL(request.url);
    const headers_Origin = request.headers.get("Access-Control-Allow-Origin") || "*"

    // console.log('https://api.openai.com' + url.pathname + url.search);

    const modifiedRequest = new Request('https://api.openai.com' + url.pathname + url.search, {
        method: request.method,
        headers: request.headers,
        body: request.body,
    });

    const response = await fetch(modifiedRequest);

    const modifiedResponse = new Response(response.body, response);
    modifiedResponse.headers.set('Access-Control-Allow-Origin', headers_Origin);

    return modifiedResponse;
}
