import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
        />
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body, #root {
                width: 100%;
                height: 100%;
                min-height: 100%;
                overflow: hidden;
              }

              html, body {
                scrollbar-width: none;
              }

              body {
                margin: 0;
              }

              html::-webkit-scrollbar,
              body::-webkit-scrollbar {
                display: none;
              }

              * {
                box-sizing: border-box;
                scrollbar-width: none;
              }

              *::-webkit-scrollbar {
                display: none;
              }

              button, [role='button'], a {
                -webkit-tap-highlight-color: transparent;
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
