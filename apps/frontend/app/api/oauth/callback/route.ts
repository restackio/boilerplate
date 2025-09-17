import { NextRequest, NextResponse } from 'next/server';
import { runWorkflow, getWorkflowResult } from '@/app/actions/workflow';

export async function POST(request: NextRequest) {
  try {
    console.log('OAuth callback API called');
    
    const body = await request.json();
    console.log('Request body:', body);
    
    const { workflow, input } = body;

    if (!workflow || !input) {
      console.error('Missing workflow or input:', { workflow, input });
      return NextResponse.json(
        { success: false, error: 'Missing workflow or input' },
        { status: 400 }
      );
    }

    console.log('Executing workflow:', workflow, 'with input:', input);

    // Execute the OAuth callback workflow
    const { workflowId, runId } = await runWorkflow({
      workflowName: workflow,
      input,
    });

    console.log('Workflow scheduled:', { workflowId, runId });

    // Get the workflow result
    const result = await getWorkflowResult({
      workflowId,
      runId,
    });

    console.log('Workflow result:', result);

    return NextResponse.json({
      success: true,
      data: result,
      workflowId,
      runId,
    });

  } catch (error) {
    console.error('OAuth callback API error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
