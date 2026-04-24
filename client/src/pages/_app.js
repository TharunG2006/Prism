import '@/styles/globals.css'
import Head from 'next/head'
import { ThemeProvider } from '@/context/ThemeContext'

export default function App({ Component, pageProps }) {
  return (
    <ThemeProvider>
      <Head>
        <title>Prism | Secure E2EE Chat</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Component {...pageProps} />
    </ThemeProvider>
  )
}
