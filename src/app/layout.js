import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({ subsets: ["latin"] });

export const metadata = {
  title: "Grasscutter",
  description: "Система управления зеленым хозяйством",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <head>
        {/* Добавляем скрипт Яндекс Карт в head */}
        <script
          src={`https://api-maps.yandex.ru/2.1/?apikey=${process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY}&lang=ru_RU`}
          type="text/javascript"
          async
        ></script>
      </head>
      <body className={montserrat.className}>{children}</body>
    </html>
  );
}