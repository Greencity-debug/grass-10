import './globals.css'

export const metadata = {
  title: 'Grasscutter',
  description: 'Система управления зелёным хозяйством',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}
