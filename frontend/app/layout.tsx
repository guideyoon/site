import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: '사이트 수집기',
    description: '지역 정보 수집 및 관리 플랫폼',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="ko">
            <body>{children}</body>
        </html>
    )
}
