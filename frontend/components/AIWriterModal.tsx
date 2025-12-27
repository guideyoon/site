import { useState, useRef, useEffect } from 'react'
import { uploadApi, aiApi, authApi } from '@/lib/api'

interface AIWriterModalProps {
    isOpen: boolean
    onClose: () => void
    mode: 'blog' | 'cafe'
    item: {
        title: string
        raw_text: string | null
        image_urls: string[] | null
    }
}

export default function AIWriterModal({ isOpen, onClose, mode, item }: AIWriterModalProps) {
    const [content, setContent] = useState('')
    const [rewrittenContent, setRewrittenContent] = useState('')
    const [activeEditor, setActiveEditor] = useState<'original' | 'rewritten'>('original')
    const [images, setImages] = useState<Array<{ url: string, file: File | null }>>([])
    const [uploading, setUploading] = useState(false)
    const [previewMode, setPreviewMode] = useState(false)

    // Cafe Specific State
    const [cafeSettings, setCafeSettings] = useState({
        club_id: '',
        menu_id: '',
        subject: ''
    })
    const [postingToCafe, setPostingToCafe] = useState(false)

    // AI Settings
    const [provider, setProvider] = useState('openai')
    const [style, setStyle] = useState('review') // Default style
    const [customPrompt, setCustomPrompt] = useState('') // For 'custom' style

    const [apiKeys, setApiKeys] = useState({
        openai_api_key: false,
        gemini_api_key: false,
        perplexity_api_key: false
    })

    const [rewriting, setRewriting] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const rewrittenTextareaRef = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
        if (isOpen) {
            // Initial content population
            let initialContent = item.title + '\n\n'
            if (item.raw_text) initialContent += item.raw_text + '\n\n'
            setContent(initialContent)

            // Initial images (convert strings to object structure)
            if (item.image_urls) {
                setImages(item.image_urls.map(url => ({ url, file: null })))
            }

            // Initial subject
            setCafeSettings(prev => ({ ...prev, subject: item.title }))

            // Check for user settings (API Key)
            checkUserApiKeys()
        }
    }, [isOpen, item])

    const checkUserApiKeys = async () => {
        try {
            const response = await authApi.me()
            const user = response.data
            setApiKeys({
                openai_api_key: !!user.openai_api_key,
                gemini_api_key: !!user.gemini_api_key,
                perplexity_api_key: !!user.perplexity_api_key
            })
            // Pre-fill Cafe settings if saved in user preferences (TODO: Add to user model if frequent)
        } catch (e) {
            console.error('Failed to fetch user settings', e)
        }
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return

        setUploading(true)
        const file = e.target.files[0]
        try {
            const response = await uploadApi.image(file)
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
            const fullUrl = `${apiUrl}${response.data.url}`

            setImages(prev => [...prev, { url: fullUrl, file }])
        } catch (error) {
            alert('이미지 업로드 실패')
        } finally {
            setUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const insertImage = (url: string) => {
        const textarea = activeEditor === 'original' ? textareaRef.current : rewrittenTextareaRef.current
        if (!textarea) return

        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const text = textarea.value

        // Insert as HTML <img> tag for better compatibility with Naver Blog/Cafe HTML editors
        const insertText = `\n<img src="${url}" style="max-width: 100%; height: auto; display: block; margin: 10px 0;" />\n`

        const newText = text.substring(0, start) + insertText + text.substring(end)

        if (activeEditor === 'original') {
            setContent(newText)
        } else {
            setRewrittenContent(newText)
        }

        setTimeout(() => {
            textarea.focus()
            textarea.setSelectionRange(start + insertText.length, start + insertText.length)
        }, 0)
    }

    const handleRewrite = async () => {
        if (!content.trim()) return

        setRewriting(true)
        try {
            let instruction = "Rewrite this text."

            if (mode === 'cafe') {
                switch (style) {
                    case 'review': instruction = "Rewrite this as a GENUINE Cafe Review. Use informal, friendly Korean (polite 'haeyo' style or 'banmal' depending on target). Include emotions, emojis, and specific details that make it sound like a real user experience. Avoid overly marketing tone."; break;
                    case 'info': instruction = "Rewrite this as an Information Share post for a Cafe community. Be helpful, concise, and structure with bullet points. Tone should be expert yet approachable."; break;
                    case 'question': instruction = "Rewrite this as a Question/Discussion starter. Frame the content as 'I found this, what do you think?' to encourage comments."; break;
                    case 'viral': instruction = "Rewrite this for Viral Marketing. Use catchy hooks, provocative questions, and emphasize 'FOMO' (Fear Of Missing Out)."; break;
                    case 'custom':
                        instruction = customPrompt || instruction;
                        break;
                    default: instruction = "Rewrite this text for a Naver Cafe post.";
                }
            } else {
                // Blog modes
                switch (style) {
                    case 'news': instruction = "Rewrite this as a formal News Article."; break;
                    case 'review': instruction = "Rewrite this as a detailed Blog Review."; break;
                    case 'guide': instruction = "Rewrite this as a How-to Guide."; break;
                    case 'story': instruction = "Rewrite this as a Story."; break;
                    case 'interview': instruction = "Rewrite this as an Interview."; break;
                    case 'custom': instruction = customPrompt || instruction; break;
                }
            }

            const response = await aiApi.rewrite(content, undefined, provider, undefined, instruction)
            setRewrittenContent(response.data.text)
            setActiveEditor('rewritten')
        } catch (error: any) {
            alert(error.response?.data?.detail || '리라이팅 실패')
        } finally {
            setRewriting(false)
        }
    }

    const handleDeleteImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index))
    }

    const handleCafeUpload = async () => {
        if (!cafeSettings.club_id || !cafeSettings.menu_id) {
            alert('카페 ID와 메뉴 ID를 입력해주세요.')
            return
        }
        if (!cafeSettings.subject) {
            alert('제목을 입력해주세요.')
            return
        }
        if (!rewrittenContent) {
            alert('업로드할 본문(리라이팅)이 없습니다.')
            return
        }

        setPostingToCafe(true)
        try {
            const formData = new FormData();
            formData.append('subject', cafeSettings.subject);

            // Convert newlines to <br>
            let htmlContent = rewrittenContent.replace(/\n/g, '<br/>');

            // Convert Markdown images to HTML if any exist (in case AI generated them)
            // ![alt](url) -> <img src="url" ... />
            htmlContent = htmlContent.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" style="max-width: 100%; height: auto; display: block; margin: 10px 0;" />');

            formData.append('content', htmlContent);

            // Append images
            images.forEach((img) => {
                if (img.file) {
                    formData.append('images', img.file);
                }
            });

            await naverApi.writePost(
                cafeSettings.club_id,
                cafeSettings.menu_id,
                formData
            )
            alert('네이버 카페에 성공적으로 업로드되었습니다!')
            onClose()
        } catch (error: any) {
            console.error(error)
            alert(error.response?.data?.detail || '카페 업로드 실패')
        } finally {
            setPostingToCafe(false)
        }
    }

    const handleCopyHtml = async (text: string) => {
        try {
            // content contains raw HTML tags (<img>) and newlines
            // We need to convert newlines to <br> for the HTML mime type so formatting is preserved
            const htmlContent = text.replace(/\n/g, '<br/>');

            const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
            const textBlob = new Blob([text], { type: 'text/plain' });

            await navigator.clipboard.write([
                new ClipboardItem({
                    'text/html': htmlBlob,
                    'text/plain': textBlob,
                }),
            ]);
            alert('복사되었습니다. (에디터에 붙여넣기 하면 이미지가 보입니다)');
        } catch (err) {
            console.error('Failed to copy: ', err);
            // Fallback
            navigator.clipboard.writeText(text);
            alert('텍스트 형식으로 복사되었습니다.');
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-[95vw] h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-bold">
                        {mode === 'cafe' ? '네이버 카페 자동 업로드' : '블로그 글 작성'}
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        ✕
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    <div className="flex-1 flex flex-col border-r overflow-hidden">

                        {/* Cafe Specific Settings Bar */}
                        {mode === 'cafe' && (
                            <div className="p-3 bg-green-50 border-b flex flex-wrap gap-4 items-center text-sm">
                                <div className="flex items-center gap-2">
                                    <label className="font-semibold text-green-800">Cafe ID:</label>
                                    <input
                                        type="text"
                                        value={cafeSettings.club_id}
                                        onChange={(e) => setCafeSettings({ ...cafeSettings, club_id: e.target.value })}
                                        placeholder="Club ID"
                                        className="border p-1 rounded w-32"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="font-semibold text-green-800">Menu ID:</label>
                                    <input
                                        type="text"
                                        value={cafeSettings.menu_id}
                                        onChange={(e) => setCafeSettings({ ...cafeSettings, menu_id: e.target.value })}
                                        placeholder="Menu ID"
                                        className="border p-1 rounded w-24"
                                    />
                                </div>
                                <div className="flex items-center gap-2 flex-1">
                                    <label className="font-semibold text-green-800">제목:</label>
                                    <input
                                        type="text"
                                        value={cafeSettings.subject}
                                        onChange={(e) => setCafeSettings({ ...cafeSettings, subject: e.target.value })}
                                        placeholder="게시글 제목"
                                        className="border p-1 rounded text-gray-800 flex-1 min-w-[200px]"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="p-4 border-b bg-gray-50 flex flex-col gap-3 z-10 shadow-sm">
                            {/* Top Row: Providers */}
                            <div className="flex justify-between items-center flex-wrap gap-2">
                                <div className="flex items-center gap-4">
                                    <span className="text-sm font-semibold">AI 모델:</span>
                                    {[
                                        { id: 'openai', name: 'CheckGPT', key: 'openai_api_key' },
                                        { id: 'gemini', name: 'Gemini', key: 'gemini_api_key' },
                                        { id: 'perplexity', name: 'Perplexity', key: 'perplexity_api_key' }
                                    ].map((p) => (
                                        <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="ai-provider"
                                                value={p.id}
                                                checked={provider === p.id}
                                                onChange={(e) => setProvider(e.target.value)}
                                                className="accent-purple-600"
                                            />
                                            <span className="text-sm">{p.name}</span>
                                            <span
                                                className={`w-2 h-2 rounded-full ${apiKeys[p.key as keyof typeof apiKeys] ? 'bg-green-500' : 'bg-red-500'}`}
                                                title={apiKeys[p.key as keyof typeof apiKeys] ? '준비됨' : '키 필요'}
                                            />
                                        </label>
                                    ))}
                                </div>

                                <button
                                    onClick={handleRewrite}
                                    disabled={rewriting || !apiKeys[`${provider}_api_key` as keyof typeof apiKeys]}
                                    className="px-6 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:opacity-50 font-medium"
                                >
                                    {rewriting ? '작성 중...' : 'AI 다시 쓰기'}
                                </button>

                                <button
                                    onClick={() => setPreviewMode(!previewMode)}
                                    className={`px-4 py-2 text-sm rounded border font-medium flex items-center gap-2 ${previewMode ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                                >
                                    {previewMode ? '📝 편집 모드' : '👁️ 미리보기'}
                                </button>
                            </div>

                            {/* Middle Row: Styles */}
                            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                                <span className="text-sm font-semibold whitespace-nowrap mr-2">스타일:</span>
                                {mode === 'blog' ? (
                                    // Blog Styles
                                    ['news', 'review', 'guide', 'story', 'interview', 'custom'].map((s) => (
                                        <button
                                            key={s}
                                            onClick={() => setStyle(s)}
                                            className={`px-3 py-1 text-xs rounded-full border whitespace-nowrap transition-colors ${style === s ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white hover:bg-gray-50'}`}
                                        >
                                            {s === 'news' && '뉴스 기사'}
                                            {s === 'review' && '리뷰'}
                                            {s === 'guide' && '가이드'}
                                            {s === 'story' && '스토리'}
                                            {s === 'interview' && '인터뷰'}
                                            {s === 'custom' && '직접 입력'}
                                        </button>
                                    ))
                                ) : (
                                    // Cafe Styles
                                    ['review', 'info', 'question', 'viral', 'custom'].map((s) => (
                                        <button
                                            key={s}
                                            onClick={() => setStyle(s)}
                                            className={`px-3 py-1 text-xs rounded-full border whitespace-nowrap transition-colors ${style === s ? 'bg-green-100 border-green-300 text-green-700' : 'bg-white hover:bg-gray-50'}`}
                                        >
                                            {s === 'review' && '성실 회원 후기'}
                                            {s === 'info' && '꿀팁 공유'}
                                            {s === 'question' && '질문/토론'}
                                            {s === 'viral' && '홍보/바이럴'}
                                            {s === 'custom' && '직접 입력'}
                                        </button>
                                    ))
                                )}
                            </div>

                            {style === 'custom' && (
                                <div className="mt-1">
                                    <textarea
                                        value={customPrompt}
                                        onChange={(e) => setCustomPrompt(e.target.value)}
                                        placeholder="AI 지침 입력..."
                                        className="w-full p-2 text-sm border rounded h-16 resize-none"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Editors */}
                        <div className="flex-1 flex flex-col p-4 overflow-hidden relative">
                            <div className="flex-1 flex gap-4 overflow-hidden">
                                <div className="flex-1 flex flex-col">
                                    <label className="text-sm font-medium mb-1 text-gray-700">원본</label>
                                    {previewMode ? (
                                        <div
                                            className="flex-1 w-full p-4 border rounded-lg overflow-y-auto bg-white prose max-w-none"
                                            dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br/>') }}
                                        />
                                    ) : (
                                        <textarea
                                            ref={textareaRef}
                                            value={content}
                                            onChange={(e) => setContent(e.target.value)}
                                            onFocus={() => setActiveEditor('original')}
                                            className={`flex-1 w-full p-4 border rounded-lg resize-none focus:outline-none ${activeEditor === 'original' ? 'ring-2 ring-blue-500' : ''}`}
                                        />
                                    )}
                                </div>
                                <div className="flex flex-col justify-center text-gray-400">➔</div>
                                <div className="flex-1 flex flex-col">
                                    <label className="text-sm font-medium mb-1 text-purple-700">리라이팅 결과</label>
                                    {previewMode ? (
                                        <div
                                            className="flex-1 w-full p-4 border rounded-lg overflow-y-auto bg-gray-50 prose max-w-none"
                                            dangerouslySetInnerHTML={{ __html: rewrittenContent.replace(/\n/g, '<br/>') }}
                                        />
                                    ) : (
                                        <textarea
                                            ref={rewrittenTextareaRef}
                                            value={rewrittenContent}
                                            onChange={(e) => setRewrittenContent(e.target.value)}
                                            onFocus={() => setActiveEditor('rewritten')}
                                            className={`flex-1 w-full p-4 border rounded-lg resize-none focus:outline-none ${activeEditor === 'rewritten' ? 'ring-2 ring-purple-500' : 'bg-gray-50'}`}
                                            placeholder="AI가 생성한 글이 여기에 나옵니다..."
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Image Gallery */}
                    <div className="w-80 bg-gray-50 p-4 border-l overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold">이미지</h3>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                            >
                                + 추가
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="hidden"
                            />
                        </div>
                        <div className="space-y-3">
                            {images.map((img, idx) => (
                                <div key={idx} className="group relative bg-white p-2 rounded border shadow-sm">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={img.url} alt={`Img ${idx}`} className="w-full aspect-video object-cover" />

                                    {/* Overlay Actions */}
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                        <button
                                            onClick={() => insertImage(img.url)}
                                            className="px-3 py-1.5 bg-white text-gray-900 text-sm font-medium rounded shadow hover:bg-gray-100 transform translate-y-2 group-hover:translate-y-0 transition-all"
                                        >
                                            본문에 삽입
                                        </button>

                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleDeleteImage(idx)
                                            }}
                                            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-sm transition-colors"
                                            title="이미지 삭제"
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800">
                        닫기
                    </button>
                    {mode === 'cafe' ? (
                        <button
                            onClick={handleCafeUpload}
                            disabled={postingToCafe || !rewrittenContent}
                            className="px-6 py-2 bg-green-600 text-white rounded font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            {postingToCafe ? '업로드 중...' : '네이버 카페에 업로드'}
                        </button>
                    ) : (
                        <>
                            <button
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                                onClick={() => handleCopyHtml(content)}
                            >
                                원본 복사
                            </button>
                            <button
                                className="px-6 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                                onClick={() => rewrittenContent && handleCopyHtml(rewrittenContent)}
                                disabled={!rewrittenContent}
                            >
                                리라이팅 복사
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
