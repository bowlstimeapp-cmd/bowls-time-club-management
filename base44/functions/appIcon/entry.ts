// Serves the app icon by proxying from the CDN — allows same-origin icon URLs
Deno.serve(async (req) => {
  const iconUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6995ed6ffddbd0f64bc9d1e8/61b3b45da_BTZoomed.png';
  const response = await fetch(iconUrl);
  const buffer = await response.arrayBuffer();
  return new Response(buffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400',
    },
  });
});