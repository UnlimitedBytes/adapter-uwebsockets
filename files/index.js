import './shims.js';

import { Server } from './server/index.js';
import { manifest } from './manifest.js';
import { EventEmitter } from 'events';
import { config } from './config.js';
import { fileURLToPath } from 'url';
import uWS from 'uWebSockets.js';
import cluster from 'cluster';
import process from 'process';
import sirv from './sirv.js';
import { cpus } from 'os';

(() => {
    if (cluster.isPrimary) {
        if (!config.processManager) {
            clustered();
            return;
        }

        console.log(`Primary ${process.pid} is running`);

        const numCPUs = cpus().length;
        for (let i = 0; i < numCPUs; i++) {
            cluster.fork();
        }

        cluster.on('exit', (worker, code, signal) => {
            console.log(`worker ${worker.process.pid} died`);
            cluster.fork();
        });
    } else {
        console.log(`Worker ${process.pid} started`);
        clustered();
    }
})();

function clustered() {
    const server = new Server(manifest);
    const app = uWS.App();
    const handlers = [];

    function serve(path, client = false) {
        return sirv(path, {
            etag: true,
            gzip: true,
            brotli: true,
            setHeaders:
                client &&
                ((response, pathname) => {
                    // only apply to build directory, not e.g. version.json
                    if (pathname.startsWith(`/${manifest.appDir}/immutable/`)) {
                        response.setHeader('cache-control', 'public,max-age=31536000,immutable');
                    }
                }),
        });
    }

    handlers.push(serve(fileURLToPath(new URL('./client', import.meta.url)), true));
    handlers.push(serve(fileURLToPath(new URL('./static', import.meta.url))));
    handlers.push(serve(fileURLToPath(new URL('./prerendered', import.meta.url))));
    handlers.push(
        /**
         * @param {import('uWebSockets.js').HttpRequest} request
         * @param {import('uWebSockets.js').HttpResponse} response
         * @param {*} _next
         */
        async (request, response, _next) => {
            const fullUrl = 'http://' + request.getHeader('host') + request.getUrl() + '?' + request.getQuery();

            const headers = new Headers();
            request.forEach((key, value) => {
                headers.set(key, value);
            });

            const fetchRequest = new Request(fullUrl, {
                method: request.getMethod(),
                headers,
            });

            const body = await server.respond(fetchRequest, {
                getClientAddress: () => {
                    if (config.cloudflare) {
                        const cloudflareIP = request.getHeader('CF-Connecting-IP');
                        if (cloudflareIP) {
                            return cloudflareIP;
                        }
                    }

                    if (config.proxy) {
                        const proxyIP = Buffer.from(response.getProxiedRemoteAddressAsText());
                        if (proxyIP) {
                            return proxyIP;
                        }
                    }

                    return Buffer.from(response.getRemoteAddressAsText());
                },
            });

            const bodyText = await body.text();
            if (!response.aborted) {
                response.end(bodyText);
            }
        }
    );

    function attachEmitter(response) {
        const eventEmitter = new EventEmitter();

        response.on = eventEmitter.on.bind(eventEmitter);
        response.off = eventEmitter.off.bind(eventEmitter);
        response.once = eventEmitter.once.bind(eventEmitter);

        response.onAborted(() => {
            response.aborted = true;
            eventEmitter.emit('aborted');
        });

        response.onWritable(() => {
            eventEmitter.emit('drain');
        });
    }

    app.any('/*', async (response, request) => {
        attachEmitter(response);

        let headersSend = false;
        let status = '200 OK';
        const headers = new Headers();

        const sendHeaders = () => {
            if (!headersSend) {
                headersSend = true;
                response.writeStatus(status);

                for (const [key, value] of headers.entries()) {
                    response.writeHeader(key, value);
                }
            }
        };

        response.setStatus = (newStatus) => {
            status = newStatus;
        };

        response.setHeader = (key, value) => {
            headers.set(key, value);
        };

        const originalEnd = response.end.bind(response);
        response.end = (body, closeConnection) => {
            sendHeaders();
            return originalEnd(body, closeConnection);
        };

        const originalWrite = response.write.bind(response);
        response.write = (chunk) => {
            sendHeaders();
            return originalWrite(chunk);
        };

        function handleError(error) {
            response.writeStatus('500 Internal Server Error');
            console.error(error);

            const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
            isDevelopment ? response.end(error.toString()) : response.end('Server Error');
        }

        function handleNotFound() {
            response.writeStatus('404 Not Found');
            response.end('Not Found');
        }

        if (handlers.length < 1) return handleNotFound();

        const nextFunction = function next(index, error = null) {
            if (error) return handleError(error);
            if (handlers.length - 1 < index) return handleNotFound();

            const nextFunction = next.bind(null, index + 1);
            const nextExecutionFunction = handlers[index];
            if (typeof nextExecutionFunction !== 'function') {
                return handleError(
                    new Error(
                        'NextFunction must be of type function and "' + typeof nextExecutionFunction + '" was given!'
                    )
                );
            }

            if (nextExecutionFunction[Symbol.toStringTag] === 'AsyncFunction') {
                nextExecutionFunction(request, response, nextFunction).catch(handleError);
                return;
            }

            try {
                nextExecutionFunction(request, response, nextFunction);
            } catch (error) {
                handleError(error);
            }
        }.bind(null, 0);

        nextFunction();
    });

    const host = process.env.HOST || '0.0.0.0';
    const port = parseInt(process.env.PORT || '3000');
    app.listen(host, port, (socket) => {
        const socketAddress = `${host}${port ? `:${port}` : ''}`;
        if (socket) {
            console.log(`Server running on http://${socketAddress}.`);
        } else {
            console.log(`Failed to listen on ${socketAddress}.`);
        }
    });
}
