import { build, context } from "esbuild";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { writeGenerated } from "./write-generated.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), ".."),
  web = join(root, "web");
async function options(development) {
  const licenses = await Promise.all(
    ["react", "react-dom", "scheduler"].map((name) =>
      readFile(join(root, "node_modules", name, "LICENSE"), "utf8").then(
        (text) => name + "\n" + text,
      ),
    ),
  );
  licenses.push(await readFile(join(root,'node_modules/@momo/workbench/dist/THIRD-PARTY-NOTICES.txt'),'utf8'));
  return {
    absWorkingDir: root,
    entryPoints: ["web/editor-react.tsx"],
    outfile: "web/generated/editor-react.js",
    bundle: true,
    write: false,
    format: "esm",
    platform: "browser",
    target: "es2022",
    jsx: "automatic",
    minify: !development,
    legalComments: "inline",
    define: {
      "process.env.NODE_ENV": JSON.stringify(
        development ? "development" : "production",
      ),
    },
    banner: {
      js: "/*!\n" + licenses.join("\n\n").replaceAll("*/", "* /") + "\n*/",
    },
    // Keep product modules at their original URLs and retain one copy of every
    // document service. Only the React views and React runtime are compiled here.
    plugins: [
      {
        name: "product-modules",
        setup(plugin) {
          plugin.onResolve({ filter: /^\.\/.*\.js$/ }, (args) =>
            args.importer.startsWith(web)
              ? { path: "../" + args.path.slice(2), external: true }
              : undefined,
          );
        },
      },
    ],
  };
}
async function save(result) {
  for (const file of result.outputFiles)
    await writeGenerated(file.path, file.contents);
  await writeGenerated(join(web,'generated/workbench-react.css'), await readFile(join(root,'node_modules/@momo/workbench/dist/react.css')));
}
export async function buildReactUI({ development = false } = {}) {
  const result = await build(await options(development));
  await save(result);
}
export async function watchReactUI() {
  const config = await options(true);
  config.plugins.push({
    name: "save-view",
    setup(plugin) {
      plugin.onEnd(async (result) => {
        if (!result.errors.length) await save(result);
      });
    },
  });
  const watcher = await context(config);
  await watcher.rebuild();
  await watcher.watch();
  return watcher;
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await buildReactUI({ development: process.argv.includes("--development") });
