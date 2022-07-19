import { fileURLToPath } from 'url';
import UglifyJS from 'uglify-js';
import fs from 'fs';
import path from 'path';

const files = fileURLToPath(new URL('./files', import.meta.url).href);

export default function (options = {}) {
    const { out = 'build', name = 'server', secureMode = false } = options;

    return {
        name: 'adapter-uwebsockets',

        async adapt(builder) {
            builder.rimraf(out);

            builder.log.minor('Copying assets..');
            builder.writeClient(`${out}/client`);
            builder.writeServer(`${out}/server`);
            builder.writeStatic(`${out}/static`);
            builder.writePrerendered(`${out}/prerendered`);

            builder.log.minor('Copying dependencies..');
            let packageJson = null;
            try {
                const packageJsonContent = fs.readFileSync(path.resolve('./package.json'), {
                    encoding: 'utf-8',
                });
                packageJson = JSON.parse(packageJsonContent);
            } catch (error) {
                builder.log.error("Couldn't load package.json from your sveltekit project.");
                builder.log.error(error);
                return;
            }

            fs.writeFileSync(
                `${out}/package.json`,
                JSON.stringify({
                    private: true,
                    type: 'module',
                    name,
                    version: '1.0.0',
                    main: 'index.js',
                    dependencies: {
                        ...(packageJson.dependencies || {}),
                        ...(secureMode ? {} : {'uWebSockets.js': 'uNetworking/uWebSockets.js#v20.10.0'}),
                        '@sveltejs/kit': '^1.0.0-next.377',
                        mrmime: '^1.0.1',
                        totalist: '^3.0.0',
                    },
                })
            );

            builder.log.minor('Generating manifest..');
            fs.writeFileSync(
                `${out}/manifest.js`,
                UglifyJS.minify(
                    `export const manifest = ${builder.generateManifest({
                        relativePath: './server',
                    })};\n`
                ).code
            );

            builder.log.minor('Generating configuration..');
            fs.writeFileSync(
                `${out}/config.js`,
                UglifyJS.minify(
                    `export const config = ${JSON.stringify({
                        proxy: options.proxy || false,
                        cloudflare: options.cloudflare || false,
                        processManager: options.processManager || true,
                    })};\n`
                ).code
            );

            builder.log.minor('Generating uwebsockets server..');
            builder.copy(files, out, {
                replace: {
                    SERVER: './server/index.js',
                    MANIFEST: './manifest.js',
                },
            });
        },
    };
}
