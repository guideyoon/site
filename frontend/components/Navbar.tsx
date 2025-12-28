'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'

interface NavbarProps {
    user: any
}

export default function Navbar({ user }: NavbarProps) {
    const router = useRouter()
    const pathname = usePathname()
    const [isMenuOpen, setIsMenuOpen] = useState(false)

    const handleLogout = () => {
        localStorage.removeItem('token')
        router.push('/login')
    }

    const navLinks = [
        { name: '대시보드', href: '/dashboard' },
        { name: '수집함', href: '/items' },
        { name: '대기열', href: '/queue' },
        { name: '출처 관리', href: '/sources' },
    ]

    if (user?.role === 'admin') {
        navLinks.push({ name: '관리자', href: '/admin' })
    }

    const isActive = (href: string) => pathname === href

    return (
        <nav className="bg-white shadow-sm sticky top-0 z-50 font-sans">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <div className="flex-shrink-0 flex items-center">
                            <h1 className="text-xl font-bold text-blue-600 cursor-pointer" onClick={() => router.push('/dashboard')}>사이트 수집기</h1>
                        </div>
                        <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={`${isActive(link.href)
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                        } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-bold`}
                                >
                                    {link.name}
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Desktop User Info & Logout */}
                    <div className="hidden sm:flex sm:items-center sm:space-x-4">
                        {user && (
                            <span className="text-sm text-gray-700 font-medium">
                                {user.username} 님
                            </span>
                        )}
                        <button
                            onClick={handleLogout}
                            className="text-gray-500 hover:text-gray-700 text-sm font-medium"
                        >
                            로그아웃
                        </button>
                    </div>

                    {/* Mobile menu button */}
                    <div className="flex items-center sm:hidden">
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none"
                        >
                            <span className="sr-only">메뉴 열기</span>
                            {/* Hamburger icon */}
                            <svg
                                className={`${isMenuOpen ? 'hidden' : 'block'} h-6 w-6`}
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                            {/* Close icon */}
                            <svg
                                className={`${isMenuOpen ? 'block' : 'hidden'} h-6 w-6`}
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile menu, show/hide based on menu state. */}
            <div className={`${isMenuOpen ? 'block' : 'hidden'} sm:hidden bg-white border-t border-gray-200`}>
                <div className="pt-2 pb-3 space-y-1">
                    {navLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`${isActive(link.href)
                                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                                    : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
                                } block pl-3 pr-4 py-2 border-l-4 text-base font-bold`}
                            onClick={() => setIsMenuOpen(false)}
                        >
                            {link.name}
                        </Link>
                    ))}
                </div>
                <div className="pt-4 pb-3 border-t border-gray-200">
                    <div className="flex items-center px-4">
                        <div className="flex-shrink-0">
                            <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-blue-100 text-blue-600 font-bold">
                                {user?.username?.charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <div className="ml-3">
                            <div className="text-base font-bold text-gray-800">{user?.username} 님</div>
                            <div className="text-sm font-medium text-gray-500 capitalize">{user?.role}</div>
                        </div>
                    </div>
                    <div className="mt-3 space-y-1">
                        <button
                            onClick={handleLogout}
                            className="block w-full text-left px-4 py-2 text-base font-bold text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                        >
                            로그아웃
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    )
}
