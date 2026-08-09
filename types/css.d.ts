// Side-effect CSS imports (app/_layout.tsx imports global.css for the web
// build). Expo declares this in the generated expo-env.d.ts, which is
// gitignored — so CI, which only ever sees tracked files, failed typecheck
// with TS2882 while every local machine passed.
declare module '*.css'
