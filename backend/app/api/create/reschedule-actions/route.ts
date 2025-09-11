import { NextResponse } from 'next/server'
import { handleRescheduleRequest } from '../../../../lib/scheduling/rescheduler'

export async function POST(req: Request) {
  try {
    const result = await handleRescheduleRequest(req)
    
    if (!result.success) {
      const errorMessage = 'error' in result ? result.error : 'Rescheduling failed'
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      )
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Rescheduling error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
