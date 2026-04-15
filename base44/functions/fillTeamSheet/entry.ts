import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import PizZip from 'npm:pizzip@3.1.7';
import Docxtemplater from 'npm:docxtemplater@3.68.3';

/**
 * docxtemplater works at the "text chunk" level — it concatenates all <w:t> text
 * in a <w:p> paragraph when looking for delimiters.
 * "Duplicate open tag" actually means the delimiters {{ and }} are in separate
 * <w:r> runs BUT THE SAME PARAGRAPH, so docxtemplater sees them as separate
 * "tokens" and gets confused.
 *
 * The actual fix docxtemplater recommends is to use their built-in
 * `fixSplitPlaceholders` utility which was added for exactly this purpose.
 * Let's try importing it from the package.
 */

let fixSplitDocxPlaceholders;
try {
  // In newer versions of docxtemplater, this utility is exported
  const mod = await import('npm:docxtemplater@3.68.3/js/docxtemplater.js');
  fixSplitDocxPlaceholders = mod.fixSplitPlaceholders || null;
} catch {
  fixSplitDocxPlaceholders = null;
}

// Fallback: our own implementation using a direct XML string approach
function fixXmlPlaceholders(xml) {
  xml = xml.replace(/<w:proofErr[^>]*\/>/g, '');
  
  // Strategy: use a regex that finds </w:t></w:r> bridges between runs
  // and removes them when the accumulated text has unclosed {{ 
  // We use a stateful replacement with a running "open brace" counter
  
  // Split the XML on </w:t> boundaries, then rebuild
  const parts = xml.split(/<\/w:t>/);
  const result = [];
  let pendingOpen = false;
  
  for (let idx = 0; idx < parts.length; idx++) {
    const part = parts[idx];
    
    if (pendingOpen) {
      // We're merging — strip the opening <w:r...><w:t...> from this part
      // Find the next <w:t> start  
      const wtPos = findWtStart(part);
      if (wtPos !== -1) {
        // Check if bridge has paragraph boundary
        const bridge = part.slice(0, wtPos);
        if (bridge.includes('</w:p>') || bridge.includes('</w:body>') || bridge.includes('</w:tc>')) {
          // Can't merge across paragraph boundary — emit the pending close
          result.push('</w:t>');
          const prevPart = result[result.length - 2] || '';
          pendingOpen = false;
        } else {
          // Strip the bridge and continue merging into previous part
          const textContent = part.slice(findWtEnd(part, wtPos));
          // Append text content to previous result
          const last = result.pop();
          result.push(last + textContent);
          
          // Check if now closed
          const allText = result.join('');
          const lastWtStart = allText.lastIndexOf('>') + 1; // approximation
          // Actually track opens/closes in accumulated text since last <w:t>
          const opens = (result[result.length - 1].match(/\{\{/g) || []).length;
          const closes = (result[result.length - 1].match(/\}\}/g) || []).length;
          
          if (opens <= closes) {
            pendingOpen = false;
            result.push('</w:t>');
          }
          // else stay pending
          continue;
        }
      } else {
        result.push('</w:t>');
        pendingOpen = false;
      }
    }
    
    // Count {{ and }} in this part's text content
    const textContent = getWtText(part);
    const opens = (textContent.match(/\{\{/g) || []).length;
    const closes = (textContent.match(/\}\}/g) || []).length;
    
    if (opens > closes) {
      pendingOpen = true;
      result.push(part);
      // Don't add </w:t> yet
    } else {
      result.push(part);
      result.push('</w:t>');
    }
  }
  
  // Remove the last spurious </w:t> we added at the end (split artifact)
  if (result[result.length - 1] === '</w:t>' && !xml.endsWith('</w:t>')) {
    result.pop();
  }
  
  return result.join('');
}

function findWtStart(str) {
  let i = 0;
  while (i < str.length) {
    const idx = str.indexOf('<w:t', i);
    if (idx === -1) return -1;
    const next = str[idx + 4];
    if (next === '>' || next === ' ') return idx;
    i = idx + 4;
  }
  return -1;
}

function findWtEnd(str, wtPos) {
  const gt = str.indexOf('>', wtPos);
  return gt === -1 ? wtPos : gt + 1;
}

function getWtText(part) {
  // Get the text content after the last > in this part
  const lastGt = part.lastIndexOf('>');
  return lastGt === -1 ? part : part.slice(lastGt + 1);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { templateUrl, data } = await req.json();
    if (!templateUrl) return Response.json({ error: 'templateUrl required' }, { status: 400 });

    const templateResponse = await fetch(templateUrl);
    if (!templateResponse.ok) return Response.json({ error: 'Failed to fetch template' }, { status: 400 });

    const templateBuffer = await templateResponse.arrayBuffer();
    const zip = new PizZip(templateBuffer);

    for (const name of Object.keys(zip.files)) {
      if (name === 'word/document.xml' || /^word\/(header|footer)\d*\.xml$/.test(name)) {
        zip.file(name, fixXmlPlaceholders(zip.files[name].asText()));
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
    console.error('fillTeamSheet error:', error.message);
    if (error.properties?.errors) {
      const details = error.properties.errors.slice(0, 3).map(e => ({
        message: e.message,
        properties: e.properties,
      }));
      return Response.json({ error: 'Template error', details }, { status: 500 });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
});