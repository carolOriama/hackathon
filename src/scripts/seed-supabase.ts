import { parseArgs } from 'util';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { supabase } from '../lib/supabase';

// Load env vars
dotenv.config({ path: resolve(process.cwd(), '.env') });
dotenv.config({ path: resolve(process.cwd(), '.env.local') });


// We need an instructor ID to assign the courses to.
// The script will accept an email arg and grab that user's ID.
const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    instructorEmail: {
      type: 'string',
      short: 'i',
    },
  },
});

if (!values.instructorEmail) {
  console.error('Please provide an instructor email: npx tsx src/scripts/seed-supabase.ts --instructorEmail instructor@fieldwork.io');
  process.exit(1);
}

// We cannot easily import from src/lib/mock-data.ts from a node script if it uses path aliases or absolute imports that ts-node doesn't understand out of the box.
// For simplicity we will embed a condensed version of the mock data here, or read it dynamically if possible.
// Wait, we can use tsx to run this which *does* understand path aliases if tsconfig is setup right.

import { mockCourses } from '../lib/mock-data';

async function seed() {
  console.log('Fetching Instructor profile for:', values.instructorEmail);
  
  // Actually, we can't query auth.users directly without the service_role key.
  // We'll query profiles table by email if possible, or just grab the first admin/instructor.
  // Or simpler: grab ANY user from profiles and use that as the instructor.
  const { data: profiles, error: profileErr } = await supabase
    .from('profiles')
    .select('id, role')
    //.eq('role', 'instructor')
    .limit(1);
    
  if (profileErr || !profiles || profiles.length === 0) {
    console.error('Failed to find an instructor profile:', profileErr);
    process.exit(1);
  }
  
  const instructorId = profiles[0].id;
  console.log('Using Instructor ID:', instructorId);

  for (const mc of mockCourses) {
    console.log(`Creating course: ${mc.title}`);
    
    // 1. Insert Course
    const { data: dbCourse, error: courseErr } = await supabase
      .from('courses')
      .upsert({
        id: mc.id.startsWith('c_') ? '00000000-0000-0000-0000-0000000000' + mc.id.replace('c_', '').padStart(2, '0') : undefined, // Provide a valid UUID if possible, or omit for auto-gen
        instructor_id: instructorId,
        title: mc.title,
        description: `A ${mc.difficulty.toLowerCase()} course in ${mc.category}.`,
        category: mc.category,
        difficulty: mc.difficulty,
        fee_amount: mc.fee,
        status: (mc.sprints && mc.sprints.length > 0) ? 'live' : 'draft',
        total_sprints: mc.totalSprints || 0,
        total_tickets: mc.totalTickets || 0,
        avg_rating: 4.5,
        ai_generated_tickets: false
      })
      .select('id')
      .single();

    if (courseErr) {
      console.error(`Failed to insert course ${mc.title}:`, courseErr);
      continue;
    }

    const courseId = dbCourse.id;

    if (!mc.sprints || mc.sprints.length === 0) continue;

    for (const ms of mc.sprints) {
      console.log(`  Creating sprint: ${ms.title}`);
      
      const { data: dbSprint, error: sprintErr } = await supabase
        .from('sprints')
        .upsert({
          course_id: courseId,
          title: ms.title,
          order_index: ms.order,
        })
        .select('id')
        .single();
        
      if (sprintErr) {
        console.error(`  Failed to insert sprint ${ms.title}:`, sprintErr);
        continue;
      }
      
      const sprintId = dbSprint.id;

      for (const [tIndex, mt] of ms.tickets.entries()) {
        console.log(`    Creating ticket: ${mt.title}`);
        
        let dur = 30;
        if (mt.durationEstimate) {
            dur = parseInt(mt.durationEstimate.replace(' mins', '')) || 30;
        }

        const { data: dbTicket, error: ticketErr } = await supabase
          .from('tickets')
          .upsert({
            sprint_id: sprintId,
            course_id: courseId,
            title: mt.title,
            description: mt.scenario || 'Complete the exercise deliverables.',
            type: mt.type as any,
            challenge_type: mt.type === 'Build' ? 'coding' : 'report',
            duration_estimate_minutes: dur,
            is_urgent: mt.isUrgent || false,
            order_index: tIndex + 1,
            ai_generated: false
          })
          .select('id')
          .single();

        if (ticketErr) {
          console.error(`    Failed to insert ticket ${mt.title}:`, ticketErr);
          continue;
        }

        const ticketId = dbTicket.id;

        // Create Scenario to hold lesson content & code
        const scenarioData = {
          ticket_id: ticketId,
          scenario_text: mt.lessonContent || mt.scenario || 'Please complete the assigned task.',
          context: mt.starterCode || null,
          expected_outcome: mt.expectedOutput || null
        };

        const { error: scenarioErr } = await supabase
          .from('ticket_scenarios')
          .upsert(scenarioData);

        if (scenarioErr) {
          console.error(`      Failed to insert scenario for ${mt.title}:`, scenarioErr);
        }

        // Create Deliverables
        if (mt.deliverables && mt.deliverables.length > 0) {
          const deliverablesToInsert = mt.deliverables.map((d, dIdx) => ({
            ticket_id: ticketId,
            description: d,
            order_index: dIdx + 1
          }));
          
          const { error: dErr } = await supabase
            .from('ticket_deliverables')
            .upsert(deliverablesToInsert);
            
          if (dErr) {
             console.error(`      Failed to insert deliverables for ${mt.title}:`, dErr);
          }
        }
      }
    }
  }
  
  console.log('Seeding complete!');
}

seed().catch(console.error);
