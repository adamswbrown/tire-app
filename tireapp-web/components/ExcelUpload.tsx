'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

export function ExcelUpload({ customerId }: { customerId: string }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('customerId', customerId)

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })

    const data = await res.json()

    if (res.ok) {
      setResult(`Imported ${data.created} applications (${data.duplicatesRemoved} duplicates skipped)`)
      router.refresh()
    } else {
      setResult(`Error: ${data.error}`)
    }

    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="flex items-center gap-3">
      {result && (
        <span className={`text-sm ${result.startsWith('Error') ? 'text-red-500' : 'text-green-600'}`}>
          {result}
        </span>
      )}
      <label className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 cursor-pointer">
        {uploading ? 'Uploading...' : 'Upload Excel'}
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleUpload}
          disabled={uploading}
          className="hidden"
        />
      </label>
    </div>
  )
}
