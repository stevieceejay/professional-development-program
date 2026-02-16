const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'backend', 'data', 'project.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // First, check what org_id exists
  db.get('SELECT id FROM organizations LIMIT 1', (err, row) => {
    if (err) {
      console.error('Error fetching organization:', err);
      db.close();
      return;
    }
    
    const orgId = row ? row.id : null;
    console.log(`Using org_id: ${orgId}`);
    
    // Add Week 1 lesson (lessons table might not have org_id constraint)
    db.run(`
      INSERT INTO lessons (title, description, video_url) 
      VALUES (?, ?, ?)
    `,
      [
        'Week 1: Self-Discovery & Career Declaration',
        'Complete your MBTI personality assessment and declare your career interest. This information will be used to build your 30-60-90 day plan, resume, and cover letter.',
        null
      ],
      function(err) {
        if (err) {
          console.error('Error adding lesson:', err);
          db.close();
          return;
        }
        
        const lessonId = this.lastID;
        console.log(`✅ Added Week 1 lesson (ID: ${lessonId})`);
        
        // Add two assignments for Week 1
        const assignments = [
          {
            title: 'MBTI Personality Assessment',
            instructions: 'Submit your MBTI personality type results (e.g., INTJ, ENFP, ISTJ, etc.). This will help us understand your work style and preferences.'
          },
          {
            title: 'Career/Job Declaration',
            instructions: 'Declare your career interest or desired job role. Be specific (e.g., "Software Engineer at a startup", "Marketing Manager in healthcare", "Data Analyst"). This will be the foundation for your 30-60-90 day plan, resume, and cover letter.'
          }
        ];
        
        let completed = 0;
        assignments.forEach((assignment, index) => {
          db.run(`
            INSERT INTO assignments (lesson_id, title, instructions, org_id) 
            VALUES (?, ?, ?, ?)
          `,
            [lessonId, assignment.title, assignment.instructions, orgId],
            function(err) {
              if (err) {
                console.error(`Error adding assignment ${index + 1}:`, err);
              } else {
                console.log(`✅ Added assignment: ${assignment.title} (ID: ${this.lastID})`);
              }
              
              completed++;
              if (completed === assignments.length) {
                console.log('\n✅ Week 1 setup complete!');
                db.close();
              }
            }
          );
        });
      }
    );
  });
});