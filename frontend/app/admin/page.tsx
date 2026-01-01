'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { usersApi, authApi } from '@/lib/api'
import Navbar from '@/components/Navbar'

interface User {
    id: number
    username: string
    role: string
    created_at: string
    expires_at: string | null
    last_login_at: string | null
    login_count: number
}

const ADMIN_VERSION = "20251228-2230-V15"

export default function AdminPage() {
    const router = useRouter()
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [notification, setNotification] = useState('')
    const [user, setUser] = useState<any>(null)

    useEffect(() => {
        const token = localStorage.getItem('token')
        if (!token) {
            router.push('/login')
            return
        }

        const loadUser = async () => {
            try {
                const res = await authApi.me()
                setUser(res.data)
            } catch (err) {
                console.error('Failed to load user info', err)
            }
        }

        loadUser()
        fetchUsers()
    }, [])

    const fetchUsers = async () => {
        setLoading(true)
        try {
            const response = await usersApi.list()
            setUsers(response.data)
            setError('')
        } catch (err: any) {
            console.error('Fetch users error:', err)
            const status = err.response?.status
            const detail = err.response?.data?.detail
            const msg = `오류 (${status}): ${typeof detail === 'string' ? detail : JSON.stringify(detail) || err.message}`
            setError(msg)
            if (err.response?.status === 403) {
                alert('관리자 권한이 필요합니다.')
                router.push('/dashboard')
            }
        } finally {
            setLoading(false)
        }
    }

    const handleUpdateUser = async (userId: number, data: any) => {
        try {
            // If expires_at is an empty string, send null to clear it
            const updateData = { ...data }
            if (updateData.expires_at === '') {
                updateData.expires_at = null
            } else if (updateData.expires_at && typeof updateData.expires_at === 'string' && updateData.expires_at.length === 10) {
                // Add end of day time for date-only inputs
                updateData.expires_at = `${updateData.expires_at}T23:59:59`
            }

            await usersApi.update(userId, updateData)
            setNotification('사용자 정보가 성공적으로 변경되었습니다.')
            fetchUsers()
            setTimeout(() => setNotification(''), 3000)
        } catch (err: any) {
            console.error('Update failed:', err)
            const detail = err.response?.data?.detail
            const errorMessage = typeof detail === 'string'
                ? detail
                : (Array.isArray(detail) ? detail.map(d => d.msg).join(', ') : JSON.stringify(detail))

            alert(errorMessage || '정보 변경에 실패했습니다.')
        }
    }

    const handleDeleteUser = async (userId: number, username: string) => {
        if (!confirm(`${username} 사용자를 정말로 삭제하시겠습니까?`)) return

        try {
            await usersApi.delete(userId)
            setNotification('사용자가 삭제되었습니다.')
            fetchUsers()
            setTimeout(() => setNotification(''), 3000)
        } catch (err: any) {
            alert(err.response?.data?.detail || '사용자 삭제에 실패했습니다.')
        }
    }

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-slate-950 font-sans text-black dark:text-white transition-colors duration-200">
            <Navbar user={user} />

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    {/* Header - Mobile Optimized */}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0 mb-6">
                        <div className="flex items-center gap-4">
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">사용자 관리</h2>
                            <span className="text-[10px] text-blue-500 font-mono mt-1">{ADMIN_VERSION}</span>
                        </div>
                        <button
                            onClick={fetchUsers}
                            className="text-sm text-blue-500 hover:text-blue-400 hover:underline self-start sm:self-auto"
                        >
                            새로고침
                        </button>
                    </div>

                    {notification && (
                        <div className="mb-4 p-4 bg-green-100 dark:bg-green-900/30 border-l-4 border-green-500 text-green-700 dark:text-green-300 text-sm">
                            {notification}
                        </div>
                    )}

                    {error && (
                        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-300 text-sm">
                            {error}
                        </div>
                    )}

                    {loading ? (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">로딩 중...</div>
                    ) : (
                        <>
                            {/* Desktop Table View - Hidden on Mobile */}
                            <div className="hidden sm:block bg-white dark:bg-slate-900 shadow overflow-x-auto sm:rounded-lg border border-gray-200 dark:border-slate-800">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
                                    <thead className="bg-gray-50 dark:bg-slate-800/50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">아이디</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">역할</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">가입일</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">만료일</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">최근 접속</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">접속 횟수</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">관리</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-800">
                                        {users.map((user) => (
                                            <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{user.username}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                    <select
                                                        value={user.role}
                                                        onChange={(e) => handleUpdateUser(user.id, { role: e.target.value })}
                                                        className="border border-gray-300 dark:border-slate-700 rounded px-2 py-1 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                                    >
                                                        <option value="admin">관리자 (Admin)</option>
                                                        <option value="viewer">사용자 (User)</option>
                                                    </select>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                    {new Date(user.created_at).toLocaleDateString('ko-KR')}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                    {user.role === 'admin' ? (
                                                        <span className="text-gray-400 dark:text-gray-600 font-medium">무제한</span>
                                                    ) : (
                                                        <input
                                                            type="date"
                                                            value={user.expires_at ? new Date(user.expires_at).toISOString().split('T')[0] : ''}
                                                            onChange={(e) => handleUpdateUser(user.id, { expires_at: e.target.value })}
                                                            className="border border-gray-300 dark:border-slate-700 rounded px-2 py-1 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                                        />
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                    {user.last_login_at ? new Date(user.last_login_at).toLocaleString('ko-KR') : '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                    {user.login_count}회
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    {user.role !== 'admin' && (
                                                        <button
                                                            onClick={() => handleDeleteUser(user.id, user.username)}
                                                            className="text-red-500 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-30 transition-colors"
                                                            title="사용자 삭제"
                                                        >
                                                            삭제
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card View - Visible only on Mobile */}
                            <div className="sm:hidden space-y-4">
                                {users.map((user) => (
                                    <div
                                        key={user.id}
                                        className="bg-white dark:bg-slate-900 rounded-lg shadow border border-gray-200 dark:border-slate-800 p-4 space-y-3"
                                    >
                                        {/* User Header */}
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{user.username}</h3>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                    가입일: {new Date(user.created_at).toLocaleDateString('ko-KR')}
                                                </p>
                                            </div>
                                            {user.role !== 'admin' && (
                                                <button
                                                    onClick={() => handleDeleteUser(user.id, user.username)}
                                                    className="text-red-500 hover:text-red-600 dark:hover:text-red-400 text-sm font-medium px-3 py-2 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors min-h-[44px]"
                                                >
                                                    삭제
                                                </button>
                                            )}
                                        </div>

                                        {/* User Details */}
                                        <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-slate-800">
                                            {/* Role */}
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                                                    역할
                                                </label>
                                                <select
                                                    value={user.role}
                                                    onChange={(e) => handleUpdateUser(user.id, { role: e.target.value })}
                                                    className="w-full border border-gray-300 dark:border-slate-700 rounded-md px-3 py-2.5 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none min-h-[44px]"
                                                >
                                                    <option value="admin">관리자 (Admin)</option>
                                                    <option value="viewer">사용자 (User)</option>
                                                </select>
                                            </div>

                                            {/* Expiration Date */}
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                                                    만료일
                                                </label>
                                                {user.role === 'admin' ? (
                                                    <div className="w-full border border-gray-300 dark:border-slate-700 rounded-md px-3 py-2.5 text-sm bg-gray-50 dark:bg-slate-800/50 text-gray-400 dark:text-gray-600 font-medium min-h-[44px] flex items-center">
                                                        무제한
                                                    </div>
                                                ) : (
                                                    <input
                                                        type="date"
                                                        value={user.expires_at ? new Date(user.expires_at).toISOString().split('T')[0] : ''}
                                                        onChange={(e) => handleUpdateUser(user.id, { expires_at: e.target.value })}
                                                        className="w-full border border-gray-300 dark:border-slate-700 rounded-md px-3 py-2.5 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none min-h-[44px]"
                                                    />
                                                )}
                                            </div>

                                            {/* Login Stats */}
                                            <div className="grid grid-cols-2 gap-3 pt-2">
                                                <div>
                                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">최근 접속</p>
                                                    <p className="text-sm text-gray-900 dark:text-white">
                                                        {user.last_login_at ? new Date(user.last_login_at).toLocaleDateString('ko-KR') : '-'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">접속 횟수</p>
                                                    <p className="text-sm text-gray-900 dark:text-white">{user.login_count}회</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    )
}
