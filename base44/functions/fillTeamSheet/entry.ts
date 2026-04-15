import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import PizZip from 'npm:pizzip@3.1.7';
import Docxtemplater from 'npm:docxtemplater@3.68.3';

function fixSplitPlaceholders(xml) {
  xml = xml.replace(/<w:proofErr[^>]*\/>/g, '');
  let changed = true;
  let iterations = 0;
  while (changed && iterations < 30) {
    changed = false;
    iterations++;
    const next = xml.replace(
      /(<w:t[^>]*>[^<]*\{\{[^}]*)<\/w:t><\/w:r><w:r[^>]*>(?:<w:rPr>[\s\S]*?<\/w:rPr>)?<w:t[^>]*>/,
      '$1'
    );
    if (next !== xml) { xml = next; changed = true; }
  }
  return xml;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { templateUrl, data } = await req.json();
    if (!templateUrl) return Response.json({ error: 'templateUrl required' }, { status: 400 });

    const templateResponse = await fetch(templateUrl);
    if (!templateResponse.ok) return Response.json({ error: 'Failed to fetch template' }, { status: 400 });

    const templateBuffer = await templateResponse.arrayBuffer();
    const zip = new PizZip(templateBuffer);

    for (const name of Object.keys(zip.files)) {
      if (name === 'word/document.xml' || /^word\/(header|footer)\d*\.xml$/.test(name)) {
        zip.file(name, fixSplitPlaceholders(zip.files[name].asText()));
      }
    }

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: () => '',
    });

    const safeData = new Proxy(data || {}, {
      get(target, prop) {
        if (typeof prop === 'string' && !(prop in target)) return '';
        return target[prop];
      },
    });

    doc.render(safeData);

    const outputBuffer = doc.getZip().generate({ type: 'uint8array' });
    const base64 = btoa(String.fromCharCode(...outputBuffer));
    return Response.json({ base64 });

  } catch (error) {
    console.error('Error:', error.message);
    if (error.properties?.errors) {
      // Return full detail of first few errors for diagnosis
      const firstErrors = error.properties.errors.slice(0, 3).map(e => ({
        message: e.message,
        name: e.name,
        properties: e.properties,
      }));
      return Response.json({ error: 'Template error', details: firstErrors }, { status: 500 });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
});