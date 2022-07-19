# Benchmarks

## ⚙️ Setup
**All Benchmarks were made on 2 [Linode][linode] Cloud VPS.**<br />
This ensures the test can easily be repeated by anyone who likes to benchmark the servers there self. This further ensures that the test results can't be easily faked because if so anyone can proof them wrong in seconds.


**All Benchmark tools are open source**<br />
This further increases the repeatability of the test as anyone can easily use the same tools to benchmark the servers there self. Also this ensures that anyone can check the test results weren't influenced only by the utilized tools.

### 💻 Servers
**Web-Server:** The webservers are made available one at a time by a $5 Nanode 1 GB with the following specs:
```md
# Nanode 1 GB
Price: $5
RAM: 1 GB
CPUs: 1 (shared)
Storage: 25 GB SSD
Transfer: 1 TB
Network In / Out: 40 Gbps / 1 Gbps
```

**Test-Server:** The benchmark tools were running one at a time on a $60 Dedicated 8 GB with the following specs:
```md
# Dedicated 8 GB
Price: $60
RAM: 8 GB
CPUs: 4 (dedicated)
Storage: 160 GB SSD
Transfer: 5 TB
Network In / Out: 40 Gbps / 5 Gbps
```

### 🛠️ Tools

We used the following open source tools to do the benchmarks:
- [Autocannon][auto_cannon] - A HTTP/1.1 benchmarking tool written in node, greatly inspired by wrk and wrk2, with support for HTTP pipelining and HTTPS.
- [http_load_test][http_load_test] - uSockets HTTP benchmarking tool
- [wrk][wrk] - a HTTP benchmarking tool

## 📝 Tests

We let any benchmarking tool run for 10 iterations and collected the data for each iteration. We then used simple math to calculate the average out of these iterations.
```js
const iterations = [
    { averageRequests: 100 },
    { averageRequests: 50 },
    { averageRequests: 150 },
    { averageRequests: 75 },
]

let averageRequests = 0;
for(let iteration of iterations) {
    averageRequests += iteration.averageRequests;
}
averageRequests = averageRequests / iterations.length;

console.log('Finished on average', averageRequests, 'requests/s');
// Finished on average 93.75 requests/s
```

## 📈 Results

Finally the part you all been waiting for what did we get as results?

We tested ``adapter-node`` against ``adapter-uwebsockets``, because they are the only comparable adapters (that we know of). As both are running on a physical machine over [Node.js][node_js].

### adapter-node
```
adapter-node - /
requests: 3168.34 rq/s
latency:
    min: 13 ms
    avg: 299.5 ms
    max: 2070 ms

adapter-node - /static.html
requests: 8406.45 rq/s
latency:
    min: 1 ms
    avg: 106.16 ms
    max: 1426 ms

adapter-node - /prerendered.html
requests: 8319.75 rq/s
latency:
    min: 2 ms
    avg: 104.26 ms
    max: 1321 ms
```

### adapter-uwebsockets
```

adapter-uwebsockets - /
requests: 3170.42 rq/s
latency:
    min: 9 ms
    avg: 211.86 ms
    max: 1459 ms

adapter-uwebsockets - /static.html
requests: 35292.45 rq/s
latency:
    min: 0 ms
    avg: 79.56 ms
    max: 230 ms

adapter-uwebsockets - /prerendered.html
requests: 34184.19 rq/s
latency:
    min: 0 ms
    avg: 74.57 ms
    max: 220 ms
```

As we can see in the benchmark results ``adapter-uwebsockets`` wins in both cases. Serving svelte routes and service static-assets. Anyhow what is clearly visible is that ``adapter-uwebsockets`` can't outperform ``adapter-node`` by a big margin on svelte routes. This is because sveltekit under the hood provides us with an own server implementation that we can't change. Therefore I believe we only managed to outperform ``adapter-node`` on this case thanks to our lower latency. For static-assets however (which includes svelte client side rendering assets) we can see a gigantic win for ``adapter-uwebsockets``.

[linode]: https://www.linode.com/
[auto_cannon]: https://www.npmjs.com/package/autocannon
[http_load_test]: https://github.com/uNetworking/uSockets/blob/master/examples/http_load_test.c
[wrk]: https://github.com/wg/wrk
[node_js]: https://nodejs.org/
