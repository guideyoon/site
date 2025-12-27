'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
    const router = useRouter()
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const formData = new FormData()
            formData.append('username', username)
            formData.append('password', password)

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
                method: 'POST',
                body: formData,
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                const detail = errorData.detail
                const errorMessage = typeof detail === 'string'
                    ? detail
                    : (Array.isArray(detail) ? detail.map((d: any) => d.msg).join(', ') : '로그인에 실패했습니다.')

                throw new Error(errorMessage)
            }

            const data = await response.json()
            localStorage.setItem('token', data.access_token)

            // Redirect to dashboard
            router.push('/dashboard')
        } catch (err: any) {
            setError(err.message || '로그인에 실패했습니다. 아이디와 비밀번호를 확인해주세요.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-lg shadow-xl p-8">
                    <h1 className="text-3xl font-bold text-center mb-8">
                        사이트 수집기
                    </h1>

                    <form onSubmit={handleLogin}>
                        <div className="mb-4">
                            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                                아이디
                            </label>
                            <input
                                type="text"
                                id="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                                required
                            />
                        </div>

                        <div className="mb-6">
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                비밀번호
                            </label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                                required
                            />
                        </div>

                        {error && (
                            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                        >
                            {loading ? '로그인 중...' : '로그인'}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm text-gray-600">
                        <p>관리자 계정이 필요합니다. 계정이 없으신가요?</p>
                        <div className="space-x-4 mt-2">
                            <Link href="/register" className="text-blue-500 hover:underline font-medium">회원가입</Link>
                            <span className="text-gray-300">|</span>
                            <Link href="/" className="text-blue-500 hover:underline">홈으로 돌아가기</Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
