import esbuild from 'esbuild'

const isWatch = process.argv.includes('--watch')

/** @type {esbuild.BuildOptions} */
const mainConfig = {
  entryPoints: ['src/main.ts'],
  outfile: 'dist/main.js',
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  external: ['openbox-plugin-api']
}

/** @type {esbuild.BuildOptions} */
const rendererConfig = {
  entryPoints: ['src/renderer.tsx'],
  outfile: 'dist/renderer.js',
  bundle: true,
  format: 'cjs',
  jsx: 'automatic',
  target: 'es2020',
  minify: true,
  loader: { '.css': 'text' },
  external: ['openbox-plugin-api', 'react', 'react/jsx-runtime', 'react/jsx-dev-runtime']
}

if (isWatch) {
  const mainCtx = await esbuild.context(mainConfig)
  const rendererCtx = await esbuild.context(rendererConfig)
  await Promise.all([mainCtx.watch(), rendererCtx.watch()])
  console.log('监听中...')
} else {
  await Promise.all([
    esbuild.build(mainConfig),
    esbuild.build(rendererConfig)
  ])
  console.log('构建完成')
}
