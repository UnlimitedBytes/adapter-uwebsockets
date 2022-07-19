/** *
 * @file Modified version of sirv@2.0.2
 *
 * Modified to use uWebSockets.HttpRequest instead of http.IncomingMessage
 * and uWebSockets.HttpResponse instead of http.ServerResponse. Also there
 * were some packages removed which didn't seem necessary to reduce bloat.
 *
 * @copyright UnlimitedBytes <admin@unlimitedbytes.ovh> (https://unlimitedbytes.ovh)
 * @license MIT https://unlimitedbytes.mit-license.org/
 *
 * --------------------------------------------------------------------------------
 *
 * !!! **IMPORTANT NOTICE**:
 * The original works copyright and license only applies to the original work!
 * This file contains a modified version of the original work and therefore has it's
 * own copyright associated with it's own license! Read the license information above
 * to find out how and under which conditions you can use this work.
 * !!! **IMPORTANT NOTICE**
 *
 * --------------------------------------------------------------------------------
 *
 * Original work can be found on:
 * https://github.com/lukeed/sirv
 *
 * Copyright of original work belongs to:
 * Luke Edwards <luke.edwards05@gmail.com> (https://lukeed.com)
 *
 * Original works license:
 * The MIT License (MIT)
 *
 * Copyright (c) Luke Edwards <luke.edwards05@gmail.com> (https://lukeed.com)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
import fs from 'fs';
import { join, normalize, resolve } from 'path';
import { totalist } from 'totalist/sync';
import { lookup } from 'mrmime';

const noop = () => {};

function isMatch(uri, arr) {
    for (let i = 0; i < arr.length; i++) {
        if (arr[i].test(uri)) return true;
    }
}

function toAssume(uri, extns) {
    let i = 0,
        x,
        len = uri.length - 1;
    if (uri.charCodeAt(len) === 47) {
        uri = uri.substring(0, len);
    }

    let arr = [],
        tmp = `${uri}/index`;
    for (; i < extns.length; i++) {
        x = extns[i] ? `.${extns[i]}` : '';
        if (uri) arr.push(uri + x);
        arr.push(tmp + x);
    }

    return arr;
}

function viaCache(cache, uri, extns) {
    let i = 0,
        data,
        arr = toAssume(uri, extns);
    for (; i < arr.length; i++) {
        if ((data = cache[arr[i]])) return data;
    }
}

function viaLocal(dir, isEtag, uri, extns) {
    let i = 0,
        arr = toAssume(uri, extns);
    let abs, stats, name, headers;
    for (; i < arr.length; i++) {
        abs = normalize(join(dir, (name = arr[i])));
        if (abs.startsWith(dir) && fs.existsSync(abs)) {
            stats = fs.statSync(abs);
            if (stats.isDirectory()) continue;
            headers = toHeaders(name, stats, isEtag);
            headers['Cache-Control'] = isEtag ? 'no-cache' : 'no-store';
            return { abs, stats, headers };
        }
    }
}

function is404(_request, response) {
    response.setStatus('404 Not Found');
    response.end();
}

function send(request, response, file, stats, headers) {
    let code = '200 OK',
        options = {};
    headers = { ...headers };

    const range = request.getHeader('range');
    if (range) {
        code = '206 Partial Content';
        let [start, end] = range.replace('bytes=', '').split('-');
        end = options.end = parseInt(end, 10) || stats.size - 1;
        start = options.start = parseInt(start, 10) || 0;

        if (start >= stats.size || end >= stats.size) {
            response.setStatus('416 Range Not Satisfiable');
            response.setHeader('Content-Range', `bytes */${stats.size}`);
            return response.end();
        }

        headers['Content-Range'] = `bytes ${start}-${end}/${stats.size}`;
        headers['Content-Length'] = (end - start + 1).toString();
        headers['Accept-Ranges'] = 'bytes';
    }

    response.setStatus(code);
    for (const [key, value] of Object.entries(headers)) {
        response.setHeader(key.toString(), value.toString());
    }

    const fileStream = fs.createReadStream(file, options);

    response.on('aborted', () => {
        fileStream.destroy();
    });

    fileStream.on('error', () => {
        try {
            response.close();
        } catch {
            /* Only errors if response is already closed. */
        }
    });

    fileStream.on('data', (chunk) => {
        try {
            if (!response.write(chunk)) {
                fileStream.pause();
                response.once('drain', () => {
                    fileStream.resume();
                });
            }
        } catch {
            /* Just in case we hit 'data' before 'aborted' */
            fileStream.destroy();
        }
    });

    fileStream.on('end', () => {
        try {
            response.end();
        } catch {
            /* Only errors if response is already closed. */
        }
    });
}

const ENCODING = {
    '.br': 'br',
    '.gz': 'gzip',
};

function toHeaders(name, stats, isEtag) {
    let encoding = ENCODING[name.slice(-3)];

    let mimetype = lookup(name.slice(0, encoding && -3)) || '';
    if (mimetype === 'text/html') mimetype += ';charset=utf-8';

    let headers = {
        'Content-Length': stats.size,
        'Content-Type': mimetype,
        'Last-Modified': stats.mtime.toUTCString(),
    };

    if (encoding) headers['Content-Encoding'] = encoding;
    if (isEtag) headers['ETag'] = `W/"${stats.size}-${stats.mtime.getTime()}"`;

    return headers;
}

export default function (directory, options = {}) {
    directory = resolve(directory || '.');

    let isNotFound = options.onNoMatch || is404;
    let setHeaders = options.setHeaders || noop;

    let extensions = options.extensions || ['html', 'htm'];
    let gzipCompressed = options.gzip && extensions.map((x) => `${x}.gz`).concat('gz');
    let brotliCompressed = options.brotli && extensions.map((x) => `${x}.br`).concat('br');

    const FILES = {};

    let fallback = '/';
    let isEtag = !!options.etag;
    let isSPA = !!options.single;

    if (typeof options.single === 'string') {
        let idx = options.single.lastIndexOf('.');
        fallback += !!~idx ? options.single.substring(0, idx) : options.single;
    }

    let ignores = [];
    if (options.ignores !== false) {
        ignores.push(/[/]([A-Za-z\s\d~$._-]+\.\w+){1,}$/); // any extensions
        if (options.dotFiles) ignores.push(/\/\.\w/);
        else ignores.push(/\/\.well-known/);
        [].concat(options.ignores || []).forEach((x) => {
            ignores.push(new RegExp(x, 'i'));
        });
    }

    let cc = options.maxAge != null && `public,max-age=${options.maxAge}`;
    if (cc && options.immutable) cc += ',immutable';
    else if (cc && options.maxAge === 0) cc += ',must-revalidate';

    if (!options.dev) {
        totalist(directory, (name, abs, stats) => {
            if (/\.well-known[\\+\/]/.test(name)) {
            } // keep
            else if (!options.dotFiles && /(^\.|[\\+|\/+]\.)/.test(name)) return;

            let headers = toHeaders(name, stats, isEtag);
            if (cc) headers['Cache-Control'] = cc;

            FILES['/' + name.normalize().replace(/\\+/g, '/')] = { abs, stats, headers };
        });
    }

    let lookup = options.dev ? viaLocal.bind(0, directory, isEtag) : viaCache.bind(0, FILES);

    return function (request, response, next) {
        let extensions = [''];
        let pathname = request.getUrl();
        let val = request.getHeader('accept-encoding');

        if (gzipCompressed && val.includes('gzip')) extensions.unshift(...gzipCompressed);
        if (brotliCompressed && /(br|brotli)/i.test(val)) extensions.unshift(...brotliCompressed);
        extensions.push(...extensions); // [...br, ...gz, orig, ...exts]

        if (pathname.indexOf('%') !== -1) {
            try {
                pathname = decodeURIComponent(pathname);
            } catch (err) {
                /* malformed uri */
            }
        }

        let data =
            lookup(pathname, extensions) || (isSPA && !isMatch(pathname, ignores) && lookup(fallback, extensions));
        if (!data) return next ? next() : isNotFound(request, response);

        if (isEtag && request.getHeader('if-none-match') === data.headers['ETag']) {
            response.setStatus('304 Not Modified');
            return response.end();
        }

        if (gzipCompressed || brotliCompressed) {
            response.setHeader('Vary', 'Accept-Encoding');
        }

        setHeaders(response, pathname, data.stats);
        send(request, response, data.abs, data.stats, data.headers);
    };
}
