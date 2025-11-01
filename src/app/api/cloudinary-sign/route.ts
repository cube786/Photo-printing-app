import crypto from 'crypto'

function env(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing required env var: ${name}`)
  return v
}


export async function POST(req: Request) {
  try {
    const { folder }: { folder?: string } = await req.json().catch(() => ({}))

    const timestamp = Math.floor(Date.now() / 1000)
    const params: Record<string, string | number> = { timestamp }
    if (folder) params.folder = folder

 
    const toSign = Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join('&')

    const apiSecret = env('CLOUDINARY_API_SECRET')
    const signature = crypto
      .createHash('sha1')
      .update(toSign + apiSecret)
      .digest('hex')

    return Response.json({
      signature,
      timestamp,
      folder: folder ?? null,
      cloudName: env('NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME'),
      apiKey: env('CLOUDINARY_API_KEY'), 
      toSign,
    })
  } catch (err: any) {
    console.error('Signature route error:', err?.message || err)
    return new Response(
      JSON.stringify({ error: { message: 'Signature generation failed' } }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
