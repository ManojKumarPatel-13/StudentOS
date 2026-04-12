// src/app/layout.js
import "./globals.css"; // THIS IS THE KEY
import { AuthProvider } from "@/context/authContext";

export const metadata = {
  title: "StudentOS",
  description: "The Central Nervous System for students",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}