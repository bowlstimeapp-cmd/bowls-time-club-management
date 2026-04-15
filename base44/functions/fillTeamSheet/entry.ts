import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import PizZip from 'npm:pizzip@3.1.7';
import Docxtemplater from 'npm:docxtemplater@3.68.3';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { templateUrl, data } = await req.json();

    if (!templateUrl) {
      return Response.json({ error: 'templateUrl is required' }, { status: 400 });
    }

    // Fetch the template file
    const templateResponse = await fetch(templateUrl);
    if (!templateResponse.ok) {
      return Response.json({ error: 'Failed to fetch template file' }, { status: 400 });
    }

    const templateBuffer = await templateResponse.arrayBuffer();

    // Load the docx template
    const zip = new PizZip(templateBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    // Render with the provided data
    doc.render(data);

    const outputBuffer = doc.getZip().generate({
      type: 'arraybuffer',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    return new Response(outputBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="team-sheet.docx"`,
      },
    });
  } catch (error) {
    console.error('fillTeamSheet error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});