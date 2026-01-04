import { Metadata } from 'next'

export const metadata: Metadata = {
    title: '수집함 | Ulsan Content Platform',
    description: 'Collected items management',
}

export const dynamic = 'force-dynamic'

export default function ItemsLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <>
            {children}
        </>
    )
}
