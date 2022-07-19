<div align="center">
    <img src="https://cdn.ubyt.es/images/unlimitedbytes/adapter-uwebsockets/logo.png" height="200" /><br>
    <i>The fastest sveltekit adapter in town for the most demanding of applications.</i><br/><br/>
</div>

## 🛑 IMPORTANT NOTICE:
SvelteKit and adapter-uwebsockets are both still in beta. Expect bugs!

Read more [here][svelte_kit_beta]

## 🚀 Build for greatest performance
adapter-uwebsockets is the fastest sveltekit adapter in town.
Powered by the most efficient tools [SvelteKit][svelte_kit] and [uWebSockets.js][uWebSockets.js]
it eats opponents for breakfast. Take a look at our [benchmarks](benchmarks/README.md) section to get a feel how fast it is.

## 👨‍💻 Build for greatest developer experience
While adapter-uwebsockets is the fastest sveltekit adapter, it still aims to keep excellent developer experience.
Therefore we optimize your application without any changes to your business logic. All svelte features are fully
supported out of the box without any configuration or headache required.

## 🏗️ Build with the best features
- ⚡️ [SvelteKit][svelte_kit] and [uWebSockets.js][uWebSockets.js] - born with fastness and DX
- 🍃 Light - Written 100% from ground up.
- 🖥️ Wide support - Windows, Linux, Mac
- 🚢 Strong defaults - Ships with embedded process manager and support for PROXY Protocol v2.

## 💪 Build with unfair advantage
Being written on top of [uWebSockets.js][uWebSockets.js] a HTTP[S]/WebSocket Server written in native code
directly targeting the kernel makes it way faster than any JavaScript implementation.

## 📦 Easily installed
One command to rule them all. Simply use ``npm i -D adapter-uwebsockets``, then add the adapter to your ``svelte.config.js``:
```js
// svelte.config.js
import adapter from 'adapter-uwebsockets';

export default {
  kit: {
    adapter: adapter()
  }
};
```

## 💼 Easily deployed

You just need the output directory (``build`` by default) and the production dependencies to run the application.
Production dependencies can be generated with the command ``npm ci --prod`` inside your output directory.
You can then start your app with:
```sh
$ node index.js # or npm run start | yarn start | ...
```

Your production dependencies get automatically bundle with ours, so no need to copy your bloated ``package.json`` from the svelte project.

## ✨ Production ready by default
adapter-uwebsockets output is production ready by default.
You can directly link the application to the worldwide web without any additional setup required.
Anyhow if you wish to apply a reverse-proxy we're fully compatible with the PROXY Protocol v2.
Just enable it by passing ``{proxy: true}`` to the adapter configuration inside your ``svelte.config.js``.

If you wish to run the application with a process manager for production Node.js applications like [PM2][pm2]
we're fully compatible! Just give us a little hint that we need to disable our embedded process manager by passing ``{processManager: false}``
to the adapter configuration inside your ``svelte.config.js``.

We love ☁️ [CloudFlare][cloudflare] and fully support CloudFlare's Reverse Proxy Headers out of the box.
If you love CloudFlare so much as we do just enable CloudFlare's Reverse Proxy Headers by passing ``{cloudflare: true}``
to the adapter configuration inside your ``svelte.config.js``.

## 📝 Ways to contribute
Developers interested in contributing should read the [Code of Conduct][code_of_conduct] and the [Contribution Guide][contribution].

Aside from code contributions that make the project better, there are a few other specific ways that you can contribute to this project.

[☕ Buy me a coffee][coffee]

[💡 Submit your idea][new_issue]


## 📃 License

> This license applies to all source code within this repository.
> All contributors to this project have agreed to share there code under this license.

[MIT License](LICENSE)

Thanks for reading the [README](README.md) ❤️

[coffee]: https://www.buymeacoffee.com/unlimitedbytes
[new_issue]: https://github.com/UnlimitedBytes/adapter-uwebsockets/issues/new
[code_of_conduct]: CODE_OF_CONDUCT.md
[contribution]: CONTRIBUTING.md
[cloudflare]: https://www.cloudflare.com
[pm2]: https://pm2.keymetrics.io/
[uWebSockets.js]: https://github.com/uNetworking/uWebSockets.js/
[svelte_kit]: https://kit.svelte.dev/
[svelte_kit_beta]: https://svelte.dev/blog/sveltekit-beta
