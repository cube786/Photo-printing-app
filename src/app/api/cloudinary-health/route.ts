function env(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing required env var: ${name}`)
  return v
}

export async function GET() {
  try {
    const cloudName = env('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME').trim()
    const apiKey = env('CLOUDINARY_API_KEY').trim()
    const apiSecret = env('CLOUDINARY_API_SECRET').trim()

    const url = `https://api.cloudinary.com/v1_1/${cloudName}/resources/image?max_results=1`
    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')

    const res = await fetch(url, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
      
      method: 'GET',
      cache: 'no-store',
    })

    const text = await res.text()
    const body = (() => { try { return JSON.parse(text) } catch { return text } })()

    return Response.json({
      status: res.status,
      statusText: res.statusText,
      cloudName,
      endpoint: url,
      ok: res.ok,
      body,
    }, { status: 200 })
  } catch (err: any) {
    return Response.json({ error: err?.message || String(err) }, { status: 500 })
  }
}
