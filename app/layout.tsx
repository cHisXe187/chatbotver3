import '../styles/globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Chatbotver3',
  description: 'Website Chatbot mit OpenAI Workflow'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
