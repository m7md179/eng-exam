import "./globals.css";

export const metadata = {
  title: "Jordanian Engineers Association",
  description: "Official exam platform for the Jordanian Engineers Association",
  openGraph: {
    title: "Jordanian Engineers Association",
    description: "Official exam platform for the Jordanian Engineers Association",
    images: [
      {
        url: "/JEA2.png",
        width: 800,
        height: 600,
        alt: "Jordanian Engineers Association Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Jordanian Engineers Association",
    description: "Official exam platform for the Jordanian Engineers Association",
    images: ["/JEA2.png"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
