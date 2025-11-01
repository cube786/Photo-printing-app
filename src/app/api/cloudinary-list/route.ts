function env(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing required env var: ${name}`)
  return v
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const folder = (searchParams.get('folder') || 'photo-printing-app').trim()

    const cloudName = env('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME').trim()
    const apiKey = env('CLOUDINARY_API_KEY').trim()
    const apiSecret = env('CLOUDINARY_API_SECRET').trim()

    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')

    
    const searchUrl = `https://api.cloudinary.com/v1_1/${cloudName}/resources/search`
    const searchRes = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        expression: `folder=${folder}`,
        max_results: 100,
        sort_by: [{ created_at: 'desc' }],
      }),
      cache: 'no-store',
    })

    let resources: any[] | null = null

    if (searchRes.ok) {
      const data = await searchRes.json()
      resources = data.resources || []
    } else {
      
      const listUrl = `https://api.cloudinary.com/v1_1/${cloudName}/resources/image/upload?prefix=${encodeURIComponent(folder + '/')}&max_results=100`
      const listRes = await fetch(listUrl, {
        headers: { Authorization: `Basic ${auth}` },
        cache: 'no-store',
      })
      const data = await listRes.json().catch(() => ({}))
      resources = Array.isArray(data.resources) ? data.resources : []
    }

    const items = (resources || []).map((r: any) => ({
      public_id: r.public_id,
      secure_url: r.secure_url || r.url,
      folder: r.folder,
      bytes: r.bytes,
      width: r.width,
      height: r.height,
      created_at: r.created_at,
      format: r.format,
    }))

    return Response.json({
      folder,
      count: items.length,
      items,
    })
  } catch (err: any) {
    return Response.json({ error: err?.message || String(err) }, { status: 500 })
  }
}
